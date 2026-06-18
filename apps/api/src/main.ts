import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { HttpException } from '@nestjs/common';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.npm_package_version,

  integrations: [
    nodeProfilingIntegration(),
    Sentry.httpIntegration(),
  ],

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  profilesSampleRate: 0,

  // beforeSend único: limpia datos sensibles Y filtra errores de negocio esperados
  beforeSend(event, hint) {
    const err = hint.originalException;

    // No llenar Sentry con errores 4xx (son errores del usuario, no bugs del sistema)
    if (err instanceof HttpException && err.getStatus() < 500) {
      return null;
    }

    // Fingerprinting: agrupa timeouts de Prisma en un solo issue en lugar de miles
    if (err instanceof Error && err.message.includes('Prisma query timeout')) {
      event.fingerprint = ['prisma-timeout', err.message.split(':')[1]?.trim() ?? 'unknown'];
    }

    // Limpiar datos sensibles del request adjunto al evento
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    if (event.request?.data && typeof event.request.data === 'object') {
      const body = event.request.data as Record<string, unknown>;
      for (const key of ['password', 'token', 'secret', 'apiKey']) {
        if (key in body) body[key] = '[REDACTED]';
      }
    }

    return event;
  },
});

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { loggerConfig } from './common/logger/logger.config';

const isProd = process.env.NODE_ENV === 'production';

function assertSecretsAreSafe() {
  if (!isProd) return;
  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = process.env[key] || '';
    if (value.length < 32 || value.includes('change_me')) {
      // Usamos console.error aquí porque el logger Pino aún no está inicializado
      console.error(`[FATAL] ${key} es débil o tiene el valor de ejemplo.`);
      process.exit(1);
    }
  }
}

async function bootstrap() {
  assertSecretsAreSafe();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Usar el logger Pino como logger global de NestJS
  app.useLogger(app.get(Logger));

  // Desactivar ETag: evita respuestas 304 con datos cacheados
  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance();
  if (instance && typeof instance.set === 'function') {
    instance.set('etag', false);
  }

  // Sin cache en ninguna respuesta de la API
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    next();
  });

  // Correlation ID: permite rastrear un request a través de todos los logs
  app.use((req: any, _res: any, next: any) => {
    if (!req.headers['x-correlation-id']) {
      req.headers['x-correlation-id'] = crypto.randomUUID();
    }
    next();
  });

  app.setGlobalPrefix('api/v1');
  app.use(helmet({ contentSecurityPolicy: false }));

  const corsOrigins = (process.env.API_CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (isProd && !corsOrigins.length) {
    process.exit(1);
  }

  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('LOGIGUAY API')
      .setDescription('Plataforma de logística y transporte de cargas - API REST')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Auth').addTag('Users').addTag('Companies').addTag('Vehicles')
      .addTag('Drivers').addTag('Documents').addTag('Cargo').addTag('Trips')
      .addTag('Quotes').addTag('Tracking').addTag('Geofences').addTag('Alerts')
      .addTag('Dashboard').addTag('Billing').addTag('Subscriptions')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = process.env.API_PORT || 3001;
  await app.listen(port);

  const log = app.get(Logger);
  log.log(`LOGIGUAY API running on http://localhost:${port}/api/v1`, 'Bootstrap');
  if (!isProd) log.log(`Swagger docs: http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
