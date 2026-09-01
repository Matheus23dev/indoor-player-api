import {
  DeviceStatus,
  MediaType,
  OverlayBarContentPosition,
  OverlayBarFit,
  OverlayBarPosition,
  OverlayBarWidgetType,
  PlaylistOrientation,
  UserRole,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'Dados inválidos.' },
      { type: 'array', items: { type: 'string' } },
    ],
  })
  message!: string | string[];

  @ApiPropertyOptional({ example: 'Bad Request' })
  error?: string;
}

export class SuccessMessageResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Operação realizada com sucesso.' })
  message!: string;
}

export class PlaylistItemsDeleteResponseDto extends SuccessMessageResponseDto {
  @ApiProperty({ example: 2 })
  removedItems!: number;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 'indoor-player-api' })
  service!: string;

  @ApiProperty({ example: '0.0.1' })
  version!: string;

  @ApiProperty({ format: 'date-time', example: '2026-08-24T12:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: 3600 })
  uptimeSeconds!: number;
}

export class ReadinessChecksDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  database!: 'ok';
}

export class ReadinessResponseDto extends HealthResponseDto {
  @ApiProperty({ type: ReadinessChecksDto })
  checks!: ReadinessChecksDto;
}

export class CompanyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Empresa Exemplo' })
  name!: string;

  @ApiProperty({ example: 'empresa-exemplo' })
  slug!: string;

  @ApiPropertyOptional({ format: 'date-time' })
  createdAt?: Date;

  @ApiPropertyOptional({ format: 'date-time' })
  updatedAt?: Date;
}

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Maria Souza' })
  name!: string;

  @ApiProperty({ format: 'email', example: 'maria@empresa.com' })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN })
  role!: UserRole;

  @ApiPropertyOptional({ format: 'uuid' })
  companyId?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  createdAt?: Date;

  @ApiPropertyOptional({ format: 'date-time' })
  updatedAt?: Date;
}

export class RegisterAccountResponseDto {
  @ApiProperty({ example: 'Conta criada com sucesso' })
  message!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty({ type: CompanyResponseDto })
  company!: CompanyResponseDto;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT usado nas rotas administrativas.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class RegisterCompanyResponseDto {
  @ApiProperty({ type: CompanyResponseDto })
  company!: CompanyResponseDto;

  @ApiProperty({ type: UserResponseDto })
  owner!: UserResponseDto;
}

export class FolderMediaCountDto {
  @ApiProperty({ example: 8 })
  medias!: number;
}

export class FolderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Campanha de agosto' })
  name!: string;

  @ApiProperty({ format: 'uuid' })
  companyId!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: FolderMediaCountDto })
  _count!: FolderMediaCountDto;
}

export class FolderDeleteResponseDto extends SuccessMessageResponseDto {
  @ApiProperty({ example: 3 })
  mediasMovedToRoot!: number;
}

export class MediaPlaylistCountDto {
  @ApiProperty({ example: 2 })
  playlistItems!: number;
}

export class MediaResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'campanha.mp4' })
  name!: string;

  @ApiProperty({ enum: MediaType, example: MediaType.VIDEO })
  type!: MediaType;

  @ApiProperty({ example: '1724430000000-uuid-campanha.mp4' })
  fileUrl!: string;

  @ApiPropertyOptional({ nullable: true, example: 12_345_678 })
  fileSize!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 30 })
  duration!: number | null;

  @ApiPropertyOptional({ nullable: true, example: true })
  hasAudio!: boolean | null;

  @ApiProperty({ format: 'uuid' })
  companyId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  folderId!: string | null;

  @ApiPropertyOptional({ type: FolderResponseDto, nullable: true })
  folder?: FolderResponseDto | null;

  @ApiPropertyOptional({ type: MediaPlaylistCountDto })
  _count?: MediaPlaylistCountDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class MediaDeleteResponseDto extends SuccessMessageResponseDto {
  @ApiProperty({ example: 2 })
  affectedPlaylists!: number;

  @ApiProperty({ example: true })
  fileRemoved!: boolean;
}

export class PlaylistItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  playlistId!: string;

  @ApiProperty({ format: 'uuid' })
  mediaId!: string;

  @ApiProperty({ example: 1 })
  order!: number;

  @ApiPropertyOptional({ nullable: true, example: 8 })
  duration!: number | null;

  @ApiProperty({ example: false })
  muted!: boolean;

  @ApiPropertyOptional({ type: MediaResponseDto })
  media?: MediaResponseDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class OverlayBarContentItemResponseDto {
  @ApiProperty({ example: 'content-1' })
  id!: string;

  @ApiProperty({
    enum: ['TEXT', 'CLOCK', 'DATE', 'WEATHER', 'IMAGE', 'SPACER'],
  })
  type!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Bem-vindo' })
  text?: string | null;

  @ApiProperty({ example: '#FFFFFF' })
  textColor!: string;

  @ApiProperty({ example: 28 })
  fontSize!: number;

  @ApiProperty({ enum: ['NORMAL', 'SEMIBOLD', 'BOLD'] })
  fontWeight!: string;

  @ApiPropertyOptional({ type: MediaResponseDto, nullable: true })
  media?: MediaResponseDto | null;

  @ApiPropertyOptional({ additionalProperties: true })
  options?: Record<string, unknown>;
}

export class OverlayBarResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Barra institucional' })
  name!: string;

  @ApiProperty({ enum: OverlayBarPosition, example: OverlayBarPosition.BOTTOM })
  position!: OverlayBarPosition;

  @ApiProperty({ minimum: 2, maximum: 40, example: 12 })
  sizePercent!: number;

  @ApiProperty({ example: '#0057FF' })
  backgroundColor!: string;

  @ApiProperty({ minimum: 0, maximum: 100, example: 100 })
  opacity!: number;

  @ApiProperty({ enum: OverlayBarFit, example: OverlayBarFit.CONTAIN })
  fit!: OverlayBarFit;

  @ApiProperty({ enum: OverlayBarContentPosition })
  contentPosition!: OverlayBarContentPosition;

  @ApiProperty({ enum: OverlayBarContentPosition })
  contentAlignment!: OverlayBarContentPosition;

  @ApiProperty({ example: 80 })
  imageSizePercent!: number;

  @ApiProperty({ example: 6 })
  contentPadding!: number;

  @ApiProperty({ example: 8 })
  contentGap!: number;

  @ApiPropertyOptional({
    type: [OverlayBarContentItemResponseDto],
    nullable: true,
  })
  contentItems!: OverlayBarContentItemResponseDto[] | null;

  @ApiPropertyOptional({ nullable: true })
  textContent!: string | null;

  @ApiProperty({ example: '#FFFFFF' })
  textColor!: string;

  @ApiProperty({ example: 28 })
  fontSize!: number;

  @ApiProperty({ enum: OverlayBarWidgetType })
  widgetType!: OverlayBarWidgetType;

  @ApiPropertyOptional({ nullable: true, example: 'Fortaleza' })
  weatherLocation!: string | null;

  @ApiProperty({ format: 'uuid' })
  companyId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  mediaId!: string | null;

  @ApiPropertyOptional({ type: MediaResponseDto, nullable: true })
  media?: MediaResponseDto | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class PlaylistOverlayBarResponseDto {
  @ApiProperty({ format: 'uuid' })
  playlistId!: string;

  @ApiProperty({ format: 'uuid' })
  overlayBarId!: string;

  @ApiProperty({ example: 1 })
  order!: number;

  @ApiProperty({ type: OverlayBarResponseDto })
  overlayBar!: OverlayBarResponseDto;
}

export class PlaylistCountsDto {
  @ApiProperty({ example: 4 })
  items!: number;

  @ApiProperty({ example: 1 })
  overlayBars!: number;

  @ApiProperty({ example: 2 })
  schedules!: number;
}

export class PlaylistResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Conteúdo institucional' })
  name!: string;

  @ApiProperty({
    enum: PlaylistOrientation,
    example: PlaylistOrientation.LANDSCAPE,
  })
  orientation!: PlaylistOrientation;

  @ApiProperty({ format: 'uuid' })
  companyId!: string;

  @ApiPropertyOptional({ type: [PlaylistItemResponseDto] })
  items?: PlaylistItemResponseDto[];

  @ApiPropertyOptional({ type: [PlaylistOverlayBarResponseDto] })
  overlayBars?: PlaylistOverlayBarResponseDto[];

  @ApiPropertyOptional({ type: PlaylistCountsDto })
  _count?: PlaylistCountsDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class PlaylistDeleteResponseDto extends SuccessMessageResponseDto {
  @ApiProperty({ example: 4 })
  removedItems!: number;

  @ApiProperty({ example: 2 })
  removedSchedules!: number;
}

export class ScheduleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Horário comercial' })
  name!: string;

  @ApiProperty({ format: 'uuid' })
  companyId!: string;

  @ApiProperty({ format: 'uuid' })
  deviceId!: string;

  @ApiProperty({ format: 'uuid' })
  playlistId!: string;

  @ApiProperty({ format: 'date-time' })
  startDate!: Date;

  @ApiProperty({ format: 'date-time' })
  endDate!: Date;

  @ApiProperty({ pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', example: '08:00' })
  startTime!: string;

  @ApiProperty({ pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', example: '18:00' })
  endTime!: string;

  @ApiProperty({ example: '1,2,3,4,5' })
  daysOfWeek!: string;

  @ApiProperty({ minimum: 1, example: 1 })
  priority!: number;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiPropertyOptional({ additionalProperties: true })
  device?: Record<string, unknown>;

  @ApiPropertyOptional({ type: PlaylistResponseDto })
  playlist?: PlaylistResponseDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class DeviceRegistrationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ minLength: 6, maxLength: 6, example: 'ABC234' })
  code!: string;

  @ApiProperty({ example: false })
  isLinked!: boolean;

  @ApiProperty({ description: 'Segredo de uso único para ativar o Player.' })
  activationSecret!: string;
}

export class DeviceActivationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ABC234' })
  code!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Recepção' })
  name!: string | null;

  @ApiProperty({ example: true })
  isLinked!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Token bearer persistido de forma segura pelo aplicativo Player.',
  })
  deviceToken!: string | null;
}

export class DeviceLookupResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ABC234' })
  code!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Recepção' })
  name!: string | null;

  @ApiProperty({ example: true })
  isLinked!: boolean;
}

export class DevicePlaybackPreviewDto {
  @ApiPropertyOptional({ nullable: true, example: 12 })
  currentTime!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 30 })
  duration!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 40 })
  progress!: number | null;

  @ApiPropertyOptional({ nullable: true, example: false })
  muted!: boolean | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  startedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  updatedAt!: Date | null;
}

export class DevicePreviewContentDto {
  @ApiPropertyOptional({ nullable: true, additionalProperties: true })
  schedule!: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true, additionalProperties: true })
  playlist!: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true, additionalProperties: true })
  item!: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true, type: MediaResponseDto })
  media!: MediaResponseDto | null;

  @ApiProperty({ type: DevicePlaybackPreviewDto })
  playback!: DevicePlaybackPreviewDto;
}

export class DeviceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Recepção' })
  name!: string | null;

  @ApiProperty({ example: 'ABC234' })
  code!: string;

  @ApiProperty({ example: true })
  isLinked!: boolean;

  @ApiProperty({ enum: DeviceStatus, example: DeviceStatus.ONLINE })
  status!: DeviceStatus;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  lastHeartbeat!: Date | null;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  companyId!: string | null;

  @ApiPropertyOptional({ type: DevicePreviewContentDto })
  preview?: DevicePreviewContentDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class DeviceHeartbeatResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ format: 'date-time' })
  receivedAt!: string;
}

export class DeviceMutationResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ format: 'uuid' })
  deviceId!: string;

  @ApiProperty({ example: 'ABC234' })
  code!: string;

  @ApiProperty({ example: true })
  keepCode!: boolean;
}

export class DeviceLogResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  deviceId!: string;

  @ApiProperty({ example: 'Player voltou a ficar online.' })
  message!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class CurrentPlaylistResponseDto {
  @ApiPropertyOptional({ nullable: true, type: ScheduleResponseDto })
  schedule!: ScheduleResponseDto | null;

  @ApiPropertyOptional({ nullable: true, type: PlaylistResponseDto })
  playlist!: PlaylistResponseDto | null;

  @ApiProperty({ format: 'date-time' })
  generatedAt!: string;

  @ApiProperty({ format: 'date', example: '2026-08-24' })
  localDate!: string;

  @ApiProperty({ example: '09:30' })
  localTime!: string;

  @ApiProperty({ example: 'America/Fortaleza' })
  timeZone!: string;
}

export class ProgrammingWindowResponseDto {
  @ApiProperty({ example: 24 })
  hours!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ format: 'date-time' })
  startsAt!: string;

  @ApiProperty({ format: 'date-time' })
  endsAt!: string;

  @ApiProperty({ example: false })
  hasMore!: boolean;
}

export class ProgrammingOccurrenceResponseDto {
  @ApiProperty({ example: 'schedule-uuid:2026-08-24T08:00:00.000Z' })
  occurrenceId!: string;

  @ApiProperty({ format: 'uuid' })
  scheduleId!: string;

  @ApiProperty({ example: 'Horário comercial' })
  scheduleName!: string;

  @ApiProperty({ format: 'uuid' })
  playlistId!: string;

  @ApiProperty({ format: 'date-time' })
  startAt!: string;

  @ApiProperty({ format: 'date-time' })
  endAt!: string;

  @ApiProperty({ example: 1 })
  priority!: number;
}

export class ProgrammingResponseDto {
  @ApiProperty({ format: 'date-time' })
  serverTime!: string;

  @ApiProperty({ example: 'America/Fortaleza' })
  timeZone!: string;

  @ApiProperty({ description: 'Hash usado para detectar alterações na grade.' })
  version!: string;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  programmingUpdatedAt!: string | null;

  @ApiProperty({ type: ProgrammingWindowResponseDto })
  window!: ProgrammingWindowResponseDto;

  @ApiProperty({ additionalProperties: true })
  device!: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  currentOccurrenceId!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  currentScheduleId!: string | null;

  @ApiProperty({ type: [ProgrammingOccurrenceResponseDto] })
  occurrences!: ProgrammingOccurrenceResponseDto[];

  @ApiProperty({ type: [PlaylistResponseDto] })
  playlists!: PlaylistResponseDto[];
}

export class AuditDeviceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Recepção' })
  name!: string | null;

  @ApiProperty({ example: 'ABC234' })
  code!: string;
}

export class AuditLogItemResponseDto extends DeviceLogResponseDto {
  @ApiProperty({ type: AuditDeviceResponseDto })
  device!: AuditDeviceResponseDto;
}

export class PaginationResponseDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 25 })
  limit!: number;

  @ApiProperty({ example: 84 })
  total!: number;

  @ApiProperty({ example: 4 })
  totalPages!: number;
}

export class AuditFiltersResponseDto {
  @ApiProperty({ type: [AuditDeviceResponseDto] })
  devices!: AuditDeviceResponseDto[];
}

export class AuditLogsResponseDto {
  @ApiProperty({ type: [AuditLogItemResponseDto] })
  items!: AuditLogItemResponseDto[];

  @ApiProperty({ type: PaginationResponseDto })
  pagination!: PaginationResponseDto;

  @ApiProperty({ type: AuditFiltersResponseDto })
  filters!: AuditFiltersResponseDto;
}

export class WeatherResponseDto {
  @ApiProperty({ example: 'Fortaleza, Ceará' })
  location!: string;

  @ApiProperty({ example: '29°C' })
  temperature!: string;

  @ApiProperty({ example: 'Parcialmente nublado' })
  condition!: string;

  @ApiProperty({ example: 'Open-Meteo' })
  attribution!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
