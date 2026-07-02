import { Params } from 'nestjs-pino';

// Campos que nunca deben aparecer en logs, sin importar dónde estén en el objeto.
// pino los redacta con "***REDACTED***" antes de serializar.
const SENSITIVE_FIELDS = [
  'password',
  'hashedPassword',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'pwd_reset',
  'secret',
  'apiKey',
  'api_key',
  'cvv',
  'cardNumber',
];

const redactPaths = [
  // Headers HTTP
  'req.headers.authorization',
  'req.headers.cookie',
  // Bodies de request
  'req.body.password',
  'req.body.token',
  // Cualquier campo sensible en cualquier nivel del log payload
  ...SENSITIVE_FIELDS.flatMap((f) => [f, `*.${f}`, `*.*.${f}`]),
];

const isProd = process.env.NODE_ENV === 'production';

export const loggerConfig: Params = {
  pinoHttp: {
    // En prod: JSON estructurado (parseable por Datadog/Loki/CloudWatch)
    // En dev: formato humano con colores
    transport: isProd
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } },

    level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),

    // Redacta datos sensibles antes de escribir el log
    redact: {
      paths: redactPaths,
      censor: '[REDACTED]',
    },

    // Campos base que aparecen en cada línea de log
    base: {
      env: process.env.NODE_ENV ?? 'development',
      version: process.env.npm_package_version ?? 'unknown',
    },

    // Personaliza el log de cada request HTTP
    customProps: (req: any) => ({
      correlationId: req.headers['x-correlation-id'] ?? req.id,
      userId: (req as any).user?.id ?? undefined,
      userRole: (req as any).user?.role ?? undefined,
    }),

    // Serializa el request sin exponer el body completo (puede tener datos sensibles)
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          // No logueamos body aquí — va por el logger manual si hace falta
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },

    // No loguear health checks — ensucian los logs sin valor
    autoLogging: {
      ignore: (req: any) => ['/api/v1/health', '/favicon.ico'].includes(req.url),
    },

    // Mensajes de request/response más claros
    customSuccessMessage: (req: any, res: any) =>
      `${req.method} ${req.url} → ${res.statusCode}`,
    customErrorMessage: (req: any, res: any, err: Error) =>
      `${req.method} ${req.url} → ${res.statusCode} | ${err.message}`,
  },
};
