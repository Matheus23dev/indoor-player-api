import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Maria Souza' })
  @IsString({ message: 'O nome do usuário deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do usuário é obrigatório.' })
  userName!: string;

  @ApiProperty({ format: 'email', example: 'maria@empresa.com' })
  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  email!: string;

  @ApiProperty({ format: 'password', minLength: 6, example: 'senha-segura' })
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  password!: string;

  @ApiProperty({ example: 'Empresa Exemplo' })
  @IsString({ message: 'O nome da empresa deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome da empresa é obrigatório.' })
  companyName!: string;
}
