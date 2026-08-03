import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(data: RegisterDto) {
    try {
      const email = data.email.trim().toLowerCase();
      const companyName = data.companyName.trim();
      const userName = data.userName.trim();
      const slug = companyName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const [userExists, companyExists] = await Promise.all([
        this.prisma.user.findUnique({ where: { email } }),
        this.prisma.company.findUnique({ where: { slug } }),
      ]);

      if (userExists) throw new ConflictException('E-mail já cadastrado.');
      if (companyExists)
        throw new ConflictException('Já existe uma empresa com esse nome.');

      const passwordHash = await bcrypt.hash(data.password, 10);

      const result = await this.prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: {
            name: companyName,
            slug,
          },
        });

        const user = await tx.user.create({
          data: {
            name: userName,
            email,
            password: passwordHash,
            companyId: company.id,
            role: UserRole.OWNER,
          },
        });

        return { user, company };
      });

      return {
        message: 'Conta criada com sucesso',
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
        company: {
          id: result.company.id,
          name: result.company.name,
          slug: result.company.slug,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        'Erro interno ao registrar a conta.',
      );
    }
  }

  async login(data: LoginDto) {
    try {
      const email = data.email.trim().toLowerCase();

      const user = await this.prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!user) {
        throw new UnauthorizedException('E-mail ou senha incorretos.');
      }

      const validPassword = await bcrypt.compare(data.password, user.password);

      if (!validPassword) {
        throw new UnauthorizedException('E-mail ou senha incorretos.');
      }

      const token = await this.jwt.signAsync({
        sub: user.id,
        companyId: user.companyId,
        role: user.role,
      });

      return {
        token,

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('[AUTH LOGIN]', error);

      throw new InternalServerErrorException('Erro interno ao realizar login.');
    }
  }
}
