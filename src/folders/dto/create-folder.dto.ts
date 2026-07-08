import { IsString, IsNotEmpty } from 'class-validator';

export class CreateFolderDto {
  @IsString({ message: 'O nome da pasta deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome da pasta é obrigatório.' })
  name!: string;
}