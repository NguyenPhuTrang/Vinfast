
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class UpdateVehicleSpecificationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  groupName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  label?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  value?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  numericValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  sortOrder?: number;
}
