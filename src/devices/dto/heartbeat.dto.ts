import {
  IsBoolean,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class HeartbeatDto {
  @IsOptional()
  @IsUUID()
  playlistId?: string | null;

  @IsOptional()
  @IsUUID()
  playlistItemId?: string | null;

  @IsOptional()
  @IsUUID()
  mediaId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentTime?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number | null;

  @IsOptional()
  @IsBoolean()
  muted?: boolean | null;

  @IsOptional()
  @IsISO8601()
  startedAt?: string | null;
}
