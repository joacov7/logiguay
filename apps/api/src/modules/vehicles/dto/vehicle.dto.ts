import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType, VehicleStatus } from '@prisma/client';

export class CreateVehicleDto {
  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiProperty({ enum: VehicleType })
  @IsEnum(VehicleType)
  type: VehicleType;

  @ApiProperty({ example: 'ABC123' })
  @IsString()
  plate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1950)
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityTons?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityM3?: number;

  @ApiPropertyOptional({ description: 'IMEI del equipo GPS instalado (Traccar)' })
  @IsOptional()
  @IsString()
  trackerDeviceId?: string;
}

export class UpdateVehicleDto {
  @ApiPropertyOptional({ enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plate?: string;

  @ApiPropertyOptional({ description: 'IMEI del equipo GPS instalado (Traccar)' })
  @IsOptional()
  @IsString()
  trackerDeviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1950)
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityTons?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityM3?: number;
}

export class UpdateVehicleStatusDto {
  @ApiProperty({ enum: VehicleStatus })
  @IsEnum(VehicleStatus)
  status: VehicleStatus;
}
