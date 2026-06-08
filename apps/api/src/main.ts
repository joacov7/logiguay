import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
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

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.API_PORT || 3001;
  await app.listen(port);

  logger.log(`LOGIGUAY API running on http://localhost:${port}/api/v1`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
