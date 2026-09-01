import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  IsEnum,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlaylistOrientation } from '@prisma/client';

export class SavePlaylistCompositionItemDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Identificador de um item que já existe na playlist.',
  })
  @IsOptional()
  @IsUUID('4', {
    message: 'O ID do item deve ser um UUID válido.',
  })
  id?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Identificador do item original quando esta posição representa uma duplicação pendente.',
  })
  @IsOptional()
  @IsUUID('4', {
    message: 'O ID do item original deve ser um UUID válido.',
  })
  sourceItemId?: string;

  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt({
    message: 'A posição deve ser um número inteiro.',
  })
  @Min(1, {
    message: 'A posição mínima é 1.',
  })
  order!: number;

  @ApiPropertyOptional({
    minimum: 1,
    example: 8,
    description: 'Tempo em segundos, configurável somente para imagens.',
  })
  @IsOptional()
  @IsInt({
    message: 'A duração deve ser um número inteiro.',
  })
  @Min(1, {
    message: 'A duração mínima é de 1 segundo.',
  })
  duration?: number;

  @ApiPropertyOptional({
    example: true,
    description:
      'Silencia um vídeo. Bloqueado quando o arquivo não possui áudio.',
  })
  @IsOptional()
  @IsBoolean({
    message: 'O campo muted deve ser verdadeiro ou falso.',
  })
  muted?: boolean;
}

export class SavePlaylistCompositionDto {
  @ApiProperty({ type: [SavePlaylistCompositionItemDto] })
  @IsArray({
    message: 'Os itens devem ser enviados em uma lista.',
  })
  @ValidateNested({ each: true })
  @Type(() => SavePlaylistCompositionItemDto)
  items!: SavePlaylistCompositionItemDto[];

  @ApiProperty({
    enum: PlaylistOrientation,
    example: PlaylistOrientation.LANDSCAPE,
  })
  @IsEnum(PlaylistOrientation, {
    message: 'A orientação deve ser LANDSCAPE ou PORTRAIT.',
  })
  orientation!: PlaylistOrientation;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Barras fixas vinculadas, na ordem de exibição.',
  })
  @IsArray({
    message: 'As barras devem ser enviadas em uma lista.',
  })
  @ArrayUnique({
    message: 'Não é permitido vincular a mesma barra mais de uma vez.',
  })
  @IsUUID('4', {
    each: true,
    message: 'Todos os IDs das barras devem ser UUIDs válidos.',
  })
  overlayBarIds!: string[];
}
