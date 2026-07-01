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

import { Request } from 'express';

import {
  FileInterceptor,
} from '@nestjs/platform-express';

import {
  diskStorage,
} from 'multer';

import * as fs from 'fs-extra';
import * as path from 'path';

import {
  randomUUID,
} from 'crypto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { MediasService } from './medias.service';

interface AuthenticatedRequest
  extends Request {
  user: {
    id: string;
    companyId: string;
  };
}

const uploadsDirectory =
  path.resolve(
    process.cwd(),
    'uploads',
  );

/*
 * Garante que a pasta exista antes
 * que o Multer tente salvar o arquivo.
 */
fs.ensureDirSync(
  uploadsDirectory,
);

@Controller('medias')
@UseGuards(JwtAuthGuard)
export class MediasController {
  constructor(
    private readonly mediasService: MediasService,
  ) {}

  /**
   * Faz upload de imagem ou vídeo.
   *
   * POST /medias/upload
   *
   * Form Data:
   * file: arquivo
   * folderId: UUID opcional
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination:
          uploadsDirectory,

        filename: (
          _request,
          file,
          callback,
        ) => {
          const extension =
            path
              .extname(
                file.originalname,
              )
              .toLowerCase();

          const originalName =
            path
              .basename(
                file.originalname,
                extension,
              )
              .normalize('NFD')
              .replace(
                /[\u0300-\u036f]/g,
                '',
              )
              .replace(
                /[^a-zA-Z0-9_-]/g,
                '-',
              )
              .replace(
                /-+/g,
                '-',
              )
              .replace(
                /^[-_]+|[-_]+$/g,
                '',
              )
              .slice(0, 80);

          const safeName =
            originalName ||
            'media';

          const fileName =
            [
              Date.now(),
              randomUUID(),
              safeName,
            ].join('-') +
            extension;

          callback(
            null,
            fileName,
          );
        },
      }),

      fileFilter: (
        _request,
        file,
        callback,
      ) => {
        const isImage =
          file.mimetype.startsWith(
            'image/',
          );

        const isVideo =
          file.mimetype.startsWith(
            'video/',
          );

        if (
          !isImage &&
          !isVideo
        ) {
          callback(
            new BadRequestException(
              'Formato inválido. Envie apenas imagens ou vídeos.',
            ),
            false,
          );

          return;
        }

        callback(
          null,
          true,
        );
      },

      limits: {
        /*
         * Limite padrão de 500 MB.
         *
         * Pode ser alterado pela variável:
         * MAX_UPLOAD_SIZE_BYTES
         */
        fileSize:
          Number(
            process.env
              .MAX_UPLOAD_SIZE_BYTES,
          ) ||
          500 *
            1024 *
            1024,
      },
    }),
  )
  upload(
    @UploadedFile()
    file:
      | Express.Multer.File
      | undefined,

    @Body('folderId')
    folderId:
      | string
      | undefined,

    @Req()
    req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Nenhum arquivo foi enviado.',
      );
    }

    const normalizedFolderId =
      folderId?.trim() ||
      undefined;

    return this.mediasService.upload(
      file,
      req.user.companyId,
      normalizedFolderId,
    );
  }

  /**
   * Lista as mídias da empresa.
   *
   * GET /medias
   */
  @Get()
  list(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.mediasService.list(
      req.user.companyId,
    );
  }

  /**
   * Exclui a mídia e o arquivo físico.
   *
   * DELETE /medias/:id
   */
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