import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Operador Recepção' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ format: 'email', example: 'operador@empresa.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    format: 'password',
    minLength: 6,
    example: 'nova-senha-segura',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    enum: [UserRole.ADMIN, UserRole.OPERATOR],
    example: UserRole.OPERATOR,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
