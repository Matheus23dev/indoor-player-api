import { PlaylistOrientation } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdatePlaylistDto {
  @IsEnum(PlaylistOrientation, {
    message: 'A orientação deve ser LANDSCAPE ou PORTRAIT.',
  })
  orientation: PlaylistOrientation;
}
