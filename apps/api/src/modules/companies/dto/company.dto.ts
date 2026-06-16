import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanType } from '@prisma/client';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Transportes Logiguay SA' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '20-12345678-9', description: 'Si no se provee, se genera un placeholder único editable luego' })
  @IsOptional()
  @IsString()
  cuit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ default: 'AR' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ enum: PlanType, default: PlanType.FREE })
  @IsOptional()
  @IsEnum(PlanType)
  planType?: PlanType;
}

export class UpdateCompanyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ enum: PlanType })
  @IsOptional()
  @IsEnum(PlanType)
  planType?: PlanType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
