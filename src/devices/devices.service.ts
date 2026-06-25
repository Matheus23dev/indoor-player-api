import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceStatus } from '@prisma/client';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async registerDevice() {
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const device = await this.prisma.device.create({
        data: {
          code,
          isLinked: false,
          status: DeviceStatus.OFFLINE,
        },
      });

      return {
        id: device.id,
        code: device.code,
        isLinked: device.isLinked,
      };
    } catch (error) {
      throw new InternalServerErrorException('Erro ao registrar dispositivo.');
    }
  }

  async pairDevice(code: string, name: string, companyId: string) {
    try {
      const device = await this.prisma.device.findUnique({
        where: { code },
      });

      if (!device) {
        throw new NotFoundException('Dispositivo não encontrado ou código inválido.');
      }

      if (device.isLinked) {
        throw new BadRequestException('Este dispositivo já está vinculado a uma conta.');
      }

      const updatedDevice = await this.prisma.device.update({
        where: { id: device.id },
        data: {
          name,
          companyId,
          isLinked: true,
        },
      });

      await this.createLog(device.id, 'Dispositivo vinculado à empresa com sucesso.');
      return updatedDevice;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Erro ao parear dispositivo.');
    }
  }

  async list(companyId: string) {
    try {
      const devices = await this.prisma.device.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      });

      const now = Date.now();

      return devices.map((device) => {
       let currentStatus: DeviceStatus = DeviceStatus.OFFLINE;

        if (device.lastHeartbeat) {
          const diff = now - device.lastHeartbeat.getTime();
          if (diff < 60000) {
            currentStatus = DeviceStatus.ONLINE;
          }
        }

        return {
          ...device,
          status: currentStatus,
        };
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro ao listar dispositivos.');
    }
  }

  async findByCode(code: string) {
    try {
      const device = await this.prisma.device.findUnique({
        where: { code },
        select: {
          id: true,
          code: true,
          isLinked: true,
          companyId: true,
        },
      });

      if (!device) throw new NotFoundException('Dispositivo não encontrado.');
      return device;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Erro ao buscar dispositivo.');
    }
  }

 async currentPlaylist(code: string) {
  try {
    const device =
      await this.prisma.device.findUnique({
        where: {
          code,
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

    const now = new Date();

    const currentTime =
      now.toTimeString().substring(0, 5);

    const currentDay =
      now.getDay().toString();

    const schedules =
      await this.prisma.schedule.findMany({
        where: {
          deviceId: device.id,

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

    const activeSchedules =
      schedules.filter(
        (schedule) => {
          const validTime =
            currentTime >=
              schedule.startTime &&
            currentTime <=
              schedule.endTime;

          const validDay =
            schedule.daysOfWeek
              .split(',')
              .includes(currentDay);

          return (
            validTime &&
            validDay
          );
        },
      );

    const activeSchedule =
      activeSchedules.sort(
        (a, b) =>
          b.priority -
          a.priority,
      )[0];

    if (!activeSchedule) {
      return {
        schedule: null,
        playlist: null,
        generatedAt:
          new Date(),
      };
    }

    return {
      schedule: {
        id: activeSchedule.id,

        name: activeSchedule.name,

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

      generatedAt:
        new Date(),
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

  async heartbeat(code: string) {
    try {
      const device = await this.prisma.device.findUnique({
        where: { code },
      });

      if (!device) throw new NotFoundException('Dispositivo não encontrado.');

      await this.prisma.device.update({
        where: { id: device.id },
        data: { lastHeartbeat: new Date() },
      });


      return { success: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Erro ao processar heartbeat.');
    }
  }

  async logs(deviceId: string, companyId: string) {
    try {
      const device = await this.prisma.device.findFirst({
        where: { id: deviceId, companyId },
      });

      if (!device) throw new NotFoundException('Dispositivo não encontrado ou não pertence a esta conta.');

      return await this.prisma.deviceLog.findMany({
        where: { deviceId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Erro ao buscar logs.');
    }
  }

  private async createLog(deviceId: string, message: string) {
    return await this.prisma.deviceLog.create({
      data: { deviceId, message },
    });
  }
}