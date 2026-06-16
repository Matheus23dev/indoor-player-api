import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import * as bcrypt from 'bcrypt';

import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

async register(data: any) {
  const userExists = await this.prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (userExists) {
    throw new BadRequestException(
      'Email já cadastrado',
    );
  }

  const slug = data.companyName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');

  const companyExists =
    await this.prisma.company.findUnique({
      where: {
        slug,
      },
    });

  if (companyExists) {
    throw new BadRequestException(
      'Já existe uma empresa com esse nome',
    );
  }

  const passwordHash = await bcrypt.hash(
    data.password,
    10,
  );

  const company =
    await this.prisma.company.create({
      data: {
        name: data.companyName,
        slug,
      },
    });

  const user = await this.prisma.user.create({
    data: {
      name: data.userName,
      email: data.email,
      password: passwordHash,
      companyId: company.id,
      role: 'OWNER',
    },
  });

  return {
    message: 'Usuário criado com sucesso',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
    },
  };
}
  async login(data: any) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const validPassword = await bcrypt.compare(
      data.password,
      user.password,
    );

    if (!validPassword) {
      throw new UnauthorizedException();
    }

    const token = this.jwt.sign({
      sub: user.id,
      companyId: user.companyId,
    });

    return {
      token,
    };
  }
}