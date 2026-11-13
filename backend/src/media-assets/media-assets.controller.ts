
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import type { Request } from 'express';

import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

import type { AuthUser } from '../common/interfaces/auth-user.interface.js';

import { MediaAssetsService } from './media-assets.service.js';

import { UploadMediaDto } from './dto/upload-media.dto.js';

import { QueryMediaDto } from './dto/query-media.dto.js';

import { Role } from '../generated/prisma/enums.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

@Controller('media-assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class MediaAssetsController {
  constructor(
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  // UPLOAD MEDIA

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 100 * 1024 * 1024,
      },
    }),
  )
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 100 * 1024 * 1024,
          }),
          new FileTypeValidator({
            fileType: /^(image\/(jpeg|png|webp)|video\/(mp4|webm))$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,

    @Body() dto: UploadMediaDto,

    @Req() request: AuthenticatedRequest,
  ) {
    return this.mediaAssetsService.upload(
      file,
      dto.folder,
      request.user.id,
    );
  }

  // GET ALL MEDIA

  @Get()
  async findAll(
    @Query() query: QueryMediaDto,
  ) {
    return this.mediaAssetsService.findAll(query);
  }

  // GET MEDIA DETAIL

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mediaAssetsService.findOne(id);
  }

  // DELETE MEDIA

  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mediaAssetsService.remove(id);
  }
}
