import {
  IsInt,
  Min,
} from 'class-validator';

export class UpdatePlaylistItemDto {
  @IsInt({
    message:
      'A duração deve ser um número inteiro.',
  })
  @Min(1, {
    message:
      'A duração mínima é de 1 segundo.',
  })
  duration!: number;
}