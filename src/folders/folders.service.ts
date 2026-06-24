import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, data: CreateFolderDto) {
    try {
      return await this.prisma.folder.create({
        data: {
          name: data.name,
          companyId,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro ao criar a pasta.');
    }
  }

  async list(companyId: string) {
    try {
      return await this.prisma.folder.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro ao listar pastas.');
    }
  }

  async update(id: string, companyId: string, data: CreateFolderDto) {
    try {
      const folder = await this.prisma.folder.findFirst({
        where: { id, companyId },
      });

      if (!folder) throw new NotFoundException('Pasta não encontrada.');

      return await this.prisma.folder.update({
        where: { id },
        data: { name: data.name },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Erro ao renomear a pasta.');
    }
  }

  async remove(id: string, companyId: string) {
    try {
      const folder = await this.prisma.folder.findFirst({
        where: { id, companyId },
      });

      if (!folder) throw new NotFoundException('Pasta não encontrada.');

      return await this.prisma.folder.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Erro ao deletar a pasta.');
    }
  }
}
