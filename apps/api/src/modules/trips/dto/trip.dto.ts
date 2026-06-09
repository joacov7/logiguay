import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsPositive,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus, CommissionType, TripEventType } from '@prisma/client';

export class CreateTripDto {
  @ApiProperty({ description: 'ID de la carga' })
  @IsString()
  cargoId: string;

  @ApiPropertyOptional({ description: 'ID de la empresa transportista' })
  @IsOptional()
  @IsString()
  transportCompanyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  estimatedArrival?: string;
}

export class AssignTripDto {
  @ApiProperty({ description: 'ID del vehículo asignado' })
  @IsString()
  vehicleId: string;

  @ApiProperty({ description: 'ID del chofer asignado' })
  @IsString()
  driverId: string;

  @ApiPropertyOptional({ description: 'Tarifa acordada en moneda local' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  agreedRate?: number;

  @ApiPropertyOptional({ description: 'Valor de comisión (% o monto fijo)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commission?: number;

  @ApiPropertyOptional({ enum: CommissionType })
  @IsOptional()
  @IsEnum(CommissionType)
  commissionType?: CommissionType;
}

export class UpdateTripStatusDto {
  @ApiProperty({ enum: TripStatus })
  @IsEnum(TripStatus)
  status: TripStatus;

  @ApiPropertyOptional({ description: 'Motivo de cancelación (requerido si status=CANCELADO)' })
  @IsOptional()
  @IsString()
  cancelReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddTripEventDto {
  @ApiProperty({ enum: TripEventType })
  @IsEnum(TripEventType)
  type: TripEventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelTripDto {
  @ApiProperty({ description: 'Motivo de cancelación' })
  @IsString()
  reason: string;
}
