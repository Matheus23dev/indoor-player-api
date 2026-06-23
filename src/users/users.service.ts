import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, data: CreateUserDto) {
    try {
      if (data.role === UserRole.OWNER) {
        throw new BadRequestException('Não é permitido atribuir a role OWNER durante a criação.');
      }

      const userExists = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (userExists) {
        throw new ConflictException('Este e-mail já está cadastrado.');
      }

      const passwordHash = await bcrypt.hash(data.password, 10);

      return await this.prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: passwordHash,
          role: data.role,
          companyId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Erro interno ao criar usuário.');
    }
  }

  async list(companyId: string) {
    try {
      return await this.prisma.user.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro interno ao listar usuários.');
    }
  }

  async findById(id: string, companyId: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id, companyId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado.');
      }

      return user;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Erro interno ao buscar o usuário.');
    }
  }
}