import { IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDriverDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiProperty()
  @IsString()
  licenseNumber: string;

  @ApiProperty()
  @IsDateString()
  licenseExpiry: string;
}

export class UpdateDriverDto {
  @ApiProperty({ required: false })
  @IsString()
  licenseNumber?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  licenseExpiry?: string;

  @ApiProperty({ required: false })
  @IsString()
  status?: string;
}
