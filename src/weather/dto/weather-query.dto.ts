import { IsString, Length } from 'class-validator';

export class WeatherQueryDto {
  @IsString()
  @Length(2, 120)
  location!: string;
}
