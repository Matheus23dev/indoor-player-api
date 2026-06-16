import { IsString } from 'class-validator';

export class LinkDeviceDto {
  @IsString()
  code!: string;
}