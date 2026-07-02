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

const ONLINE_TIMEOUT_MS = 60_000;

const SCHEDULE_TIME_ZONE =
  process.env.SCHEDULE_TIME_ZONE ??
  'America/Sao_Paulo';

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
    include: typeof devicePreviewInclude;
  }>;

type SchedulePreview =
  Prisma.ScheduleGetPayload<{
    select: typeof schedulePreviewSelect;
  }>;

interface CurrentDateTime {
  date: string;
  time: string;
  dayOfWeek: number;
}

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
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

        console.error(
          '[DEVICES] Erro ao registrar:',
          error,
        );

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

      if (!normalizedName) {
        throw new BadRequestException(
          'O nome do dispositivo é obrigatório.',
        );
      }

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

      console.error(
        '[DEVICES] Erro ao parear:',
        error,
      );

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

      /*
       * Não filtramos startDate/endDate diretamente com "now".
       *
       * Uma data final armazenada como 00:00 poderia fazer o
       * agendamento terminar no início do último dia.
       *
       * A validação correta acontece em selectActiveSchedule().
       */
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
          const deviceSchedules =
            schedulesByDevice.get(
              device.id,
            ) ?? [];

          const activeSchedule =
            this.selectActiveSchedule(
              deviceSchedules,
              now,
            );

          return this.buildDeviceResponse(
            device,
            activeSchedule,
            now,
          );
        },
      );
    } catch (error) {
      console.error(
        '[DEVICES] Erro ao listar:',
        error,
      );

      throw new InternalServerErrorException(
        'Erro ao listar dispositivos.',
      );
    }
  }

  async findByCode(
    code: string,
  ) {
    try {
      const normalizedCode =
        this.normalizeCode(code);

      const device =
        await this.prisma.device.findUnique({
          where: {
            code:
              normalizedCode,
          },

          select: {
            id: true,
            code: true,
            name: true,
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

      console.error(
        '[DEVICES] Erro ao buscar pelo código:',
        error,
      );

      throw new InternalServerErrorException(
        'Erro ao buscar dispositivo.',
      );
    }
  }

  async currentPlaylist(
    code: string,
  ) {
    try {
      const normalizedCode =
        this.normalizeCode(code);

      const device =
        await this.prisma.device.findUnique({
          where: {
            code:
              normalizedCode,
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

      if (!device.companyId) {
        throw new BadRequestException(
          'Dispositivo não possui uma empresa vinculada.',
        );
      }

      const now =
        new Date();

      /*
       * Busca todos os agendamentos ativos desse player.
       *
       * As datas, os dias e os horários serão verificados em
       * selectActiveSchedule(), usando America/Sao_Paulo.
       */
      const schedules =
        await this.prisma.schedule.findMany({
          where: {
            deviceId:
              device.id,

            companyId:
              device.companyId,

            active: true,
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
          timeZone:
            SCHEDULE_TIME_ZONE,
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

          daysOfWeek:
            activeSchedule.daysOfWeek,

          priority:
            activeSchedule.priority,
        },

        playlist:
          activeSchedule.playlist,

        generatedAt: now,

        timeZone:
          SCHEDULE_TIME_ZONE,
      };
    } catch (error) {
      if (
        error instanceof
        HttpException
      ) {
        throw error;
      }

      console.error(
        '[DEVICES] Erro ao buscar playlist atual:',
        error,
      );

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
                  id:
                    playlistId,
                },
              }
            : {
                disconnect:
                  true,
              };

        playbackData.currentPlaylistItem =
          playlistItemId
            ? {
                connect: {
                  id:
                    playlistItemId,
                },
              }
            : {
                disconnect:
                  true,
              };

        playbackData.currentMedia =
          mediaId
            ? {
                connect: {
                  id:
                    mediaId,
                },
              }
            : {
                disconnect:
                  true,
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
          id:
            device.id,
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

      console.error(
        '[DEVICES] Erro no heartbeat:',
        error,
      );

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
            id:
              deviceId,

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

      /*
       * Novamente, a data não é filtrada diretamente no Prisma.
       */
      const schedules =
        await this.prisma.schedule.findMany({
          where: {
            companyId,
            deviceId,
            active: true,
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

      console.error(
        '[DEVICES] Erro no preview:',
        error,
      );

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
            id:
              deviceId,

            companyId,
          },

          select: {
            id: true,
          },
        });

      if (!device) {
        throw new NotFoundException(
          'Dispositivo não encontrado ou não pertence a esta conta.',
        );
      }

      return await this.prisma.deviceLog.findMany({
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

      console.error(
        '[DEVICES] Erro ao buscar logs:',
        error,
      );

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
      duration !== null &&
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
      id:
        device.id,

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

                startDate:
                  activeSchedule.startDate,

                endDate:
                  activeSchedule.endDate,

                startTime:
                  activeSchedule.startTime,

                endTime:
                  activeSchedule.endTime,

                daysOfWeek:
                  activeSchedule.daysOfWeek,

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
      startDate: Date;
      endDate: Date;
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
    const current =
      this.getCurrentDateTimeInTimeZone(
        now,
        SCHEDULE_TIME_ZONE,
      );

    const activeSchedules =
      schedules.filter(
        schedule => {
          if (!schedule.active) {
            return false;
          }

          const startDate =
            this.formatScheduleDate(
              schedule.startDate,
            );

          const endDate =
            this.formatScheduleDate(
              schedule.endDate,
            );

          const validDate =
            current.date >=
              startDate &&
            current.date <=
              endDate;

          if (!validDate) {
            return false;
          }

          const daysOfWeek =
            this.parseDaysOfWeek(
              schedule.daysOfWeek,
            );

          const validDay =
            daysOfWeek.includes(
              current.dayOfWeek,
            );

          if (!validDay) {
            return false;
          }

          return this.isTimeWithinSchedule(
            current.time,
            schedule.startTime,
            schedule.endTime,
          );
        },
      );

    activeSchedules.sort(
      (
        first,
        second,
      ) =>
        second.priority -
        first.priority,
    );

    return (
      activeSchedules[0] ??
      null
    );
  }

  private getCurrentDateTimeInTimeZone(
    date: Date,
    timeZone: string,
  ): CurrentDateTime {
    const formatter =
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone,

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit',

          hour:
            '2-digit',

          minute:
            '2-digit',

          weekday:
            'short',

          hourCycle:
            'h23',
        },
      );

    const formattedParts =
      formatter.formatToParts(
        date,
      );

    const getPart = (
      type: Intl.DateTimeFormatPartTypes,
    ) =>
      formattedParts.find(
        part =>
          part.type === type,
      )?.value;

    const year =
      getPart('year');

    const month =
      getPart('month');

    const day =
      getPart('day');

    const hour =
      getPart('hour');

    const minute =
      getPart('minute');

    const weekDay =
      getPart('weekday');

    if (
      !year ||
      !month ||
      !day ||
      !hour ||
      !minute ||
      !weekDay
    ) {
      throw new InternalServerErrorException(
        'Não foi possível calcular a data e o horário atuais.',
      );
    }

    const weekDays:
      Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    const dayOfWeek =
      weekDays[weekDay];

    if (
      dayOfWeek ===
      undefined
    ) {
      throw new InternalServerErrorException(
        'Não foi possível identificar o dia da semana atual.',
      );
    }

    return {
      date:
        `${year}-${month}-${day}`,

      time:
        `${hour}:${minute}`,

      dayOfWeek,
    };
  }

  private formatScheduleDate(
    date: Date,
  ) {
    /*
     * startDate/endDate representam datas sem horário.
     *
     * Exemplo:
     * 2026-07-02T00:00:00.000Z
     * vira:
     * 2026-07-02
     */
    return date
      .toISOString()
      .slice(0, 10);
  }

  private parseDaysOfWeek(
    value: string,
  ) {
    return [
      ...new Set(
        value
          .split(',')
          .map(day =>
            Number(
              day.trim(),
            ),
          )
          .filter(
            day =>
              Number.isInteger(
                day,
              ) &&
              day >= 0 &&
              day <= 6,
          ),
      ),
    ];
  }

  private isTimeWithinSchedule(
    currentTime: string,
    startTime: string,
    endTime: string,
  ) {
    /*
     * Se início e fim forem iguais,
     * o agendamento é considerado inválido/inativo.
     */
    if (
      startTime === endTime
    ) {
      return false;
    }

    /*
     * Horário normal.
     *
     * Exemplo:
     * 08:00 até 18:00
     */
    if (
      startTime < endTime
    ) {
      return (
        currentTime >=
          startTime &&
        currentTime <
          endTime
      );
    }

    /*
     * Horário atravessando a meia-noite.
     *
     * Exemplo:
     * 22:00 até 02:00
     */
    return (
      currentTime >=
        startTime ||
      currentTime <
        endTime
    );
  }

  private calculateEstimatedCurrentTime(
    savedTime: number | null,

    playbackUpdatedAt:
      Date | null,

    duration:
      number | null,

    status:
      DeviceStatus,

    now: Date,
  ) {
    if (
      savedTime === null
    ) {
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