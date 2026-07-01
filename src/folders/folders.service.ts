import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateFolderDto } from './dto/create-folder.dto';

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    companyId: string,
    data: CreateFolderDto,
  ) {
    try {
      const name =
        this.normalizeName(
          data.name,
        );

      return await this.prisma.folder.create({
        data: {
          name,
          companyId,
        },

        include: {
          _count: {
            select: {
              medias: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleError(
        error,
        'Erro ao criar a pasta.',
      );
    }
  }

  async list(
    companyId: string,
  ) {
    try {
      return await this.prisma.folder.findMany({
        where: {
          companyId,
        },

        include: {
          _count: {
            select: {
              medias: true,
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      this.handleError(
        error,
        'Erro ao listar pastas.',
      );
    }
  }

  async update(
    id: string,
    companyId: string,
    data: CreateFolderDto,
  ) {
    try {
      const folder =
        await this.prisma.folder.findFirst({
          where: {
            id,
            companyId,
          },

          select: {
            id: true,
          },
        });

      if (!folder) {
        throw new NotFoundException(
          'Pasta não encontrada.',
        );
      }

      const name =
        this.normalizeName(
          data.name,
        );

      return await this.prisma.folder.update({
        where: {
          id: folder.id,
        },

        data: {
          name,
        },

        include: {
          _count: {
            select: {
              medias: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleError(
        error,
        'Erro ao renomear a pasta.',
      );
    }
  }

  async remove(
    id: string,
    companyId: string,
  ) {
    try {
      const folder =
        await this.prisma.folder.findFirst({
          where: {
            id,
            companyId,
          },

          select: {
            id: true,
            name: true,

            _count: {
              select: {
                medias: true,
              },
            },
          },
        });

      if (!folder) {
        throw new NotFoundException(
          'Pasta não encontrada.',
        );
      }

      await this.prisma.$transaction(
        async tx => {
          /*
           * As mídias não são excluídas.
           * Elas apenas voltam para a raiz,
           * ficando com folderId igual a null.
           */
          await tx.media.updateMany({
            where: {
              folderId: folder.id,
              companyId,
            },

            data: {
              folderId: null,
            },
          });

          await tx.folder.delete({
            where: {
              id: folder.id,
            },
          });
        },
      );

      return {
        success: true,

        message:
          'Pasta excluída com sucesso.',

        mediasMovedToRoot:
          folder._count.medias,
      };
    } catch (error) {
      this.handleError(
        error,
        'Erro ao deletar a pasta.',
      );
    }
  }

  private normalizeName(
    value: string,
  ) {
    const name =
      value?.trim();

    if (!name) {
      throw new BadRequestException(
        'O nome da pasta é obrigatório.',
      );
    }

    if (name.length > 100) {
      throw new BadRequestException(
        'O nome da pasta deve possuir no máximo 100 caracteres.',
      );
    }

    return name;
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

    console.error(
      '[FOLDERS]',
      error,
    );

    throw new InternalServerErrorException(
      defaultMessage,
    );
  }
}