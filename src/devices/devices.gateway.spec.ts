import { DeviceAuthService } from './device-auth.service';
import { DevicesGateway } from './devices.gateway';
import { PrismaService } from '../prisma/prisma.service';

describe('DevicesGateway connection history', () => {
  const deviceLogCreate = jest.fn().mockResolvedValue({ id: 'log-1' });

  function createGateway() {
    return new DevicesGateway(
      {
        deviceLog: {
          create: deviceLogCreate,
        },
      } as unknown as PrismaService,
      {} as DeviceAuthService,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('acknowledges telemetry from a legacy Player without persisting it', () => {
    const gateway = createGateway();
    const socket = createAuthenticatedSocket('socket-1');

    expect(gateway.receivePlayerLog(socket)).toEqual({ ok: true });
    expect(deviceLogCreate).not.toHaveBeenCalled();
  });

  it('rejects telemetry without an authenticated device', () => {
    const gateway = createGateway();
    const socket = {
      id: 'socket-2',
      data: {},
    } as unknown as Parameters<DevicesGateway['receivePlayerLog']>[0];

    expect(gateway.receivePlayerLog(socket)).toEqual({ ok: false });
  });

  it('records a confirmed connection loss and its restoration', async () => {
    jest.useFakeTimers();

    try {
      const gateway = createGateway();
      const firstSocket = createAuthenticatedSocket('socket-1');

      gateway.handleConnection(firstSocket);
      gateway.handleDisconnect(firstSocket);

      await jest.advanceTimersByTimeAsync(60_000);

      expect(deviceLogCreate).toHaveBeenCalledTimes(1);
      expect(readStoredEvent(0)).toMatchObject({
        source: 'SYSTEM',
        event: 'PLAYER_CONNECTION_LOST',
        level: 'WARNING',
        message:
          'O Player perdeu a conexão após permanecer inativo por pelo menos 1 minuto.',
        metadata: {
          offlineSeconds: 60,
        },
      });

      await jest.advanceTimersByTimeAsync(5_000);
      gateway.handleConnection(createAuthenticatedSocket('socket-2'));

      expect(deviceLogCreate).toHaveBeenCalledTimes(2);
      expect(readStoredEvent(1)).toMatchObject({
        source: 'SYSTEM',
        event: 'PLAYER_CONNECTION_RESTORED',
        level: 'SUCCESS',
        metadata: {
          offlineSeconds: 65,
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not record a brief transport oscillation', async () => {
    jest.useFakeTimers();

    try {
      const gateway = createGateway();
      const firstSocket = createAuthenticatedSocket('socket-1');

      gateway.handleConnection(firstSocket);
      gateway.handleDisconnect(firstSocket);

      await jest.advanceTimersByTimeAsync(59_000);
      gateway.handleConnection(createAuthenticatedSocket('socket-2'));
      await jest.advanceTimersByTimeAsync(2_000);

      expect(deviceLogCreate).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  function createAuthenticatedSocket(socketId: string) {
    return {
      id: socketId,
      data: {
        deviceId: 'device-1',
        device: {
          id: 'device-1',
          code: 'ABC123',
        },
      },
    } as unknown as Parameters<DevicesGateway['handleConnection']>[0];
  }

  function readStoredEvent(callIndex: number) {
    const message = deviceLogCreate.mock.calls[callIndex][0].data
      .message as string;

    return JSON.parse(message.replace('@SYSTEM_EVENT:', ''));
  }
});
