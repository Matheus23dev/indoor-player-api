import {
  Transform,
  Type,
} from 'class-transformer';

import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class HeartbeatDto {
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().toUpperCase()
      : value,
  )
  @IsString({
    message:
      'O código deve ser um texto.',
  })
  @IsNotEmpty({
    message:
      'O código é obrigatório.',
  })
  @Length(6, 6, {
    message:
      'O código deve ter exatamente 6 caracteres.',
  })
  code: string;

  @IsOptional()
  @IsUUID('4', {
    message:
      'O ID da playlist é inválido.',
  })
  playlistId?: string | null;

  @IsOptional()
  @IsUUID('4', {
    message:
      'O ID do item da playlist é inválido.',
  })
  playlistItemId?: string | null;

  @IsOptional()
  @IsUUID('4', {
    message:
      'O ID da mídia é inválido.',
  })
  mediaId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message:
      'O tempo atual deve ser um número inteiro.',
  })
  @Min(0, {
    message:
      'O tempo atual não pode ser negativo.',
  })
  currentTime?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message:
      'A duração deve ser um número inteiro.',
  })
  @Min(0, {
    message:
      'A duração não pode ser negativa.',
  })
  duration?: number | null;

  @IsOptional()
  @IsDateString(
    {},
    {
      message:
        'A data de início da mídia é inválida.',
    },
  )
  startedAt?: string | null;
}