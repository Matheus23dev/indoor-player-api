import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFolderDto {
  @ApiProperty({ example: 'Campanha de agosto', maxLength: 100 })
  @IsString({ message: 'O nome da pasta deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome da pasta é obrigatório.' })
  name!: string;
}
