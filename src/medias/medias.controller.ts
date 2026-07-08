import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';

import * as fs from 'fs-extra';
import * as path from 'path';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediasService } from './medias.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    companyId: string;
  };
}

const uploadsDirectory = path.resolve(
  '/var/www/files/indoor-player-api',
);

const maxUploadSizeBytes =
  500 * 1024 * 1024;

fs.ensureDirSync(uploadsDirectory);

function sanitizeFileName(originalName: string) {
  const extension = path
    .extname(originalName)
    .toLowerCase();

  const name = path
    .basename(originalName, extension)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 80);

  return {
    extension,
    name: name || 'media',
  };
}

@Controller('medias')
@UseGuards(JwtAuthGuard)
export class MediasController {
  constructor(
    private readonly mediasService: MediasService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadsDirectory,

        filename: (
          _request,
          file,
          callback,
        ) => {
          const { extension, name } =
            sanitizeFileName(
              file.originalname,
            );

          const fileName =
            `${Date.now()}-${randomUUID()}-${name}${extension}`;

          callback(null, fileName);
        },
      }),

      fileFilter: (
        _request,
        file,
        callback,
      ) => {
        const isImage =
          file.mimetype.startsWith('image/');

        const isVideo =
          file.mimetype.startsWith('video/');

        if (!isImage && !isVideo) {
          callback(
            new BadRequestException(
              'Formato inválido. Envie apenas imagens ou vídeos.',
            ),
            false,
          );

          return;
        }

        callback(null, true);
      },

      limits: {
        fileSize: maxUploadSizeBytes,
      },
    }),
  )
  upload(
    @UploadedFile()
    file: Express.Multer.File | undefined,

    @Body('folderId')
    folderId: string | undefined,

    @Req()
    req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Nenhum arquivo foi enviado.',
      );
    }

    return this.mediasService.upload(
      file,
      req.user.companyId,
      folderId?.trim() || undefined,
    );
  }

  @Get()
  list(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.mediasService.list(
      req.user.companyId,
    );
  }

  @Delete(':id')
  remove(
    @Param('id')
    id: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.mediasService.remove(
      id,
      req.user.companyId,
    );
  }
}
