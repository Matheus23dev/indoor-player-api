import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { getJwtSecret } from '../config/environment';

interface JwtPayload {
  sub: string;
  companyId: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey: getJwtSecret(config.get<string>('JWT_SECRET')),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },

      select: {
        id: true,
        name: true,
        companyId: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    return {
      id: user.id,
      name: user.name,
      companyId: user.companyId,
      role: user.role,
    };
  }
}
