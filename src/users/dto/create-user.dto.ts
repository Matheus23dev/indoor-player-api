import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'Operador Recepção' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ format: 'email', example: 'operador@empresa.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ format: 'password', minLength: 6, example: 'senha-segura' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    enum: [UserRole.ADMIN, UserRole.OPERATOR],
    example: UserRole.OPERATOR,
  })
  @IsEnum(UserRole)
  role!: UserRole;
}
