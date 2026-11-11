import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Delete, UseGuards, Query } from '@nestjs/common';
import { VehiclesService } from './vehicles.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateVehicleCategoryDto } from './dto/create-vehicle-category.dto.js';
import { UpdateVehicleCategoryDto } from './dto/update-vehicle-category.dto.js';
import { QueryVehiclesDto } from './dto/query-vehicles.dto.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto.js';
import { QueryVehicleVariantsDto } from './dto/query-vehicle-variants.dto.js';
import { CreateVehicleVariantDto } from './dto/create-vehicle-variant.dto.js';
import { UpdateVehicleVariantDto } from './dto/update-vehicle-variant.dto.js';
import { CreateVehicleSpecificationDto } from './dto/create-vehicle-specification.dto.js';
import { QueryVehicleSpecificationsDto } from './dto/query-vehicle-specifications.dto.js';
import { UpdateVehicleSpecificationDto } from './dto/update-vehicle-specification.dto.js';

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

    // ==================== VEHICLE VARIANTS ====================

    // Public: Get active variants of a published vehicle
    @Get(':vehicleId/variants')
    findPublicVariants(
    @Param('vehicleId', new ParseUUIDPipe()) vehicleId: string,
    @Query() query: QueryVehicleVariantsDto,
    ) {
    return this.vehiclesService.findPublicVariants(vehicleId, query);
    }

    // Public: Get variant detail
    @Get(':vehicleId/variants/:id')
    findPublicVariantById(
    @Param('vehicleId', new ParseUUIDPipe()) vehicleId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    ) {
    return this.vehiclesService.findPublicVariantById(vehicleId, id);
    }

    // Admin: Get all variants of a vehicle
    @Get('admin/:vehicleId/variants')
    @UseGuards(JwtAuthGuard)
    findAllVariants(
    @Param('vehicleId', new ParseUUIDPipe()) vehicleId: string,
    @Query() query: QueryVehicleVariantsDto,
    ) {
    return this.vehiclesService.findAllVariants(vehicleId, query);
    }

    // Admin: Get variant detail
    @Get('admin/:vehicleId/variants/:id')
    @UseGuards(JwtAuthGuard)
    findVariantById(
    @Param('vehicleId', new ParseUUIDPipe()) vehicleId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    ) {
    return this.vehiclesService.findVariantById(vehicleId, id);
    }

    // Admin: Create variant
    @Post(':vehicleId/variants')
    @UseGuards(JwtAuthGuard)
    createVariant(
    @Param('vehicleId', new ParseUUIDPipe()) vehicleId: string,
    @Body() dto: CreateVehicleVariantDto,
    ) {
    return this.vehiclesService.createVariant(vehicleId, dto);
    }

    // Admin: Update variant
    @Patch(':vehicleId/variants/:id')
    @UseGuards(JwtAuthGuard)
    updateVariant(
    @Param('vehicleId', new ParseUUIDPipe()) vehicleId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateVehicleVariantDto,
    ) {
    return this.vehiclesService.updateVariant(vehicleId, id, dto);
    }

    // Admin: Delete variant (soft delete)
    @Delete(':vehicleId/variants/:id')
    @UseGuards(JwtAuthGuard)
    deleteVariant(
    @Param('vehicleId', new ParseUUIDPipe()) vehicleId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    ) {
    return this.vehiclesService.deleteVariant(vehicleId, id);
    }

    // ================= VEHICLE SPECIFICATION ==================

    // GET /vehicles/:vehicleId/variants/:variantId/specifications
    @Get(':vehicleId/variants/:variantId/specifications')
    findPublicSpecifications(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Query() query: QueryVehicleSpecificationsDto,
    ) {
    return this.vehiclesService.findPublicSpecifications(
        vehicleId,
        variantId,
        query,
    );
    }

    // GET /vehicles/:vehicleId/variants/:variantId/specifications/:id
    @Get(':vehicleId/variants/:variantId/specifications/:id')
    findPublicSpecificationById(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    ) {
    return this.vehiclesService.findPublicSpecificationById(
        vehicleId,
        variantId,
        id,
    );
    }

    // GET /vehicles/admin/:vehicleId/variants/:variantId/specifications
    @UseGuards(JwtAuthGuard)
    @Get('admin/:vehicleId/variants/:variantId/specifications')
    findAllSpecifications(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Query() query: QueryVehicleSpecificationsDto,
    ) {
    return this.vehiclesService.findAllSpecifications(
        vehicleId,
        variantId,
        query,
    );
    }

    // GET /vehicles/admin/:vehicleId/variants/:variantId/specifications/:id
    @UseGuards(JwtAuthGuard)
    @Get('admin/:vehicleId/variants/:variantId/specifications/:id')
    findSpecificationById(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    ) {
    return this.vehiclesService.findSpecificationById(
        vehicleId,
        variantId,
        id,
    );
    }

    // POST /vehicles/:vehicleId/variants/:variantId/specifications
    @UseGuards(JwtAuthGuard)
    @Post(':vehicleId/variants/:variantId/specifications')
    createSpecification(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: CreateVehicleSpecificationDto,
    ) {
    return this.vehiclesService.createSpecification(
        vehicleId,
        variantId,
        dto,
    );
    }

    // PATCH /vehicles/:vehicleId/variants/:variantId/specifications/:id
    @UseGuards(JwtAuthGuard)
    @Patch(':vehicleId/variants/:variantId/specifications/:id')
    updateSpecification(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleSpecificationDto,
    ) {
    return this.vehiclesService.updateSpecification(
        vehicleId,
        variantId,
        id,
        dto,
    );
    }

    // DELETE /vehicles/:vehicleId/variants/:variantId/specifications/:id
    @UseGuards(JwtAuthGuard)
    @Delete(':vehicleId/variants/:variantId/specifications/:id')
    deleteSpecification(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    ) {
    return this.vehiclesService.deleteSpecification(
        vehicleId,
        variantId,
        id,
    );
    }

}
