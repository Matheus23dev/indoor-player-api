import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterCompanyDto {
  @ApiProperty({ example: 'Empresa Exemplo' })
  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @ApiProperty({ example: 'Maria Souza' })
  @IsString()
  @IsNotEmpty()
  ownerName!: string;

  @ApiProperty({ format: 'email', example: 'maria@empresa.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ format: 'password', minLength: 6, example: 'senha-segura' })
  @IsString()
  @MinLength(6)
  password!: string;
}
