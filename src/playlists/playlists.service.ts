import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { DevicesGateway } from '../devices/devices.gateway';
import {
  serializeDeviceAuditEvent,
  type DeviceAuditActor,
  type DeviceAuditEvent,
} from '../devices/device-audit';
import { PrismaService } from '../prisma/prisma.service';
import { AddPlaylistItemDto } from './dto/add-playlist-item.dto';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistItemDto } from './dto/update-playlist-item.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import {
  applyPlaylistItemOrder,
  compactPlaylistItemOrder,
} from './playlist-item-order';

@Injectable()
export class PlaylistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devicesGateway: DevicesGateway,
  ) {}

  async create(companyId: string, data: CreatePlaylistDto) {
    try {
      const name = data.name.trim();

      if (!name) {
        throw new BadRequestException('O nome da playlist é obrigatório.');
      }

      return await this.prisma.playlist.create({
        data: {
          name,
          orientation: data.orientation,
          companyId,
        },
      });
    } catch (error) {
      this.handleError(error, 'Erro interno ao criar playlist.');
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

          overlayBars: {
            include: {
              overlayBar: {
                include: {
                  media: true,
                },
              },
            },
            orderBy: {
              order: 'asc',
            },
          },

          _count: {
            select: {
              items: true,
              overlayBars: true,
              schedules: true,
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      this.handleError(error, 'Erro interno ao listar playlists.');
    }
  }

  async findOne(id: string, companyId: string) {
    try {
      const playlist = await this.prisma.playlist.findFirst({
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

          overlayBars: {
            include: {
              overlayBar: {
                include: {
                  media: true,
                },
              },
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
        throw new NotFoundException('Playlist não encontrada.');
      }

      return playlist;
    } catch (error) {
      this.handleError(error, 'Erro interno ao buscar playlist.');
    }
  }

  async update(
    id: string,
    companyId: string,
    data: UpdatePlaylistDto,
    actor: DeviceAuditActor,
  ) {
    try {
      const playlist = await this.prisma.playlist.findFirst({
        where: {
          id,
          companyId,
        },
        select: {
          id: true,
          name: true,
          orientation: true,
        },
      });

      if (!playlist) {
        throw new NotFoundException('Playlist não encontrada.');
      }

      if (playlist.orientation === data.orientation) {
        return playlist;
      }

      const updatedPlaylist = await this.prisma.playlist.update({
        where: {
          id: playlist.id,
        },
        data: {
          orientation: data.orientation,
        },
      });

      await this.devicesGateway.notifyPlaylistChanged(
        playlist.id,
        'PLAYLIST_UPDATED',
      );

      await this.auditPlaylistDevices(playlist.id, {
        actor,
        action: 'PLAYLIST_ORIENTATION_UPDATED',
        message: `alterou a orientação da playlist "${playlist.name}" para ${data.orientation === 'PORTRAIT' ? 'vertical' : 'horizontal'}.`,
        entityType: 'PLAYLIST',
        entityId: playlist.id,
        metadata: {
          playlistName: playlist.name,
          previousOrientation: playlist.orientation,
          orientation: data.orientation,
        },
      });

      return updatedPlaylist;
    } catch (error) {
      this.handleError(error, 'Erro interno ao atualizar playlist.');
    }
  }

  async addItem(
    playlistId: string,
    companyId: string,
    dto: AddPlaylistItemDto,
    actor: DeviceAuditActor,
  ) {
    try {
      const [playlist, media] = await Promise.all([
        this.prisma.playlist.findFirst({
          where: {
            id: playlistId,
            companyId,
          },

          select: {
            id: true,
            name: true,
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
        throw new NotFoundException('Playlist não encontrada.');
      }

      if (!media) {
        throw new NotFoundException('Mídia não encontrada.');
      }

      if (
        dto.duration !== undefined &&
        (!Number.isInteger(dto.duration) || dto.duration < 1)
      ) {
        throw new BadRequestException(
          'A duração deve ser um número inteiro maior que zero.',
        );
      }

      if (media.type === 'VIDEO' && dto.duration !== undefined) {
        throw new BadRequestException(
          'A duração pode ser configurada somente para imagens.',
        );
      }

      const duration =
        media.type === 'IMAGE'
          ? (dto.duration ?? media.duration ?? 5)
          : (media.duration ?? null);

      const createdItem = await this.prisma.$transaction(
        async (tx) => {
          const lastItem = await tx.playlistItem.findFirst({
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

          const nextOrder = lastItem ? lastItem.order + 1 : 1;

          const item = await tx.playlistItem.create({
            data: {
              playlistId,
              mediaId: dto.mediaId,
              order: nextOrder,
              duration,
              muted: media.type === 'VIDEO' && media.hasAudio === false,
            },

            include: {
              media: true,
            },
          });

          await this.touchPlaylist(tx, playlistId);

          return item;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      await this.devicesGateway.notifyPlaylistChanged(
        playlistId,
        'PLAYLIST_ITEM_ADDED',
      );

      await this.auditPlaylistDevices(playlistId, {
        actor,
        action: 'PLAYLIST_MEDIA_ADDED',
        message: `adicionou a mídia "${media.name}" à playlist "${playlist.name}".`,
        entityType: 'PLAYLIST',
        entityId: playlistId,
        metadata: {
          playlistName: playlist.name,
          mediaName: media.name,
        },
      });

      return createdItem;
    } catch (error) {
      this.handleError(error, 'Erro interno ao adicionar item à playlist.');
    }
  }

  async remove(id: string, companyId: string, actor: DeviceAuditActor) {
    try {
      const playlist = await this.prisma.playlist.findFirst({
        where: {
          id,
          companyId,
        },

        select: {
          id: true,
          name: true,

          schedules: {
            select: {
              deviceId: true,
            },
          },

          _count: {
            select: {
              items: true,
              schedules: true,
            },
          },
        },
      });

      if (!playlist) {
        throw new NotFoundException('Playlist não encontrada.');
      }

      const affectedDeviceIds = Array.from(
        new Set<string>(
          (
            playlist.schedules as Array<{
              deviceId: string;
            }>
          ).map((schedule) => schedule.deviceId),
        ),
      );

      await this.prisma.$transaction(async (tx) => {
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
      });

      for (const deviceId of affectedDeviceIds) {
        this.devicesGateway.notifyProgrammingChanged(
          deviceId,
          'PLAYLIST_DELETED',
          id,
        );
      }

      await this.auditDevices(affectedDeviceIds, {
        actor,
        action: 'PLAYLIST_DELETED',
        message: `excluiu a playlist "${playlist.name}".`,
        entityType: 'PLAYLIST',
        entityId: id,
        metadata: {
          playlistName: playlist.name,
        },
      });

      return {
        success: true,
        message: 'Playlist removida com sucesso.',
        removedItems: playlist._count.items,
        removedSchedules: playlist._count.schedules,
      };
    } catch (error) {
      this.handleError(error, 'Erro interno ao remover playlist.');
    }
  }

  async removeItem(itemId: string, companyId: string, actor: DeviceAuditActor) {
    try {
      const itemToDelete = await this.prisma.playlistItem.findFirst({
        where: {
          id: itemId,

          playlist: {
            companyId,
          },
        },

        select: {
          id: true,
          playlistId: true,
          media: {
            select: {
              name: true,
            },
          },
          playlist: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!itemToDelete) {
        throw new NotFoundException('Item não encontrado na sua playlist.');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.playlistItem.delete({
          where: {
            id: itemToDelete.id,
          },
        });

        await compactPlaylistItemOrder(tx, itemToDelete.playlistId);

        await this.touchPlaylist(tx, itemToDelete.playlistId);
      });

      await this.devicesGateway.notifyPlaylistChanged(
        itemToDelete.playlistId,
        'PLAYLIST_ITEM_REMOVED',
      );

      await this.auditPlaylistDevices(itemToDelete.playlistId, {
        actor,
        action: 'PLAYLIST_MEDIA_REMOVED',
        message: `removeu a mídia "${itemToDelete.media.name}" da playlist "${itemToDelete.playlist.name}".`,
        entityType: 'PLAYLIST',
        entityId: itemToDelete.playlistId,
        metadata: {
          playlistName: itemToDelete.playlist.name,
          mediaName: itemToDelete.media.name,
        },
      });

      return {
        success: true,
        message: 'Item removido e playlist reordenada com sucesso.',
      };
    } catch (error) {
      this.handleError(error, 'Erro interno ao remover item da playlist.');
    }
  }

  async updateItem(
    id: string,
    data: UpdatePlaylistItemDto,
    companyId: string,
    actor: DeviceAuditActor,
  ) {
    try {
      const { duration, muted } = data;

      if (duration === undefined && muted === undefined) {
        throw new BadRequestException(
          'Informe a duração ou a configuração de áudio.',
        );
      }

      if (
        duration !== undefined &&
        (!Number.isInteger(duration) || duration < 1)
      ) {
        throw new BadRequestException(
          'A duração deve ser um número inteiro maior que zero.',
        );
      }

      const item = await this.prisma.playlistItem.findFirst({
        where: {
          id,

          playlist: {
            companyId,
          },
        },

        select: {
          id: true,
          playlistId: true,

          playlist: {
            select: {
              name: true,
            },
          },

          media: {
            select: {
              id: true,
              name: true,
              type: true,
              hasAudio: true,
            },
          },
        },
      });

      if (!item) {
        throw new NotFoundException('Item não encontrado na sua playlist.');
      }

      if (muted !== undefined && item.media.type !== 'VIDEO') {
        throw new BadRequestException(
          'A configuração de áudio está disponível somente para vídeos.',
        );
      }

      if (duration !== undefined && item.media.type !== 'IMAGE') {
        throw new BadRequestException(
          'A duração pode ser alterada somente para imagens.',
        );
      }

      if (muted === false && item.media.hasAudio === false) {
        throw new BadRequestException(
          'Este vídeo não possui faixa de áudio para ser ativada.',
        );
      }

      const updatedItem = await this.prisma.$transaction(async (tx) => {
        const result = await tx.playlistItem.update({
          where: {
            id: item.id,
          },

          data: {
            ...(duration !== undefined
              ? {
                  duration,
                }
              : {}),

            ...(muted !== undefined
              ? {
                  muted,
                }
              : {}),
          },

          include: {
            media: true,
          },
        });

        await this.touchPlaylist(tx, item.playlistId);

        return result;
      });

      await this.devicesGateway.notifyPlaylistChanged(
        item.playlistId,
        'PLAYLIST_UPDATED',
      );

      const changes = [
        duration !== undefined ? `duração para ${duration}s` : null,
        muted !== undefined
          ? muted
            ? 'áudio silenciado'
            : 'áudio ativado'
          : null,
      ].filter((change): change is string => Boolean(change));

      await this.auditPlaylistDevices(item.playlistId, {
        actor,
        action: 'PLAYLIST_MEDIA_UPDATED',
        message: `alterou a mídia "${item.media.name}" na playlist "${item.playlist.name}" (${changes.join(', ')}).`,
        entityType: 'PLAYLIST',
        entityId: item.playlistId,
        metadata: {
          playlistName: item.playlist.name,
          mediaName: item.media.name,
          ...(duration !== undefined ? { duration } : {}),
          ...(muted !== undefined ? { muted } : {}),
        },
      });

      return updatedItem;
    } catch (error) {
      this.handleError(error, 'Erro interno ao atualizar item da playlist.');
    }
  }

  async reorder(
    playlistId: string,
    items: {
      id: string;
      order: number;
    }[],
    companyId: string,
    actor: DeviceAuditActor,
  ) {
    try {
      if (!Array.isArray(items) || items.length === 0) {
        throw new BadRequestException(
          'Informe os itens que serão reordenados.',
        );
      }

      const playlist = await this.prisma.playlist.findFirst({
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
        throw new NotFoundException('Playlist não encontrada.');
      }

      if (items.length !== playlist.items.length) {
        throw new BadRequestException(
          'Todos os itens da playlist devem ser enviados na reordenação.',
        );
      }

      const receivedIds = items.map((item) => item.id);

      const uniqueIds = new Set(receivedIds);

      if (uniqueIds.size !== receivedIds.length) {
        throw new BadRequestException(
          'Existem itens duplicados na reordenação.',
        );
      }

      const validIds = new Set(playlist.items.map((item) => item.id));

      const invalidItem = items.find((item) => !validIds.has(item.id));

      if (invalidItem) {
        throw new BadRequestException(
          'Um ou mais itens não pertencem a esta playlist.',
        );
      }

      const receivedOrders = items.map((item) => item.order);

      const uniqueOrders = new Set(receivedOrders);

      if (uniqueOrders.size !== receivedOrders.length) {
        throw new BadRequestException(
          'Não é permitido enviar posições duplicadas.',
        );
      }

      const invalidOrder = items.find(
        (item) => !Number.isInteger(item.order) || item.order < 1,
      );

      if (invalidOrder) {
        throw new BadRequestException(
          'As posições devem ser números inteiros maiores que zero.',
        );
      }

      const updatedPlaylist = await this.prisma.$transaction(async (tx) => {
        await applyPlaylistItemOrder(tx, playlistId, items);

        await this.touchPlaylist(tx, playlistId);

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
      });

      await this.devicesGateway.notifyPlaylistChanged(
        playlistId,
        'PLAYLIST_REORDERED',
      );

      await this.auditPlaylistDevices(playlistId, {
        actor,
        action: 'PLAYLIST_REORDERED',
        message: `reordenou as mídias da playlist "${playlist.name}".`,
        entityType: 'PLAYLIST',
        entityId: playlistId,
        metadata: {
          playlistName: playlist.name,
        },
      });

      return updatedPlaylist;
    } catch (error) {
      this.handleError(error, 'Erro interno ao reordenar playlist.');
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

  private async auditPlaylistDevices(
    playlistId: string,
    event: DeviceAuditEvent,
  ) {
    const schedules = await this.prisma.schedule.findMany({
      where: {
        playlistId,
      },
      select: {
        deviceId: true,
      },
      distinct: ['deviceId'],
    });

    await this.auditDevices(
      schedules.map((schedule) => schedule.deviceId),
      event,
    );
  }

  private async auditDevices(deviceIds: string[], event: DeviceAuditEvent) {
    const uniqueDeviceIds = [...new Set(deviceIds)];

    if (uniqueDeviceIds.length === 0) {
      return;
    }

    const message = serializeDeviceAuditEvent(event);

    await this.prisma.deviceLog.createMany({
      data: uniqueDeviceIds.map((deviceId) => ({
        deviceId,
        message,
      })),
    });
  }

  private handleError(error: unknown, defaultMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
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

    console.error('[PLAYLISTS]', error);

    throw new InternalServerErrorException(defaultMessage);
  }
}
