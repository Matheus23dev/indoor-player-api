import { IsBoolean, IsInt, Min, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlaylistItemDto {
  @ApiPropertyOptional({
    minimum: 1,
    example: 8,
    description: 'Tempo em segundos, configurável somente para imagens.',
  })
  @ValidateIf((_object, value) => value !== undefined)
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
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean({
    message: 'O campo muted deve ser verdadeiro ou falso.',
  })
  muted?: boolean;
}
