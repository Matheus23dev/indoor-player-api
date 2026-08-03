import { IsUUID, IsNotEmpty, IsInt, IsOptional, Min } from 'class-validator';

export class AddPlaylistItemDto {
  @IsUUID('4', { message: 'O ID da mídia deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'O ID da mídia é obrigatório.' })
  mediaId: string;

  @IsInt({ message: 'A duração deve ser um número inteiro (em segundos).' })
  @Min(1, { message: 'A duração mínima é 1 segundo.' })
  @IsOptional()
  duration?: number;
}
