import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ActivateDeviceDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;

  @IsString()
  @IsNotEmpty()
  activationSecret!: string;
}
