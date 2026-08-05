import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { MediaType, Prisma } from '@prisma/client';

import { DevicesGateway } from '../devices/devices.gateway';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateOverlayBarDto,
  OverlayBarContentItemDto,
} from './dto/create-overlay-bar.dto';
import { UpdateOverlayBarDto } from './dto/update-overlay-bar.dto';

const overlayBarInclude = {
  media: true,
  playlists: {
    orderBy: {
      order: 'asc',
    },
    select: {
      order: true,
      createdAt: true,
      playlist: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  _count: {
    select: {
      playlists: true,
    },
  },
} satisfies Prisma.OverlayBarInclude;

@Injectable()
export class OverlayBarsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devicesGateway: DevicesGateway,
  ) {}

  async create(companyId: string, dto: CreateOverlayBarDto) {
    try {
      const name = dto.name.trim();

      if (!name) {
        throw new BadRequestException('O nome da barra é obrigatório.');
      }

      await this.validateMedia(dto.mediaId, companyId);
      this.validateWeatherWidget(
        dto.widgetType,
        dto.weatherLocation,
        dto.textContent,
        dto.contentItems,
      );
      this.validateContentItems(dto.contentItems);

      return await this.prisma.overlayBar.create({
        data: {
          name,
          position: dto.position,
          sizePercent: dto.sizePercent,
          backgroundColor: dto.backgroundColor.toUpperCase(),
          opacity: dto.opacity,
          fit: dto.fit,
          contentPosition: dto.contentPosition,
          imageSizePercent: dto.imageSizePercent,
          contentPadding: dto.contentPadding,
          contentGap: dto.contentGap,
          contentItems: this.serializeContentItems(dto.contentItems),
          textContent: this.normalizeText(dto.textContent),
          textColor: dto.textColor?.toUpperCase(),
          fontSize: dto.fontSize,
          widgetType: dto.widgetType,
          weatherLocation: this.normalizeText(dto.weatherLocation),
          mediaId: dto.mediaId ?? null,
          companyId,
        },
        include: overlayBarInclude,
      });
    } catch (error) {
      this.handleError(error, 'Erro interno ao criar barra.');
    }
  }

  async list(companyId: string) {
    try {
      return await this.prisma.overlayBar.findMany({
        where: {
          companyId,
        },
        include: overlayBarInclude,
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      this.handleError(error, 'Erro interno ao listar barras.');
    }
  }

  async update(id: string, companyId: string, dto: UpdateOverlayBarDto) {
    try {
      const overlayBar = await this.prisma.overlayBar.findFirst({
        where: {
          id,
          companyId,
        },
        select: {
          id: true,
          playlists: {
            select: {
              playlistId: true,
            },
          },
          widgetType: true,
          weatherLocation: true,
          textContent: true,
          contentItems: true,
        },
      });

      if (!overlayBar) {
        throw new NotFoundException('Barra não encontrada.');
      }

      if (dto.name !== undefined && !dto.name.trim()) {
        throw new BadRequestException('O nome da barra é obrigatório.');
      }

      if (dto.mediaId !== undefined) {
        await this.validateMedia(dto.mediaId, companyId);
      }

      this.validateWeatherWidget(
        dto.widgetType ?? overlayBar.widgetType,
        dto.weatherLocation !== undefined
          ? dto.weatherLocation
          : overlayBar.weatherLocation,
        dto.textContent !== undefined
          ? dto.textContent
          : overlayBar.textContent,
        dto.contentItems !== undefined
          ? dto.contentItems
          : this.parseContentItems(overlayBar.contentItems),
      );
      this.validateContentItems(dto.contentItems);

      const data: Prisma.OverlayBarUncheckedUpdateInput = {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
        ...(dto.sizePercent !== undefined
          ? { sizePercent: dto.sizePercent }
          : {}),
        ...(dto.backgroundColor !== undefined
          ? { backgroundColor: dto.backgroundColor.toUpperCase() }
          : {}),
        ...(dto.opacity !== undefined ? { opacity: dto.opacity } : {}),
        ...(dto.fit !== undefined ? { fit: dto.fit } : {}),
        ...(dto.contentPosition !== undefined
          ? { contentPosition: dto.contentPosition }
          : {}),
        ...(dto.imageSizePercent !== undefined
          ? { imageSizePercent: dto.imageSizePercent }
          : {}),
        ...(dto.contentPadding !== undefined
          ? { contentPadding: dto.contentPadding }
          : {}),
        ...(dto.contentGap !== undefined ? { contentGap: dto.contentGap } : {}),
        ...(dto.contentItems !== undefined
          ? { contentItems: this.serializeContentItems(dto.contentItems) }
          : {}),
        ...(dto.textContent !== undefined
          ? { textContent: this.normalizeText(dto.textContent) }
          : {}),
        ...(dto.textColor !== undefined
          ? { textColor: dto.textColor.toUpperCase() }
          : {}),
        ...(dto.fontSize !== undefined ? { fontSize: dto.fontSize } : {}),
        ...(dto.widgetType !== undefined ? { widgetType: dto.widgetType } : {}),
        ...(dto.weatherLocation !== undefined
          ? { weatherLocation: this.normalizeText(dto.weatherLocation) }
          : {}),
        ...(dto.mediaId !== undefined ? { mediaId: dto.mediaId } : {}),
      };

      const updated = await this.prisma.overlayBar.update({
        where: {
          id: overlayBar.id,
        },
        data,
        include: overlayBarInclude,
      });

      await this.notifyPlaylists(
        overlayBar.playlists.map((item) => item.playlistId),
      );

      return updated;
    } catch (error) {
      this.handleError(error, 'Erro interno ao atualizar barra.');
    }
  }

  async attachToPlaylist(
    overlayBarId: string,
    playlistId: string,
    companyId: string,
  ) {
    try {
      const [overlayBar, playlist] = await Promise.all([
        this.prisma.overlayBar.findFirst({
          where: {
            id: overlayBarId,
            companyId,
          },
          select: {
            id: true,
          },
        }),
        this.prisma.playlist.findFirst({
          where: {
            id: playlistId,
            companyId,
          },
          select: {
            id: true,
          },
        }),
      ]);

      if (!overlayBar) {
        throw new NotFoundException('Barra não encontrada.');
      }

      if (!playlist) {
        throw new NotFoundException('Playlist não encontrada.');
      }

      const existing = await this.prisma.playlistOverlayBar.findUnique({
        where: {
          playlistId_overlayBarId: {
            playlistId,
            overlayBarId,
          },
        },
        include: {
          overlayBar: {
            include: overlayBarInclude,
          },
        },
      });

      if (existing) {
        return existing;
      }

      const attached = await this.prisma.$transaction(async (tx) => {
        const last = await tx.playlistOverlayBar.findFirst({
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

        const relation = await tx.playlistOverlayBar.create({
          data: {
            playlistId,
            overlayBarId,
            order: (last?.order ?? 0) + 1,
          },
          include: {
            overlayBar: {
              include: overlayBarInclude,
            },
          },
        });

        await this.touchPlaylist(tx, playlistId);

        return relation;
      });

      await this.devicesGateway.notifyPlaylistChanged(
        playlistId,
        'PLAYLIST_OVERLAY_BARS_UPDATED',
      );

      return attached;
    } catch (error) {
      this.handleError(error, 'Erro interno ao vincular barra à playlist.');
    }
  }

  async detachFromPlaylist(
    overlayBarId: string,
    playlistId: string,
    companyId: string,
  ) {
    try {
      const relation = await this.prisma.playlistOverlayBar.findFirst({
        where: {
          playlistId,
          overlayBarId,
          playlist: {
            companyId,
          },
          overlayBar: {
            companyId,
          },
        },
        select: {
          playlistId: true,
        },
      });

      if (!relation) {
        throw new NotFoundException('Vínculo da barra não encontrado.');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.playlistOverlayBar.delete({
          where: {
            playlistId_overlayBarId: {
              playlistId,
              overlayBarId,
            },
          },
        });

        const remaining = await tx.playlistOverlayBar.findMany({
          where: {
            playlistId,
          },
          orderBy: {
            order: 'asc',
          },
          select: {
            overlayBarId: true,
          },
        });

        for (const [index, item] of remaining.entries()) {
          await tx.playlistOverlayBar.update({
            where: {
              playlistId_overlayBarId: {
                playlistId,
                overlayBarId: item.overlayBarId,
              },
            },
            data: {
              order: index + 1,
            },
          });
        }

        await this.touchPlaylist(tx, playlistId);
      });

      await this.devicesGateway.notifyPlaylistChanged(
        playlistId,
        'PLAYLIST_OVERLAY_BARS_UPDATED',
      );

      return {
        success: true,
        message: 'Barra removida da playlist com sucesso.',
      };
    } catch (error) {
      this.handleError(error, 'Erro interno ao remover barra da playlist.');
    }
  }

  async remove(id: string, companyId: string) {
    try {
      const overlayBar = await this.prisma.overlayBar.findFirst({
        where: {
          id,
          companyId,
        },
        select: {
          id: true,
          playlists: {
            select: {
              playlistId: true,
            },
          },
        },
      });

      if (!overlayBar) {
        throw new NotFoundException('Barra não encontrada.');
      }

      const playlistIds = overlayBar.playlists.map((item) => item.playlistId);

      await this.prisma.$transaction(async (tx) => {
        await tx.overlayBar.delete({
          where: {
            id: overlayBar.id,
          },
        });

        for (const playlistId of playlistIds) {
          await this.touchPlaylist(tx, playlistId);
        }
      });

      await this.notifyPlaylists(playlistIds);

      return {
        success: true,
        message: 'Barra excluída com sucesso.',
        affectedPlaylists: playlistIds.length,
      };
    } catch (error) {
      this.handleError(error, 'Erro interno ao excluir barra.');
    }
  }

  private async validateMedia(
    mediaId: string | null | undefined,
    companyId: string,
  ) {
    if (!mediaId) {
      return;
    }

    const media = await this.prisma.media.findFirst({
      where: {
        id: mediaId,
        companyId,
      },
      select: {
        type: true,
      },
    });

    if (!media) {
      throw new NotFoundException('Imagem da barra não encontrada.');
    }

    if (media.type !== MediaType.IMAGE) {
      throw new BadRequestException(
        'A barra aceita somente imagens ou logos da biblioteca.',
      );
    }
  }

  private normalizeText(value: string | null | undefined) {
    const normalized = value?.trim();

    return normalized ? normalized : null;
  }

  private validateWeatherWidget(
    widgetType: string | undefined,
    weatherLocation: string | null | undefined,
    textContent: string | null | undefined,
    contentItems: Array<{ type: string; text?: string | null }> | undefined,
  ) {
    const usesWeatherToken = /{{(?:temperatura|clima|cidade)}}/.test(
      textContent ?? '',
    );
    const itemsUseWeather = (contentItems ?? []).some(
      (item) =>
        item.type === 'WEATHER' ||
        /{{(?:temperatura|clima|cidade)}}/.test(item.text ?? ''),
    );

    if (
      (widgetType === 'WEATHER' || usesWeatherToken || itemsUseWeather) &&
      !weatherLocation?.trim()
    ) {
      throw new BadRequestException(
        'Informe a cidade ou região usada para exibir o clima.',
      );
    }
  }

  private validateContentItems(
    contentItems:
      | Array<{ id: string; type: string; text?: string }>
      | undefined,
  ) {
    if (!contentItems) {
      return;
    }

    const ids = new Set<string>();

    for (const item of contentItems) {
      if (ids.has(item.id)) {
        throw new BadRequestException(
          'Cada conteúdo da barra deve possuir um identificador único.',
        );
      }

      ids.add(item.id);

      if (item.type === 'TEXT' && !item.text?.trim()) {
        throw new BadRequestException('Preencha o texto do conteúdo da barra.');
      }
    }
  }

  private parseContentItems(value: Prisma.JsonValue | null) {
    return Array.isArray(value)
      ? (value as Array<{ id: string; type: string; text?: string }>)
      : undefined;
  }

  private serializeContentItems(items: OverlayBarContentItemDto[] | undefined) {
    return items?.map((item) => ({
      id: item.id,
      type: item.type,
      ...(item.text !== undefined ? { text: item.text } : {}),
      textColor: item.textColor,
      fontSize: item.fontSize,
      fontWeight: item.fontWeight,
      ...(item.fontFamily !== undefined ? { fontFamily: item.fontFamily } : {}),
      ...(item.italic !== undefined ? { italic: item.italic } : {}),
      ...(item.backgroundColor !== undefined
        ? { backgroundColor: item.backgroundColor }
        : {}),
      padding: item.padding,
      borderRadius: item.borderRadius,
      spacerSize: item.spacerSize,
    })) as Prisma.InputJsonValue | undefined;
  }

  private async notifyPlaylists(playlistIds: string[]) {
    for (const playlistId of new Set(playlistIds)) {
      await this.devicesGateway.notifyPlaylistChanged(
        playlistId,
        'PLAYLIST_OVERLAY_BARS_UPDATED',
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

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    console.error('[OVERLAY BARS]', error);

    throw new InternalServerErrorException(fallbackMessage);
  }
}
