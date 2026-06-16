import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // 🔹 Criar dispositivo (TV)
  async registerDevice() {
    const code = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    const device = await this.prisma.device.create({
      data: {
        code,
        isLinked: false,
      },
    });

    return {
      id: device.id,
      code: device.code,
      isLinked: device.isLinked,
    };
  }

  // 🔹 Vincular dispositivo à empresa
  async linkDevice(code: string, companyId: string) {
    const device = await this.prisma.device.findUnique({
      where: { code },
    });

    if (!device) {
      throw new NotFoundException('Dispositivo não encontrado');
    }

    return this.prisma.device.update({
      where: { id: device.id },
      data: {
        isLinked: true,
        companyId,
      },
    });
  }

  // 🔹 Listar dispositivos da empresa
  async list(companyId: string) {
    const devices = await this.prisma.device.findMany({
      where: { companyId },
    });

    const now = Date.now();

    return devices.map((device) => {
      const lastHeartbeat = device.lastHeartbeat;

      let status = 'OFFLINE';

      if (lastHeartbeat) {
        const diff = now - lastHeartbeat.getTime();

        if (diff < 60000) {
          status = 'ONLINE';
        }
      }

      return {
        ...device,
        status,
      };
    });
  }

  // 🔹 Buscar dispositivo por código (TV usa isso)
  async findByCode(code: string) {
    const device = await this.prisma.device.findUnique({
      where: { code },
    });

    if (!device) {
      throw new NotFoundException('Dispositivo não encontrado');
    }

    return {
      id: device.id,
      code: device.code,
      isLinked: device.isLinked,
      companyId: device.companyId,
    };
  }

  // 🔹 Parear dispositivo com nome
  async pairDevice(
    code: string,
    name: string,
    companyId: string,
  ) {
    const device = await this.prisma.device.findUnique({
      where: { code },
    });

    if (!device) {
      throw new NotFoundException('Dispositivo não encontrado');
    }

    if (device.isLinked) {
      throw new BadRequestException('Dispositivo já vinculado');
    }

    await this.createLog(
      device.id,
      'Dispositivo vinculado à empresa',
    );

    return this.prisma.device.update({
      where: { id: device.id },
      data: {
        name,
        companyId,
        isLinked: true,
      },
    });
  }

  // 🔹 Playlist atual do dispositivo
  async currentPlaylist(code: string) {
    const device = await this.prisma.device.findUnique({
      where: { code },
    });

    if (!device) {
      throw new NotFoundException('Dispositivo não encontrado');
    }

    const now = new Date();

    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().substring(0, 5);
    const currentDay = now.getDay().toString();

    const schedules = await this.prisma.schedule.findMany({
      where: {
        deviceId: device.id,
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

    const activeSchedule = schedules.find((schedule) => {
      const startDate = schedule.startDate
        .toISOString()
        .split('T')[0];

      const endDate = schedule.endDate
        .toISOString()
        .split('T')[0];

      const validDate =
        currentDate >= startDate &&
        currentDate <= endDate;

      const validTime =
        currentTime >= schedule.startTime &&
        currentTime <= schedule.endTime;

      const validDay = schedule.daysOfWeek
        .split(',')
        .includes(currentDay);

      return validDate && validTime && validDay;
    });

    if (!activeSchedule) {
      return {
        playlist: null,
      };
    }

    return {
      scheduleId: activeSchedule.id,
      playlist: activeSchedule.playlist,
    };
  }

  // 🔹 Heartbeat (online status)
  async heartbeat(code: string) {
    const device = await this.prisma.device.findUnique({
      where: { code },
    });

    if (!device) {
      throw new NotFoundException();
    }

    await this.prisma.device.update({
      where: { id: device.id },
      data: {
        lastHeartbeat: new Date(),
      },
    });

    await this.createLog(
      device.id,
      'Heartbeat recebido',
    );

    return {
      success: true,
    };
  }

  // 🔹 Logs do device
  async logs(deviceId: string) {
    return this.prisma.deviceLog.findMany({
      where: { deviceId },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }

  // 🔹 Criar log interno
  private async createLog(
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