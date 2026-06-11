import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

const isProd = process.env.NODE_ENV === 'production';

function assertSecretsAreSafe(logger: Logger) {
  if (!isProd) return;
  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = process.env[key] || '';
    if (value.length < 32 || value.includes('change_me')) {
      logger.error(`${key} es débil o tiene el valor de ejemplo. Configurá un secreto real antes de desplegar.`);
      process.exit(1);
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  assertSecretsAreSafe(logger);

  app.setGlobalPrefix('api/v1');

  // CSP deshabilitado para no romper Swagger UI en dev; el resto de los headers aplican
  app.use(helmet({ contentSecurityPolicy: false }));

  // API_CORS_ORIGIN acepta varios dominios separados por coma.
  // Las apps móviles no envían header Origin, así que CORS no las afecta.
  const corsOrigins = (process.env.API_CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (isProd && !corsOrigins.length) {
    logger.error('API_CORS_ORIGIN no está configurado. En producción es obligatorio.');
    process.exit(1);
  }
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('LOGIGUAY API')
    .setDescription('Plataforma de logística y transporte de cargas - API REST')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Autenticación y sesiones')
    .addTag('Users', 'Gestión de usuarios')
    .addTag('Companies', 'Gestión de empresas')
    .addTag('Vehicles', 'Gestión de flota')
    .addTag('Drivers', 'Gestión de choferes')
    .addTag('Documents', 'Documentación y vencimientos')
    .addTag('Cargo', 'Cargas y bolsa')
    .addTag('Trips', 'Viajes y ciclo de vida')
    .addTag('Quotes', 'Cotizaciones')
    .addTag('Tracking', 'Rastreo en tiempo real')
    .addTag('Geofences', 'Geocercas')
    .addTag('Alerts', 'Sistema de alertas')
    .addTag('Dashboard', 'Analítica y KPIs')
    .addTag('Billing', 'Facturación')
    .addTag('Subscriptions', 'Planes y suscripciones')
    .build();

  // Swagger expone todo el esquema de la API: solo disponible fuera de producción
  if (!isProd) {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = process.env.API_PORT || 3001;
  await app.listen(port);

  logger.log(`LOGIGUAY API running on http://localhost:${port}/api/v1`);
  if (!isProd) logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
