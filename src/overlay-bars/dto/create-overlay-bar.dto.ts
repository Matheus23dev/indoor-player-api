import {
  OverlayBarContentPosition,
  OverlayBarFit,
  OverlayBarPosition,
  OverlayBarWidgetType,
} from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
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

export class OverlayBarContentItemDto {
  @IsString()
  @Length(1, 64)
  id!: string;

  @IsIn(['TEXT', 'CLOCK', 'DATE', 'WEATHER', 'SPACER'])
  type!: 'TEXT' | 'CLOCK' | 'DATE' | 'WEATHER' | 'SPACER';

  @IsOptional()
  @IsString()
  @Length(0, 500)
  text?: string;

  @IsHexColor()
  textColor!: string;

  @IsInt()
  @Min(10)
  @Max(120)
  fontSize!: number;

  @IsIn(['NORMAL', 'SEMIBOLD', 'BOLD'])
  fontWeight!: 'NORMAL' | 'SEMIBOLD' | 'BOLD';

  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;

  @IsInt()
  @Min(0)
  @Max(60)
  padding!: number;

  @IsInt()
  @Min(0)
  @Max(60)
  borderRadius!: number;

  @IsInt()
  @Min(0)
  @Max(200)
  spacerSize!: number;
}

export class CreateOverlayBarDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsEnum(OverlayBarPosition)
  position!: OverlayBarPosition;

  @IsInt()
  @Min(2)
  @Max(40)
  sizePercent!: number;

  @IsHexColor()
  backgroundColor!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  opacity!: number;

  @IsEnum(OverlayBarFit)
  fit!: OverlayBarFit;

  @IsOptional()
  @IsUUID()
  mediaId?: string | null;

  @IsOptional()
  @IsEnum(OverlayBarContentPosition)
  contentPosition?: OverlayBarContentPosition;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(100)
  imageSizePercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  contentPadding?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  contentGap?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OverlayBarContentItemDto)
  contentItems?: OverlayBarContentItemDto[];

  @IsOptional()
  @IsString()
  @Length(0, 500)
  textContent?: string | null;

  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(120)
  fontSize?: number;

  @IsOptional()
  @IsEnum(OverlayBarWidgetType)
  widgetType?: OverlayBarWidgetType;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  weatherLocation?: string | null;
}
