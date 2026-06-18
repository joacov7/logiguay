import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['error', 'warn'],
      // Timeout explícito: evita que queries colgadas bloqueen el event loop.
      // Prisma no expone un timeout nativo, pero el datasource_url puede
      // incluir ?connect_timeout=N. Aquí forzamos un query timeout via
      // middleware en onModuleInit.
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');

    // Middleware de timeout: cancela queries que tarden más de 30 s.
    // Protege el servidor de queries colgadas ante lentitud de DB.
    this.$use(async (params, next) => {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Prisma query timeout: ${params.model}.${params.action}`)), 30_000),
      );
      return Promise.race([next(params), timeout]);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
