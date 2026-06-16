import {
  IsEmail,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  userName!: string;

  @IsEmail()
  email!: string;

  @MinLength(6)
  password!: string;

  @IsString()
  companyName!: string;
}