import { IsString, IsNotEmpty, Length } from 'class-validator';

export class PairDeviceDto {
  @IsString({ message: 'O código deve ser um texto.' })
  @IsNotEmpty({ message: 'O código é obrigatório.' })
  @Length(6, 6, { message: 'O código deve ter exatamente 6 caracteres.' })
  code: string;

  @IsString({ message: 'O nome do dispositivo deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do dispositivo é obrigatório.' })
  name: string;
}