
import { Type } from 'class-transformer';

import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { VehicleMediaRole } from '../../generated/prisma/client.js';

export class QueryVehicleMediaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(VehicleMediaRole)
  role?: VehicleMediaRole;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsEnum(['sortOrder', 'createdAt'])
  sortBy?: 'sortOrder' | 'createdAt' = 'sortOrder';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}
