import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'O nome do usuário deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do usuário é obrigatório.' })
  userName: string;

  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  email: string;

  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  password: string;

  @IsString({ message: 'O nome da empresa deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome da empresa é obrigatório.' })
  companyName: string;
}