import { Module } from '@nestjs/common';
import { VehiclesController } from './vehicles.controller.js';
import { VehiclesService } from './vehicles.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [
    VehiclesService
  ]
})
export class VehiclesModule {}
