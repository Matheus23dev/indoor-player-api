import { PlaylistOrientation } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlaylistDto {
  @ApiProperty({ example: 'Conteúdo institucional' })
  @IsString({ message: 'O nome da playlist deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome da playlist é obrigatório.' })
  name!: string;

  @ApiProperty({
    enum: PlaylistOrientation,
    default: PlaylistOrientation.LANDSCAPE,
  })
  @IsEnum(PlaylistOrientation, {
    message: 'A orientação deve ser LANDSCAPE ou PORTRAIT.',
  })
  orientation: PlaylistOrientation = PlaylistOrientation.LANDSCAPE;
}
