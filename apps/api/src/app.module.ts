import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { EmailModule } from './common/email/email.module';
import { HealthModule } from './common/health/health.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { loggerConfig } from './common/logger/logger.config';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { CargoModule } from './modules/cargo/cargo.module';
import { TripsModule } from './modules/trips/trips.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { GeofencesModule } from './modules/geofences/geofences.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { BillingModule } from './modules/billing/billing.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { TurnosModule } from './modules/turnos/turnos.module';
import { CamionesModule } from './modules/camiones/camiones.module';
import { MarketModule } from './modules/market/market.module';
import { AdminModule } from './modules/admin/admin.module';
import { MessagesModule } from './modules/messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    LoggerModule.forRoot(loggerConfig),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    RedisModule,
    EmailModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    VehiclesModule,
    DriversModule,
    DocumentsModule,
    CargoModule,
    TripsModule,
    QuotesModule,
    TrackingModule,
    GeofencesModule,
    AlertsModule,
    DashboardModule,
    BillingModule,
    SubscriptionsModule,
    RatingsModule,
    TurnosModule,
    CamionesModule,
    MarketModule,
    AdminModule,
    MessagesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // AllExceptionsFilter necesita PinoLogger inyectado — lo registramos
    // como provider explícito para que NestJS resuelva la dependencia
    AllExceptionsFilter,
    { provide: APP_FILTER, useExisting: AllExceptionsFilter },
  ],
})
export class AppModule {}
