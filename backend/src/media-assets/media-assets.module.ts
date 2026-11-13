
import { Module } from '@nestjs/common';

import { MediaAssetsController } from './media-assets.controller.js';
import { MediaAssetsService } from './media-assets.service.js';
import { CloudinaryStorageService } from './storage/cloudinary-storage.service.js';
import { MEDIA_STORAGE } from './storage/interfaces/media-storage.interface.js';

@Module({
  controllers: [MediaAssetsController],

  providers: [
    MediaAssetsService,
    CloudinaryStorageService,
    {
      provide: MEDIA_STORAGE,
      useExisting: CloudinaryStorageService,
    },
  ],

  exports: [MediaAssetsService],
})
export class MediaAssetsModule {}
