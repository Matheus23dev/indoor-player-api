import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import {
  MediaType,
  Prisma,
} from '@prisma/client';

import {
  execFile,
} from 'child_process';

import {
  promisify,
} from 'util';

import * as fs from 'fs-extra';
import * as path from 'path';

import { PrismaService } from '../prisma/prisma.service';

const execFileAsync =
  promisify(execFile);

/*
 * O pacote ffprobe-static fornece o executável
 * correto para Windows e Linux.
 */
const ffprobePath: string =
  require('ffprobe-static').path;

@Injectable()
export class MediasService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async upload(
    file: Express.Multer.File,
    companyId: string,
    folderId?: string,
  ) {
    const filePath =
      this.getUploadedFilePath(file);

    try {
      if (!file) {
        throw new BadRequestException(
          'Nenhum arquivo foi enviado.',
        );
      }

      const mediaType =
        this.getMediaType(
          file.mimetype,
        );

      if (folderId) {
        const folder =
          await this.prisma.folder.findFirst({
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

      let duration: number | null =
        null;

      if (
        mediaType ===
        MediaType.VIDEO
      ) {
        duration =
          await this.getVideoDuration(
            filePath,
          );
      }

      return await this.prisma.media.create({
        data: {
          name:
            file.originalname,

          type:
            mediaType,

          fileUrl:
            `/uploads/${file.filename}`,

          fileSize:
            file.size,

          duration,

          companyId,

          folderId:
            folderId || null,
        },

        include: {
          folder: true,
        },
      });
    } catch (error) {
      /*
       * Se o cadastro falhar, remove o arquivo
       * que o Multer já salvou no servidor.
       */
      await this.removePhysicalFileSafely(
        filePath,
      );

      if (
        error instanceof
        HttpException
      ) {
        throw error;
      }

      console.error(
        '[MEDIAS] Erro no upload:',
        error,
      );

      throw new InternalServerErrorException(
        'Erro interno ao fazer upload da mídia.',
      );
    }
  }

  async list(
    companyId: string,
  ) {
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
      console.error(
        '[MEDIAS] Erro ao listar:',
        error,
      );

      throw new InternalServerErrorException(
        'Erro interno ao listar as mídias.',
      );
    }
  }

  async remove(
    id: string,
    companyId: string,
  ) {
    try {
      const media =
        await this.prisma.media.findFirst({
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
        throw new NotFoundException(
          'Mídia não encontrada.',
        );
      }

      const affectedPlaylistIds = [
        ...new Set(
          media.playlistItems.map(
            item =>
              item.playlistId,
          ),
        ),
      ];

      await this.prisma.$transaction(
        async tx => {
          /*
           * Remove todos os itens que utilizam
           * essa mídia.
           */
          await tx.playlistItem.deleteMany({
            where: {
              mediaId: media.id,
            },
          });

          /*
           * Reorganiza cada playlist afetada.
           */
          for (
            const playlistId of
            affectedPlaylistIds
          ) {
            await this.reorderPlaylistItems(
              tx,
              playlistId,
            );

            /*
             * Atualiza updatedAt para que o player
             * detecte a mudança na playlist.
             */
            await tx.playlist.update({
              where: {
                id: playlistId,
              },

              data: {
                updatedAt:
                  new Date(),
              },
            });
          }

          await tx.media.delete({
            where: {
              id: media.id,
            },
          });
        },
      );

      const filePath =
        this.getPathFromFileUrl(
          media.fileUrl,
        );

      const fileRemoved =
        await this.removePhysicalFileSafely(
          filePath,
        );

      return {
        success: true,

        message: fileRemoved
          ? 'Mídia e arquivo excluídos com sucesso.'
          : 'Mídia excluída do banco, mas o arquivo físico não foi encontrado ou não pôde ser removido.',

        affectedPlaylists:
          affectedPlaylistIds.length,

        fileRemoved,
      };
    } catch (error) {
      if (
        error instanceof
        HttpException
      ) {
        throw error;
      }

      console.error(
        '[MEDIAS] Erro ao excluir:',
        error,
      );

      throw new InternalServerErrorException(
        'Erro interno ao excluir a mídia.',
      );
    }
  }

  /**
   * Identifica se o arquivo é imagem ou vídeo.
   */
  private getMediaType(
    mimeType: string,
  ) {
    if (
      mimeType.startsWith(
        'video/',
      )
    ) {
      return MediaType.VIDEO;
    }

    if (
      mimeType.startsWith(
        'image/',
      )
    ) {
      return MediaType.IMAGE;
    }

    throw new BadRequestException(
      'Formato de arquivo não suportado. Envie uma imagem ou um vídeo.',
    );
  }

  /**
   * Extrai a duração real do vídeo
   * e retorna em segundos inteiros.
   */
  private async getVideoDuration(
    filePath: string,
  ) {
    try {
      const {
        stdout,
      } =
        await execFileAsync(
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
            timeout:
              60_000,

            maxBuffer:
              1024 * 1024,
          },
        );

      const rawDuration =
        Number.parseFloat(
          stdout.trim(),
        );

      if (
        !Number.isFinite(
          rawDuration,
        ) ||
        rawDuration <= 0
      ) {
        throw new Error(
          'Duração inválida retornada pelo ffprobe.',
        );
      }

      return Math.ceil(
        rawDuration,
      );
    } catch (error) {
      console.error(
        '[MEDIAS] Erro ao identificar duração:',
        error,
      );

      throw new BadRequestException(
        'Não foi possível identificar a duração do vídeo.',
      );
    }
  }

  /**
   * Reorganiza as posições sem entrar em conflito
   * com @@unique([playlistId, order]).
   */
  private async reorderPlaylistItems(
    tx: Prisma.TransactionClient,
    playlistId: string,
  ) {
    const remainingItems =
      await tx.playlistItem.findMany({
        where: {
          playlistId,
        },

        orderBy: {
          order: 'asc',
        },

        select: {
          id: true,
        },
      });

    /*
     * Primeiro usa posições negativas temporárias.
     */
    for (
      let index = 0;
      index < remainingItems.length;
      index += 1
    ) {
      await tx.playlistItem.update({
        where: {
          id: remainingItems[index].id,
        },

        data: {
          order:
            -(index + 1),
        },
      });
    }

    /*
     * Depois aplica as posições definitivas.
     */
    for (
      let index = 0;
      index < remainingItems.length;
      index += 1
    ) {
      await tx.playlistItem.update({
        where: {
          id: remainingItems[index].id,
        },

        data: {
          order:
            index + 1,
        },
      });
    }
  }

  private getUploadedFilePath(
    file?: Express.Multer.File,
  ) {
    if (!file) {
      return '';
    }

    if (file.path) {
      return path.resolve(
        file.path,
      );
    }

    return path.resolve(
      process.cwd(),
      'uploads',
      file.filename,
    );
  }

  private getPathFromFileUrl(
    fileUrl: string,
  ) {
    const normalizedFileUrl =
      fileUrl.replace(
        /^[/\\]+/,
        '',
      );

    return path.resolve(
      process.cwd(),
      normalizedFileUrl,
    );
  }

  /**
   * Retorna true quando o arquivo foi removido.
   * Retorna false quando ele não existia ou houve
   * erro isolado durante a limpeza.
   */
  private async removePhysicalFileSafely(
    filePath: string,
  ) {
    if (!filePath) {
      return false;
    }

    try {
      const exists =
        await fs.pathExists(
          filePath,
        );

      if (!exists) {
        return false;
      }

      await fs.remove(
        filePath,
      );

      return true;
    } catch (error) {
      console.error(
        '[MEDIAS] Erro ao remover arquivo físico:',
        {
          filePath,
          error,
        },
      );

      return false;
    }
  }
}