import { IsString, IsBoolean, IsOptional, IsEnum, IsDateString, IsNumber, IsIn } from 'class-validator';
import { PlanType, Role } from '@prisma/client';

export class UpdateAdminCompanyDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() cuit?: string;
  @IsOptional() @IsEnum(PlanType) planType?: PlanType;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
}

export class UpdateAdminSubscriptionDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsEnum(PlanType) planType?: PlanType;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsNumber() amount?: number;
}

export class UpdateAdminUserDto {
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
}

export class ResetPasswordDto {
  @IsString() password!: string;
}
