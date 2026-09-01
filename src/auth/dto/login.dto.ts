import { IsEmail, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ format: 'email', example: 'usuario@empresa.com' })
  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  email!: string;

  @ApiProperty({ format: 'password', minLength: 6, example: 'senha-segura' })
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  password!: string;
}
