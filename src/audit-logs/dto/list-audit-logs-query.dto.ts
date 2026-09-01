import { Transform, Type, type TransformFnParams } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum AuditLogSource {
  ALL = 'ALL',
  ADMINISTRATION = 'ADMINISTRATION',
  PLAYER = 'PLAYER',
  SYSTEM = 'SYSTEM',
}

export class ListAuditLogsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25, example: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @ApiPropertyOptional({ enum: AuditLogSource, default: AuditLogSource.ALL })
  @IsOptional()
  @IsEnum(AuditLogSource)
  source: AuditLogSource = AuditLogSource.ALL;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filtra por Player.' })
  @IsOptional()
  @IsUUID('4')
  deviceId?: string;

  @ApiPropertyOptional({
    maxLength: 120,
    example: 'playlist institucional',
    description: 'Pesquisa por nome do Player, código ou mensagem.',
  })
  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : String(value ?? ''),
  )
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-08-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
