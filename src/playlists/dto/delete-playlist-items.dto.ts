import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeletePlaylistItemsDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    minItems: 1,
    description: 'Itens selecionados para remoção da playlist.',
  })
  @IsArray({
    message: 'Os IDs dos itens devem ser enviados em uma lista.',
  })
  @ArrayMinSize(1, {
    message: 'Selecione pelo menos uma mídia para excluir.',
  })
  @ArrayUnique({
    message: 'Não é permitido enviar IDs de mídias duplicados.',
  })
  @IsUUID('4', {
    each: true,
    message: 'Todos os IDs dos itens devem ser UUIDs válidos.',
  })
  itemIds!: string[];
}
