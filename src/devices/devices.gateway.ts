import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

import { PrismaService } from '../prisma/prisma.service';

import { DeviceAuthService } from './device-auth.service';
import {
  serializeDeviceSystemEvent,
  type DeviceSystemEvent,
} from './device-audit';

import type { AuthenticatedDevice } from './device-auth.types';

interface DeviceSocketData {
  device?: AuthenticatedDevice;
  deviceId?: string;
  deviceRoom?: string;
}

type DeviceSocket = Socket<any, any, any, DeviceSocketData>;
type DeviceServer = Server<any, any, any, DeviceSocketData>;

const CONNECTION_LOST_GRACE_MS = 10_000;

export type ProgrammingChangeReason =
  | 'SCHEDULE_CREATED'
  | 'SCHEDULE_UPDATED'
  | 'SCHEDULE_DELETED'
  | 'PLAYLIST_UPDATED'
  | 'PLAYLIST_ITEM_ADDED'
  | 'PLAYLIST_ITEM_REMOVED'
  | 'PLAYLIST_REORDERED'
  | 'PLAYLIST_DELETED';

export type DeviceSessionEndReason = 'UNLINKED' | 'DELETED';

@WebSocketGateway({
  namespace: '/devices',

  cors: {
    origin: '*',
  },

  transports: ['websocket'],
})
export class DevicesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: DeviceServer;

  private readonly socketsByDevice = new Map<string, Set<string>>();
  private readonly pendingDisconnectLogs = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly connectionLostAt = new Map<string, Date>();
  private readonly suppressedDisconnects = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,

    private readonly deviceAuthService: DeviceAuthService,
  ) {}

  afterInit(server: DeviceServer) {
    server.use((socket, next) => {
      void this.authenticateSocket(socket)
        .then(() => {
          next();
        })
        .catch((error) => {
          console.log('[SOCKET] Autenticação recusada:', error);

          next(new Error('UNAUTHORIZED'));
        });
    });
  }

  handleConnection(client: DeviceSocket) {
    const device = client.data.device;

    console.log('[SOCKET] TV conectada:', {
      socketId: client.id,

      deviceId: device?.id,

      code: device?.code,
    });

    if (!device) {
      return;
    }

    const sockets = this.socketsByDevice.get(device.id) ?? new Set<string>();
    sockets.add(client.id);
    this.socketsByDevice.set(device.id, sockets);

    this.cancelPendingDisconnectLog(device.id);

    const lostAt = this.connectionLostAt.get(device.id);

    if (!lostAt) {
      return;
    }

    this.connectionLostAt.delete(device.id);

    const restoredAt = new Date();
    const offlineSeconds = Math.max(
      1,
      Math.round((restoredAt.getTime() - lostAt.getTime()) / 1_000),
    );

    void this.persistSystemEvent(device.id, {
      event: 'PLAYER_CONNECTION_RESTORED',
      level: 'SUCCESS',
      message: `A conexão do Player foi restabelecida após ${this.formatOfflineDuration(offlineSeconds)}.`,
      metadata: {
        offlineSeconds,
      },
      occurredAt: restoredAt,
    });
  }

  handleDisconnect(client: DeviceSocket) {
    console.log('[SOCKET] TV desconectada:', client.id);

    const deviceId = client.data.deviceId;

    if (!deviceId) {
      return;
    }

    const sockets = this.socketsByDevice.get(deviceId);
    sockets?.delete(client.id);

    if (sockets && sockets.size > 0) {
      return;
    }

    this.socketsByDevice.delete(deviceId);

    if (this.suppressedDisconnects.has(deviceId)) {
      return;
    }

    this.cancelPendingDisconnectLog(deviceId);

    const disconnectedAt = new Date();
    const timer = setTimeout(() => {
      this.pendingDisconnectLogs.delete(deviceId);

      if ((this.socketsByDevice.get(deviceId)?.size ?? 0) > 0) {
        return;
      }

      this.connectionLostAt.set(deviceId, disconnectedAt);

      void this.persistSystemEvent(deviceId, {
        event: 'PLAYER_CONNECTION_LOST',
        level: 'WARNING',
        message: 'O Player perdeu a conexão.',
        occurredAt: disconnectedAt,
      });
    }, CONNECTION_LOST_GRACE_MS);

    this.pendingDisconnectLogs.set(deviceId, timer);
  }

  @SubscribeMessage('player:log')
  receivePlayerLog(
    @ConnectedSocket()
    client: DeviceSocket,
  ) {
    // Older APKs still send telemetry. Acknowledge it to drain their local
    // queues, but keep the device history focused on administrative actions.
    return {
      ok: Boolean(client.data.deviceId),
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

    this.server.to(this.getDeviceRoom(deviceId)).emit('programming:changed', {
      deviceId,
      reason,
      entityId: entityId ?? null,
      emittedAt: new Date().toISOString(),
    });
  }

  notifyDeviceUnlinked(
    deviceId: string,

    reason: DeviceSessionEndReason,

    keepCode: boolean,
  ) {
    if (!this.server) {
      return;
    }

    const room = this.getDeviceRoom(deviceId);

    this.suppressedDisconnects.add(deviceId);
    this.cancelPendingDisconnectLog(deviceId);
    this.connectionLostAt.delete(deviceId);

    setTimeout(() => {
      this.suppressedDisconnects.delete(deviceId);
    }, 30_000);

    this.server.to(room).emit('device:unlinked', {
      deviceId,
      reason,
      keepCode,
      emittedAt: new Date().toISOString(),
    });

    setTimeout(() => {
      this.server.in(room).disconnectSockets(true);
    }, 150);
  }

  async notifyPlaylistChanged(
    playlistId: string,

    reason: ProgrammingChangeReason = 'PLAYLIST_UPDATED',
  ) {
    try {
      const schedules = await this.prisma.schedule.findMany({
        where: {
          playlistId,
          active: true,
        },

        select: {
          deviceId: true,
        },

        distinct: ['deviceId'],
      });

      for (const schedule of schedules) {
        this.notifyProgrammingChanged(schedule.deviceId, reason, playlistId);
      }
    } catch (error: unknown) {
      console.log('[SOCKET] Erro ao notificar alteração de playlist:', error);
    }
  }

  private async authenticateSocket(socket: DeviceSocket) {
    const authToken =
      typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : null;

    const authorizationHeader =
      typeof socket.handshake.headers.authorization === 'string'
        ? socket.handshake.headers.authorization
        : undefined;

    const bearerToken =
      this.deviceAuthService.extractBearerToken(authorizationHeader);

    const device = await this.deviceAuthService.validateDeviceToken(
      authToken ?? bearerToken,
    );

    socket.data.device = device;

    socket.data.deviceId = device.id;

    const room = this.getDeviceRoom(device.id);

    socket.data.deviceRoom = room;

    await socket.join(room);
  }

  private cancelPendingDisconnectLog(deviceId: string) {
    const timer = this.pendingDisconnectLogs.get(deviceId);

    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.pendingDisconnectLogs.delete(deviceId);
  }

  private async persistSystemEvent(deviceId: string, event: DeviceSystemEvent) {
    try {
      await this.prisma.deviceLog.create({
        data: {
          deviceId,
          message: serializeDeviceSystemEvent(event),
        },
      });
    } catch (error: unknown) {
      console.log('[SOCKET] Erro ao registrar estado da conexão:', {
        deviceId,
        event: event.event,
        error,
      });
    }
  }

  private formatOfflineDuration(seconds: number) {
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return remainingSeconds > 0
      ? `${minutes}min ${remainingSeconds}s`
      : `${minutes}min`;
  }

  private getDeviceRoom(deviceId: string) {
    return `device:${deviceId}`;
  }
}
