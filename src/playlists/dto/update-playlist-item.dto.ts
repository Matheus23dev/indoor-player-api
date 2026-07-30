import {
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdatePlaylistItemDto {
  @IsOptional()
  @IsInt({
    message:
      'A duração deve ser um número inteiro.',
  })
  @Min(1, {
    message:
      'A duração mínima é de 1 segundo.',
  })
  duration?: number;

  @IsOptional()
  @IsBoolean({
    message:
      'O campo muted deve ser verdadeiro ou falso.',
  })
  muted?: boolean;
}