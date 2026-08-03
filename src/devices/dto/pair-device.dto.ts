import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';

export class PairDeviceDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}
