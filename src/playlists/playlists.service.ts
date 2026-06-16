import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlaylistsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    name: string,
    companyId: string,
  ) {
    return this.prisma.playlist.create({
      data: {
        name,
        companyId,
      },
    });
  }

  async list(
    companyId: string,
  ) {
    return this.prisma.playlist.findMany({
      where: {
        companyId,
      },

      include: {
        items: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(
    id: string,
    companyId: string,
  ) {
    const playlist =
      await this.prisma.playlist.findFirst({
        where: {
          id,
          companyId,
        },

        include: {
          items: {
            include: {
              media: true,
            },

            orderBy: {
              order: 'asc',
            },
          },
        },
      });

    if (!playlist) {
      throw new NotFoundException(
        'Playlist não encontrada',
      );
    }

    return playlist;
  }

  async addItem(
    playlistId: string,
    mediaId: string,
    duration?: number,
  ) {
    const count =
      await this.prisma.playlistItem.count({
        where: {
          playlistId,
        },
      });

    return this.prisma.playlistItem.create({
      data: {
        playlistId,
        mediaId,

        order: count + 1,
        duration,
      },
    });
  }

  async remove(id: string) {
  const playlist =
    await this.prisma.playlist.findUnique({
      where: {
        id,
      },
    });

  if (!playlist) {
    throw new NotFoundException(
      'Playlist não encontrada',
    );
  }

  return this.prisma.playlist.delete({
    where: {
      id,
    },
  });
}

 async removeItem(id: string) {
  const item =
    await this.prisma.playlistItem.findUnique({
      where: {
        id,
      },
    });

  if (!item) {
    throw new NotFoundException(
      'Item não encontrado',
    );
  }

  return this.prisma.playlistItem.delete({
    where: {
      id,
    },
  });
}
}