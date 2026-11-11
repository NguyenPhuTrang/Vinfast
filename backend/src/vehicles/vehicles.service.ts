import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';

import { ContentStatus, Prisma } from '../generated/prisma/client.js';

import { CreateVehicleCategoryDto } from './dto/create-vehicle-category.dto.js';
import { UpdateVehicleCategoryDto } from './dto/update-vehicle-category.dto.js';

import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { QueryVehiclesDto } from './dto/query-vehicles.dto.js';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto.js';
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

    async findPublicVehicles(query: QueryVehiclesDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;

        const where: Prisma.VehicleWhereInput = { // xây dựng điều kiện lọc để tìm danh sách xe
            status: ContentStatus.PUBLISHED,
            ...(query.categoryId && {categoryId: query.categoryId}), 
            ...(query.isFeatured !== undefined && {
                isFeatured: query.isFeatured
            }),
            ...(query.search && {
                OR: [
                        { name: { contains: query.search.trim(), mode: 'insensitive' } },
                        { slug: { contains: query.search.trim(), mode: 'insensitive' } },
                        { modelCode: { contains: query.search.trim(), mode: 'insensitive' } },
                ]
            })
        }

        const [vehicles, total] = await this.prisma.$transaction([
            this.prisma.vehicle.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: [
                    { sortOrder: 'asc'}, // sắp xếp theo chữ số the sortOrder thứ tự tăng dần .
                    { publishedAt: 'desc'} // sắp xếp theo cột publishedAt (ngày xuất bản) giảm dần, tức là mới nhất lên đầu.
                ],
                include: {
                    category: true,
                    variants: {
                        where: {isActive: true},
                        orderBy: {sortOrder: 'asc'}
                    }
                }
            }),
            this.prisma.vehicle.count({where})
        ]);
        return {
            data: vehicles,
            pagination: {
                page,
                limit,
                total,
                totalPage: Math.ceil(total/limit)
            }
        }
    }

    async findPublicVehicleBySlug(slug: string) {
        const vehicle = await this.prisma.vehicle.findFirst({
            where: {
                slug,
                status: ContentStatus.PUBLISHED
            },
            include: {
                category: true,
                variants: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc'},
                    include: {
                        specifications: {
                            orderBy: {sortOrder: 'asc'}
                        }
                    }
                },
                media: { // ấy danh sách media (ảnh/video)
                    include: {
                        mediaAsset: true
                    },
                    orderBy: {sortOrder: 'asc'}
                }
            }
        });

        if(!vehicle)
        {
            throw new NotFoundException('Vehicle not found');
        }

        return vehicle
    }

    async findAllVehicles(query: QueryVehiclesDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        
        const where: Prisma.VehicleWhereInput = {
         ...(query.status && { status: query.status }),
         ...(query.categoryId && { categoryId: query.categoryId }),
         ...(query.isFeatured !== undefined && {
           isFeatured: query.isFeatured,
         }),
         ...(query.search && {
           OR: [
             { name: { contains: query.search.trim(), mode: 'insensitive' } },
             { slug: { contains: query.search.trim(), mode: 'insensitive' } },
             { modelCode: { contains: query.search.trim(), mode: 'insensitive' } },
           ],
         }),
       };

       const sortBy = query.sortBy ?? 'createdAt'
       const sortOrder = query.sortBy ?? 'desc'

       const [vehicles, total] = await this.prisma.$transaction([
            this.prisma.vehicle.findMany({
                where,
                skip: (page - 1) *limit,
                take: limit,
                orderBy: { [sortBy]: sortBy },
                include: {
                    category: true,
                    variants: {
                        orderBy: {sortOrder: 'asc'}
                    }
                }
            }),
            this.prisma.vehicle.count({where})
       ]);

       return {
        date: vehicles,
        pagination: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit)
        }
       }

    }

    async findVehicleById(id: string) {
        const vehicle = await this.prisma.vehicle.findUnique({
            where: {id},
            include: {
                category: true,
                variants: {
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        specifications: {
                            orderBy: { sortOrder: 'asc' }
                        }
                    }
                },
                media: {
                    include: {
                        mediaAsset: true
                    },
                    orderBy: {sortOrder: 'asc'}
                }
            }
        });

        if(!vehicle){
            throw new NotFoundException('Vehicle not found')
        }

        return vehicle
    }

    async createVehicle(dto: CreateVehicleDto) {
        const category = await this.prisma.vehicleCategory.findUnique({
            where: {id: dto.categoryId},
        })

        if(!category || !category.isActive){
            throw new BadRequestException('Vehicle category is unavailable')
        }

        const status = dto.status ?? ContentStatus.DRAFT;

        try{
            return await this.prisma.vehicle.create({
                data: {
                categoryId: dto.categoryId,
                name: dto.name.trim(),
                slug: dto.slug.trim(),
                modelCode: dto.modelCode?.trim(),
                tagline: dto.tagline?.trim(),
                shortDescription: dto.shortDescription?.trim(),
                description: dto.description?.trim(),
                status,
                isFeatured: dto.isFeatured ?? false,
                sortOrder: dto.sortOrder ?? 0,
                seoTitle: dto.seoTitle?.trim(),
                seoDescription: dto.seoDescription?.trim(),
                publishedAt:
                    status === ContentStatus.PUBLISHED ? new Date() : null,
                },
                include: {
                    category: true // category là object con nằm trong từng phần tử, chứa thông tin danh mục của chính phần tử đó. sẽ có dạng "category": { }
                }
            });
        }catch (error: unknown) {
            if(this.isUniqueConstraintError(error)) {
                throw new ConflictException('Vehicle slug alrealy exists');
            }

            throw error;
        }
    }

    async updateVehicle(id: string, dto: UpdateVehicleDto) {
        if(Object.keys(dto).length === 0) {
            throw new BadRequestException('At least on field must ben provided')
        }

        const existing = await this.prisma.vehicle.findUnique({
            where: {id}
        })

        if(!existing){
            throw new NotFoundException('Vehicle not found')
        }

        if(dto.categoryId) {
            const category = await this.prisma.vehicleCategory.findUnique({
                where: {id: dto.categoryId},
            })
            if(!category || !category.isActive){
                throw new BadRequestException('Vehicle category is unavaible');
            }
        }

        try{
            return await this.prisma.vehicle.update({
                where: {id},
                 data: {
                        ...(dto.categoryId !== undefined && {
                            categoryId: dto.categoryId,
                        }),
                        ...(dto.name !== undefined && { name: dto.name.trim() }),
                        ...(dto.slug !== undefined && { slug: dto.slug.trim() }),
                        ...(dto.modelCode !== undefined && {
                            modelCode: dto.modelCode.trim(),
                        }),
                        ...(dto.tagline !== undefined && {
                            tagline: dto.tagline.trim(),
                        }),
                        ...(dto.shortDescription !== undefined && {
                            shortDescription: dto.shortDescription.trim(),
                        }),
                        ...(dto.description !== undefined && {
                            description: dto.description.trim(),
                        }),
                        ...(dto.isFeatured !== undefined && {
                            isFeatured: dto.isFeatured,
                        }),
                        ...(dto.sortOrder !== undefined && {
                            sortOrder: dto.sortOrder,
                        }),
                        ...(dto.seoTitle !== undefined && {
                            seoTitle: dto.seoTitle.trim(),
                        }),
                        ...(dto.seoDescription !== undefined && {
                            seoDescription: dto.seoDescription.trim(),
                        }),
                        },
                include: {
                category: true,
                },
             });
        } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Vehicle slug already exists');
      }

      throw error;
    }
  }

  // Admin: Thay đổi trạng thái xe
  async updateVehicleStatus(
    id: string,
    dto: UpdateVehicleStatusDto,
  ) {
    const existing = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Vehicle not found');
    }

    if (dto.status === ContentStatus.PUBLISHED) {
      const category = await this.prisma.vehicleCategory.findUnique({
        where: { id: existing.categoryId },
      });

      if (!category || !category.isActive) {
        throw new BadRequestException(
          'Cannot publish a vehicle with an inactive category',
        );
      }
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: {
        status: dto.status,
        publishedAt:
          dto.status === ContentStatus.PUBLISHED
            ? existing.publishedAt ?? new Date()
            : dto.status === ContentStatus.DRAFT
              ? null
              : existing.publishedAt,
      },
      include: {
        category: true,
      },
    });
  }

  // Admin: Xóa mềm xe bằng cách chuyển sang ARCHIVED
  async deleteVehicle(id: string) {
    const existing = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Vehicle not found');
    }

    if (existing.status === ContentStatus.ARCHIVED) {
      return {
        message: 'Vehicle is already archived',
      };
    }

    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data: {
        status: ContentStatus.ARCHIVED,
      },
    });

    return {
      message: 'Vehicle archived successfully',
      vehicle,
    };
  }
}