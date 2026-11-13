
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type {
  MediaStorageInterface,
  UploadMediaInput,
  StorageResourceType,
} from './storage/interfaces/media-storage.interface.js';

import { MEDIA_STORAGE } from './storage/interfaces/media-storage.interface.js';

import { PrismaService } from '../database/prisma.service.js';

import { QueryMediaDto } from './dto/query-media.dto.js';

export type MediaFolder =
  | 'vehicles'
  | 'news'
  | 'gallery'
  | 'general';

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
];

@Injectable()
export class MediaAssetsService {
  private readonly logger = new Logger(MediaAssetsService.name);

  constructor(
    private readonly prisma: PrismaService,

    @Inject(MEDIA_STORAGE)
    private readonly mediaStorage: MediaStorageInterface,
  ) {}

  // ==========================================
  // UPLOAD MEDIA
  // ==========================================

  async upload(
    file: Express.Multer.File,
    folder: MediaFolder,
    uploadedById?: string,
  ) {
    if (!file || !file.buffer || file.size === 0) {
      throw new BadRequestException('File is required');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        'File size must not exceed 100 MB',
      );
    }

    if (file.originalname.length > 255) {
      throw new BadRequestException(
        'File name must not exceed 255 characters',
      );
    }

    let mediaType: 'IMAGE' | 'VIDEO';

    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      mediaType = 'IMAGE';
    } else if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      mediaType = 'VIDEO';
    } else {
      throw new BadRequestException(
        'Only JPEG, PNG, WebP, MP4 and WebM files are supported',
      );
    }

    const input: UploadMediaInput = {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder,
    };

    // Upload file to Cloudinary
    const uploadedFile = await this.mediaStorage.upload(input);

    try {
      // Save file metadata to PostgreSQL
      const mediaAsset = await this.prisma.mediaAsset.create({
        data: {
          originalName: file.originalname,
          storageKey: uploadedFile.storageKey,
          publicUrl: uploadedFile.publicUrl,
          mimeType: file.mimetype,
          mediaType,
          sizeBytes: BigInt(uploadedFile.sizeBytes),
          width: uploadedFile.width ?? null,
          height: uploadedFile.height ?? null,
          durationSeconds: uploadedFile.durationSeconds ?? null,
          uploadedById: uploadedById ?? null,
        },
      });

      return this.serializeMediaAsset(mediaAsset);
    } catch (error) {
      this.logger.error(
        'Failed to save media metadata. Attempting Cloudinary cleanup.',
      );

      try {
        await this.mediaStorage.delete(
          uploadedFile.storageKey,
          uploadedFile.resourceType,
        );
      } catch (cleanupError) {
        this.logger.error(
          `Cloudinary cleanup failed: ${
            cleanupError instanceof Error
              ? cleanupError.message
              : 'Unknown error'
          }`,
        );
      }

      throw new InternalServerErrorException(
        'Failed to save media information',
      );
    }
  }

  // ==========================================
  // GET ALL MEDIA WITH PAGINATION & FILTERS
  // ==========================================

  async findAll(query: QueryMediaDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(query.mediaType && {
        mediaType: query.mediaType,
      }),

      ...(query.uploadedById && {
        uploadedById: query.uploadedById,
      }),

      ...(query.search && {
        OR: [
          {
            originalName: {
              contains: query.search,
              mode: 'insensitive' as const,
            },
          },
          {
            mimeType: {
              contains: query.search,
              mode: 'insensitive' as const,
            },
          },
          {
            altText: {
              contains: query.search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }),
    };

    const sortOrder = query.sortOrder ?? 'desc';

    const orderBy =
      query.sortBy === 'originalName'
        ? { originalName: sortOrder }
        : query.sortBy === 'sizeBytes'
          ? { sizeBytes: sortOrder }
          : { createdAt: sortOrder };

    const [mediaAssets, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          uploadedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),

      this.prisma.mediaAsset.count({ where }),
    ]);

    return {
      data: mediaAssets.map((asset) =>
        this.serializeMediaAsset(asset),
      ),

      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =================== GET MEDIA DETAIL ====================

  async findOne(id: string) {
    const mediaAsset = await this.prisma.mediaAsset.findUnique({
      where: { id },

      include: {
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!mediaAsset) {
      throw new NotFoundException('Media asset not found');
    }

    return this.serializeMediaAsset(mediaAsset);
  }

  // ==================== DELETE MEDIA =======================

  async remove(id: string) {
    const mediaAsset = await this.prisma.mediaAsset.findUnique({
      where: { id },

      select: {
        id: true,
        storageKey: true,
        mediaType: true,

        vehicleMedia: {
          select: { id: true },
        },

        newsCovers: {
          select: { id: true },
        },

        galleryItems: {
          select: { id: true },
        },

        galleryAlbumCovers: {
          select: { id: true },
        },
      },
    });

    if (!mediaAsset) {
      throw new NotFoundException('Media asset not found');
    }

    // Prevent deletion if this media is being used.
    const usageCount =
      mediaAsset.vehicleMedia.length +
      mediaAsset.newsCovers.length +
      mediaAsset.galleryItems.length +
      mediaAsset.galleryAlbumCovers.length;

    if (usageCount > 0) {
      throw new BadRequestException(
        'Cannot delete this media because it is being used by other content',
      );
    }

    const resourceType: StorageResourceType =
      mediaAsset.mediaType === 'VIDEO' ? 'video' : 'image';

    try {
      // Delete from Cloudinary first.
      const deleted = await this.mediaStorage.delete(
        mediaAsset.storageKey,
        resourceType,
      );

      if (!deleted) {
        this.logger.warn(
          `Cloudinary asset ${mediaAsset.storageKey} was not found. Removing database metadata.`,
        );
      }

      // Delete metadata from PostgreSQL.
      await this.prisma.mediaAsset.delete({
        where: { id },
      });

      return {
        id,
        deleted: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete media asset ${id}: ${
          error instanceof Error
            ? error.message
            : 'Unknown error'
        }`,
      );

      throw new InternalServerErrorException(
        'Failed to delete media asset',
      );
    }
  }

  // ======================= SERIALIZE PRISMA BIGINT / DECIMAL ==========================

  private serializeMediaAsset<
    T extends {
      sizeBytes: bigint;
      durationSeconds: { toString(): string } | null;
    },
  >(asset: T) {
    return {
      ...asset,
      sizeBytes: asset.sizeBytes.toString(),
      durationSeconds: asset.durationSeconds?.toString() ?? null,
    };
  }
}
