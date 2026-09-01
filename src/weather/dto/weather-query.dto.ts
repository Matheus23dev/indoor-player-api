import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WeatherQueryDto {
  @ApiProperty({ example: 'Fortaleza', minLength: 2, maxLength: 120 })
  @IsString()
  @Length(2, 120)
  location!: string;
}
