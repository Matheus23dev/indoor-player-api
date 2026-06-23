import {
  Injectable,
  NotFoundException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { AddPlaylistItemDto } from './dto/add-playlist-item.dto';

@Injectable()
export class PlaylistsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, data: CreatePlaylistDto) {
    try {
      return await this.prisma.playlist.create({
        data: {
          name: data.name,
          companyId,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro interno ao criar playlist.');
    }
  }

  async list(companyId: string) {
    try {
      return await this.prisma.playlist.findMany({
        where: { companyId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro interno ao listar playlists.');
    }
  }

  async findOne(id: string, companyId: string) {
    try {
      const playlist = await this.prisma.playlist.findFirst({
        where: { id, companyId },
        include: {
          items: {
            include: { media: true },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!playlist) {
        throw new NotFoundException('Playlist não encontrada.');
      }

      return playlist;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Erro interno ao buscar playlist.');
    }
  }

async addItem(playlistId: string, companyId: string, dto: AddPlaylistItemDto) {
    try {
      const [playlist, media] = await Promise.all([
        this.prisma.playlist.findFirst({ where: { id: playlistId, companyId } }),
        this.prisma.media.findFirst({ where: { id: dto.mediaId, companyId } }),
      ]);

      if (!playlist) throw new NotFoundException('Playlist não encontrada.');
      if (!media) throw new NotFoundException('Mídia não encontrada.');

      const lastItem = await this.prisma.playlistItem.findFirst({
        where: { playlistId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });

      const nextOrder = lastItem ? lastItem.order + 1 : 1;

      return await this.prisma.playlistItem.create({
        data: {
          playlistId,
          mediaId: dto.mediaId,
          order: nextOrder,
          duration: dto.duration,
        },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Erro interno ao adicionar item à playlist.');
    }
  }

  async remove(id: string, companyId: string) {
    try {
      const playlist = await this.prisma.playlist.findFirst({
        where: { id, companyId },
      });

      if (!playlist) {
        throw new NotFoundException('Playlist não encontrada.');
      }

      return await this.prisma.$transaction([
        this.prisma.playlistItem.deleteMany({ where: { playlistId: id } }),
        this.prisma.playlist.delete({ where: { id } }),
      ]);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Erro interno ao remover playlist.');
    }
  }

  async removeItem(itemId: string, companyId: string) {
    try {
      const itemToDelete = await this.prisma.playlistItem.findFirst({
        where: {
          id: itemId,
          playlist: { companyId }, 
        },
      });

      if (!itemToDelete) {
        throw new NotFoundException('Item não encontrado na sua playlist.');
      }

      return await this.prisma.$transaction(async (tx) => {
        await tx.playlistItem.delete({
          where: { id: itemId },
        });

        await tx.playlistItem.updateMany({
          where: {
            playlistId: itemToDelete.playlistId,
            order: { gt: itemToDelete.order },
          },
          data: {
            order: { decrement: 1 },
          },
        });

        return { message: 'Item removido e playlist reordenada com sucesso.' };
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Erro interno ao remover item da playlist.');
    }
  }
}