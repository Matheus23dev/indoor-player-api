import { PlaylistOrientation } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreatePlaylistDto {
  @IsString({ message: 'O nome da playlist deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome da playlist é obrigatório.' })
  name: string;

  @IsEnum(PlaylistOrientation, {
    message: 'A orientação deve ser LANDSCAPE ou PORTRAIT.',
  })
  orientation: PlaylistOrientation = PlaylistOrientation.LANDSCAPE;
}
