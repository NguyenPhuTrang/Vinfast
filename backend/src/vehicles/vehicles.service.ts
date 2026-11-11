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
import { QueryVehicleVariantsDto } from './dto/query-vehicle-variants.dto.js';
import { CreateVehicleVariantDto } from './dto/create-vehicle-variant.dto.js';
import { UpdateVehicleVariantDto } from './dto/update-vehicle-variant.dto.js';
import { QueryVehicleSpecificationsDto } from './dto/query-vehicle-specifications.dto.js';
import { CreateVehicleSpecificationDto } from './dto/create-vehicle-specification.dto.js';
import { UpdateVehicleSpecificationDto } from './dto/update-vehicle-specification.dto.js';
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
       const sortOrder = query.sortOrder ?? 'desc'

       const [vehicles, total] = await this.prisma.$transaction([
            this.prisma.vehicle.findMany({
                where,
                skip: (page - 1) *limit,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
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
        data: vehicles,
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


  // ==========================================
  // VEHICLE VARIANT
  // ==========================================

  // Public: Lấy danh sách phiên bản đang hoạt động
  async findPublicVariants(
    vehicleId: string,
    query: QueryVehicleVariantsDto,
  ) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        status: ContentStatus.PUBLISHED,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.VehicleVariantWhereInput = {
      vehicleId,
      isActive: true,
      ...(query.search && {
        OR: [
          {
            name: {
              contains: query.search.trim(),
              mode: 'insensitive',
            },
          },
          {
            code: {
              contains: query.search.trim(),
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const [variants, total] = await this.prisma.$transaction([
      this.prisma.vehicleVariant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
        include: {
          specifications: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.vehicleVariant.count({ where }),
    ]);

    return {
      data: variants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================== VEHICLE VARIANT =====================

  // Public: Lấy chi tiết phiên bản
  async findPublicVariantById(
    vehicleId: string,
    id: string,
  ) {
    const variant = await this.prisma.vehicleVariant.findFirst({
      where: {
        id,
        vehicleId,
        isActive: true,
        vehicle: {
          status: ContentStatus.PUBLISHED,
        },
      },
      include: {
        specifications: {
          orderBy: { sortOrder: 'asc' },
        },
        media: {
          include: {
            mediaAsset: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Vehicle variant not found');
    }

    return variant;
  }

  // Admin: Lấy danh sách tất cả phiên bản của một xe
  async findAllVariants(
    vehicleId: string,
    query: QueryVehicleVariantsDto,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortOrder = query.sortOrder ?? 'asc';

    const where: Prisma.VehicleVariantWhereInput = {
      vehicleId,
      ...(query.isActive !== undefined && {
        isActive: query.isActive,
      }),
      ...(query.search && {
        OR: [
          {
            name: {
              contains: query.search.trim(),
              mode: 'insensitive',
            },
          },
          {
            code: {
              contains: query.search.trim(),
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const orderBy: Prisma.VehicleVariantOrderByWithRelationInput =
      query.sortBy === 'name'
        ? { name: sortOrder }
        : query.sortBy === 'code'
          ? { code: sortOrder }
          : query.sortBy === 'createdAt'
            ? { createdAt: sortOrder }
            : { sortOrder: sortOrder };

    const [variants, total] = await this.prisma.$transaction([
      this.prisma.vehicleVariant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          specifications: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.vehicleVariant.count({ where }),
    ]);

    return {
      data: variants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Admin: Lấy chi tiết phiên bản theo ID
  async findVariantById(
    vehicleId: string,
    id: string,
  ) {
    const variant = await this.prisma.vehicleVariant.findFirst({
      where: {
        id,
        vehicleId,
      },
      include: {
        specifications: {
          orderBy: { sortOrder: 'asc' },
        },
        media: {
          include: {
            mediaAsset: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Vehicle variant not found');
    }

    return variant;
  }

  // Admin: Tạo phiên bản mới
  async createVariant(
    vehicleId: string,
    dto: CreateVehicleVariantDto,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.status === ContentStatus.ARCHIVED) {
      throw new BadRequestException(
        'Cannot add a variant to an archived vehicle',
      );
    }

    try {
      return await this.prisma.vehicleVariant.create({
        data: {
          vehicleId,
          name: dto.name.trim(),
          code: dto.code.trim(),
          description: dto.description?.trim(),
          isActive: dto.isActive ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
        include: {
          specifications: true,
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Variant code already exists for this vehicle',
        );
      }

      throw error;
    }
  }

  // Admin: Cập nhật phiên bản
  async updateVariant(
    vehicleId: string,
    id: string,
    dto: UpdateVehicleVariantDto,
  ) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided',
      );
    }

    const existing = await this.prisma.vehicleVariant.findFirst({
      where: {
        id,
        vehicleId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Vehicle variant not found');
    }

    try {
      return await this.prisma.vehicleVariant.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && {
            name: dto.name.trim(),
          }),
          ...(dto.code !== undefined && {
            code: dto.code.trim(),
          }),
          ...(dto.description !== undefined && {
            description: dto.description.trim(),
          }),
          ...(dto.isActive !== undefined && {
            isActive: dto.isActive,
          }),
          ...(dto.sortOrder !== undefined && {
            sortOrder: dto.sortOrder,
          }),
        },
        include: {
          specifications: true,
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Variant code already exists for this vehicle',
        );
      }

      throw error;
    }
  }

  // Admin: Xóa mềm phiên bản
  async deleteVariant(
    vehicleId: string,
    id: string,
  ) {
    const existing = await this.prisma.vehicleVariant.findFirst({
      where: {
        id,
        vehicleId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Vehicle variant not found');
    }

    if (!existing.isActive) {
      return {
        message: 'Vehicle variant is already inactive',
      };
    }

    const variant = await this.prisma.vehicleVariant.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return {
      message: 'Vehicle variant deactivated successfully',
      variant,
    };
  }

  
  // ================= VEHICLE SPECIFICATION ==================

  // Public: Lấy danh sách thông số của phiên bản
  async findPublicSpecifications(
    vehicleId: string,
    variantId: string,
    query: QueryVehicleSpecificationsDto,
  ) {
    const variant = await this.prisma.vehicleVariant.findFirst({
      where: {
        id: variantId,
        vehicleId,
        isActive: true,
        vehicle: {
          status: ContentStatus.PUBLISHED,
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Vehicle variant not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const sortOrder = query.sortOrder ?? 'asc';

    const where: Prisma.VehicleSpecificationWhereInput = {
      variantId,
      ...(query.groupName && {
        groupName: {
          equals: query.groupName.trim(),
          mode: 'insensitive',
        },
      }),
      ...(query.search && {
        OR: [
          {
            key: {
              contains: query.search.trim(),
              mode: 'insensitive',
            },
          },
          {
            label: {
              contains: query.search.trim(),
              mode: 'insensitive',
            },
          },
          {
            value: {
              contains: query.search.trim(),
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const sortBy = query.sortBy ?? 'sortOrder';

    const orderBy: Prisma.VehicleSpecificationOrderByWithRelationInput =
      sortBy === 'groupName'
        ? { groupName: sortOrder }
        : sortBy === 'key'
          ? { key: sortOrder }
          : sortBy === 'label'
            ? { label: sortOrder }
            : sortBy === 'createdAt'
              ? { createdAt: sortOrder }
              : { sortOrder: sortOrder };

    const [specifications, total] = await this.prisma.$transaction([
      this.prisma.vehicleSpecification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { groupName: 'asc' },
          orderBy,
        ],
      }),
      this.prisma.vehicleSpecification.count({ where }),
    ]);

    return {
      data: specifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Public: Lấy chi tiết một thông số
  async findPublicSpecificationById(
    vehicleId: string,
    variantId: string,
    id: string,
  ) {
    const specification =
      await this.prisma.vehicleSpecification.findFirst({
        where: {
          id,
          variantId,
          variant: {
            vehicleId,
            isActive: true,
            vehicle: {
              status: ContentStatus.PUBLISHED,
            },
          },
        },
      });

    if (!specification) {
      throw new NotFoundException('Vehicle specification not found');
    }

    return specification;
  }

  // Admin: Lấy danh sách tất cả thông số của một phiên bản
  async findAllSpecifications(
    vehicleId: string,
    variantId: string,
    query: QueryVehicleSpecificationsDto,
  ) {
    const variant = await this.prisma.vehicleVariant.findFirst({
      where: {
        id: variantId,
        vehicleId,
      },
    });

    if (!variant) {
      throw new NotFoundException('Vehicle variant not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const sortOrder = query.sortOrder ?? 'asc';

    const where: Prisma.VehicleSpecificationWhereInput = {
      variantId,
      ...(query.groupName && {
        groupName: {
          equals: query.groupName.trim(),
          mode: 'insensitive',
        },
      }),
      ...(query.search && {
        OR: [
          {
            key: {
              contains: query.search.trim(),
              mode: 'insensitive',
            },
          },
          {
            label: {
              contains: query.search.trim(),
              mode: 'insensitive',
            },
          },
          {
            value: {
              contains: query.search.trim(),
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const sortBy = query.sortBy ?? 'sortOrder';

    const orderBy: Prisma.VehicleSpecificationOrderByWithRelationInput =
      sortBy === 'groupName'
        ? { groupName: sortOrder }
        : sortBy === 'key'
          ? { key: sortOrder }
          : sortBy === 'label'
            ? { label: sortOrder }
            : sortBy === 'createdAt'
              ? { createdAt: sortOrder }
              : { sortOrder: sortOrder };

    const [specifications, total] = await this.prisma.$transaction([
      this.prisma.vehicleSpecification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { groupName: 'asc' },
          orderBy,
        ],
      }),
      this.prisma.vehicleSpecification.count({ where }),
    ]);

    return {
      data: specifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Admin: Lấy chi tiết thông số
  async findSpecificationById(
    vehicleId: string,
    variantId: string,
    id: string,
  ) {
    const specification =
      await this.prisma.vehicleSpecification.findFirst({
        where: {
          id,
          variantId,
          variant: {
            vehicleId,
          },
        },
      });

    if (!specification) {
      throw new NotFoundException('Vehicle specification not found');
    }

    return specification;
  }

  // Admin: Tạo thông số mới
  async createSpecification(
    vehicleId: string,
    variantId: string,
    dto: CreateVehicleSpecificationDto,
  ) {
    const variant = await this.prisma.vehicleVariant.findFirst({
      where: {
        id: variantId,
        vehicleId,
      },
      include: {
        vehicle: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Vehicle variant not found');
    }

    if (variant.vehicle.status === ContentStatus.ARCHIVED) {
      throw new BadRequestException(
        'Cannot add a specification to an archived vehicle',
      );
    }

    try {
      return await this.prisma.vehicleSpecification.create({
        data: {
          variantId,
          groupName: dto.groupName.trim(),
          key: dto.key.trim(),
          label: dto.label.trim(),
          value: dto.value.trim(),
          numericValue: dto.numericValue,
          unit: dto.unit?.trim(),
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Specification key already exists for this variant',
        );
      }

      throw error;
    }
  }

  // Admin: Cập nhật thông số
  async updateSpecification(
    vehicleId: string,
    variantId: string,
    id: string,
    dto: UpdateVehicleSpecificationDto,
  ) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided',
      );
    }

    const existing =
      await this.prisma.vehicleSpecification.findFirst({
        where: {
          id,
          variantId,
          variant: {
            vehicleId,
          },
        },
      });

    if (!existing) {
      throw new NotFoundException('Vehicle specification not found');
    }

    try {
      return await this.prisma.vehicleSpecification.update({
        where: { id },
        data: {
          ...(dto.groupName !== undefined && {
            groupName: dto.groupName.trim(),
          }),
          ...(dto.key !== undefined && {
            key: dto.key.trim(),
          }),
          ...(dto.label !== undefined && {
            label: dto.label.trim(),
          }),
          ...(dto.value !== undefined && {
            value: dto.value.trim(),
          }),
          ...(dto.numericValue !== undefined && {
            numericValue: dto.numericValue,
          }),
          ...(dto.unit !== undefined && {
            unit: dto.unit.trim(),
          }),
          ...(dto.sortOrder !== undefined && {
            sortOrder: dto.sortOrder,
          }),
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Specification key already exists for this variant',
        );
      }

      throw error;
    }
  }

  // Admin: Xóa thông số
  async deleteSpecification(
    vehicleId: string,
    variantId: string,
    id: string,
  ) {
    const existing =
      await this.prisma.vehicleSpecification.findFirst({
        where: {
          id,
          variantId,
          variant: {
            vehicleId,
          },
        },
      });

    if (!existing) {
      throw new NotFoundException('Vehicle specification not found');
    }

    await this.prisma.vehicleSpecification.delete({
      where: { id },
    });

    return {
      message: 'Vehicle specification deleted successfully',
    };
  }

}