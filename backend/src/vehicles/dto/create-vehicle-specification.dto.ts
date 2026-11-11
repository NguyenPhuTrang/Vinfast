
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVehicleSpecificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  groupName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  label!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  value!: string;

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
