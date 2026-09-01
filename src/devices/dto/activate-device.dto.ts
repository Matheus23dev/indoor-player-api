import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateDeviceDto {
  @ApiProperty({ example: 'ABC234', minLength: 6, maxLength: 6 })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;

  @ApiProperty({
    description: 'Segredo recebido no registro inicial desta instalação.',
    example: 'segredo-de-ativacao-gerado-pela-api',
  })
  @IsString()
  @IsNotEmpty()
  activationSecret!: string;
}
