import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { DateTime } from 'luxon';
import { DeviceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { DeviceAuthService } from './device-auth.service';
import { DevicesGateway } from './devices.gateway';
import type { AuthenticatedDevice } from './device-auth.types';
import {
  PLAYER_LOG_PREFIX,
  serializeDeviceAuditEvent,
  type DeviceAuditActor,
} from './device-audit';

const ONLINE_TIMEOUT_MS = 60_000;
const SCHEDULE_TIME_ZONE =
  process.env.SCHEDULE_TIME_ZONE ?? 'America/Fortaleza';
const DEFAULT_PROGRAMMING_HOURS = 24;
const MAX_PROGRAMMING_HOURS = 168;
const DEFAULT_PROGRAMMING_LIMIT = 20;
const MAX_PROGRAMMING_LIMIT = 100;
const MAX_PROGRAMMING_RULES = 500;
const devicePreviewInclude = {
  currentPlaylist: {
    select: {
      id: true,
      name: true,
      orientation: true,
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
const programmingScheduleSelect = {
  id: true,
  name: true,
  startDate: true,
  endDate: true,
  startTime: true,
  endTime: true,
  daysOfWeek: true,
  priority: true,
  active: true,
  updatedAt: true,
  playlist: {
    select: {
      id: true,
      name: true,
      orientation: true,
      updatedAt: true,
      overlayBars: {
        orderBy: {
          order: 'asc',
        },
        select: {
          order: true,
          createdAt: true,
          overlayBar: {
            select: {
              id: true,
              name: true,
              position: true,
              sizePercent: true,
              backgroundColor: true,
              opacity: true,
              fit: true,
              contentPosition: true,
              imageSizePercent: true,
              contentPadding: true,
              contentGap: true,
              contentItems: true,
              textContent: true,
              textColor: true,
              fontSize: true,
              widgetType: true,
              weatherLocation: true,
              updatedAt: true,
              media: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  fileUrl: true,
                  fileSize: true,
                  duration: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      },
      items: {
        orderBy: {
          order: 'asc',
        },
        select: {
          id: true,
          order: true,
          duration: true,
          muted: true,
          createdAt: true,
          media: {
            select: {
              id: true,
              name: true,
              type: true,
              fileUrl: true,
              fileSize: true,
              duration: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ScheduleSelect;

type DeviceWithPreviewRelations = Prisma.DeviceGetPayload<{
  include: typeof devicePreviewInclude;
}>;
type SchedulePreview = Prisma.ScheduleGetPayload<{
  select: typeof schedulePreviewSelect;
}>;
type ProgrammingSchedule = Prisma.ScheduleGetPayload<{
  select: typeof programmingScheduleSelect;
}>;

interface ProgrammingOccurrence {
  occurrenceId: string;
  scheduleId: string;
  scheduleName: string;
  playlistId: string;
  startAt: string;
  endAt: string;
  startTimestamp: number;
  endTimestamp: number;
  priority: number;
}
interface ScheduleRule {
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  daysOfWeek: string;
  priority: number;
  active: boolean;
}

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devicesGateway: DevicesGateway,
    private readonly deviceAuthService: DeviceAuthService,
  ) {}

  async registerDevice() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = this.generateCode();
      const activationSecret =
        this.deviceAuthService.generateActivationSecret();
      const activationSecretHash =
        this.deviceAuthService.hashSecret(activationSecret);
      try {
        const device = await this.prisma.device.create({
          data: {
            code,
            activationSecretHash,
            isLinked: false,
            status: DeviceStatus.OFFLINE,
          },
        });
        return {
          id: device.id,
          code: device.code,
          isLinked: device.isLinked,
          activationSecret,
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
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

  activateDevice(code: string, activationSecret: string) {
    return this.deviceAuthService.activateDevice(code, activationSecret);
  }

  async pairDevice(
    code: string,
    name: string,
    companyId: string,
    actor: DeviceAuditActor,
  ) {
    try {
      const normalizedCode = this.normalizeCode(code);
      const normalizedName = name.trim();
      const device = await this.prisma.device.findUnique({
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
      const updatedDevice = await this.prisma.device.update({
        where: {
          id: device.id,
        },
        data: {
          name: normalizedName,
          companyId,
          isLinked: true,
        },
      });
      await this.createAuditLog(device.id, {
        actor,
        action: 'DEVICE_LINKED',
        message: `vinculou o dispositivo "${normalizedName}" à empresa.`,
        entityType: 'DEVICE',
        entityId: device.id,
        metadata: {
          deviceName: normalizedName,
          deviceCode: device.code,
        },
      });
      return updatedDevice;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro ao parear dispositivo.');
    }
  }

  async list(companyId: string) {
    try {
      const now = new Date();
      const devices = await this.prisma.device.findMany({
        where: {
          companyId,
        },
        include: devicePreviewInclude,
        orderBy: {
          createdAt: 'desc',
        },
      });
      if (devices.length === 0) {
        return [];
      }
      const schedules = await this.prisma.schedule.findMany({
        where: {
          companyId,
          deviceId: {
            in: devices.map((device) => device.id),
          },
          active: true,
        },
        select: schedulePreviewSelect,
      });
      const schedulesByDevice = new Map<string, SchedulePreview[]>();
      schedules.forEach((schedule) => {
        const current = schedulesByDevice.get(schedule.deviceId) ?? [];
        current.push(schedule);
        schedulesByDevice.set(schedule.deviceId, current);
      });
      return devices.map((device) => {
        const activeSchedule = this.selectActiveSchedule(
          schedulesByDevice.get(device.id) ?? [],
          now,
        );
        return this.buildDeviceResponse(device, activeSchedule, now);
      });
    } catch {
      throw new InternalServerErrorException('Erro ao listar dispositivos.');
    }
  }

  async findByCode(code: string) {
    try {
      const device = await this.prisma.device.findUnique({
        where: {
          code: this.normalizeCode(code),
        },
        select: {
          id: true,
          code: true,
          name: true,
          isLinked: true,
        },
      });
      if (!device) {
        throw new NotFoundException('Dispositivo não encontrado.');
      }
      return device;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro ao buscar dispositivo.');
    }
  }

  async currentPlaylist(code: string) {
    try {
      const device = await this.prisma.device.findUnique({
        where: {
          code: this.normalizeCode(code),
        },
      });
      if (!device) {
        throw new NotFoundException('Dispositivo não encontrado.');
      }
      if (!device.isLinked) {
        throw new BadRequestException('Dispositivo não está vinculado.');
      }
      if (!device.companyId) {
        throw new BadRequestException(
          'Dispositivo não possui uma empresa vinculada.',
        );
      }
      const now = new Date();
      const schedules = await this.prisma.schedule.findMany({
        where: {
          deviceId: device.id,
          companyId: device.companyId,
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
      const activeSchedule = this.selectActiveSchedule<
        (typeof schedules)[number]
      >(schedules, now);
      const localNow = this.getLocalDateTime(now);
      if (!activeSchedule) {
        return {
          schedule: null,
          playlist: null,
          generatedAt: now.toISOString(),
          localDate: localNow.toFormat('yyyy-MM-dd'),
          localTime: localNow.toFormat('HH:mm'),
          timeZone: SCHEDULE_TIME_ZONE,
        };
      }
      return {
        schedule: {
          id: activeSchedule.id,
          name: activeSchedule.name,
          startDate: this.formatDateOnly(activeSchedule.startDate),
          endDate: this.formatDateOnly(activeSchedule.endDate),
          startTime: activeSchedule.startTime,
          endTime: activeSchedule.endTime,
          daysOfWeek: this.parseDaysOfWeek(activeSchedule.daysOfWeek),
          priority: activeSchedule.priority,
        },
        playlist: activeSchedule.playlist,
        generatedAt: now.toISOString(),
        localDate: localNow.toFormat('yyyy-MM-dd'),
        localTime: localNow.toFormat('HH:mm'),
        timeZone: SCHEDULE_TIME_ZONE,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('[DEVICES] Erro ao buscar playlist atual:', error);
      throw new InternalServerErrorException('Erro ao buscar playlist atual.');
    }
  }

  async programming(
    code: string,
    hours = DEFAULT_PROGRAMMING_HOURS,
    limit = DEFAULT_PROGRAMMING_LIMIT,
  ) {
    try {
      const normalizedCode = this.normalizeCode(code);
      const safeHours = this.normalizeProgrammingHours(hours);
      const safeLimit = this.normalizeProgrammingLimit(limit);
      const device = await this.prisma.device.findUnique({
        where: {
          code: normalizedCode,
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
        throw new NotFoundException('Dispositivo não encontrado.');
      }
      if (!device.isLinked) {
        throw new BadRequestException('Dispositivo não está vinculado.');
      }
      if (!device.companyId) {
        throw new BadRequestException(
          'Dispositivo não possui uma empresa vinculada.',
        );
      }
      const serverNow = new Date();
      const windowStart = this.getLocalDateTime(serverNow);
      const windowEnd = windowStart.plus({
        hours: safeHours,
      });
      const databaseStartDate = new Date(
        `${windowStart
          .minus({
            days: 1,
          })
          .toISODate()}T00:00:00.000Z`,
      );
      const databaseEndDate = new Date(
        `${windowEnd.toISODate()}T23:59:59.999Z`,
      );
      const schedules = await this.prisma.schedule.findMany({
        where: {
          deviceId: device.id,
          companyId: device.companyId,
          active: true,
          startDate: {
            lte: databaseEndDate,
          },
          endDate: {
            gte: databaseStartDate,
          },
        },
        select: programmingScheduleSelect,
        orderBy: [
          {
            priority: 'desc',
          },
          {
            startDate: 'asc',
          },
          {
            startTime: 'asc',
          },
        ],
        take: MAX_PROGRAMMING_RULES,
      });
      const allOccurrences = schedules.flatMap((schedule) =>
        this.createScheduleOccurrences(schedule, windowStart, windowEnd),
      );
      const nowTimestamp = windowStart.toMillis();
      const selectedOccurrences = allOccurrences
        .sort((first, second) => {
          const firstIsActive =
            first.startTimestamp <= nowTimestamp &&
            nowTimestamp < first.endTimestamp;
          const secondIsActive =
            second.startTimestamp <= nowTimestamp &&
            nowTimestamp < second.endTimestamp;
          if (firstIsActive !== secondIsActive) {
            return firstIsActive ? -1 : 1;
          }
          if (first.startTimestamp !== second.startTimestamp) {
            return first.startTimestamp - second.startTimestamp;
          }
          return second.priority - first.priority;
        })
        .slice(0, safeLimit);
      const selectedScheduleIds = new Set(
        selectedOccurrences.map((occurrence) => occurrence.scheduleId),
      );
      const selectedSchedules = schedules.filter((schedule) =>
        selectedScheduleIds.has(schedule.id),
      );
      const playlists = this.buildUniqueProgrammingPlaylists(selectedSchedules);
      const currentOccurrence =
        selectedOccurrences
          .filter(
            (occurrence) =>
              occurrence.startTimestamp <= nowTimestamp &&
              nowTimestamp < occurrence.endTimestamp,
          )
          .sort((first, second) => second.priority - first.priority)[0] ?? null;
      const publicOccurrences = selectedOccurrences.map((occurrence) => ({
        occurrenceId: occurrence.occurrenceId,
        scheduleId: occurrence.scheduleId,
        scheduleName: occurrence.scheduleName,
        playlistId: occurrence.playlistId,
        startAt: occurrence.startAt,
        endAt: occurrence.endAt,
        priority: occurrence.priority,
      }));
      const version = this.createProgrammingVersion({
        occurrences: publicOccurrences,
        playlists,
      });
      return {
        serverTime: serverNow.toISOString(),
        localDate: windowStart.toFormat('yyyy-MM-dd'),
        localTime: windowStart.toFormat('HH:mm:ss'),
        timeZone: SCHEDULE_TIME_ZONE,
        version,
        programmingUpdatedAt: this.getProgrammingUpdatedAt(selectedSchedules),
        window: {
          hours: safeHours,
          limit: safeLimit,
          startsAt: windowStart.toUTC().toISO(),
          endsAt: windowEnd.toUTC().toISO(),
          hasMore: allOccurrences.length > selectedOccurrences.length,
        },
        device: {
          id: device.id,
          code: device.code,
          name: device.name,
        },
        currentOccurrenceId: currentOccurrence?.occurrenceId ?? null,
        currentScheduleId: currentOccurrence?.scheduleId ?? null,
        occurrences: publicOccurrences,
        playlists,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('[DEVICES] Erro ao buscar programação:', error);
      throw new InternalServerErrorException(
        'Erro ao buscar programação do dispositivo.',
      );
    }
  }

  async unlinkDevice(
    deviceId: string,
    companyId: string,
    actor: DeviceAuditActor,
  ) {
    try {
      const device = await this.prisma.device.findFirst({
        where: {
          id: deviceId,
          companyId,
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });
      if (!device) {
        throw new NotFoundException(
          'Dispositivo não encontrado ou não pertence a esta conta.',
        );
      }
      await this.prisma.$transaction(async (transaction) => {
        await transaction.schedule.deleteMany({
          where: {
            deviceId: device.id,
          },
        });
        await transaction.device.update({
          where: {
            id: device.id,
          },
          data: {
            name: null,
            companyId: null,
            isLinked: false,
            status: DeviceStatus.OFFLINE,
            lastHeartbeat: null,
            currentPlaylistId: null,
            currentPlaylistItemId: null,
            currentMediaId: null,
            currentMediaTime: null,
            currentMediaDuration: null,
            currentMediaStartedAt: null,
            playbackUpdatedAt: null,
            deviceTokenHash: null,
            deviceTokenRevokedAt: new Date(),
          },
        });
        await transaction.deviceLog.create({
          data: {
            deviceId: device.id,
            message: serializeDeviceAuditEvent({
              actor,
              action: 'DEVICE_UNLINKED',
              message: `desvinculou o dispositivo "${device.name || device.code}" da empresa.`,
              entityType: 'DEVICE',
              entityId: device.id,
              metadata: {
                deviceName: device.name,
                deviceCode: device.code,
              },
            }),
          },
        });
      });
      this.devicesGateway.notifyDeviceUnlinked(device.id, 'UNLINKED', true);
      return {
        success: true,
        deviceId: device.id,
        code: device.code,
        keepCode: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('[DEVICES] Erro ao desvincular dispositivo:', error);
      throw new InternalServerErrorException(
        'Erro ao desvincular dispositivo.',
      );
    }
  }

  async deleteDevice(deviceId: string, companyId: string) {
    try {
      const device = await this.prisma.device.findFirst({
        where: {
          id: deviceId,
          companyId,
        },
        select: {
          id: true,
          code: true,
        },
      });
      if (!device) {
        throw new NotFoundException(
          'Dispositivo não encontrado ou não pertence a esta conta.',
        );
      }
      await this.prisma.$transaction(async (transaction) => {
        await transaction.schedule.deleteMany({
          where: {
            deviceId: device.id,
          },
        });
        await transaction.deviceLog.deleteMany({
          where: {
            deviceId: device.id,
          },
        });
        await transaction.device.delete({
          where: {
            id: device.id,
          },
        });
      });
      this.devicesGateway.notifyDeviceUnlinked(device.id, 'DELETED', false);
      return {
        success: true,
        deviceId: device.id,
        code: device.code,
        keepCode: false,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('[DEVICES] Erro ao excluir dispositivo:', error);
      throw new InternalServerErrorException('Erro ao excluir dispositivo.');
    }
  }

  async heartbeat(dto: HeartbeatDto, device: AuthenticatedDevice) {
    try {
      const now = new Date();
      const includesPlaybackState = [
        'playlistId',
        'playlistItemId',
        'mediaId',
        'currentTime',
        'duration',
        'muted',
        'startedAt',
      ].some((key) => Object.prototype.hasOwnProperty.call(dto, key));
      const playbackData: Prisma.DeviceUpdateInput = {
        lastHeartbeat: now,
        status: DeviceStatus.ONLINE,
      };
      if (includesPlaybackState) {
        const playlistId = dto.playlistId ?? null;
        const playlistItemId = dto.playlistItemId ?? null;
        const mediaId = dto.mediaId ?? null;
        const informedIds = [playlistId, playlistItemId, mediaId].filter(
          Boolean,
        ).length;
        if (informedIds !== 0 && informedIds !== 3) {
          throw new BadRequestException(
            'Playlist, item e mídia devem ser informados juntos.',
          );
        }
        const playbackIdentityChanged =
          playlistId !== device.currentPlaylistId ||
          playlistItemId !== device.currentPlaylistItemId ||
          mediaId !== device.currentMediaId;

        if (
          playbackIdentityChanged &&
          playlistId &&
          playlistItemId &&
          mediaId
        ) {
          const validItem = await this.prisma.playlistItem.findFirst({
            where: {
              id: playlistItemId,
              playlistId,
              mediaId,
              playlist: {
                companyId: device.companyId,
              },
              media: {
                companyId: device.companyId,
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
        playbackData.currentPlaylist = playlistId
          ? {
              connect: {
                id: playlistId,
              },
            }
          : {
              disconnect: true,
            };
        playbackData.currentPlaylistItem = playlistItemId
          ? {
              connect: {
                id: playlistItemId,
              },
            }
          : {
              disconnect: true,
            };
        playbackData.currentMedia = mediaId
          ? {
              connect: {
                id: mediaId,
              },
            }
          : {
              disconnect: true,
            };
        playbackData.currentMediaTime = dto.currentTime ?? null;
        playbackData.currentMediaDuration = dto.duration ?? null;
        playbackData.playbackMuted = dto.muted ?? null;
        playbackData.currentMediaStartedAt = dto.startedAt
          ? new Date(dto.startedAt)
          : null;
        playbackData.playbackUpdatedAt = now;
      }
      await this.prisma.device.update({
        where: {
          id: device.id,
        },
        data: playbackData,
      });
      return {
        success: true,
        receivedAt: now.toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro ao processar heartbeat.');
    }
  }

  async preview(deviceId: string, companyId: string) {
    try {
      const now = new Date();
      const device = await this.prisma.device.findFirst({
        where: {
          id: deviceId,
          companyId,
        },
        include: devicePreviewInclude,
      });
      if (!device) {
        throw new NotFoundException(
          'Dispositivo não encontrado ou não pertence a esta conta.',
        );
      }
      const schedules = await this.prisma.schedule.findMany({
        where: {
          companyId,
          deviceId,
          active: true,
        },
        select: schedulePreviewSelect,
      });
      const activeSchedule = this.selectActiveSchedule<
        (typeof schedules)[number]
      >(schedules, now);
      return this.buildDeviceResponse(device, activeSchedule, now);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Erro ao buscar preview do dispositivo.',
      );
    }
  }

  async logs(deviceId: string, companyId: string) {
    try {
      const device = await this.prisma.device.findFirst({
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
          NOT: {
            message: {
              startsWith: PLAYER_LOG_PREFIX,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 500,
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro ao buscar logs.');
    }
  }

  private buildDeviceResponse(
    device: DeviceWithPreviewRelations,
    activeSchedule: SchedulePreview | null,
    now: Date,
  ) {
    const status = this.getDeviceStatus(device.lastHeartbeat, now);
    const duration =
      device.currentMediaDuration ??
      device.currentPlaylistItem?.duration ??
      device.currentMedia?.duration ??
      null;
    const currentTime = this.calculateEstimatedCurrentTime(
      device.currentMediaTime,
      device.playbackUpdatedAt,
      duration,
      status,
      now,
    );
    const progress =
      duration && duration > 0 && currentTime !== null
        ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
        : null;
    return {
      id: device.id,
      name: device.name,
      code: device.code,
      isLinked: device.isLinked,
      status,
      lastHeartbeat: device.lastHeartbeat,
      companyId: device.companyId,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
      preview: {
        schedule: activeSchedule
          ? {
              id: activeSchedule.id,
              name: activeSchedule.name,
              startDate: this.formatDateOnly(activeSchedule.startDate),
              endDate: this.formatDateOnly(activeSchedule.endDate),
              startTime: activeSchedule.startTime,
              endTime: activeSchedule.endTime,
              daysOfWeek: this.parseDaysOfWeek(activeSchedule.daysOfWeek),
              priority: activeSchedule.priority,
            }
          : null,
        playlist: device.currentPlaylist
          ? {
              id: device.currentPlaylist.id,
              name: device.currentPlaylist.name,
            }
          : null,
        item: device.currentPlaylistItem
          ? {
              id: device.currentPlaylistItem.id,
              order: device.currentPlaylistItem.order,
            }
          : null,
        media: device.currentMedia
          ? {
              id: device.currentMedia.id,
              name: device.currentMedia.name,
              type: device.currentMedia.type,
              fileUrl: device.currentMedia.fileUrl,
              duration: device.currentMedia.duration,
            }
          : null,
        playback: {
          currentTime,
          duration,
          progress,
          muted: device.playbackMuted,
          startedAt: device.currentMediaStartedAt,
          updatedAt: device.playbackUpdatedAt,
        },
      },
    };
  }

  private selectActiveSchedule<T extends ScheduleRule>(
    schedules: T[],
    date = new Date(),
  ): T | null {
    const current = this.getLocalDateTime(date);
    return (
      schedules
        .filter(
          (schedule) =>
            schedule.active && this.isScheduleActiveAt(schedule, current),
        )
        .sort((first, second) => second.priority - first.priority)[0] ?? null
    );
  }

  private isScheduleActiveAt(schedule: ScheduleRule, current: DateTime) {
    if (schedule.startTime === schedule.endTime) {
      return false;
    }
    const currentDate = current.toFormat('yyyy-MM-dd');
    const currentTime = current.toFormat('HH:mm');
    const currentDay = current.weekday % 7;
    const scheduleStartDate = this.formatDateOnly(schedule.startDate);
    const scheduleEndDate = this.formatDateOnly(schedule.endDate);
    const validDays = this.parseDaysOfWeek(schedule.daysOfWeek);
    if (schedule.startTime < schedule.endTime) {
      return (
        currentDate >= scheduleStartDate &&
        currentDate <= scheduleEndDate &&
        validDays.includes(currentDay) &&
        currentTime >= schedule.startTime &&
        currentTime < schedule.endTime
      );
    }
    if (currentTime >= schedule.startTime) {
      return (
        currentDate >= scheduleStartDate &&
        currentDate <= scheduleEndDate &&
        validDays.includes(currentDay)
      );
    }
    if (currentTime < schedule.endTime) {
      const previous = current.minus({
        days: 1,
      });
      const previousDate = previous.toFormat('yyyy-MM-dd');
      const previousDay = previous.weekday % 7;
      return (
        previousDate >= scheduleStartDate &&
        previousDate <= scheduleEndDate &&
        validDays.includes(previousDay)
      );
    }
    return false;
  }

  private createScheduleOccurrences(
    schedule: ProgrammingSchedule,
    windowStart: DateTime,
    windowEnd: DateTime,
  ): ProgrammingOccurrence[] {
    const occurrences: ProgrammingOccurrence[] = [];
    if (!schedule.active || schedule.startTime === schedule.endTime) {
      return occurrences;
    }
    const scheduleStartDate = this.formatDateOnly(schedule.startDate);
    const scheduleEndDate = this.formatDateOnly(schedule.endDate);
    const validDays = this.parseDaysOfWeek(schedule.daysOfWeek);
    let cursor = windowStart.startOf('day').minus({
      days: 1,
    });
    const lastDay = windowEnd.endOf('day');
    while (cursor.toMillis() <= lastDay.toMillis()) {
      const date = cursor.toFormat('yyyy-MM-dd');
      const dayOfWeek = cursor.weekday % 7;
      const dateIsValid = date >= scheduleStartDate && date <= scheduleEndDate;
      const dayIsValid = validDays.includes(dayOfWeek);
      if (dateIsValid && dayIsValid) {
        const startsAt = DateTime.fromFormat(
          `${date} ${schedule.startTime}`,
          'yyyy-MM-dd HH:mm',
          {
            zone: SCHEDULE_TIME_ZONE,
          },
        );
        let endsAt: DateTime;
        if (schedule.startTime < schedule.endTime) {
          endsAt = DateTime.fromFormat(
            `${date} ${schedule.endTime}`,
            'yyyy-MM-dd HH:mm',
            {
              zone: SCHEDULE_TIME_ZONE,
            },
          );
        } else {
          const nextDate = cursor
            .plus({
              days: 1,
            })
            .toFormat('yyyy-MM-dd');
          endsAt = DateTime.fromFormat(
            `${nextDate} ${schedule.endTime}`,
            'yyyy-MM-dd HH:mm',
            {
              zone: SCHEDULE_TIME_ZONE,
            },
          );
        }
        if (startsAt.isValid && endsAt.isValid) {
          const overlapsWindow =
            endsAt.toMillis() > windowStart.toMillis() &&
            startsAt.toMillis() < windowEnd.toMillis();
          if (overlapsWindow) {
            const startTimestamp = startsAt.toMillis();
            const endTimestamp = endsAt.toMillis();
            occurrences.push({
              occurrenceId: `${schedule.id}:${startTimestamp}`,
              scheduleId: schedule.id,
              scheduleName: schedule.name,
              playlistId: schedule.playlist.id,
              startAt: startsAt.toUTC().toISO(),
              endAt: endsAt.toUTC().toISO()!,
              startTimestamp,
              endTimestamp,
              priority: schedule.priority,
            });
          }
        }
      }
      cursor = cursor.plus({
        days: 1,
      });
    }
    return occurrences;
  }

  private buildUniqueProgrammingPlaylists(schedules: ProgrammingSchedule[]) {
    const playlistsMap = new Map<string, ProgrammingSchedule['playlist']>();
    for (const schedule of schedules) {
      playlistsMap.set(schedule.playlist.id, schedule.playlist);
    }
    return Array.from(playlistsMap.values()).map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      orientation: playlist.orientation,
      updatedAt: playlist.updatedAt.toISOString(),
      bars: playlist.overlayBars.map((item) => ({
        id: item.overlayBar.id,
        name: item.overlayBar.name,
        position: item.overlayBar.position,
        sizePercent: item.overlayBar.sizePercent,
        backgroundColor: item.overlayBar.backgroundColor,
        opacity: item.overlayBar.opacity,
        fit: item.overlayBar.fit,
        contentPosition: item.overlayBar.contentPosition,
        imageSizePercent: item.overlayBar.imageSizePercent,
        contentPadding: item.overlayBar.contentPadding,
        contentGap: item.overlayBar.contentGap,
        contentItems: item.overlayBar.contentItems,
        textContent: item.overlayBar.textContent,
        textColor: item.overlayBar.textColor,
        fontSize: item.overlayBar.fontSize,
        widgetType: item.overlayBar.widgetType,
        weatherLocation: item.overlayBar.weatherLocation,
        order: item.order,
        updatedAt: item.overlayBar.updatedAt.toISOString(),
        media: item.overlayBar.media
          ? {
              id: item.overlayBar.media.id,
              name: item.overlayBar.media.name,
              type: item.overlayBar.media.type,
              fileUrl: item.overlayBar.media.fileUrl,
              fileSize: item.overlayBar.media.fileSize,
              duration: item.overlayBar.media.duration,
              updatedAt: item.overlayBar.media.updatedAt.toISOString(),
            }
          : null,
      })),
      items: playlist.items.map((item) => ({
        id: item.id,
        order: item.order,
        duration: item.duration,
        muted: item.muted,
        media: {
          id: item.media.id,
          name: item.media.name,
          type: item.media.type,
          fileUrl: item.media.fileUrl,
          fileSize: item.media.fileSize,
          duration: item.media.duration,
          updatedAt: item.media.updatedAt.toISOString(),
        },
      })),
    }));
  }

  private getLocalDateTime(date = new Date()) {
    const localDateTime = DateTime.fromJSDate(date).setZone(SCHEDULE_TIME_ZONE);
    if (!localDateTime.isValid) {
      throw new InternalServerErrorException(
        'Não foi possível calcular o horário local.',
      );
    }
    return localDateTime;
  }

  private formatDateOnly(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private parseDaysOfWeek(value: string) {
    if (!value) {
      return [];
    }
    const normalized = value
      .replace(/\[/g, '')
      .replace(/\]/g, '')
      .replace(/"/g, '');
    return [
      ...new Set(
        normalized
          .split(',')
          .map((day) => Number(day.trim()))
          .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
      ),
    ].sort((first, second) => first - second);
  }

  private normalizeProgrammingHours(hours: number) {
    if (!Number.isFinite(hours)) {
      return DEFAULT_PROGRAMMING_HOURS;
    }
    return Math.min(MAX_PROGRAMMING_HOURS, Math.max(1, Math.floor(hours)));
  }

  private normalizeProgrammingLimit(limit: number) {
    if (!Number.isFinite(limit)) {
      return DEFAULT_PROGRAMMING_LIMIT;
    }
    return Math.min(MAX_PROGRAMMING_LIMIT, Math.max(1, Math.floor(limit)));
  }

  private createProgrammingVersion(programming: unknown) {
    return createHash('sha256')
      .update(JSON.stringify(programming))
      .digest('hex');
  }

  private getProgrammingUpdatedAt(schedules: ProgrammingSchedule[]) {
    if (schedules.length === 0) {
      return null;
    }
    let latestTimestamp = 0;
    for (const schedule of schedules) {
      latestTimestamp = Math.max(
        latestTimestamp,
        schedule.updatedAt.getTime(),
        schedule.playlist.updatedAt.getTime(),
      );
      for (const item of schedule.playlist.items) {
        latestTimestamp = Math.max(
          latestTimestamp,
          item.createdAt.getTime(),
          item.media.updatedAt.getTime(),
        );
      }
      for (const item of schedule.playlist.overlayBars) {
        latestTimestamp = Math.max(
          latestTimestamp,
          item.createdAt.getTime(),
          item.overlayBar.updatedAt.getTime(),
          item.overlayBar.media?.updatedAt.getTime() ?? 0,
        );
      }
    }
    return latestTimestamp > 0 ? new Date(latestTimestamp).toISOString() : null;
  }

  private calculateEstimatedCurrentTime(
    savedTime: number | null,
    playbackUpdatedAt: Date | null,
    duration: number | null,
    status: DeviceStatus,
    now: Date,
  ) {
    if (savedTime === null) {
      return null;
    }
    let estimated = Math.max(0, savedTime);
    if (status === DeviceStatus.ONLINE && playbackUpdatedAt) {
      estimated += Math.max(
        0,
        Math.floor((now.getTime() - playbackUpdatedAt.getTime()) / 1000),
      );
    }
    if (duration !== null && duration > 0) {
      return Math.min(estimated, duration);
    }
    return estimated;
  }

  private getDeviceStatus(lastHeartbeat: Date | null, now: Date) {
    if (!lastHeartbeat) {
      return DeviceStatus.OFFLINE;
    }
    const difference = now.getTime() - lastHeartbeat.getTime();
    return difference < ONLINE_TIMEOUT_MS
      ? DeviceStatus.ONLINE
      : DeviceStatus.OFFLINE;
  }

  private generateCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from(
      {
        length: 6,
      },
      () => alphabet[randomInt(0, alphabet.length)],
    ).join('');
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }

  private createAuditLog(
    deviceId: string,
    event: Parameters<typeof serializeDeviceAuditEvent>[0],
  ) {
    return this.prisma.deviceLog.create({
      data: {
        deviceId,
        message: serializeDeviceAuditEvent(event),
      },
    });
  }
}
