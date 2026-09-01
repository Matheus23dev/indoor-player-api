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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({ example: 'Horário comercial' })
  @IsString({
    message: 'O nome deve ser um texto válido.',
  })
  @IsNotEmpty({
    message: 'O nome é obrigatório.',
  })
  name!: string;

  @ApiProperty({ format: 'uuid', description: 'Player pertencente à empresa.' })
  @IsUUID('4', {
    message: 'O ID do player deve ser um UUID válido.',
  })
  @IsNotEmpty({
    message: 'O ID do player é obrigatório.',
  })
  deviceId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Playlist pertencente à empresa.',
  })
  @IsUUID('4', {
    message: 'O ID da playlist deve ser um UUID válido.',
  })
  @IsNotEmpty({
    message: 'O ID da playlist é obrigatório.',
  })
  playlistId!: string;

  @ApiProperty({ format: 'date', example: '2026-08-01' })
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

  @ApiProperty({ format: 'date', example: '2026-12-31' })
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

  @ApiProperty({ pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', example: '08:00' })
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

  @ApiProperty({ pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', example: '18:00' })
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

  @ApiProperty({
    pattern: '^[0-6](\\s*,\\s*[0-6])*$',
    example: '1,2,3,4,5',
    description: 'Dias da semana: 0 para domingo até 6 para sábado.',
  })
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

  @ApiPropertyOptional({ minimum: 1, default: 1, example: 1 })
  @IsInt({
    message: 'A prioridade deve ser um número inteiro.',
  })
  @Min(1, {
    message: 'A prioridade mínima é 1.',
  })
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ default: true, example: true })
  @IsBoolean({
    message: 'O campo active deve ser verdadeiro ou falso.',
  })
  @IsOptional()
  active?: boolean;
}
