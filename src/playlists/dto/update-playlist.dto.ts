import { PlaylistOrientation } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlaylistDto {
  @ApiProperty({
    enum: PlaylistOrientation,
    example: PlaylistOrientation.PORTRAIT,
  })
  @IsEnum(PlaylistOrientation, {
    message: 'A orientação deve ser LANDSCAPE ou PORTRAIT.',
  })
  orientation!: PlaylistOrientation;
}
