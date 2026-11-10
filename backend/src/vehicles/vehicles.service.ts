import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateVehicleCategoryDto } from './dto/create-vehicle-category.dto.js';
import { UpdateVehicleCategoryDto } from './dto/update-vehicle-category.dto.js';

@Injectable()
export class VehiclesService {
    constructor(
        private readonly prisma: PrismaService
    ) {} // NestJS đưa cho service để tương tác với database

    private isUniqueConstraintError(error: unknown): boolean { // kiểm tra xem một lỗi có phải là lỗi “trùng giá trị unique” của Prisma hay không. Trả về true nếu đúng, false nếu không. , Unique nghĩa là “không được trùng nhau”: trong một cột có ràng buộc unique, mỗi giá trị chỉ được xuất hiện một lần trong toàn bảng.
        return(
            typeof error === 'object' && error !== null && 'code' in error && error.code === "P2002"
        );
    }

    async findPublicCategories() { // lấy danh sách các danh mục xe đang hoạt động để hiển thị công khai
        return this.prisma.vehicleCategory.findMany({
            where: {
                isActive: true,
            },
            orderBy: [
                { sortOrder: 'asc' },
                { name: 'asc' }
            ],
            include: {
                _count: {
                    select: {
                        vehicles: {
                            where: {
                                status: 'PUBLISHED'
                            }
                        }
                    }
                }
            }
        });
    }

    async findAllCategories() {
        return this.prisma.vehicleCategory.findMany({
            orderBy: [
                { sortOrder: 'asc' },
                { createdAt: 'desc' },
            ],
            include: {
                _count:{
                    select: {
                        vehicles: true
                    }
                }
            }
        })
    }

    async findCategoryBySlug(slug: string) {
        const category = await this.prisma.vehicleCategory.findFirst({
            where: {
                slug,
                isActive: true
            },
            include: {
                _count: {
                    select: {
                        vehicles: { // đếm số lượng vehicles có trạng thái PUBLISHED
                            where: {
                                status: 'PUBLISHED'
                            }
                        }
                    }
                }
            }
        })
        if(!category){
            throw new NotFoundException("Vehicle category not found")
        }

        return category;
    }

    async createCategory(dto: CreateVehicleCategoryDto) {
        try {
            return await this.prisma.vehicleCategory.create({
                data: {
                    name: dto.name.trim(),
                    slug: dto.slug.trim(),
                    description: dto.description?.trim(),
                    sortOrder: dto.sortOrder ?? 0,
                    isActive: dto.isActive ?? true,
                },
            });
        } catch( error: unknown) {
            if(this.isUniqueConstraintError(error)) {
                throw new ConflictException("Vehicle category slug already exists")
            }

            throw error
        }
    }

    async updateCategory(
        id: string,
        dto: UpdateVehicleCategoryDto
    ) {
        if(Object.keys(dto).length === 0)
        {
            throw new BadRequestException("At least one field must be provided")
        }

     const existing =
      await this.prisma.vehicleCategory.findUnique({
        where: { id },
      });

        if (!existing) {
        throw new NotFoundException(
            'Vehicle category not found',
        );
        }

        try {
            return await this.prisma.vehicleCategory.update({
                where: {id},
                data: {
                    ...(dto.name !== undefined && {
                        name: dto.name.trim(),
                    }),
                    ...(dto.slug !== undefined && {
                        slug: dto.slug.trim(),
                    }),
                    ...(dto.description !== undefined && {
                        description: dto.description.trim(),
                    }),
                    ...(dto.sortOrder !== undefined && {
                        sortOrder: dto.sortOrder,
                    }),
                    ...(dto.isActive !== undefined && {
                        isActive: dto.isActive,
                    }),
                    },
                });
                } catch (error: unknown) {
                if (this.isUniqueConstraintError(error)) {
                    throw new ConflictException(
                    'Vehicle category slug already exists',
                    );
                }

                throw error;
            }
        }

        async deleteCategory(id: string) {
        const existing =
        await this.prisma.vehicleCategory.findUnique({
            where: { id },
        });

        if (!existing) {
        throw new NotFoundException(
            'Vehicle category not found',
        );
        }

        if (!existing.isActive) {
        return {
            message: 'Vehicle category is already inactive',
        };
        }

        const updated =
        await this.prisma.vehicleCategory.update({
            where: { id },
            data: {
            isActive: false,
            },
        });

        return {
        message: 'Vehicle category deactivated successfully',
        category: updated,
        };
    }
}
