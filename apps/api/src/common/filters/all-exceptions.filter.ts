import * as Sentry from '@sentry/node';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = (request.headers['x-correlation-id'] as string) ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message ?? res;

      // 4xx: errores de negocio esperados → solo debug, no alertar
      if (status < 500) {
        this.logger.debug({
          correlationId, status,
          path: request.url, method: request.method, message,
        }, `HTTP ${status}`);
      } else {
        this.logger.warn({
          correlationId, status,
          path: request.url, method: request.method,
          err: { message: exception.message },
        }, `HTTP ${status}`);
        Sentry.captureException(exception, { extra: { correlationId, path: request.url } });
      }
    } else if (exception instanceof Error) {
      // Error no controlado → crítico, siempre alertar
      this.logger.error({
        correlationId,
        path: request.url,
        method: request.method,
        err: {
          message: exception.message,
          name: exception.name,
          // Stack solo en no-prod: evita exponer rutas internas en logs de producción
          ...(process.env.NODE_ENV !== 'production' && { stack: exception.stack }),
        },
      }, 'Unhandled exception');

      // Enriquecer el evento de Sentry con contexto para facilitar el debugging
      Sentry.withScope((scope) => {
        scope.setTag('correlationId', correlationId);
        scope.setTag('method', request.method);
        scope.setTag('path', request.url);
        scope.setExtra('userId', (request as any).user?.id ?? null);
        scope.setExtra('userRole', (request as any).user?.role ?? null);
        Sentry.captureException(exception);
      });

      if (process.env.NODE_ENV !== 'production') {
        message = exception.message;
      }
    } else {
      // throw de un no-Error (string, número) — muy raro, igual lo capturamos
      this.logger.error({ correlationId, raw: String(exception) }, 'Unknown exception type');
      Sentry.captureMessage(String(exception), 'error');
    }

    response.status(status).json({
      statusCode: status,
      message,
      // El cliente puede reportar este ID y vos lo buscás exacto en logs/Sentry
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }
}
