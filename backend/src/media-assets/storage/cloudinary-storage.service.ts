// kết nối backend NestJS với Cloudinary để thực hiện các thao tác lưu trữ và quản lý file media.
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

import type {
  MediaStorageInterface,
  UploadMediaInput,
  UploadMediaResult,
  StorageResourceType,
} from './interfaces/media-storage.interface.js';

@Injectable()
export class CloudinaryStorageService implements MediaStorageInterface {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>(
        'CLOUDINARY_CLOUD_NAME',
      ),
      api_key: this.configService.getOrThrow<string>(
        'CLOUDINARY_API_KEY',
      ),
      api_secret: this.configService.getOrThrow<string>(
        'CLOUDINARY_API_SECRET',
      ),
      secure: true,
    });
  }

  async upload(input: UploadMediaInput): Promise<UploadMediaResult> {
    const { buffer, folder } = input;

    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Cannot upload an empty file');
    }

    const normalizedFolder = folder.replace(/^\/+|\/+$/g, '');

    if (
      !normalizedFolder ||
      normalizedFolder.includes('..') ||
      !/^[a-zA-Z0-9/_-]+$/.test(normalizedFolder)
    ) {
      throw new BadRequestException('Invalid Cloudinary folder');
    }

    const cloudinaryFolder = `vinfast/${normalizedFolder}`;

    try {
      const result = await new Promise<UploadApiResponse>(
        (resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: cloudinaryFolder,
              resource_type: 'auto',
              use_filename: false,
              unique_filename: true,
              overwrite: false,
            },
            (error, uploadResult) => {
              if (error) {
                reject(error);
                return;
              }

              if (!uploadResult) {
                reject(
                  new Error('Cloudinary returned an empty response'),
                );
                return;
              }

              resolve(uploadResult);
            },
          );

          uploadStream.end(buffer);
        },
      );

      return {
        storageKey: result.public_id,
        publicUrl: result.secure_url,
        format: result.format,
        resourceType: result.resource_type as StorageResourceType,
        sizeBytes: result.bytes,
        width: result.width,
        height: result.height,
        durationSeconds: result.duration,
      };
    } catch (error) {
      this.logger.error(
        `Cloudinary upload failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      throw new InternalServerErrorException(
        'Failed to upload media to Cloudinary',
      );
    }
  }

  async delete(
    storageKey: string,
    resourceType: StorageResourceType,
  ): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(storageKey, {
        resource_type: resourceType,
        invalidate: true,
      });

      if (result.result === 'ok') {
        return true;
      }

      if (result.result === 'not found') {
        return false;
      }

      throw new Error(
        `Unexpected Cloudinary delete result: ${result.result}`,
      );
    } catch (error) {
      this.logger.error(
        `Cloudinary delete failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      throw new InternalServerErrorException(
        'Failed to delete media from Cloudinary',
      );
    }
  }
}
