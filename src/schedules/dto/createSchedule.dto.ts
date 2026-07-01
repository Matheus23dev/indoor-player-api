import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class CreateScheduleDto {
  @IsString({
    message: 'O nome deve ser um texto válido.',
  })
  @IsNotEmpty({
    message: 'O nome é obrigatório.',
  })
  name!: string;

  @IsUUID('4', {
    message: 'O ID do player deve ser um UUID válido.',
  })
  @IsNotEmpty({
    message: 'O ID do player é obrigatório.',
  })
  deviceId!: string;

  @IsUUID('4', {
    message: 'O ID da playlist deve ser um UUID válido.',
  })
  @IsNotEmpty({
    message: 'O ID da playlist é obrigatório.',
  })
  playlistId!: string;

  @IsDateString(
    {},
    {
      message: 'A data de início deve ser uma data válida.',
    },
  )
  @IsNotEmpty({
    message: 'A data de início é obrigatória.',
  })
  startDate!: string;

  @IsDateString(
    {},
    {
      message: 'A data de término deve ser uma data válida.',
    },
  )
  @IsNotEmpty({
    message: 'A data de término é obrigatória.',
  })
  endDate!: string;

  @IsString({
    message: 'O horário de início deve ser um texto válido.',
  })
  @IsNotEmpty({
    message: 'O horário de início é obrigatório.',
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'O horário de início deve estar no formato HH:mm.',
  })
  startTime!: string;

  @IsString({
    message: 'O horário de término deve ser um texto válido.',
  })
  @IsNotEmpty({
    message: 'O horário de término é obrigatório.',
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'O horário de término deve estar no formato HH:mm.',
  })
  endTime!: string;

  @IsString({
    message: 'Os dias da semana devem ser uma string válida.',
  })
  @IsNotEmpty({
    message: 'Os dias da semana são obrigatórios.',
  })
  @Matches(/^[0-6](\s*,\s*[0-6])*$/, {
    message:
      'Os dias da semana devem conter valores entre 0 e 6 separados por vírgula.',
  })
  daysOfWeek!: string;

  @IsInt({
    message: 'A prioridade deve ser um número inteiro.',
  })
  @Min(1, {
    message: 'A prioridade mínima é 1.',
  })
  @IsOptional()
  priority?: number;

  @IsBoolean({
    message: 'O campo active deve ser verdadeiro ou falso.',
  })
  @IsOptional()
  active?: boolean;
}