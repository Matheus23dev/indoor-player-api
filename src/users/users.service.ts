import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
  ) {}
  

  async create(
    companyId: string,
    data: CreateUserDto,
  ) {
    const exists =
      await this.prisma.user.findUnique({
        where: {
          email: data.email,
        },
      });
     

    if (data.role === UserRole.OWNER) {
      throw new BadRequestException(
    'Não é permitido criar OWNER',
      );
   }

    if (exists) {
      throw new BadRequestException(
        'Email já cadastrado',
      );
    }
    

    const passwordHash =
      await bcrypt.hash(
        data.password,
        10,
      );

    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: passwordHash,
        role: data.role,
        companyId,
      },
    });
  }

  async list(companyId: string) {
    return this.prisma.user.findMany({
      where: {
        companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  async findById(id: string, companyId: string) {
  const user = await this.prisma.user.findFirst({
    where: {
      id,
      companyId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    throw new BadRequestException(
      'Usuário não encontrado',
    );
  }

  return user;
}
}