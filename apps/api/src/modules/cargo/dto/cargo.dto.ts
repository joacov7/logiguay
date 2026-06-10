import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsPositive,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CargoStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateCargoDto {
  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiProperty({ example: 'Granos' })
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weightTons?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  volumeM3?: number;

  @ApiProperty()
  @IsString()
  originAddress: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  originLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  originLng?: number;

  @ApiProperty()
  @IsString()
  destinationAddress: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  destinationLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  destinationLng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requiredDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  estimatedValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAuction?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  auctionEndsAt?: string;
}

export class UpdateCargoDto {
  @ApiPropertyOptional({ enum: CargoStatus })
  @IsOptional()
  @IsEnum(CargoStatus)
  status?: CargoStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weightTons?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  volumeM3?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  originAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  originLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  originLng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destinationAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  destinationLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  destinationLng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requiredDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  estimatedValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAuction?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  auctionEndsAt?: string;
}

export class MarketplaceFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  originCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destinationCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minWeight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxWeight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requiredDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requiredDateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'estimatedValue', 'requiredDate'] })
  @IsOptional()
  @IsString()
  orderBy?: 'createdAt' | 'estimatedValue' | 'requiredDate';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  orderDir?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  radiusKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;
}

export class GeoFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  radiusKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;
}

export class SelectQuoteDto {
  @ApiProperty()
  @IsString()
  quoteId: string;
}
