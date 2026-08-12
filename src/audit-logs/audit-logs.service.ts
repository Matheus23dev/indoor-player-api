import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PLAYER_LOG_PREFIX, SYSTEM_LOG_PREFIX } from '../devices/device-audit';
import {
  AuditLogSource,
  ListAuditLogsQueryDto,
} from './dto/list-audit-logs-query.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string, query: ListAuditLogsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;

    if (from && to && from.getTime() > to.getTime()) {
      throw new BadRequestException(
        'A data inicial não pode ser posterior à data final.',
      );
    }

    const where = this.buildWhere(companyId, query, from, to);
    const [items, total, devices] = await Promise.all([
      this.prisma.deviceLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          device: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
      this.prisma.deviceLog.count({ where }),
      this.prisma.device.findMany({
        where: { companyId },
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
        select: { id: true, name: true, code: true },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      filters: { devices },
    };
  }

  private buildWhere(
    companyId: string,
    query: ListAuditLogsQueryDto,
    from: Date | null,
    to: Date | null,
  ): Prisma.DeviceLogWhereInput {
    const conditions: Prisma.DeviceLogWhereInput[] = [
      { device: { companyId } },
    ];

    if (query.deviceId) {
      conditions.push({ deviceId: query.deviceId });
    }

    if (query.search) {
      conditions.push({
        OR: [
          { message: { contains: query.search } },
          { device: { name: { contains: query.search } } },
          { device: { code: { contains: query.search } } },
        ],
      });
    }

    if (from || to) {
      conditions.push({
        createdAt: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      });
    }

    const sourceCondition = this.getSourceCondition(
      query.source ?? AuditLogSource.ALL,
    );

    if (sourceCondition) {
      conditions.push(sourceCondition);
    }

    return { AND: conditions };
  }

  private getSourceCondition(
    source: AuditLogSource,
  ): Prisma.DeviceLogWhereInput | null {
    if (source === AuditLogSource.PLAYER) {
      return { message: { startsWith: PLAYER_LOG_PREFIX } };
    }

    if (source === AuditLogSource.SYSTEM) {
      return { message: { startsWith: SYSTEM_LOG_PREFIX } };
    }

    if (source === AuditLogSource.ADMINISTRATION) {
      return {
        AND: [
          { message: { not: { startsWith: PLAYER_LOG_PREFIX } } },
          { message: { not: { startsWith: SYSTEM_LOG_PREFIX } } },
        ],
      };
    }

    return null;
  }
}
