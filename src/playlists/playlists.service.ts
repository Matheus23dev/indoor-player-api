import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { AddPlaylistItemDto } from './dto/add-playlist-item.dto';

@Injectable()
export class PlaylistsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    companyId: string,
    data: CreatePlaylistDto,
  ) {
    try {
      const name = data.name.trim();

      if (!name) {
        throw new BadRequestException(
          'O nome da playlist é obrigatório.',
        );
      }

      return await this.prisma.playlist.create({
        data: {
          name,
          companyId,
        },
      });
    } catch (error) {
      this.handleError(
        error,
        'Erro interno ao criar playlist.',
      );
    }
  }

  async list(companyId: string) {
    try {
      return await this.prisma.playlist.findMany({
        where: {
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

          _count: {
            select: {
              items: true,
              schedules: true,
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      this.handleError(
        error,
        'Erro interno ao listar playlists.',
      );
    }
  }

  async findOne(
    id: string,
    companyId: string,
  ) {
    try {
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

            schedules: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        });

      if (!playlist) {
        throw new NotFoundException(
          'Playlist não encontrada.',
        );
      }

      return playlist;
    } catch (error) {
      this.handleError(
        error,
        'Erro interno ao buscar playlist.',
      );
    }
  }

  async addItem(
    playlistId: string,
    companyId: string,
    dto: AddPlaylistItemDto,
  ) {
    try {
      const [playlist, media] =
        await Promise.all([
          this.prisma.playlist.findFirst({
            where: {
              id: playlistId,
              companyId,
            },

            select: {
              id: true,
            },
          }),

          this.prisma.media.findFirst({
            where: {
              id: dto.mediaId,
              companyId,
            },
          }),
        ]);

      if (!playlist) {
        throw new NotFoundException(
          'Playlist não encontrada.',
        );
      }

      if (!media) {
        throw new NotFoundException(
          'Mídia não encontrada.',
        );
      }

      if (
        dto.duration !== undefined &&
        (
          !Number.isInteger(dto.duration) ||
          dto.duration < 1
        )
      ) {
        throw new BadRequestException(
          'A duração deve ser um número inteiro maior que zero.',
        );
      }

      const duration =
        media.type === 'IMAGE'
          ? dto.duration ??
            media.duration ??
            5
          : dto.duration ??
            media.duration ??
            null;

      return await this.prisma.$transaction(
        async tx => {
          const lastItem =
            await tx.playlistItem.findFirst({
              where: {
                playlistId,
              },

              orderBy: {
                order: 'desc',
              },

              select: {
                order: true,
              },
            });

          const nextOrder =
            lastItem
              ? lastItem.order + 1
              : 1;

          const createdItem =
            await tx.playlistItem.create({
              data: {
                playlistId,
                mediaId: dto.mediaId,
                order: nextOrder,
                duration,
              },

              include: {
                media: true,
              },
            });

          await this.touchPlaylist(
            tx,
            playlistId,
          );

          return createdItem;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        },
      );
    } catch (error) {
      this.handleError(
        error,
        'Erro interno ao adicionar item à playlist.',
      );
    }
  }

  async remove(
    id: string,
    companyId: string,
  ) {
    try {
      const playlist =
        await this.prisma.playlist.findFirst({
          where: {
            id,
            companyId,
          },

          select: {
            id: true,

            _count: {
              select: {
                items: true,
                schedules: true,
              },
            },
          },
        });

      if (!playlist) {
        throw new NotFoundException(
          'Playlist não encontrada.',
        );
      }

      /*
       * Os agendamentos são apagados porque
       * não podem continuar apontando para uma
       * playlist que não existe.
       */
      await this.prisma.$transaction(
        async tx => {
          await tx.schedule.deleteMany({
            where: {
              playlistId: id,
              companyId,
            },
          });

          await tx.playlistItem.deleteMany({
            where: {
              playlistId: id,
            },
          });

          await tx.playlist.delete({
            where: {
              id,
            },
          });
        },
      );

      return {
        success: true,

        message:
          'Playlist removida com sucesso.',

        removedItems:
          playlist._count.items,

        removedSchedules:
          playlist._count.schedules,
      };
    } catch (error) {
      this.handleError(
        error,
        'Erro interno ao remover playlist.',
      );
    }
  }

  async removeItem(
    itemId: string,
    companyId: string,
  ) {
    try {
      const itemToDelete =
        await this.prisma.playlistItem.findFirst({
          where: {
            id: itemId,

            playlist: {
              companyId,
            },
          },

          select: {
            id: true,
            playlistId: true,
          },
        });

      if (!itemToDelete) {
        throw new NotFoundException(
          'Item não encontrado na sua playlist.',
        );
      }

      await this.prisma.$transaction(
        async tx => {
          await tx.playlistItem.delete({
            where: {
              id: itemToDelete.id,
            },
          });

          const remainingItems =
            await tx.playlistItem.findMany({
              where: {
                playlistId:
                  itemToDelete.playlistId,
              },

              orderBy: {
                order: 'asc',
              },

              select: {
                id: true,
              },
            });

          /*
           * Primeiro usamos números negativos.
           * Isso evita conflito com:
           *
           * @@unique([playlistId, order])
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
                order: -(index + 1),
              },
            });
          }

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
                order: index + 1,
              },
            });
          }

          await this.touchPlaylist(
            tx,
            itemToDelete.playlistId,
          );
        },
      );

      return {
        success: true,
        message:
          'Item removido e playlist reordenada com sucesso.',
      };
    } catch (error) {
      this.handleError(
        error,
        'Erro interno ao remover item da playlist.',
      );
    }
  }

  async updateItem(
    id: string,
    duration: number,
    companyId: string,
  ) {
    try {
      if (
        !Number.isInteger(duration) ||
        duration < 1
      ) {
        throw new BadRequestException(
          'A duração deve ser um número inteiro maior que zero.',
        );
      }

      const item =
        await this.prisma.playlistItem.findFirst({
          where: {
            id,

            playlist: {
              companyId,
            },
          },

          select: {
            id: true,
            playlistId: true,
          },
        });

      if (!item) {
        throw new NotFoundException(
          'Item não encontrado na sua playlist.',
        );
      }

      return await this.prisma.$transaction(
        async tx => {
          const updatedItem =
            await tx.playlistItem.update({
              where: {
                id: item.id,
              },

              data: {
                duration,
              },

              include: {
                media: true,
              },
            });

          await this.touchPlaylist(
            tx,
            item.playlistId,
          );

          return updatedItem;
        },
      );
    } catch (error) {
      this.handleError(
        error,
        'Erro interno ao atualizar item da playlist.',
      );
    }
  }

  async reorder(
    playlistId: string,
    items: {
      id: string;
      order: number;
    }[],
    companyId: string,
  ) {
    try {
      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        throw new BadRequestException(
          'Informe os itens que serão reordenados.',
        );
      }

      const playlist =
        await this.prisma.playlist.findFirst({
          where: {
            id: playlistId,
            companyId,
          },

          include: {
            items: {
              select: {
                id: true,
              },
            },
          },
        });

      if (!playlist) {
        throw new NotFoundException(
          'Playlist não encontrada.',
        );
      }

      if (
        items.length !==
        playlist.items.length
      ) {
        throw new BadRequestException(
          'Todos os itens da playlist devem ser enviados na reordenação.',
        );
      }

      const receivedIds =
        items.map(item => item.id);

      const uniqueIds =
        new Set(receivedIds);

      if (
        uniqueIds.size !==
        receivedIds.length
      ) {
        throw new BadRequestException(
          'Existem itens duplicados na reordenação.',
        );
      }

      const validIds =
        new Set(
          playlist.items.map(
            item => item.id,
          ),
        );

      const invalidItem =
        items.find(
          item =>
            !validIds.has(item.id),
        );

      if (invalidItem) {
        throw new BadRequestException(
          'Um ou mais itens não pertencem a esta playlist.',
        );
      }

      const receivedOrders =
        items.map(item => item.order);

      const uniqueOrders =
        new Set(receivedOrders);

      if (
        uniqueOrders.size !==
        receivedOrders.length
      ) {
        throw new BadRequestException(
          'Não é permitido enviar posições duplicadas.',
        );
      }

      const invalidOrder =
        items.find(
          item =>
            !Number.isInteger(
              item.order,
            ) ||
            item.order < 1,
        );

      if (invalidOrder) {
        throw new BadRequestException(
          'As posições devem ser números inteiros maiores que zero.',
        );
      }

      const orderedItems =
        [...items].sort(
          (first, second) =>
            first.order -
            second.order,
        );

      return await this.prisma.$transaction(
        async tx => {
          /*
           * Primeira etapa: posições temporárias.
           */
          for (
            let index = 0;
            index < orderedItems.length;
            index += 1
          ) {
            await tx.playlistItem.update({
              where: {
                id: orderedItems[index].id,
              },

              data: {
                order: -(index + 1),
              },
            });
          }

          /*
           * Segunda etapa: posições definitivas.
           */
          for (
            let index = 0;
            index < orderedItems.length;
            index += 1
          ) {
            await tx.playlistItem.update({
              where: {
                id: orderedItems[index].id,
              },

              data: {
                order: index + 1,
              },
            });
          }

          await this.touchPlaylist(
            tx,
            playlistId,
          );

          return tx.playlist.findUnique({
            where: {
              id: playlistId,
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
        },
      );
    } catch (error) {
      this.handleError(
        error,
        'Erro interno ao reordenar playlist.',
      );
    }
  }

  private async touchPlaylist(
    tx: Prisma.TransactionClient,
    playlistId: string,
  ) {
    await tx.playlist.update({
      where: {
        id: playlistId,
      },

      data: {
        updatedAt: new Date(),
      },
    });
  }

  private handleError(
    error: unknown,
    defaultMessage: string,
  ): never {
    if (error instanceof HttpException) {
      throw error;
    }

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Ocorreu um conflito na ordem dos itens. Tente novamente.',
        );
      }

      if (error.code === 'P2025') {
        throw new NotFoundException(
          'O registro solicitado não foi encontrado.',
        );
      }
    }

    console.error(
      '[PLAYLISTS]',
      error,
    );

    throw new InternalServerErrorException(
      defaultMessage,
    );
  }
}