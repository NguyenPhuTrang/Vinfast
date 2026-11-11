import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Delete, UseGuards, Query } from '@nestjs/common';
import { VehiclesService } from './vehicles.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateVehicleCategoryDto } from './dto/create-vehicle-category.dto.js';
import { UpdateVehicleCategoryDto } from './dto/update-vehicle-category.dto.js';
import { QueryVehiclesDto } from './dto/query-vehicles.dto.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto.js';

@Controller('vehicles')
export class VehiclesController {
    constructor ( private readonly vehiclesService: VehiclesService, ){}

    @Get('categories')
    findPublicCategories() {
        return this.vehiclesService.findPublicCategories;
    }

    @Get('categories/:slug')
    findCategoryBySlug(
        @Param('slug') slug: string,
    ) {
        return this.vehiclesService.findCategoryBySlug(slug)
    }

    @Get('categories/admin')
    @UseGuards(JwtAuthGuard)
    findAllCategories() {
        return this.vehiclesService.findAllCategories();
    }

    @Post('categories')
    @UseGuards(JwtAuthGuard)
    createCategory( @Body() dto: CreateVehicleCategoryDto ){
        return this.vehiclesService.createCategory(dto)
    }

    @Patch('categories/:id')
    @UseGuards(JwtAuthGuard)
    updateCategory(
        @Param('id', new ParseUUIDPipe()) id: string, // ParseUUIDPipe là một pipe có sẵn của NestJS, dùng để kiểm tra một tham số có phải UUID hợp lệ hay không. Nếu không hợp lệ, NestJS tự trả về lỗi 400 Bad Request và không chạy tiếp vào hàm xử lý.
        @Body() dto: UpdateVehicleCategoryDto,
    ) {
        return this.vehiclesService.updateCategory(id,dto);
    }

    @Delete('categories/:id')
    @UseGuards(JwtAuthGuard)
    deleteCategory(
        @Param('id', new ParseUUIDPipe()) id: string
    ){
        return this.vehiclesService.deleteCategory(id);
    }

    @Get('admin')
    @UseGuards(JwtAuthGuard)
    findAllVehicles(
        @Query() query: QueryVehiclesDto
    ) {
        return this.vehiclesService.findAllVehicles(query)
    }

    @Get('admin/:id')
    @UseGuards(JwtAuthGuard)
    findVehicleById(
        @Param('id', ParseUUIDPipe) id: string
    ) {
        return this.vehiclesService.findVehicleById(id);
    }

    @Get()
    findPublicVehicles(
        @Query() query:QueryVehiclesDto,
    ){
        return this.vehiclesService.findPublicVehicles(query)
    }

    @Get(':slug')
    findPublicVehicleBySlug(
        @Param('slug') slug: string
    ){
        return this.vehiclesService.findPublicVehicleBySlug(slug)
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    createVehicle(
        @Body() dto: CreateVehicleDto,
    ) {
        return this.vehiclesService.createVehicle(dto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    updateVehicle(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateVehicleDto,
    ) {
        return this.vehiclesService.updateVehicle(id, dto);
    }

    @Patch(':id/status')
    @UseGuards(JwtAuthGuard)
    updateVehicleStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateVehicleStatusDto,
    ) {
        return this.vehiclesService.updateVehicleStatus(id, dto);
    }

   
    @Delete(':id') // Admin: Xóa mềm xe
    @UseGuards(JwtAuthGuard)
    deleteVehicle(
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.vehiclesService.deleteVehicle(id);
    }

}
