import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth() {
    return {
      status: 'ok' as const,
      service: 'indoor-player-api',
      version: process.env.npm_package_version ?? '0.0.1',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  async getReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        ...this.getHealth(),
        checks: {
          database: 'ok' as const,
        },
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'indoor-player-api',
        checks: {
          database: 'unavailable',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
