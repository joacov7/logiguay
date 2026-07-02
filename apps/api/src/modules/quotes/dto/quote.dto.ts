import { IsString, IsNumber, IsOptional, IsEnum, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuoteStatus } from '@prisma/client';

export class CreateQuoteDto {
  @ApiProperty()
  @IsString()
  cargoId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transportCompanyId?: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateQuoteStatusDto {
  @ApiProperty({ enum: QuoteStatus })
  @IsEnum(QuoteStatus)
  status: QuoteStatus;
}
