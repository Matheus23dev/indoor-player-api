import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
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

import {
  DeviceAuthService,
} from './device-auth.service';

import type {
  AuthenticatedDevice,
} from './device-auth.types';

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
  namespace:
    '/devices',

  cors: {
    origin:
      '*',
  },

  transports: [
    'websocket',
  ],
})
export class DevicesGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly prisma:
      PrismaService,

    private readonly deviceAuthService:
      DeviceAuthService,
  ) {}

  afterInit(
    server:
      Server,
  ) {
    server.use(
      (
        socket,
        next,
      ) => {
        void this
          .authenticateSocket(
            socket,
          )
          .then(() => {
            next();
          })
          .catch(error => {
            console.log(
              '[SOCKET] Autenticação recusada:',
              error,
            );

            next(
              new Error(
                'UNAUTHORIZED',
              ),
            );
          });
      },
    );
  }

  handleConnection(
    client:
      Socket,
  ) {
    const device =
      client.data.device as
        | AuthenticatedDevice
        | undefined;

    console.log(
      '[SOCKET] TV conectada:',
      {
        socketId:
          client.id,

        deviceId:
          device?.id,

        code:
          device?.code,
      },
    );
  }

  handleDisconnect(
    client:
      Socket,
  ) {
    console.log(
      '[SOCKET] TV desconectada:',
      client.id,
    );
  }

  notifyProgrammingChanged(
    deviceId:
      string,

    reason:
      ProgrammingChangeReason,

    entityId?:
      string,
  ) {
    if (!this.server) {
      return;
    }

    this.server
      .to(
        this.getDeviceRoom(
          deviceId,
        ),
      )
      .emit(
        'programming:changed',
        {
          deviceId,
          reason,
          entityId:
            entityId ??
            null,
          emittedAt:
            new Date()
              .toISOString(),
        },
      );
  }

  notifyDeviceUnlinked(
    deviceId:
      string,

    reason:
      DeviceSessionEndReason,

    keepCode:
      boolean,
  ) {
    if (!this.server) {
      return;
    }

    const room =
      this.getDeviceRoom(
        deviceId,
      );

    this.server
      .to(room)
      .emit(
        'device:unlinked',
        {
          deviceId,
          reason,
          keepCode,
          emittedAt:
            new Date()
              .toISOString(),
        },
      );

    setTimeout(
      () => {
        this.server
          .in(room)
          .disconnectSockets(
            true,
          );
      },
      150,
    );
  }

  async notifyPlaylistChanged(
    playlistId:
      string,

    reason:
      ProgrammingChangeReason =
        'PLAYLIST_UPDATED',
  ) {
    try {
      const schedules =
        await this.prisma.schedule.findMany({
          where: {
            playlistId,
            active:
              true,
          },

          select: {
            deviceId:
              true,
          },

          distinct: [
            'deviceId',
          ],
        });

      for (
        const schedule
        of schedules
      ) {
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

  private async authenticateSocket(
    socket:
      Socket,
  ) {
    const authToken =
      typeof socket.handshake
        .auth?.token ===
        'string'
        ? socket.handshake
            .auth.token
        : null;

    const authorizationHeader =
      typeof socket.handshake
        .headers
        .authorization ===
        'string'
        ? socket.handshake
            .headers
            .authorization
        : undefined;

    const bearerToken =
      this.deviceAuthService
        .extractBearerToken(
          authorizationHeader,
        );

    const device =
      await this.deviceAuthService
        .validateDeviceToken(
          authToken ??
          bearerToken,
        );

    socket.data.device =
      device;

    socket.data.deviceId =
      device.id;

    const room =
      this.getDeviceRoom(
        device.id,
      );

    socket.data.deviceRoom =
      room;

    await socket.join(
      room,
    );
  }

  private getDeviceRoom(
    deviceId:
      string,
  ) {
    return `device:${deviceId}`;
  }
}
