import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePlaylistDto {
  @IsString({ message: 'O nome da playlist deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome da playlist é obrigatório.' })
  name: string;
}