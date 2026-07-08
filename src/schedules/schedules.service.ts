import { BadRequestException, HttpException,  Injectable, InternalServerErrorException,  NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DevicesGateway } from '../devices/devices.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/createSchedule.dto';
import { UpdateScheduleDto } from './dto/updateSchedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devicesGateway: DevicesGateway,
  ) {}

  async create(
    companyId: string,
    data: CreateScheduleDto,
  ) {
    try {
      const [device, playlist] =
        await Promise.all([
          this.prisma.device.findFirst({
            where: {
              id: data.deviceId,
              companyId,
            },
          }),

          this.prisma.playlist.findFirst({
            where: {
              id: data.playlistId,
              companyId,
            },
          }),
        ]);

      if (!device) {
        throw new NotFoundException(
          'Player não encontrado ou não pertence à sua empresa.',
        );
      }

      if (!device.isLinked) {
        throw new BadRequestException(
          'O player precisa estar vinculado antes de receber um agendamento.',
        );
      }

      if (!playlist) {
        throw new NotFoundException(
          'Playlist não encontrada ou não pertence à sua empresa.',
        );
      }

      const name = data.name.trim();

      if (!name) {
        throw new BadRequestException(
          'O nome do agendamento é obrigatório.',
        );
      }

      const startDate = this.parseDate(
        data.startDate,
        'Data inicial',
      );

      const endDate = this.parseDate(
        data.endDate,
        'Data final',
      );

      this.validateDateRange(
        startDate,
        endDate,
      );

      this.validateTime(
        data.startTime,
        'Horário inicial',
      );

      this.validateTime(
        data.endTime,
        'Horário final',
      );

      const daysOfWeek =
        this.normalizeDaysOfWeek(
          data.daysOfWeek,
        );

      const priority =
        data.priority ?? 1;

      this.validatePriority(priority);

      const schedule =
        await this.prisma.schedule.create({
          data: {
            name,
            companyId,
            deviceId: data.deviceId,
            playlistId: data.playlistId,
            startDate,
            endDate,
            startTime: data.startTime,
            endTime: data.endTime,
            daysOfWeek,
            priority,
            active: data.active ?? true,
          },

          include: {
            device: true,
            playlist: true,
          },
        });

      this.devicesGateway.notifyProgrammingChanged(
        schedule.deviceId,
        'SCHEDULE_CREATED',
        schedule.id,
      );

      return schedule;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error(
        '[SCHEDULES] Erro ao criar:',
        error,
      );

      throw new InternalServerErrorException(
        'Erro interno ao criar agendamento.',
      );
    }
  }

  async update(
    id: string,
    companyId: string,
    dto: UpdateScheduleDto,
  ) {
    try {
      const schedule =
        await this.prisma.schedule.findFirst({
          where: {
            id,
            companyId,
          },
        });

      if (!schedule) {
        throw new NotFoundException(
          'Agendamento não encontrado.',
        );
      }

      if (dto.deviceId) {
        const device =
          await this.prisma.device.findFirst({
            where: {
              id: dto.deviceId,
              companyId,
            },
          });

        if (!device) {
          throw new NotFoundException(
            'Player não encontrado ou não pertence à sua empresa.',
          );
        }

        if (!device.isLinked) {
          throw new BadRequestException(
            'O player precisa estar vinculado antes de receber um agendamento.',
          );
        }
      }

      if (dto.playlistId) {
        const playlist =
          await this.prisma.playlist.findFirst({
            where: {
              id: dto.playlistId,
              companyId,
            },
          });

        if (!playlist) {
          throw new NotFoundException(
            'Playlist não encontrada ou não pertence à sua empresa.',
          );
        }
      }

      const startDate = dto.startDate
        ? this.parseDate(
            dto.startDate,
            'Data inicial',
          )
        : schedule.startDate;

      const endDate = dto.endDate
        ? this.parseDate(
            dto.endDate,
            'Data final',
          )
        : schedule.endDate;

      this.validateDateRange(
        startDate,
        endDate,
      );

      const startTime =
        dto.startTime ?? schedule.startTime;

      const endTime =
        dto.endTime ?? schedule.endTime;

      this.validateTime(
        startTime,
        'Horário inicial',
      );

      this.validateTime(
        endTime,
        'Horário final',
      );

      const priority =
        dto.priority ?? schedule.priority;

      this.validatePriority(priority);

      const updateData:
        Prisma.ScheduleUncheckedUpdateInput = {};

      if (dto.name !== undefined) {
        const name = dto.name.trim();

        if (!name) {
          throw new BadRequestException(
            'O nome do agendamento é obrigatório.',
          );
        }

        updateData.name = name;
      }

      if (dto.deviceId !== undefined) {
        updateData.deviceId = dto.deviceId;
      }

      if (dto.playlistId !== undefined) {
        updateData.playlistId = dto.playlistId;
      }

      if (dto.startDate !== undefined) {
        updateData.startDate = startDate;
      }

      if (dto.endDate !== undefined) {
        updateData.endDate = endDate;
      }

      if (dto.startTime !== undefined) {
        updateData.startTime = startTime;
      }

      if (dto.endTime !== undefined) {
        updateData.endTime = endTime;
      }

      if (dto.daysOfWeek !== undefined) {
        updateData.daysOfWeek =
          this.normalizeDaysOfWeek(
            dto.daysOfWeek,
          );
      }

      if (dto.priority !== undefined) {
        updateData.priority = priority;
      }

      if (dto.active !== undefined) {
        updateData.active = dto.active;
      }

      const updatedSchedule =
        await this.prisma.schedule.update({
          where: {
            id: schedule.id,
          },

          data: updateData,

          include: {
            device: true,
            playlist: true,
          },
        });

      this.devicesGateway.notifyProgrammingChanged(
        updatedSchedule.deviceId,
        'SCHEDULE_UPDATED',
        updatedSchedule.id,
      );

      if (
        schedule.deviceId !==
        updatedSchedule.deviceId
      ) {
        this.devicesGateway.notifyProgrammingChanged(
          schedule.deviceId,
          'SCHEDULE_UPDATED',
          updatedSchedule.id,
        );
      }

      return updatedSchedule;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error(
        '[SCHEDULES] Erro ao atualizar:',
        error,
      );

      throw new InternalServerErrorException(
        'Erro interno ao atualizar agendamento.',
      );
    }
  }

  async list(companyId: string) {
    try {
      return await this.prisma.schedule.findMany({
        where: {
          companyId,
        },

        include: {
          device: true,
          playlist: true,
        },

        orderBy: [
          {
            active: 'desc',
          },
          {
            priority: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
      });
    } catch (error) {
      console.error(
        '[SCHEDULES] Erro ao listar:',
        error,
      );

      throw new InternalServerErrorException(
        'Erro interno ao listar agendamentos.',
      );
    }
  }

  async findOne(
    id: string,
    companyId: string,
  ) {
    try {
      const schedule =
        await this.prisma.schedule.findFirst({
          where: {
            id,
            companyId,
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
          'Agendamento não encontrado.',
        );
      }

      return schedule;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error(
        '[SCHEDULES] Erro ao buscar:',
        error,
      );

      throw new InternalServerErrorException(
        'Erro interno ao buscar agendamento.',
      );
    }
  }

  async remove(
    id: string,
    companyId: string,
  ) {
    try {
      const schedule =
        await this.prisma.schedule.findFirst({
          where: {
            id,
            companyId,
          },

          select: {
            id: true,
            deviceId: true,
          },
        });

      if (!schedule) {
        throw new NotFoundException(
          'Agendamento não encontrado.',
        );
      }

      await this.prisma.schedule.delete({
        where: {
          id: schedule.id,
        },
      });

      this.devicesGateway.notifyProgrammingChanged(
        schedule.deviceId,
        'SCHEDULE_DELETED',
        schedule.id,
      );

      return {
        success: true,
        message:
          'Agendamento excluído com sucesso.',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error(
        '[SCHEDULES] Erro ao excluir:',
        error,
      );

      throw new InternalServerErrorException(
        'Erro interno ao excluir agendamento.',
      );
    }
  }

  private parseDate(
    value: string | Date,
    fieldName: string,
  ) {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new BadRequestException(
          `${fieldName} inválida.`,
        );
      }

      return value;
    }

    const normalizedValue =
      /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? `${value}T00:00:00`
        : value;

    const date = new Date(normalizedValue);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        `${fieldName} inválida.`,
      );
    }

    return date;
  }

  private validateDateRange(
    startDate: Date,
    endDate: Date,
  ) {
    if (
      endDate.getTime() <
      startDate.getTime()
    ) {
      throw new BadRequestException(
        'A data final não pode ser anterior à data inicial.',
      );
    }
  }

  private validateTime(
    value: string,
    fieldName: string,
  ) {
    const validTime =
      /^([01]\d|2[0-3]):[0-5]\d$/.test(
        value,
      );

    if (!validTime) {
      throw new BadRequestException(
        `${fieldName} deve estar no formato HH:mm.`,
      );
    }
  }

  private normalizeDaysOfWeek(
    value: string,
  ) {
    if (typeof value !== 'string') {
      throw new BadRequestException(
        'Os dias da semana são inválidos.',
      );
    }

    const days = value
      .split(',')
      .map(day => day.trim())
      .filter(Boolean);

    if (days.length === 0) {
      throw new BadRequestException(
        'Informe pelo menos um dia da semana.',
      );
    }

    const invalidDay = days.find(day => {
      const number = Number(day);

      return (
        !Number.isInteger(number) ||
        number < 0 ||
        number > 6
      );
    });

    if (invalidDay) {
      throw new BadRequestException(
        'Os dias da semana devem estar entre 0 e 6.',
      );
    }

    return [...new Set(days.map(Number))]
      .sort(
        (first, second) =>
          first - second,
      )
      .join(',');
  }

  private validatePriority(
    priority: number,
  ) {
    if (
      !Number.isInteger(priority) ||
      priority < 1
    ) {
      throw new BadRequestException(
        'A prioridade deve ser um número inteiro maior ou igual a 1.',
      );
    }
  }
}
