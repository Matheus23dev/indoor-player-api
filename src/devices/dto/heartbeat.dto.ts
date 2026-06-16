import { IsString } from 'class-validator';

export class HeartbeatDto {
  @IsString()
  code!: string;
}