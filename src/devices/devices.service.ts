import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { randomInt } from 'crypto';

import {
  DeviceStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { HeartbeatDto } from './dto/heartbeat.dto';

const ONLINE_TIMEOUT_MS =
  60_000;

const devicePreviewInclude = {
  currentPlaylist: {
    select: {
      id: true,
      name: true,
    },
  },

  currentPlaylistItem: {
    select: {
      id: true,
      order: true,
      duration: true,
      playlistId: true,
      mediaId: true,
    },
  },

  currentMedia: {
    select: {
      id: true,
      name: true,
      type: true,
      fileUrl: true,
      duration: true,
    },
  },
} satisfies Prisma.DeviceInclude;

const schedulePreviewSelect = {
  id: true,
  name: true,
  deviceId: true,
  playlistId: true,
  startDate: true,
  endDate: true,
  startTime: true,
  endTime: true,
  daysOfWeek: true,
  priority: true,
  active: true,
} satisfies Prisma.ScheduleSelect;

type DeviceWithPreviewRelations =
  Prisma.DeviceGetPayload<{
    include:
      typeof devicePreviewInclude;
  }>;

type SchedulePreview =
  Prisma.ScheduleGetPayload<{
    select:
      typeof schedulePreviewSelect;
  }>;

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  async registerDevice() {
    for (
      let attempt = 0;
      attempt < 10;
      attempt += 1
    ) {
      const code =
        this.generateCode();

      try {
        const device =
          await this.prisma.device.create({
            data: {
              code,
              isLinked: false,
              status:
                DeviceStatus.OFFLINE,
            },
          });

        return {
          id: device.id,
          code: device.code,
          isLinked:
            device.isLinked,
        };
      } catch (error) {
        if (
          error instanceof
            Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }

        throw new InternalServerErrorException(
          'Erro ao registrar dispositivo.',
        );
      }
    }

    throw new InternalServerErrorException(
      'Não foi possível gerar um código único para o dispositivo.',
    );
  }

  async pairDevice(
    code: string,
    name: string,
    companyId: string,
  ) {
    try {
      const normalizedCode =
        this.normalizeCode(code);

      const normalizedName =
        name.trim();

      const device =
        await this.prisma.device.findUnique({
          where: {
            code: normalizedCode,
          },
        });

      if (!device) {
        throw new NotFoundException(
          'Dispositivo não encontrado ou código inválido.',
        );
      }

      if (device.isLinked) {
        throw new BadRequestException(
          'Este dispositivo já está vinculado a uma conta.',
        );
      }

      const updatedDevice =
        await this.prisma.device.update({
          where: {
            id: device.id,
          },

          data: {
            name: normalizedName,
            companyId,
            isLinked: true,
          },
        });

      await this.createLog(
        device.id,
        'Dispositivo vinculado à empresa com sucesso.',
      );

      return updatedDevice;
    } catch (error) {
      if (
        error instanceof
        HttpException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Erro ao parear dispositivo.',
      );
    }
  }

  async list(
    companyId: string,
  ) {
    try {
      const now =
        new Date();

      const devices =
        await this.prisma.device.findMany({
          where: {
            companyId,
          },

          include:
            devicePreviewInclude,

          orderBy: {
            createdAt: 'desc',
          },
        });

      if (
        devices.length === 0
      ) {
        return [];
      }

      const schedules =
        await this.prisma.schedule.findMany({
          where: {
            companyId,

            deviceId: {
              in: devices.map(
                device =>
                  device.id,
              ),
            },

            active: true,

            startDate: {
              lte: now,
            },

            endDate: {
              gte: now,
            },
          },

          select:
            schedulePreviewSelect,
        });

      const schedulesByDevice =
        new Map<
          string,
          SchedulePreview[]
        >();

      schedules.forEach(
        schedule => {
          const current =
            schedulesByDevice.get(
              schedule.deviceId,
            ) ?? [];

          current.push(schedule);

          schedulesByDevice.set(
            schedule.deviceId,
            current,
          );
        },
      );

      return devices.map(
        device => {
          const activeSchedule =
            this.selectActiveSchedule(
              schedulesByDevice.get(
                device.id,
              ) ?? [],
              now,
            );

          return this.buildDeviceResponse(
            device,
            activeSchedule,
            now,
          );
        },
      );
    } catch {
      throw new InternalServerErrorException(
        'Erro ao listar dispositivos.',
      );
    }
  }

  async findByCode(
    code: string,
  ) {
    try {
      const device =
        await this.prisma.device.findUnique({
          where: {
            code:
              this.normalizeCode(
                code,
              ),
          },

          select: {
            id: true,
            code: true,
            isLinked: true,
            companyId: true,
          },
        });

      if (!device) {
        throw new NotFoundException(
          'Dispositivo não encontrado.',
        );
      }

      return device;
    } catch (error) {
      if (
        error instanceof
        HttpException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Erro ao buscar dispositivo.',
      );
    }
  }

  async currentPlaylist(
    code: string,
  ) {
    try {
      const device =
        await this.prisma.device.findUnique({
          where: {
            code:
              this.normalizeCode(
                code,
              ),
          },
        });

      if (!device) {
        throw new NotFoundException(
          'Dispositivo não encontrado.',
        );
      }

      if (!device.isLinked) {
        throw new BadRequestException(
          'Dispositivo não está vinculado.',
        );
      }

      const now =
        new Date();

      const schedules =
        await this.prisma.schedule.findMany({
          where: {
            deviceId:
              device.id,

            active: true,

            startDate: {
              lte: now,
            },

            endDate: {
              gte: now,
            },
          },

          include: {
            playlist: {
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
            },
          },
        });

      const activeSchedule =
        this.selectActiveSchedule(
          schedules,
          now,
        );

      if (!activeSchedule) {
        return {
          schedule: null,
          playlist: null,
          generatedAt: now,
        };
      }

      return {
        schedule: {
          id:
            activeSchedule.id,

          name:
            activeSchedule.name,

          startDate:
            activeSchedule.startDate,

          endDate:
            activeSchedule.endDate,

          startTime:
            activeSchedule.startTime,

          endTime:
            activeSchedule.endTime,

          priority:
            activeSchedule.priority,
        },

        playlist:
          activeSchedule.playlist,

        generatedAt: now,
      };
    } catch (error) {
      if (
        error instanceof
        HttpException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Erro ao buscar playlist atual.',
      );
    }
  }

  async heartbeat(
    dto: HeartbeatDto,
  ) {
    try {
      const device =
        await this.prisma.device.findUnique({
          where: {
            code:
              this.normalizeCode(
                dto.code,
              ),
          },
        });

      if (!device) {
        throw new NotFoundException(
          'Dispositivo não encontrado.',
        );
      }

      const now =
        new Date();

      const includesPlaybackState =
        [
          'playlistId',
          'playlistItemId',
          'mediaId',
          'currentTime',
          'duration',
          'startedAt',
        ].some(key =>
          Object.prototype.hasOwnProperty.call(
            dto,
            key,
          ),
        );

      const playbackData:
        Prisma.DeviceUpdateInput = {
          lastHeartbeat: now,
          status:
            DeviceStatus.ONLINE,
        };

      if (includesPlaybackState) {
        const playlistId =
          dto.playlistId ??
          null;

        const playlistItemId =
          dto.playlistItemId ??
          null;

        const mediaId =
          dto.mediaId ??
          null;

        const informedIds =
          [
            playlistId,
            playlistItemId,
            mediaId,
          ].filter(Boolean).length;

        if (
          informedIds !== 0 &&
          informedIds !== 3
        ) {
          throw new BadRequestException(
            'Playlist, item e mídia devem ser informados juntos.',
          );
        }

        if (
          playlistId &&
          playlistItemId &&
          mediaId
        ) {
          if (!device.companyId) {
            throw new BadRequestException(
              'O dispositivo ainda não está vinculado a uma empresa.',
            );
          }

          const validItem =
            await this.prisma.playlistItem.findFirst({
              where: {
                id:
                  playlistItemId,

                playlistId,

                mediaId,

                playlist: {
                  companyId:
                    device.companyId,
                },

                media: {
                  companyId:
                    device.companyId,
                },
              },

              select: {
                id: true,
              },
            });

          if (!validItem) {
            throw new BadRequestException(
              'O estado de reprodução informado é inválido.',
            );
          }
        }

        playbackData.currentPlaylist =
          playlistId
            ? {
                connect: {
                  id: playlistId,
                },
              }
            : {
                disconnect: true,
              };

        playbackData.currentPlaylistItem =
          playlistItemId
            ? {
                connect: {
                  id: playlistItemId,
                },
              }
            : {
                disconnect: true,
              };

        playbackData.currentMedia =
          mediaId
            ? {
                connect: {
                  id: mediaId,
                },
              }
            : {
                disconnect: true,
              };

        playbackData.currentMediaTime =
          dto.currentTime ??
          null;

        playbackData.currentMediaDuration =
          dto.duration ??
          null;

        playbackData.currentMediaStartedAt =
          dto.startedAt
            ? new Date(
                dto.startedAt,
              )
            : null;

        playbackData.playbackUpdatedAt =
          now;
      }

      await this.prisma.device.update({
        where: {
          id: device.id,
        },

        data:
          playbackData,
      });

      return {
        success: true,
        receivedAt: now,
      };
    } catch (error) {
      if (
        error instanceof
        HttpException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Erro ao processar heartbeat.',
      );
    }
  }

  async preview(
    deviceId: string,
    companyId: string,
  ) {
    try {
      const now =
        new Date();

      const device =
        await this.prisma.device.findFirst({
          where: {
            id: deviceId,
            companyId,
          },

          include:
            devicePreviewInclude,
        });

      if (!device) {
        throw new NotFoundException(
          'Dispositivo não encontrado ou não pertence a esta conta.',
        );
      }

      const schedules =
        await this.prisma.schedule.findMany({
          where: {
            companyId,
            deviceId,
            active: true,

            startDate: {
              lte: now,
            },

            endDate: {
              gte: now,
            },
          },

          select:
            schedulePreviewSelect,
        });

      const activeSchedule =
        this.selectActiveSchedule(
          schedules,
          now,
        );

      return this.buildDeviceResponse(
        device,
        activeSchedule,
        now,
      );
    } catch (error) {
      if (
        error instanceof
        HttpException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Erro ao buscar preview do dispositivo.',
      );
    }
  }

  async logs(
    deviceId: string,
    companyId: string,
  ) {
    try {
      const device =
        await this.prisma.device.findFirst({
          where: {
            id: deviceId,
            companyId,
          },
        });

      if (!device) {
        throw new NotFoundException(
          'Dispositivo não encontrado ou não pertence a esta conta.',
        );
      }

      return this.prisma.deviceLog.findMany({
        where: {
          deviceId,
        },

        orderBy: {
          createdAt: 'desc',
        },

        take: 100,
      });
    } catch (error) {
      if (
        error instanceof
        HttpException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Erro ao buscar logs.',
      );
    }
  }

  private buildDeviceResponse(
    device:
      DeviceWithPreviewRelations,

    activeSchedule:
      | SchedulePreview
      | null,

    now: Date,
  ) {
    const status =
      this.getDeviceStatus(
        device.lastHeartbeat,
        now,
      );

    const duration =
      device.currentMediaDuration ??
      device.currentPlaylistItem
        ?.duration ??
      device.currentMedia
        ?.duration ??
      null;

    const currentTime =
      this.calculateEstimatedCurrentTime(
        device.currentMediaTime,
        device.playbackUpdatedAt,
        duration,
        status,
        now,
      );

    const progress =
      duration &&
      duration > 0 &&
      currentTime !== null
        ? Math.min(
            100,
            Math.max(
              0,
              (
                currentTime /
                duration
              ) * 100,
            ),
          )
        : null;

    return {
      id: device.id,

      name:
        device.name,

      code:
        device.code,

      isLinked:
        device.isLinked,

      status,

      lastHeartbeat:
        device.lastHeartbeat,

      companyId:
        device.companyId,

      createdAt:
        device.createdAt,

      updatedAt:
        device.updatedAt,

      preview: {
        schedule:
          activeSchedule
            ? {
                id:
                  activeSchedule.id,

                name:
                  activeSchedule.name,

                startTime:
                  activeSchedule.startTime,

                endTime:
                  activeSchedule.endTime,

                priority:
                  activeSchedule.priority,
              }
            : null,

        playlist:
          device.currentPlaylist
            ? {
                id:
                  device.currentPlaylist.id,

                name:
                  device.currentPlaylist.name,
              }
            : null,

        item:
          device.currentPlaylistItem
            ? {
                id:
                  device.currentPlaylistItem.id,

                order:
                  device.currentPlaylistItem.order,
              }
            : null,

        media:
          device.currentMedia
            ? {
                id:
                  device.currentMedia.id,

                name:
                  device.currentMedia.name,

                type:
                  device.currentMedia.type,

                fileUrl:
                  device.currentMedia.fileUrl,

                duration:
                  device.currentMedia.duration,
              }
            : null,

        playback: {
          currentTime,
          duration,
          progress,

          startedAt:
            device.currentMediaStartedAt,

          updatedAt:
            device.playbackUpdatedAt,
        },
      },
    };
  }

  private selectActiveSchedule<
    T extends {
      startTime: string;
      endTime: string;
      daysOfWeek: string;
      priority: number;
      active: boolean;
    },
  >(
    schedules: T[],
    now: Date,
  ): T | null {
    const currentTime =
      now
        .toTimeString()
        .substring(0, 5);

    const currentDay =
      now
        .getDay()
        .toString();

    return (
      schedules
        .filter(
          schedule => {
            const validTime =
              currentTime >=
                schedule.startTime &&
              currentTime <=
                schedule.endTime;

            const validDay =
              schedule.daysOfWeek
                .split(',')
                .map(day =>
                  day.trim(),
                )
                .includes(
                  currentDay,
                );

            return (
              schedule.active &&
              validTime &&
              validDay
            );
          },
        )
        .sort(
          (
            first,
            second,
          ) =>
            second.priority -
            first.priority,
        )[0] ?? null
    );
  }

  private calculateEstimatedCurrentTime(
    savedTime: number | null,
    playbackUpdatedAt:
      Date | null,
    duration: number | null,
    status: DeviceStatus,
    now: Date,
  ) {
    if (savedTime === null) {
      return null;
    }

    let estimated =
      Math.max(
        0,
        savedTime,
      );

    if (
      status ===
        DeviceStatus.ONLINE &&
      playbackUpdatedAt
    ) {
      estimated +=
        Math.max(
          0,
          Math.floor(
            (
              now.getTime() -
              playbackUpdatedAt.getTime()
            ) / 1000,
          ),
        );
    }

    if (
      duration !== null &&
      duration > 0
    ) {
      return Math.min(
        estimated,
        duration,
      );
    }

    return estimated;
  }

  private getDeviceStatus(
    lastHeartbeat:
      Date | null,

    now: Date,
  ) {
    if (!lastHeartbeat) {
      return DeviceStatus.OFFLINE;
    }

    const difference =
      now.getTime() -
      lastHeartbeat.getTime();

    return difference <
      ONLINE_TIMEOUT_MS
      ? DeviceStatus.ONLINE
      : DeviceStatus.OFFLINE;
  }

  private generateCode() {
    const alphabet =
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    return Array.from(
      {
        length: 6,
      },
      () =>
        alphabet[
          randomInt(
            0,
            alphabet.length,
          )
        ],
    ).join('');
  }

  private normalizeCode(
    code: string,
  ) {
    return code
      .trim()
      .toUpperCase();
  }

  private createLog(
    deviceId: string,
    message: string,
  ) {
    return this.prisma.deviceLog.create({
      data: {
        deviceId,
        message,
      },
    });
  }
}