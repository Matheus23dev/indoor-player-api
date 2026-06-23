import {
  Injectable,
  NotFoundException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { MediaType } from '@prisma/client'; 

@Injectable()
export class MediasService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(file: Express.Multer.File, companyId: string) {
    try {
      const mediaType = file.mimetype.startsWith('video')
        ? MediaType.VIDEO
        : MediaType.IMAGE;

      return await this.prisma.media.create({
        data: {
          name: file.originalname,
          type: mediaType, 
          fileUrl: '/uploads/' + file.filename,
          fileSize: file.size,
          companyId,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro interno ao fazer upload da mídia.');
    }
  }

  async list(companyId: string) {
    try {
      return await this.prisma.media.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro interno ao listar as mídias.');
    }
  }

  async remove(id: string, companyId: string) {
    try {
      const media = await this.prisma.media.findFirst({
        where: { id, companyId },
      });

      if (!media) {
        throw new NotFoundException('Mídia não encontrada.');
      }
      const affectedPlaylistItems = await this.prisma.playlistItem.findMany({
        where: { mediaId: id },
      });

      await this.prisma.$transaction(async (tx) => {
        for (const item of affectedPlaylistItems) {
          await tx.playlistItem.delete({
            where: { id: item.id },
          });

          await tx.playlistItem.updateMany({
            where: {
              playlistId: item.playlistId,
              order: { gt: item.order },
            },
            data: {
              order: { decrement: 1 },
            },
          });
        }

        await tx.media.delete({
          where: { id },
        });
      });

      const filePath = path.join(process.cwd(), media.fileUrl);
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
      }

      return { message: 'Mídia e arquivo excluídos com sucesso.' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Erro interno ao excluir a mídia.');
    }
  }
}