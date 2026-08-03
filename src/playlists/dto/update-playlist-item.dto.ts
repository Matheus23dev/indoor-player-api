import { IsBoolean, IsInt, Min, ValidateIf } from 'class-validator';

export class UpdatePlaylistItemDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt({
    message: 'A duração deve ser um número inteiro.',
  })
  @Min(1, {
    message: 'A duração mínima é de 1 segundo.',
  })
  duration?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean({
    message: 'O campo muted deve ser verdadeiro ou falso.',
  })
  muted?: boolean;
}
