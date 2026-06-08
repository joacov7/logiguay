import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, body } = request;

    const auditableMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    if (!auditableMethods.includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (responseData) => {
        try {
          const urlParts = url.split('/').filter(Boolean);
          const entity = urlParts[1] || 'unknown';
          const entityId = urlParts[2] || responseData?.id || null;

          await this.prisma.auditLog.create({
            data: {
              userId: user?.id || null,
              action: method,
              entity,
              entityId,
              newValue: method !== 'DELETE' ? (body as any) : null,
              ip: ip || null,
            },
          });
        } catch (err) {
          this.logger.error('Failed to write audit log', err);
        }
      }),
    );
  }
}
