import { IsUUID, IsNotEmpty, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddPlaylistItemDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Mídia pertencente à mesma empresa.',
  })
  @IsUUID('4', { message: 'O ID da mídia deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'O ID da mídia é obrigatório.' })
  mediaId!: string;

  @ApiPropertyOptional({
    minimum: 1,
    example: 8,
    description: 'Tempo em segundos, aceito somente para imagens.',
  })
  @IsInt({ message: 'A duração deve ser um número inteiro (em segundos).' })
  @Min(1, { message: 'A duração mínima é 1 segundo.' })
  @IsOptional()
  duration?: number;
}
