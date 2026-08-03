import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { MediaType } from '@prisma/client';

import { execFile } from 'child_process';
import { path as ffprobePath } from 'ffprobe-static';
import { promisify } from 'util';

import * as fs from 'fs-extra';
import * as path from 'path';

import { PrismaService } from '../prisma/prisma.service';
import { getMediaStoragePath } from '../config/environment';
import { compactPlaylistItemOrder } from '../playlists/playlist-item-order';

const execFileAsync = promisify(execFile);

@Injectable()
export class MediasService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(
    file: Express.Multer.File,
    companyId: string,
    folderId?: string,
  ) {
    const filePath = this.getUploadedFilePath(file);

    try {
      if (!file) {
        throw new BadRequestException('Nenhum arquivo foi enviado.');
      }

      const mediaType = this.getMediaType(file.mimetype);

      if (folderId) {
        await this.validateFolder(folderId, companyId);
      }

      const duration =
        mediaType === MediaType.VIDEO
          ? await this.getVideoDuration(filePath)
          : null;

      return await this.prisma.media.create({
        data: {
          name: file.originalname,
          type: mediaType,
          fileUrl: file.filename,
          fileSize: file.size,
          duration,
          companyId,
          folderId: folderId || null,
        },

        include: {
          folder: true,
        },
      });
    } catch (error: unknown) {
      await this.removePhysicalFileSafely(filePath);

      if (error instanceof HttpException) {
        throw error;
      }

      console.error('[MEDIAS] Erro no upload:', error);

      throw new InternalServerErrorException(
        'Erro interno ao fazer upload da mídia.',
      );
    }
  }

  async list(companyId: string) {
    try {
      return await this.prisma.media.findMany({
        where: {
          companyId,
        },

        include: {
          folder: true,

          _count: {
            select: {
              playlistItems: true,
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      console.error('[MEDIAS] Erro ao listar:', error);

      throw new InternalServerErrorException(
        'Erro interno ao listar as mídias.',
      );
    }
  }

  async remove(id: string, companyId: string) {
    try {
      const media = await this.prisma.media.findFirst({
        where: {
          id,
          companyId,
        },

        include: {
          playlistItems: {
            select: {
              id: true,
              playlistId: true,
              order: true,
            },
          },
        },
      });

      if (!media) {
        throw new NotFoundException('Mídia não encontrada.');
      }

      const affectedPlaylistIds = [
        ...new Set(media.playlistItems.map((item) => item.playlistId)),
      ];

      await this.prisma.$transaction(async (tx) => {
        await tx.playlistItem.deleteMany({
          where: {
            mediaId: media.id,
          },
        });

        for (const playlistId of affectedPlaylistIds) {
          await compactPlaylistItemOrder(tx, playlistId);

          await tx.playlist.update({
            where: {
              id: playlistId,
            },

            data: {
              updatedAt: new Date(),
            },
          });
        }

        await tx.media.delete({
          where: {
            id: media.id,
          },
        });
      });

      const fileRemoved = await this.removePhysicalFileSafely(
        this.getPathFromFileUrl(media.fileUrl),
      );

      return {
        success: true,

        message: fileRemoved
          ? 'Mídia e arquivo excluídos com sucesso.'
          : 'Mídia excluída do banco, mas o arquivo físico não foi encontrado ou não pôde ser removido.',

        affectedPlaylists: affectedPlaylistIds.length,

        fileRemoved,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('[MEDIAS] Erro ao excluir:', error);

      throw new InternalServerErrorException(
        'Erro interno ao excluir a mídia.',
      );
    }
  }

  private async validateFolder(folderId: string, companyId: string) {
    const folder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        companyId,
      },

      select: {
        id: true,
      },
    });

    if (!folder) {
      throw new NotFoundException(
        'Pasta não encontrada ou não pertence à sua empresa.',
      );
    }
  }

  private getMediaType(mimeType: string) {
    if (mimeType.startsWith('video/')) {
      return MediaType.VIDEO;
    }

    if (mimeType.startsWith('image/')) {
      return MediaType.IMAGE;
    }

    throw new BadRequestException(
      'Formato de arquivo não suportado. Envie uma imagem ou um vídeo.',
    );
  }

  private async getVideoDuration(filePath: string) {
    try {
      const { stdout } = await execFileAsync(
        ffprobePath,
        [
          '-v',
          'error',

          '-show_entries',
          'format=duration',

          '-of',
          'default=noprint_wrappers=1:nokey=1',

          filePath,
        ],
        {
          timeout: 60_000,

          maxBuffer: 1024 * 1024,
        },
      );

      const duration = Number.parseFloat(stdout.trim());

      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('Duração inválida retornada pelo ffprobe.');
      }

      return Math.ceil(duration);
    } catch (error) {
      console.error('[MEDIAS] Erro ao identificar duração:', error);

      throw new BadRequestException(
        'Não foi possível identificar a duração do vídeo.',
      );
    }
  }

  private getUploadedFilePath(file?: Express.Multer.File) {
    if (!file) {
      return '';
    }

    if (file.path) {
      return path.resolve(file.path);
    }

    return path.resolve(getMediaStoragePath(), file.filename);
  }

  private getPathFromFileUrl(fileUrl: string) {
    const fileName = path.basename(fileUrl);

    return path.resolve(getMediaStoragePath(), fileName);
  }

  private async removePhysicalFileSafely(filePath: string) {
    if (!filePath) {
      return false;
    }

    try {
      const exists = await fs.pathExists(filePath);

      if (!exists) {
        return false;
      }

      await fs.remove(filePath);

      return true;
    } catch (error: unknown) {
      console.error('[MEDIAS] Erro ao remover arquivo físico:', {
        filePath,
        error,
      });

      return false;
    }
  }
}
