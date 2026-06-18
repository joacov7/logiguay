import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check — usado por load balancer y UptimeRobot' })
  async check() {
    const checks = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.set('health:ping', '1', 5),
    ]);

    const db = checks[0].status === 'fulfilled';
    const cache = checks[1].status === 'fulfilled';
    const healthy = db && cache;

    return {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: db ? 'ok' : 'error',
        cache: cache ? 'ok' : 'error',
      },
    };
  }
}
