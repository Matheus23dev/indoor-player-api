import { BadRequestException, ConflictException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole,} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    companyId: string,
    requesterRole: UserRole,
    data: CreateUserDto,
  ) {
    try {
      const name =
        data.name?.trim();

      const email =
        data.email
          ?.trim()
          .toLowerCase();

      const password =
        data.password;

      if (!name) {
        throw new BadRequestException(
          'O nome do usuário é obrigatório.',
        );
      }

      if (!email) {
        throw new BadRequestException(
          'O e-mail do usuário é obrigatório.',
        );
      }

      if (
        !password ||
        !password.trim()
      ) {
        throw new BadRequestException(
          'A senha do usuário é obrigatória.',
        );
      }

      if (
        data.role ===
        UserRole.OWNER
      ) {
        throw new BadRequestException(
          'Não é permitido atribuir a role OWNER durante a criação.',
        );
      }

      if (
        data.role !==
          UserRole.ADMIN &&
        data.role !==
          UserRole.OPERATOR
      ) {
        throw new BadRequestException(
          'A role informada é inválida.',
        );
      }

      if (
        requesterRole ===
          UserRole.ADMIN &&
        data.role ===
          UserRole.ADMIN
      ) {
        throw new BadRequestException(
          'Um administrador não pode criar outro administrador.',
        );
      }

      const userExists =
        await this.prisma.user.findUnique({
          where: {
            email,
          },

          select: {
            id: true,
          },
        });

      if (userExists) {
        throw new ConflictException(
          'Este e-mail já está cadastrado.',
        );
      }

      const passwordHash =
        await bcrypt.hash(
          password,
          10,
        );

      return await this.prisma.user.create({
        data: {
          name,
          email,

          password:
            passwordHash,

          role:
            data.role,

          companyId,
        },

        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      this.handleError(
        error,
        'Erro interno ao criar usuário.',
      );
    }
  }

  async list(
    companyId: string,
  ) {
    try {
      return await this.prisma.user.findMany({
        where: {
          companyId,
        },

        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
          createdAt: true,
          updatedAt: true,
        },

        orderBy: [
          {
            role: 'asc',
          },
          {
            createdAt: 'desc',
          },
        ],
      });
    } catch (error) {
      this.handleError(
        error,
        'Erro interno ao listar usuários.',
      );
    }
  }

  async findById(
    id: string,
    companyId: string,
  ) {
    try {
      const user =
        await this.prisma.user.findFirst({
          where: {
            id,
            companyId,
          },

          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            companyId: true,
            createdAt: true,
            updatedAt: true,
          },
        });

      if (!user) {
        throw new NotFoundException(
          'Usuário não encontrado.',
        );
      }

      return user;
    } catch (error) {
      this.handleError(
        error,
        'Erro interno ao buscar o usuário.',
      );
    }
  }

  private handleError(
    error: unknown,
    defaultMessage: string,
  ): never {
    if (
      error instanceof
      HttpException
    ) {
      throw error;
    }

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      if (
        error.code ===
        'P2002'
      ) {
        throw new ConflictException(
          'Este e-mail já está cadastrado.',
        );
      }

      if (
        error.code ===
        'P2025'
      ) {
        throw new NotFoundException(
          'Usuário não encontrado.',
        );
      }
    }

    console.error(
      '[USERS]',
      error,
    );

    throw new InternalServerErrorException(
      defaultMessage,
    );
  }
}