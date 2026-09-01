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
import { DeletePlaylistItemsDto } from './dto/delete-playlist-items.dto';
import { SavePlaylistCompositionDto } from './dto/save-playlist-composition.dto';
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

  async duplicateItem(
    itemId: string,
    companyId: string,
    actor: DeviceAuditActor,
  ) {
    try {
      const duplicated = await this.prisma.$transaction(
        async (tx) => {
          const sourceItem = await tx.playlistItem.findFirst({
            where: {
              id: itemId,
              playlist: {
                companyId,
              },
            },
            include: {
              media: true,
              playlist: {
                select: {
                  name: true,
                },
              },
            },
          });

          if (!sourceItem) {
            throw new NotFoundException('Item não encontrado na sua playlist.');
          }

          const currentItems = await tx.playlistItem.findMany({
            where: {
              playlistId: sourceItem.playlistId,
            },
            orderBy: {
              order: 'asc',
            },
            select: {
              id: true,
              order: true,
            },
          });

          const sourceIndex = currentItems.findIndex(
            (item) => item.id === sourceItem.id,
          );
          const temporaryOrder =
            (currentItems[currentItems.length - 1]?.order ?? 0) + 1;

          const createdItem = await tx.playlistItem.create({
            data: {
              playlistId: sourceItem.playlistId,
              mediaId: sourceItem.mediaId,
              order: temporaryOrder,
              duration: sourceItem.duration,
              muted: sourceItem.muted,
            },
            include: {
              media: true,
            },
          });

          const reorderedItems = [...currentItems];
          reorderedItems.splice(sourceIndex + 1, 0, {
            id: createdItem.id,
            order: temporaryOrder,
          });

          await applyPlaylistItemOrder(
            tx,
            sourceItem.playlistId,
            reorderedItems,
          );
          await this.touchPlaylist(tx, sourceItem.playlistId);

          return {
            item: {
              ...createdItem,
              order: sourceIndex + 2,
            },
            playlistId: sourceItem.playlistId,
            playlistName: sourceItem.playlist.name,
            mediaName: sourceItem.media.name,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      await this.devicesGateway.notifyPlaylistChanged(
        duplicated.playlistId,
        'PLAYLIST_ITEM_ADDED',
      );

      await this.auditPlaylistDevices(duplicated.playlistId, {
        actor,
        action: 'PLAYLIST_MEDIA_DUPLICATED',
        message: `duplicou a mídia "${duplicated.mediaName}" na playlist "${duplicated.playlistName}".`,
        entityType: 'PLAYLIST',
        entityId: duplicated.playlistId,
        metadata: {
          playlistName: duplicated.playlistName,
          mediaName: duplicated.mediaName,
          sourceItemId: itemId,
          duplicatedItemId: duplicated.item.id,
        },
      });

      return duplicated.item;
    } catch (error) {
      this.handleError(error, 'Erro interno ao duplicar item da playlist.');
    }
  }

  async saveComposition(
    playlistId: string,
    dto: SavePlaylistCompositionDto,
    companyId: string,
    actor: DeviceAuditActor,
  ) {
    try {
      const playlist = await this.prisma.playlist.findFirst({
        where: {
          id: playlistId,
          companyId,
        },
        select: {
          id: true,
          name: true,
          orientation: true,
          items: {
            select: {
              id: true,
              mediaId: true,
              order: true,
              duration: true,
              muted: true,
              media: {
                select: {
                  name: true,
                  type: true,
                  hasAudio: true,
                },
              },
            },
          },
          overlayBars: {
            select: {
              overlayBarId: true,
              order: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      if (!playlist) {
        throw new NotFoundException('Playlist não encontrada.');
      }

      const validOverlayBars =
        dto.overlayBarIds.length > 0
          ? await this.prisma.overlayBar.findMany({
              where: {
                companyId,
                id: {
                  in: dto.overlayBarIds,
                },
              },
              select: {
                id: true,
              },
            })
          : [];

      if (validOverlayBars.length !== dto.overlayBarIds.length) {
        throw new BadRequestException(
          'Uma ou mais barras não pertencem à sua empresa.',
        );
      }

      const currentItemsById = new Map(
        playlist.items.map((item) => [item.id, item]),
      );
      const malformedItem = dto.items.find(
        (item) => Boolean(item.id) === Boolean(item.sourceItemId),
      );

      if (malformedItem) {
        throw new BadRequestException(
          'Cada posição deve informar um item existente ou a origem da duplicação.',
        );
      }

      const existingItems = dto.items.filter(
        (item): item is typeof item & { id: string } => Boolean(item.id),
      );
      const receivedIds = existingItems.map((item) => item.id);

      if (new Set(receivedIds).size !== receivedIds.length) {
        throw new BadRequestException(
          'Não é permitido enviar mídias duplicadas.',
        );
      }

      if (receivedIds.length !== playlist.items.length) {
        throw new BadRequestException(
          'Todos os itens atuais da playlist devem ser enviados ao salvar.',
        );
      }

      const invalidItem = dto.items.find(
        (item) =>
          !currentItemsById.has((item.id ?? item.sourceItemId) as string),
      );

      if (invalidItem) {
        throw new BadRequestException(
          'Uma ou mais mídias não pertencem a esta playlist.',
        );
      }

      const missingCurrentItem = playlist.items.find(
        (item) => !receivedIds.includes(item.id),
      );

      if (missingCurrentItem) {
        throw new BadRequestException(
          'Todos os itens atuais da playlist devem ser enviados ao salvar.',
        );
      }

      const orderedPositions = dto.items
        .map((item) => item.order)
        .sort((first, second) => first - second);
      const hasInvalidOrder = orderedPositions.some(
        (order, index) => order !== index + 1,
      );

      if (hasInvalidOrder) {
        throw new BadRequestException(
          'As posições devem formar uma sequência contínua a partir de 1.',
        );
      }

      for (const submittedItem of dto.items) {
        const currentItem = currentItemsById.get(
          (submittedItem.id ?? submittedItem.sourceItemId) as string,
        )!;

        if (
          submittedItem.duration !== undefined &&
          currentItem.media.type !== 'IMAGE'
        ) {
          throw new BadRequestException(
            'A duração pode ser alterada somente para imagens.',
          );
        }

        if (
          submittedItem.muted !== undefined &&
          currentItem.media.type !== 'VIDEO'
        ) {
          throw new BadRequestException(
            'A configuração de áudio está disponível somente para vídeos.',
          );
        }

        if (
          submittedItem.muted === false &&
          currentItem.media.hasAudio === false
        ) {
          throw new BadRequestException(
            `O vídeo "${currentItem.media.name}" não possui faixa de áudio para ser ativada.`,
          );
        }
      }

      const changedItems = dto.items.filter((submittedItem) => {
        if (submittedItem.sourceItemId) {
          return true;
        }

        const currentItem = currentItemsById.get(submittedItem.id as string)!;

        return (
          currentItem.order !== submittedItem.order ||
          (submittedItem.duration !== undefined &&
            currentItem.duration !== submittedItem.duration) ||
          (submittedItem.muted !== undefined &&
            currentItem.muted !== submittedItem.muted)
        );
      });
      const currentOverlayBarIds = playlist.overlayBars.map(
        (item) => item.overlayBarId,
      );
      const overlayBarsChanged =
        currentOverlayBarIds.length !== dto.overlayBarIds.length ||
        currentOverlayBarIds.some(
          (overlayBarId, index) => overlayBarId !== dto.overlayBarIds[index],
        );
      const orientationChanged = playlist.orientation !== dto.orientation;

      const updatedPlaylist = await this.prisma.$transaction(
        async (tx) => {
          const resolvedItemIds = new Map<number, string>();
          let temporaryOrder =
            Math.max(0, ...playlist.items.map((item) => item.order)) + 1;

          for (const [index, submittedItem] of dto.items.entries()) {
            if (submittedItem.id) {
              resolvedItemIds.set(index, submittedItem.id);
              continue;
            }

            const sourceItem = currentItemsById.get(
              submittedItem.sourceItemId as string,
            )!;
            const duplicatedItem = await tx.playlistItem.create({
              data: {
                playlistId,
                mediaId: sourceItem.mediaId,
                order: temporaryOrder,
                duration: sourceItem.duration,
                muted: sourceItem.muted,
              },
              select: {
                id: true,
              },
            });

            resolvedItemIds.set(index, duplicatedItem.id);
            temporaryOrder += 1;
          }

          await applyPlaylistItemOrder(
            tx,
            playlistId,
            dto.items.map((item, index) => ({
              id: resolvedItemIds.get(index)!,
              order: item.order,
            })),
          );

          for (const [index, submittedItem] of dto.items.entries()) {
            if (
              submittedItem.duration === undefined &&
              submittedItem.muted === undefined
            ) {
              continue;
            }

            await tx.playlistItem.update({
              where: {
                id: resolvedItemIds.get(index)!,
              },
              data: {
                ...(submittedItem.duration !== undefined
                  ? { duration: submittedItem.duration }
                  : {}),
                ...(submittedItem.muted !== undefined
                  ? { muted: submittedItem.muted }
                  : {}),
              },
            });
          }

          await tx.playlistOverlayBar.deleteMany({
            where: {
              playlistId,
            },
          });

          if (dto.overlayBarIds.length > 0) {
            await tx.playlistOverlayBar.createMany({
              data: dto.overlayBarIds.map((overlayBarId, index) => ({
                playlistId,
                overlayBarId,
                order: index + 1,
              })),
            });
          }

          await tx.playlist.update({
            where: {
              id: playlistId,
            },
            data: {
              orientation: dto.orientation,
              updatedAt: new Date(),
            },
          });

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
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      await this.devicesGateway.notifyPlaylistChanged(
        playlistId,
        'PLAYLIST_UPDATED',
      );

      await this.auditPlaylistDevices(playlistId, {
        actor,
        action: 'PLAYLIST_COMPOSITION_UPDATED',
        message: `salvou as alterações da composição da playlist "${playlist.name}".`,
        entityType: 'PLAYLIST',
        entityId: playlistId,
        metadata: {
          playlistName: playlist.name,
          changedItems: changedItems.length,
          duplicatedItems: dto.items.filter((item) => item.sourceItemId).length,
          orientationChanged,
          overlayBarsChanged,
        },
      });

      return updatedPlaylist;
    } catch (error) {
      this.handleError(error, 'Erro interno ao salvar a composição.');
    }
  }

  async removeItems(
    playlistId: string,
    dto: DeletePlaylistItemsDto,
    companyId: string,
    actor: DeviceAuditActor,
  ) {
    try {
      const playlist = await this.prisma.playlist.findFirst({
        where: {
          id: playlistId,
          companyId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!playlist) {
        throw new NotFoundException('Playlist não encontrada.');
      }

      const items = await this.prisma.playlistItem.findMany({
        where: {
          playlistId,
          id: {
            in: dto.itemIds,
          },
        },
        select: {
          id: true,
          media: {
            select: {
              name: true,
            },
          },
        },
      });

      if (items.length !== dto.itemIds.length) {
        throw new BadRequestException(
          'Uma ou mais mídias selecionadas não pertencem a esta playlist.',
        );
      }

      await this.prisma.$transaction(
        async (tx) => {
          await tx.playlistItem.deleteMany({
            where: {
              playlistId,
              id: {
                in: dto.itemIds,
              },
            },
          });

          await compactPlaylistItemOrder(tx, playlistId);
          await this.touchPlaylist(tx, playlistId);
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      await this.devicesGateway.notifyPlaylistChanged(
        playlistId,
        'PLAYLIST_ITEM_REMOVED',
      );

      const mediaNames = items.map((item) => item.media.name);

      await this.auditPlaylistDevices(playlistId, {
        actor,
        action: 'PLAYLIST_MEDIA_BULK_REMOVED',
        message: `removeu ${items.length} ${items.length === 1 ? 'mídia' : 'mídias'} da playlist "${playlist.name}".`,
        entityType: 'PLAYLIST',
        entityId: playlistId,
        metadata: {
          playlistName: playlist.name,
          removedItems: items.length,
          mediaNames: mediaNames.join(', '),
        },
      });

      return {
        success: true,
        message:
          items.length === 1
            ? 'Mídia removida com sucesso.'
            : 'Mídias removidas com sucesso.',
        removedItems: items.length,
      };
    } catch (error) {
      this.handleError(
        error,
        'Erro interno ao remover as mídias selecionadas.',
      );
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
