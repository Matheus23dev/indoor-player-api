import { BadRequestException } from '@nestjs/common';

import type { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogSource } from './dto/list-audit-logs-query.dto';

describe('AuditLogsService', () => {
  const deviceLogFindMany = jest.fn();
  const deviceLogCount = jest.fn();
  const deviceFindMany = jest.fn();

  function createService() {
    const prisma = {
      deviceLog: {
        findMany: deviceLogFindMany,
        count: deviceLogCount,
      },
      device: {
        findMany: deviceFindMany,
      },
    } as unknown as PrismaService;

    return new AuditLogsService(prisma);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    deviceLogFindMany.mockResolvedValue([
      {
        id: 'log-1',
        deviceId: '11111111-1111-4111-8111-111111111111',
        message: '@SYSTEM_EVENT:{}',
        createdAt: new Date('2026-08-12T12:00:00.000Z'),
        device: {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'TV recepção',
          code: 'ABC123',
        },
      },
    ]);
    deviceLogCount.mockResolvedValue(21);
    deviceFindMany.mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'TV recepção',
        code: 'ABC123',
      },
    ]);
  });

  it('lists only company logs with filters and pagination', async () => {
    const service = createService();
    const result = await service.list('company-1', {
      page: 2,
      limit: 10,
      source: AuditLogSource.SYSTEM,
      deviceId: '11111111-1111-4111-8111-111111111111',
      search: 'recepção',
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-12T23:59:59.999Z',
    });

    expect(deviceLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: {
          AND: expect.arrayContaining([
            { device: { companyId: 'company-1' } },
            { deviceId: '11111111-1111-4111-8111-111111111111' },
            { message: { startsWith: '@SYSTEM_EVENT:' } },
          ]),
        },
      }),
    );
    expect(deviceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: 'company-1' } }),
    );
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 21,
      totalPages: 3,
    });
    expect(result.items).toHaveLength(1);
    expect(result.filters.devices).toHaveLength(1);
  });

  it('rejects an inverted date range before querying the database', async () => {
    const service = createService();

    await expect(
      service.list('company-1', {
        page: 1,
        limit: 25,
        source: AuditLogSource.ALL,
        from: '2026-08-12T00:00:00.000Z',
        to: '2026-08-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(deviceLogFindMany).not.toHaveBeenCalled();
  });
});
