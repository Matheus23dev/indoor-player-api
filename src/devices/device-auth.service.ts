import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'crypto';

import {
  PrismaService,
} from '../prisma/prisma.service';

import type {
  AuthenticatedDevice,
} from './device-auth.types';

@Injectable()
export class DeviceAuthService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  generateActivationSecret() {
    return randomBytes(32)
      .toString('base64url');
  }

  generateDeviceToken() {
    return randomBytes(48)
      .toString('base64url');
  }

  hashSecret(
    value: string,
  ) {
    return createHash('sha256')
      .update(value)
      .digest('hex');
  }

  async activateDevice(
    code: string,
    activationSecret: string,
  ) {
    const normalizedCode =
      code
        .trim()
        .toUpperCase();

    const device =
      await this.prisma.device.findUnique({
        where: {
          code:
            normalizedCode,
        },

        select: {
          id: true,
          code: true,
          name: true,
          isLinked: true,
          companyId: true,
          activationSecretHash:
            true,
        },
      });

    if (!device) {
      throw new NotFoundException(
        'Dispositivo não encontrado.',
      );
    }

    if (
      !device.activationSecretHash
    ) {
      throw new ConflictException(
        'Este dispositivo precisa ser registrado novamente para usar autenticação segura.',
      );
    }

    const informedHash =
      this.hashSecret(
        activationSecret,
      );

    if (
      !this.secureCompare(
        informedHash,
        device.activationSecretHash,
      )
    ) {
      throw new UnauthorizedException(
        'Credencial de ativação inválida.',
      );
    }

    if (
      !device.isLinked ||
      !device.companyId
    ) {
      return {
        id:
          device.id,

        code:
          device.code,

        name:
          device.name,

        isLinked:
          false,

        deviceToken:
          null,
      };
    }

    const deviceToken =
      this.generateDeviceToken();

    const deviceTokenHash =
      this.hashSecret(
        deviceToken,
      );

    const now =
      new Date();

    await this.prisma.device.update({
      where: {
        id:
          device.id,
      },

      data: {
        deviceTokenHash,
        deviceTokenCreatedAt:
          now,
        deviceTokenRevokedAt:
          null,
      },
    });

    return {
      id:
        device.id,

      code:
        device.code,

      name:
        device.name,

      isLinked:
        true,

      deviceToken,
    };
  }

  async validateDeviceToken(
    rawToken:
      string | null | undefined,
  ): Promise<AuthenticatedDevice> {
    const token =
      rawToken?.trim();

    if (!token) {
      throw new UnauthorizedException(
        'Token do dispositivo não informado.',
      );
    }

    const tokenHash =
      this.hashSecret(
        token,
      );

    const device =
      await this.prisma.device.findUnique({
        where: {
          deviceTokenHash:
            tokenHash,
        },

        select: {
          id: true,
          code: true,
          name: true,
          isLinked: true,
          companyId: true,
          deviceTokenRevokedAt:
            true,
        },
      });

    if (
      !device ||
      device.deviceTokenRevokedAt
    ) {
      throw new UnauthorizedException(
        'Token do dispositivo inválido ou revogado.',
      );
    }

    if (
      !device.isLinked ||
      !device.companyId
    ) {
      throw new UnauthorizedException(
        'Dispositivo não está vinculado.',
      );
    }

    return {
      id:
        device.id,

      code:
        device.code,

      name:
        device.name,

      companyId:
        device.companyId,

      isLinked:
        true,
    };
  }

  extractBearerToken(
    authorization:
      string | undefined,
  ) {
    if (!authorization) {
      return null;
    }

    const [
      scheme,
      token,
    ] = authorization
      .trim()
      .split(/\s+/);

    if (
      scheme?.toLowerCase() !==
        'bearer' ||
      !token
    ) {
      return null;
    }

    return token;
  }

  private secureCompare(
    first: string,
    second: string,
  ) {
    const firstBuffer =
      Buffer.from(
        first,
        'utf8',
      );

    const secondBuffer =
      Buffer.from(
        second,
        'utf8',
      );

    if (
      firstBuffer.length !==
      secondBuffer.length
    ) {
      return false;
    }

    return timingSafeEqual(
      firstBuffer,
      secondBuffer,
    );
  }
}
