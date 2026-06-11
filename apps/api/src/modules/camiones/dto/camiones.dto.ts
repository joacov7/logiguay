import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTruckAvailabilityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiProperty({ example: 'CAMION' })
  @IsString()
  vehicleType: string;

  @ApiPropertyOptional({ example: 28 })
  @IsOptional()
  @IsNumber()
  capacityTons?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsNumber()
  capacityM3?: number;

  @ApiProperty({ example: 'Rosario, Santa Fe' })
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
  @IsDateString()
  availableFrom: string;

  @ApiProperty()
  @IsDateString()
  availableTo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
