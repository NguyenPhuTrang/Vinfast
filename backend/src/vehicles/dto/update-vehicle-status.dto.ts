
import { IsEnum } from 'class-validator';

import { ContentStatus } from '../../generated/prisma/enums.js';

export class UpdateVehicleStatusDto {
  @IsEnum(ContentStatus)
  status!: ContentStatus;
}
