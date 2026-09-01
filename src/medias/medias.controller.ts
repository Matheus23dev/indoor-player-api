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
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';

import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';

import * as fs from 'fs-extra';
import * as path from 'path';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { getMediaStoragePath } from '../config/environment';
import { MediasService } from './medias.service';
import { normalizeMediaFileName } from './media-file-name';
import {
  ApiServerError,
  ApiUserAuthentication,
  ApiUuidParameter,
} from '../swagger/swagger.decorators';
import {
  ApiErrorResponseDto,
  MediaDeleteResponseDto,
  MediaResponseDto,
} from '../swagger/swagger.models';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    companyId: string;
  };
}

const maxUploadSizeBytes = 500 * 1024 * 1024;

function sanitizeFileName(originalName: string) {
  const extension = path.extname(originalName).toLowerCase();

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
@ApiTags('Mídias')
@ApiUserAuthentication()
@ApiServerError()
export class MediasController {
  constructor(private readonly mediasService: MediasService) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Enviar uma imagem ou um vídeo',
    description:
      'Aceita arquivos de até 500 MB. Vídeos são analisados para identificar duração e presença de áudio.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        folderId: {
          type: 'string',
          format: 'uuid',
          description:
            'Pasta de destino. Quando omitida, a mídia fica na raiz.',
        },
      },
    },
  })
  @ApiCreatedResponse({ type: MediaResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'A pasta informada não pertence à empresa.',
    type: ApiErrorResponseDto,
  })
  @ApiPayloadTooLargeResponse({
    description: 'O arquivo ultrapassa o limite de 500 MB.',
    type: ApiErrorResponseDto,
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          try {
            const directory = getMediaStoragePath();
            fs.ensureDirSync(directory);
            callback(null, directory);
          } catch (error) {
            callback(error as Error, '');
          }
        },

        filename: (_request, file, callback) => {
          file.originalname = normalizeMediaFileName(file.originalname);
          const { extension, name } = sanitizeFileName(file.originalname);

          const fileName = `${Date.now()}-${randomUUID()}-${name}${extension}`;

          callback(null, fileName);
        },
      }),

      fileFilter: (_request, file, callback) => {
        const isImage = file.mimetype.startsWith('image/');

        const isVideo = file.mimetype.startsWith('video/');

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
      throw new BadRequestException('Nenhum arquivo foi enviado.');
    }

    return this.mediasService.upload(
      file,
      req.user.companyId,
      folderId?.trim() || undefined,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar as mídias da empresa' })
  @ApiOkResponse({ type: MediaResponseDto, isArray: true })
  list(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.mediasService.list(req.user.companyId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Excluir uma mídia',
    description:
      'Remove os vínculos com playlists, compacta a ordem dos itens e tenta excluir o arquivo físico.',
  })
  @ApiUuidParameter('id', 'Identificador da mídia.')
  @ApiOkResponse({ type: MediaDeleteResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  remove(
    @Param('id')
    id: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.mediasService.remove(id, req.user.companyId);
  }
}
