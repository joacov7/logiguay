import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

@ApiTags('Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tracking')
export class TrackingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'Última posición de un vehículo' })
  async getVehiclePosition(@Param('vehicleId') vehicleId: string) {
    const cached = await this.redis.getJson(`vehicle:${vehicleId}:position`);
    if (cached) return cached;

    return this.prisma.vehiclePosition.findFirst({
      where: { vehicleId },
      orderBy: { timestamp: 'desc' },
    });
  }

  @Get('company/:companyId/fleet')
  @ApiOperation({ summary: 'Posición de toda la flota de una empresa' })
  async getFleetPositions(@Param('companyId') companyId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { companyId, status: 'ACTIVO' },
      select: { id: true, plate: true, type: true },
    });

    const positions = await Promise.all(
      vehicles.map(async (v) => {
        const pos = await this.redis.getJson(`vehicle:${v.id}:position`);
        if (pos) return { ...v, position: pos };

        const dbPos = await this.prisma.vehiclePosition.findFirst({
          where: { vehicleId: v.id },
          orderBy: { timestamp: 'desc' },
        });
        return { ...v, position: dbPos };
      }),
    );

    return positions;
  }

  @Get('vehicle/:vehicleId/history')
  @ApiOperation({ summary: 'Historial de posiciones de un vehículo' })
  async getVehicleHistory(@Param('vehicleId') vehicleId: string) {
    return this.prisma.vehiclePosition.findMany({
      where: { vehicleId },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }
}
