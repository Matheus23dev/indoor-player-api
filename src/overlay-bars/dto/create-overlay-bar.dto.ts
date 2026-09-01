import {
  OverlayBarContentPosition,
  OverlayBarFit,
  OverlayBarPosition,
  OverlayBarWidgetType,
} from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OverlayBarContentItemDto {
  @ApiProperty({ example: 'content-1', minLength: 1, maxLength: 64 })
  @IsString()
  @Length(1, 64)
  id!: string;

  @ApiProperty({
    enum: ['TEXT', 'CLOCK', 'DATE', 'WEATHER', 'IMAGE', 'SPACER'],
  })
  @IsIn(['TEXT', 'CLOCK', 'DATE', 'WEATHER', 'IMAGE', 'SPACER'])
  type!: 'TEXT' | 'CLOCK' | 'DATE' | 'WEATHER' | 'IMAGE' | 'SPACER';

  @ApiPropertyOptional({ maxLength: 500, example: 'Bem-vindo' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  text?: string;

  @ApiProperty({ example: '#FFFFFF' })
  @IsHexColor()
  textColor!: string;

  @ApiProperty({ minimum: 10, maximum: 120, example: 28 })
  @IsInt()
  @Min(10)
  @Max(120)
  fontSize!: number;

  @ApiProperty({ enum: ['NORMAL', 'SEMIBOLD', 'BOLD'], example: 'BOLD' })
  @IsIn(['NORMAL', 'SEMIBOLD', 'BOLD'])
  fontWeight!: 'NORMAL' | 'SEMIBOLD' | 'BOLD';

  @ApiPropertyOptional({
    enum: [
      'SYSTEM',
      'SANS_SERIF',
      'SANS_SERIF_CONDENSED',
      'SERIF',
      'MONOSPACE',
    ],
    default: 'SYSTEM',
  })
  @IsOptional()
  @IsIn(['SYSTEM', 'SANS_SERIF', 'SANS_SERIF_CONDENSED', 'SERIF', 'MONOSPACE'])
  fontFamily?:
    | 'SYSTEM'
    | 'SANS_SERIF'
    | 'SANS_SERIF_CONDENSED'
    | 'SERIF'
    | 'MONOSPACE';

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  italic?: boolean;

  @ApiPropertyOptional({ example: '#000000' })
  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;

  @ApiProperty({ minimum: 0, maximum: 60, example: 0 })
  @IsInt()
  @Min(0)
  @Max(60)
  padding!: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 60, example: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  paddingHorizontal?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 60, example: 4 })
  @IsOptional()
  @ApiProperty({ minimum: 0, maximum: 60, example: 0 })
  @IsInt()
  @Min(0)
  @Max(60)
  paddingVertical?: number;

  @ApiProperty({ minimum: 0, maximum: 200, example: 16 })
  @IsInt()
  @Min(0)
  @Max(60)
  borderRadius!: number;

  @IsInt()
  @Min(0)
  @Max(200)
  spacerSize!: number;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  mediaId?: string | null;

  @ApiPropertyOptional({ minimum: 10, maximum: 600, example: 80 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(600)
  imageSizePercent?: number;

  @ApiPropertyOptional({ enum: OverlayBarFit, example: OverlayBarFit.CONTAIN })
  @IsOptional()
  @IsEnum(OverlayBarFit)
  fit?: OverlayBarFit;

  @ApiPropertyOptional({ minimum: -120, maximum: 120, example: 0 })
  @IsOptional()
  @IsInt()
  @Min(-120)
  @Max(120)
  offsetX?: number;

  @ApiPropertyOptional({ minimum: -120, maximum: 120, example: 0 })
  @IsOptional()
  @IsInt()
  @Min(-120)
  @Max(120)
  offsetY?: number;
}

export class CreateOverlayBarDto {
  @ApiProperty({ example: 'Barra institucional', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ enum: OverlayBarPosition, example: OverlayBarPosition.BOTTOM })
  @IsEnum(OverlayBarPosition)
  position!: OverlayBarPosition;

  @ApiProperty({ minimum: 2, maximum: 40, example: 12 })
  @IsInt()
  @Min(2)
  @Max(40)
  sizePercent!: number;

  @ApiProperty({ example: '#0057FF' })
  @IsHexColor()
  backgroundColor!: string;

  @ApiProperty({ minimum: 0, maximum: 100, example: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  opacity!: number;

  @ApiProperty({ enum: OverlayBarFit, example: OverlayBarFit.CONTAIN })
  @IsEnum(OverlayBarFit)
  fit!: OverlayBarFit;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  mediaId?: string | null;

  @ApiPropertyOptional({
    enum: OverlayBarContentPosition,
    default: OverlayBarContentPosition.CENTER,
  })
  @IsOptional()
  @IsEnum(OverlayBarContentPosition)
  contentPosition?: OverlayBarContentPosition;

  @ApiPropertyOptional({
    enum: OverlayBarContentPosition,
    default: OverlayBarContentPosition.CENTER,
  })
  @IsOptional()
  @IsEnum(OverlayBarContentPosition)
  contentAlignment?: OverlayBarContentPosition;

  @ApiPropertyOptional({ minimum: 10, maximum: 600, default: 80 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(600)
  imageSizePercent?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 120, default: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  contentPadding?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 120, default: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  contentGap?: number;

  @ApiPropertyOptional({ type: [OverlayBarContentItemDto], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OverlayBarContentItemDto)
  contentItems?: OverlayBarContentItemDto[];

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  textContent?: string | null;

  @ApiPropertyOptional({ example: '#FFFFFF' })
  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @ApiPropertyOptional({ minimum: 10, maximum: 120, default: 28 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(120)
  fontSize?: number;

  @ApiPropertyOptional({
    enum: OverlayBarWidgetType,
    default: OverlayBarWidgetType.NONE,
  })
  @IsOptional()
  @IsEnum(OverlayBarWidgetType)
  widgetType?: OverlayBarWidgetType;

  @ApiPropertyOptional({ minLength: 2, maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  weatherLocation?: string | null;
}
