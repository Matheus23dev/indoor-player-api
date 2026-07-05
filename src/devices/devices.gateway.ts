import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import {
  Server,
  Socket,
} from 'socket.io';

import {
  PrismaService,
} from '../prisma/prisma.service';

interface SubscribeDevicePayload {
  code: string;
}

export type ProgrammingChangeReason =
  | 'SCHEDULE_CREATED'
  | 'SCHEDULE_UPDATED'
  | 'SCHEDULE_DELETED'
  | 'PLAYLIST_UPDATED'
  | 'PLAYLIST_ITEM_ADDED'
  | 'PLAYLIST_ITEM_REMOVED'
  | 'PLAYLIST_REORDERED'
  | 'PLAYLIST_DELETED';

export type DeviceSessionEndReason =
  | 'UNLINKED'
  | 'DELETED';

@WebSocketGateway({
  namespace: '/devices',

  cors: {
    origin: '*',
  },

  transports: [
    'websocket',
  ],
})
export class DevicesGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(
    client: Socket,
  ) {
    console.log(
      '[SOCKET] Cliente conectado:',
      client.id,
    );
  }

  handleDisconnect(
    client: Socket,
  ) {
    console.log(
      '[SOCKET] Cliente desconectado:',
      client.id,
    );
  }

  @SubscribeMessage('device:subscribe')
  async subscribeDevice(
    @MessageBody()
    payload: SubscribeDevicePayload,

    @ConnectedSocket()
    client: Socket,
  ) {
    const code =
      payload?.code
        ?.trim()
        .toUpperCase();

    if (!code) {
      return {
        success: false,
        reason: 'INVALID_CODE',
        message: 'Código do dispositivo não informado.',
      };
    }

    const device =
      await this.prisma.device.findUnique({
        where: {
          code,
        },

        select: {
          id: true,
          code: true,
          isLinked: true,
        },
      });

    if (!device) {
      return {
        success: false,
        reason: 'NOT_FOUND',
        message: 'Dispositivo não encontrado.',
      };
    }

    if (!device.isLinked) {
      return {
        success: false,
        reason: 'NOT_LINKED',
        message: 'Dispositivo ainda não está vinculado.',
      };
    }

    const previousRoom =
      client.data.deviceRoom as
        | string
        | undefined;

    if (previousRoom) {
      await client.leave(previousRoom);
    }

    const room =
      this.getDeviceRoom(device.id);

    await client.join(room);

    client.data.deviceId =
      device.id;

    client.data.deviceRoom =
      room;

    console.log(
      `[SOCKET] Dispositivo ${device.code} inscrito em ${room}`,
    );

    return {
      success: true,
      deviceId: device.id,
    };
  }

  notifyProgrammingChanged(
    deviceId: string,
    reason: ProgrammingChangeReason,
    entityId?: string,
  ) {
    if (!this.server) {
      return;
    }

    this.server
      .to(this.getDeviceRoom(deviceId))
      .emit(
        'programming:changed',
        {
          deviceId,
          reason,
          entityId: entityId ?? null,
          emittedAt: new Date().toISOString(),
        },
      );
  }

  notifyDeviceUnlinked(
    deviceId: string,
    reason: DeviceSessionEndReason,
    keepCode: boolean,
  ) {
    if (!this.server) {
      return;
    }

    this.server
      .to(this.getDeviceRoom(deviceId))
      .emit(
        'device:unlinked',
        {
          deviceId,
          reason,
          keepCode,
          emittedAt: new Date().toISOString(),
        },
      );
  }

  async notifyPlaylistChanged(
    playlistId: string,
    reason: ProgrammingChangeReason =
      'PLAYLIST_UPDATED',
  ) {
    try {
      const schedules =
        await this.prisma.schedule.findMany({
          where: {
            playlistId,
            active: true,
          },

          select: {
            deviceId: true,
          },

          distinct: [
            'deviceId',
          ],
        });

      for (const schedule of schedules) {
        this.notifyProgrammingChanged(
          schedule.deviceId,
          reason,
          playlistId,
        );
      }
    } catch (error) {
      console.log(
        '[SOCKET] Erro ao notificar alteração de playlist:',
        error,
      );
    }
  }

  private getDeviceRoom(
    deviceId: string,
  ) {
    return `device:${deviceId}`;
  }
}
