import { IsString, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CargoStatus } from '@prisma/client';

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
}

export class UpdateCargoDto {
  @ApiPropertyOptional({ enum: CargoStatus })
  @IsOptional()
  @IsEnum(CargoStatus)
  status?: CargoStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  estimatedValue?: number;
}
