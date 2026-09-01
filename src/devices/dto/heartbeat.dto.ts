import {
  IsBoolean,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class HeartbeatDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  playlistId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  playlistItemId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  mediaId?: string | null;

  @ApiPropertyOptional({ minimum: 0, nullable: true, example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentTime?: number | null;

  @ApiPropertyOptional({ minimum: 0, nullable: true, example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number | null;

  @ApiPropertyOptional({ nullable: true, example: false })
  @IsOptional()
  @IsBoolean()
  muted?: boolean | null;

  @ApiPropertyOptional({
    format: 'date-time',
    nullable: true,
    example: '2026-08-24T12:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  startedAt?: string | null;
}
