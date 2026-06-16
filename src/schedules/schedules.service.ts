import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateScheduleDto } from './dto/updateSchedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(data: any) {
    const device =
      await this.prisma.device.findUnique({
        where: {
          id: data.deviceId,
        },
      });

    if (!device) {
      throw new NotFoundException(
        'Player não encontrado',
      );
    }

    const playlist =
      await this.prisma.playlist.findUnique({
        where: {
          id: data.playlistId,
        },
      });

    if (!playlist) {
      throw new NotFoundException(
        'Playlist não encontrada',
      );
    }

    return this.prisma.schedule.create({
      data: {
        name: data.name,

        companyId: data.companyId,

        deviceId: data.deviceId,

        playlistId: data.playlistId,

        startDate: new Date(data.startDate),

        endDate: new Date(data.endDate),

        startTime: data.startTime,

        endTime: data.endTime,

        daysOfWeek: data.daysOfWeek,

        priority: data.priority ?? 1,
      },
    });
  }

  async update(
  id: string,
  dto: UpdateScheduleDto,
) {
  const schedule =
    await this.prisma.schedule.findUnique({
      where: {
        id,
      },
    });

  if (!schedule) {
    throw new NotFoundException(
      'Agendamento não encontrado',
    );
  }

  return this.prisma.schedule.update({
    where: {
      id,
    },

    data: dto,
  });
}

  async list(
    companyId: string,
  ) {
    return this.prisma.schedule.findMany({
      where: {
        companyId,
      },

      include: {
        device: true,
        playlist: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const schedule =
      await this.prisma.schedule.findUnique({
        where: {
          id,
        },

        include: {
          device: true,

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

    if (!schedule) {
      throw new NotFoundException(
        'Agendamento não encontrado',
      );
    }

    return schedule;
  }
}