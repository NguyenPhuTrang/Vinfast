import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Delete, UseGuards } from '@nestjs/common';
import { VehiclesService } from './vehicles.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateVehicleCategoryDto } from './dto/create-vehicle-category.dto.js';
import { UpdateVehicleCategoryDto } from './dto/update-vehicle-category.dto.js';

@Controller('vehicles')
export class VehiclesController {
    constructor ( private readonly vehiclesService: VehiclesService, ){}

    @Get('categories')
    findPublicCategories() {
        return this.vehiclesService.findAllCategories();
    }

    @Get('categories/:slug')
    findCategoryBySlug(
        @Param('slug') slug: string,
    ) {
        return this.vehiclesService.findCategoryBySlug(slug)
    }

    @Get('category/admin')
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
}
