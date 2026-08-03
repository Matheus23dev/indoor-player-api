import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

class ReorderPlaylistItemDto {
  @IsUUID('4', {
    message: 'O ID do item deve ser um UUID válido.',
  })
  id!: string;

  @IsInt({
    message: 'A posição deve ser um número inteiro.',
  })
  @Min(1, {
    message: 'A posição mínima é 1.',
  })
  order!: number;
}

export class ReorderPlaylistDto {
  @IsArray({
    message: 'Os itens devem ser enviados em uma lista.',
  })
  @ArrayMinSize(1, {
    message: 'Informe pelo menos um item.',
  })
  @ValidateNested({
    each: true,
  })
  @Type(() => ReorderPlaylistItemDto)
  items!: ReorderPlaylistItemDto[];
}
