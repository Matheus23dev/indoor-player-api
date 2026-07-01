import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { DevicesService } from './devices.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { HeartbeatDto } from './dto/heartbeat.dto';
import { PairDeviceDto } from './dto/pair-device.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    companyId: string;
  };
}

@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
  ) {}

  /**
   * Registra um novo dispositivo.
   * Rota usada pelo aplicativo da TV.
   *
   * POST /devices/register
   */
  @Post('register')
  register() {
    return this.devicesService.registerDevice();
  }

  /**
   * Consulta o dispositivo pelo código.
   * Usada pela tela de ativação para verificar
   * se a TV já foi vinculada.
   *
   * GET /devices/code/:code
   */
  @Get('code/:code')
  findByCode(
    @Param('code') code: string,
  ) {
    return this.devicesService.findByCode(
      code,
    );
  }

  /**
   * Retorna o agendamento e a playlist
   * ativos para o dispositivo.
   *
   * GET /devices/current-playlist/:code
   */
  @Get('current-playlist/:code')
  currentPlaylist(
    @Param('code') code: string,
  ) {
    return this.devicesService.currentPlaylist(
      code,
    );
  }

  /**
   * Atualiza o último heartbeat do dispositivo.
   *
   * POST /devices/heartbeat
   *
   * Body:
   * {
   *   "code": "ABC123"
   * }
   */
  @Post('heartbeat')
  heartbeat(
    @Body() dto: HeartbeatDto,
  ) {
    return this.devicesService.heartbeat(
      dto.code,
    );
  }

  /**
   * Vincula o código exibido na TV
   * à empresa autenticada.
   *
   * POST /devices/pair
   */
  @Post('pair')
  @UseGuards(JwtAuthGuard)
  pair(
    @Body() dto: PairDeviceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.devicesService.pairDevice(
      dto.code,
      dto.name,
      req.user.companyId,
    );
  }

  /**
   * Lista os dispositivos da empresa autenticada.
   *
   * GET /devices
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.devicesService.list(
      req.user.companyId,
    );
  }

  /**
   * Retorna os logs de um dispositivo.
   *
   * GET /devices/:id/logs
   */
  @Get(':id/logs')
  @UseGuards(JwtAuthGuard)
  logs(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.devicesService.logs(
      id,
      req.user.companyId,
    );
  }
}