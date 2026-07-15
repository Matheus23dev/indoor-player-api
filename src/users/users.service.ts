import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  UserRole,
} from '@prisma/client';

import * as bcrypt from 'bcrypt';

import {
  PrismaService,
} from '../prisma/prisma.service';

import {
  CreateUserDto,
} from './dto/create-user.dto';

import {
  UpdateUserDto,
} from './dto/update-user.dto';

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

      this.validateAssignableRole(
        data.role,
      );

      if (
        requesterRole === UserRole.ADMIN &&
        data.role === UserRole.ADMIN
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

        select: this.userSelect(),
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

        select: this.userSelect(),

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

          select: this.userSelect(),
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

  async update(
    id: string,
    companyId: string,
    requesterId: string,
    requesterRole: UserRole,
    data: UpdateUserDto,
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
            email: true,
            role: true,
          },
        });

      if (!user) {
        throw new NotFoundException(
          'Usuário não encontrado.',
        );
      }

      if (user.role === UserRole.OWNER) {
        throw new BadRequestException(
          'Não é permitido editar o usuário OWNER pelo painel.',
        );
      }

      if (
        requesterRole === UserRole.ADMIN &&
        user.role === UserRole.ADMIN &&
        requesterId !== user.id
      ) {
        throw new BadRequestException(
          'Um administrador não pode editar outro administrador.',
        );
      }

      const updateData:
        Prisma.UserUpdateInput = {};

      if (data.name !== undefined) {
        const name =
          data.name.trim();

        if (!name) {
          throw new BadRequestException(
            'O nome do usuário é obrigatório.',
          );
        }

        updateData.name =
          name;
      }

      if (data.email !== undefined) {
        const email =
          data.email
            .trim()
            .toLowerCase();

        if (!email) {
          throw new BadRequestException(
            'O e-mail do usuário é obrigatório.',
          );
        }

        const emailExists =
          await this.prisma.user.findUnique({
            where: {
              email,
            },

            select: {
              id: true,
            },
          });

        if (
          emailExists &&
          emailExists.id !== id
        ) {
          throw new ConflictException(
            'Este e-mail já está cadastrado.',
          );
        }

        updateData.email =
          email;
      }

      if (data.password !== undefined) {
        const password =
          data.password.trim();

        if (!password) {
          throw new BadRequestException(
            'A senha não pode ser vazia.',
          );
        }

        updateData.password =
          await bcrypt.hash(
            password,
            10,
          );
      }

      if (data.role !== undefined) {
        this.validateAssignableRole(
          data.role,
        );

        if (
          requesterRole === UserRole.ADMIN &&
          data.role === UserRole.ADMIN
        ) {
          throw new BadRequestException(
            'Um administrador não pode atribuir a role ADMIN.',
          );
        }

        updateData.role =
          data.role;
      }

      return await this.prisma.user.update({
        where: {
          id,
        },

        data:
          updateData,

        select: this.userSelect(),
      });
    } catch (error) {
      this.handleError(
        error,
        'Erro interno ao atualizar usuário.',
      );
    }
  }

  async remove(
    id: string,
    companyId: string,
    requesterId: string,
    requesterRole: UserRole,
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
            role: true,
          },
        });

      if (!user) {
        throw new NotFoundException(
          'Usuário não encontrado.',
        );
      }

      if (user.role === UserRole.OWNER) {
        throw new BadRequestException(
          'Não é permitido remover o usuário OWNER.',
        );
      }

      if (user.id === requesterId) {
        throw new BadRequestException(
          'Você não pode remover seu próprio usuário.',
        );
      }

      if (
        requesterRole === UserRole.ADMIN &&
        user.role === UserRole.ADMIN
      ) {
        throw new BadRequestException(
          'Um administrador não pode remover outro administrador.',
        );
      }

      await this.prisma.user.delete({
        where: {
          id,
        },
      });

      return {
        success: true,
        message: 'Usuário removido com sucesso.',
      };
    } catch (error) {
      this.handleError(
        error,
        'Erro interno ao remover usuário.',
      );
    }
  }

  private validateAssignableRole(
    role: UserRole,
  ) {
    if (role === UserRole.OWNER) {
      throw new BadRequestException(
        'Não é permitido atribuir a role OWNER.',
      );
    }

    if (
      role !== UserRole.ADMIN &&
      role !== UserRole.OPERATOR
    ) {
      throw new BadRequestException(
        'A role informada é inválida.',
      );
    }
  }

  private userSelect() {
    return {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      createdAt: true,
      updatedAt: true,
    };
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
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Este e-mail já está cadastrado.',
        );
      }

      if (error.code === 'P2025') {
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