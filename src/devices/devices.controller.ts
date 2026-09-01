import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import type { Request } from 'express';
import { UserRole } from '@prisma/client';

import { DevicesService } from './devices.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { RolesGuard } from '../auth/roles.guard';

import {
  DeviceAuthGuard,
  type DeviceAuthenticatedRequest,
} from './device-auth.guard';

import { ActivateDeviceDto } from './dto/activate-device.dto';

import { HeartbeatDto } from './dto/heartbeat.dto';

import { PairDeviceDto } from './dto/pair-device.dto';
import type { DeviceAuditActor } from './device-audit';
import {
  ApiDeviceAuthentication,
  ApiRestrictedRoles,
  ApiServerError,
  ApiUserAuthentication,
  ApiUuidParameter,
} from '../swagger/swagger.decorators';
import {
  ApiErrorResponseDto,
  CurrentPlaylistResponseDto,
  DeviceActivationResponseDto,
  DeviceHeartbeatResponseDto,
  DeviceLogResponseDto,
  DeviceLookupResponseDto,
  DeviceMutationResponseDto,
  DeviceRegistrationResponseDto,
  DeviceResponseDto,
  ProgrammingResponseDto,
} from '../swagger/swagger.models';

interface AuthenticatedRequest extends Request {
  user: DeviceAuditActor & {
    companyId: string;
    role: UserRole;
  };
}

@Controller('devices')
@ApiTags('Dispositivos')
@ApiServerError()
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar uma nova instalação do Player',
    description:
      'Gera o código exibido na TV e um segredo de ativação. O segredo deve ser armazenado com segurança pelo aplicativo.',
  })
  @ApiCreatedResponse({ type: DeviceRegistrationResponseDto })
  register() {
    return this.devicesService.registerDevice();
  }

  @Post('activate')
  @ApiOperation({
    summary: 'Ativar ou consultar o vínculo de um Player',
    description:
      'Quando o Player já está vinculado, revoga o token anterior e emite um novo deviceToken.',
  })
  @ApiCreatedResponse({ type: DeviceActivationResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    description: 'O segredo de ativação é inválido.',
    type: ApiErrorResponseDto,
  })
  activate(
    @Body()
    dto: ActivateDeviceDto,
  ) {
    return this.devicesService.activateDevice(dto.code, dto.activationSecret);
  }

  @Get('code/:code')
  @ApiOperation({
    summary: 'Consultar o estado básico pelo código exibido na TV',
  })
  @ApiParam({
    name: 'code',
    example: 'ABC234',
    schema: { type: 'string', minLength: 6, maxLength: 6 },
  })
  @ApiOkResponse({ type: DeviceLookupResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  findByCode(
    @Param('code')
    code: string,
  ) {
    return this.devicesService.findByCode(code);
  }

  @Get('current-playlist')
  @UseGuards(DeviceAuthGuard)
  @ApiDeviceAuthentication()
  @ApiOperation({ summary: 'Consultar a playlist ativa neste instante' })
  @ApiOkResponse({ type: CurrentPlaylistResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  currentPlaylist(
    @Req()
    req: DeviceAuthenticatedRequest,
  ) {
    return this.devicesService.currentPlaylist(req.device.code);
  }

  @Get('programming')
  @UseGuards(DeviceAuthGuard)
  @ApiDeviceAuthentication()
  @ApiOperation({
    summary: 'Sincronizar a janela de programação do Player',
    description:
      'Retorna ocorrências, playlists completas e uma versão determinística para controle de cache.',
  })
  @ApiQuery({
    name: 'hours',
    required: false,
    type: Number,
    example: 24,
    description:
      'Tamanho da janela futura em horas. Normalizado entre 1 e 168.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Máximo de ocorrências. Normalizado entre 1 e 100.',
  })
  @ApiOkResponse({ type: ProgrammingResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  programming(
    @Req()
    req: DeviceAuthenticatedRequest,

    @Query('hours')
    hours = '24',

    @Query('limit')
    limit = '20',
  ) {
    return this.devicesService.programming(
      req.device.code,
      Number(hours),
      Number(limit),
    );
  }

  @Post('heartbeat')
  @UseGuards(DeviceAuthGuard)
  @ApiDeviceAuthentication()
  @ApiOperation({
    summary: 'Atualizar presença e estado de reprodução do Player',
    description:
      'Playlist, item e mídia devem ser enviados juntos ou todos como nulos. O status online utiliza uma janela de 60 segundos.',
  })
  @ApiCreatedResponse({ type: DeviceHeartbeatResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  heartbeat(
    @Body()
    dto: HeartbeatDto,

    @Req()
    req: DeviceAuthenticatedRequest,
  ) {
    return this.devicesService.heartbeat(dto, req.device);
  }

  @Post('pair')
  @UseGuards(JwtAuthGuard)
  @ApiUserAuthentication()
  @ApiOperation({
    summary: 'Vincular o código de um Player à empresa do usuário',
  })
  @ApiCreatedResponse({ type: DeviceResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  pair(
    @Body()
    dto: PairDeviceDto,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.devicesService.pairDevice(
      dto.code,
      dto.name,
      req.user.companyId,
      req.user,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiUserAuthentication()
  @ApiOperation({ summary: 'Listar os Players e seus estados de reprodução' })
  @ApiOkResponse({ type: DeviceResponseDto, isArray: true })
  list(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.devicesService.list(req.user.companyId);
  }

  @Get(':id/preview')
  @UseGuards(JwtAuthGuard)
  @ApiUserAuthentication()
  @ApiOperation({
    summary: 'Consultar o conteúdo atual para a prévia do painel',
  })
  @ApiUuidParameter('id', 'Identificador do Player.')
  @ApiOkResponse({ type: DeviceResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  preview(
    @Param('id')
    id: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.devicesService.preview(id, req.user.companyId);
  }

  @Get(':id/logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiUserAuthentication()
  @ApiRestrictedRoles([UserRole.OWNER, UserRole.ADMIN])
  @ApiOperation({
    summary: 'Consultar o histórico operacional de um Player',
    description: 'Retorna até 500 eventos, do mais recente para o mais antigo.',
  })
  @ApiUuidParameter('id', 'Identificador do Player.')
  @ApiOkResponse({ type: DeviceLogResponseDto, isArray: true })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  logs(
    @Param('id')
    id: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.devicesService.logs(id, req.user.companyId);
  }

  @Post(':id/unlink')
  @UseGuards(JwtAuthGuard)
  @ApiUserAuthentication()
  @ApiOperation({
    summary: 'Desvincular um Player',
    description:
      'Revoga o token, remove os agendamentos, limpa o estado de reprodução e preserva o código para novo vínculo.',
  })
  @ApiUuidParameter('id', 'Identificador do Player.')
  @ApiCreatedResponse({ type: DeviceMutationResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  unlink(
    @Param('id')
    id: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.devicesService.unlinkDevice(id, req.user.companyId, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiUserAuthentication()
  @ApiOperation({ summary: 'Excluir definitivamente um Player' })
  @ApiUuidParameter('id', 'Identificador do Player.')
  @ApiOkResponse({ type: DeviceMutationResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  delete(
    @Param('id')
    id: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.devicesService.deleteDevice(id, req.user.companyId);
  }
}
