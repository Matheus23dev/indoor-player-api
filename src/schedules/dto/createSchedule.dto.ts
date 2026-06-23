import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  Matches,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateScheduleDto {
  @IsString({ message: 'O nome deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  name: string;

  @IsUUID('4', { message: 'O ID do player deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'O ID do player é obrigatório.' })
  deviceId: string;

  @IsUUID('4', { message: 'O ID da playlist deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'O ID da playlist é obrigatório.' })
  playlistId: string;

  @IsDateString({}, { message: 'A data de início deve ser uma data válida.' })
  @IsNotEmpty({ message: 'A data de início é obrigatória.' })
  startDate: string;

  @IsDateString({}, { message: 'A data de término deve ser uma data válida.' })
  @IsNotEmpty({ message: 'A data de término é obrigatória.' })
  endDate: string;

  @IsString()
  @IsNotEmpty({ message: 'O horário de início é obrigatório.' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'O horário de início deve estar no formato HH:MM.',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty({ message: 'O horário de término é obrigatório.' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'O horário de término deve estar no formato HH:MM.',
  })
  endTime: string;

  @IsString({ message: 'Os dias da semana devem ser uma string válida.' })
  @IsNotEmpty({ message: 'Os dias da semana são obrigatórios.' })
  daysOfWeek: string;

  @IsInt({ message: 'A prioridade deve ser um número inteiro.' })
  @Min(1, { message: 'A prioridade mínima é 1.' })
  @IsOptional()
  priority?: number;
}