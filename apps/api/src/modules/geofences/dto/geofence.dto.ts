import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GeoFenceType } from '@prisma/client';

export class CreateGeoFenceDto {
  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: GeoFenceType })
  @IsEnum(GeoFenceType)
  type: GeoFenceType;

  @ApiProperty()
  @IsNumber()
  lat: number;

  @ApiProperty()
  @IsNumber()
  lng: number;

  @ApiPropertyOptional({ default: 500 })
  @IsOptional()
  @IsNumber()
  radiusMeters?: number;
}
