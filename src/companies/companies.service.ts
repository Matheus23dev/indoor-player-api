import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import {
  Prisma,
  UserRole,
} from '@prisma/client';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterCompanyDto } from './dto/companies.dto';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async register(
    dto: RegisterCompanyDto,
  ) {
    const companyName =
      dto.companyName.trim();

    const ownerName =
      dto.ownerName.trim();

    const email =
      dto.email
        .trim()
        .toLowerCase();

    const password =
      dto.password;

    if (!companyName) {
      throw new BadRequestException(
        'O nome da empresa é obrigatório.',
      );
    }

    if (!ownerName) {
      throw new BadRequestException(
        'O nome do proprietário é obrigatório.',
      );
    }

    const existingUser =
      await this.prisma.user.findUnique({
        where: {
          email,
        },

        select: {
          id: true,
        },
      });

    if (existingUser) {
      throw new ConflictException(
        'Este e-mail já está cadastrado.',
      );
    }

    const slug =
      await this.generateUniqueSlug(
        companyName,
      );

    const passwordHash =
      await bcrypt.hash(
        password,
        10,
      );

    return this.prisma.$transaction(
      async (
        tx: Prisma.TransactionClient,
      ) => {
        const company =
          await tx.company.create({
            data: {
              name: companyName,
              slug,
            },
          });

        const owner =
          await tx.user.create({
            data: {
              name: ownerName,
              email,
              password: passwordHash,
              role: UserRole.OWNER,
              companyId: company.id,
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

        return {
          company,
          owner,
        };
      },
    );
  }

  private async generateUniqueSlug(
    companyName: string,
  ) {
    const baseSlug =
      companyName
        .normalize('NFD')
        .replace(
          /[\u0300-\u036f]/g,
          '',
        )
        .toLowerCase()
        .trim()
        .replace(
          /[^a-z0-9]+/g,
          '-',
        )
        .replace(
          /^-+|-+$/g,
          '',
        );

    let slug =
      baseSlug || 'empresa';

    let counter = 1;

    while (
      await this.prisma.company.findUnique({
        where: {
          slug,
        },

        select: {
          id: true,
        },
      })
    ) {
      slug =
        `${baseSlug}-${counter}`;

      counter += 1;
    }

    return slug;
  }
}