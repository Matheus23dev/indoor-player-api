import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PairDeviceDto {
  @ApiProperty({ example: 'ABC234', minLength: 6, maxLength: 6 })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ example: 'TV Recepção', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}
