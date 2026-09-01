import { AppService } from './app.service';
import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

describe('AppService', () => {
  const queryRaw = jest.fn();

  function createService() {
    return new AppService({
      $queryRaw: queryRaw,
    } as unknown as PrismaService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns operational health information', () => {
    const health = createService().getHealth();

    expect(health).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'indoor-player-api',
        version: expect.any(String),
        timestamp: expect.any(String),
        uptimeSeconds: expect.any(Number),
      }),
    );
    expect(Number.isNaN(Date.parse(health.timestamp))).toBe(false);
  });

  it('reports readiness when the database responds', async () => {
    queryRaw.mockResolvedValue([{ result: 1 }]);

    await expect(createService().getReadiness()).resolves.toEqual(
      expect.objectContaining({
        status: 'ok',
        checks: {
          database: 'ok',
        },
      }),
    );
  });

  it('returns service unavailable when the database is down', async () => {
    queryRaw.mockRejectedValue(new Error('database unavailable'));

    await expect(createService().getReadiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
