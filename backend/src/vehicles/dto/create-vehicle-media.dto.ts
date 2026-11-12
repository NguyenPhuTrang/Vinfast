
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { VehicleMediaRole } from '../../generated/prisma/client.js';

export class CreateVehicleMediaDto {
  @IsUUID()
  mediaAssetId: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsOptional()
  @IsEnum(VehicleMediaRole)
  role?: VehicleMediaRole;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999999)
  sortOrder?: number;
}
