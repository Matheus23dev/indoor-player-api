import {
  Injectable,
  NotFoundException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateScheduleDto } from './dto/updateSchedule.dto';
import { CreateScheduleDto } from './dto/createSchedule.dto'; 

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, data: CreateScheduleDto) {
    try {
      const [device, playlist] = await Promise.all([
        this.prisma.device.findFirst({
          where: { id: data.deviceId, companyId },
        }),
        this.prisma.playlist.findFirst({
          where: { id: data.playlistId, companyId },
        }),
      ]);

      if (!device) {
        throw new NotFoundException('Player não encontrado ou não pertence à sua empresa.');
      }

      if (!playlist) {
        throw new NotFoundException('Playlist não encontrada ou não pertence à sua empresa.');
      }

      return await this.prisma.schedule.create({
        data: {
          name: data.name,
          companyId,
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
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Erro interno ao criar agendamento.');
    }
  }

  async update(id: string, companyId: string, dto: UpdateScheduleDto) {
    try {
      const schedule = await this.prisma.schedule.findFirst({
        where: { id, companyId },
      });

      if (!schedule) {
        throw new NotFoundException('Agendamento não encontrado.');
      }

      return await this.prisma.schedule.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Erro interno ao atualizar agendamento.');
    }
  }

  async list(companyId: string) {
    try {
      return await this.prisma.schedule.findMany({
        where: { companyId },
        include: {
          device: true,
          playlist: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro interno ao listar agendamentos.');
    }
  }

  async findOne(id: string, companyId: string) {
    try {
      const schedule = await this.prisma.schedule.findFirst({
        where: { id, companyId },
        include: {
          device: true,
          playlist: {
            include: {
              items: {
                include: { media: true },
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      });

      if (!schedule) {
        throw new NotFoundException('Agendamento não encontrado.');
      }

      return schedule;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Erro interno ao buscar agendamento.');
    }
  }
}