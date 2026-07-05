import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { DevicesService } from './devices.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { HeartbeatDto } from './dto/heartbeat.dto';
import { PairDeviceDto } from './dto/pair-device.dto';

interface AuthenticatedRequest
  extends Request {
  user: {
    id: string;
    companyId: string;
  };
}

@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService:
      DevicesService,
  ) {}

  /**
   * Registra um novo TV Box e gera
   * um código de pareamento.
   *
   * POST /devices/register
   */
  @Post('register')
  register() {
    return this.devicesService.registerDevice();
  }

  /**
   * Consulta um dispositivo pelo código.
   *
   * GET /devices/code/:code
   */
  @Get('code/:code')
  findByCode(
    @Param('code')
    code: string,
  ) {
    return this.devicesService.findByCode(
      code,
    );
  }

  /**
   * Retorna somente a playlist que
   * deve estar tocando neste momento.
   *
   * GET /devices/current-playlist/:code
   */
  @Get('current-playlist/:code')
  currentPlaylist(
    @Param('code')
    code: string,
  ) {
    return this.devicesService.currentPlaylist(
      code,
    );
  }

  /**
   * Retorna toda a programação ativa
   * do dispositivo, incluindo agendamentos
   * atuais e futuros.
   *
   * GET /devices/programming/:code
   */
@Get('programming/:code')
programming(
  @Param('code')
  code: string,

  @Query('hours')
  hours = '24',

  @Query('limit')
  limit = '20',
) {
  return this.devicesService.programming(
    code,
    Number(hours),
    Number(limit),
  );
}

  /**
   * Recebe o status e o estado atual
   * de reprodução do TV Box.
   *
   * POST /devices/heartbeat
   */
  @Post('heartbeat')
  heartbeat(
    @Body()
    dto: HeartbeatDto,
  ) {
    return this.devicesService.heartbeat(
      dto,
    );
  }

  /**
   * Vincula o TV Box à empresa autenticada.
   *
   * POST /devices/pair
   */
  @Post('pair')
  @UseGuards(JwtAuthGuard)
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
    );
  }

  /**
   * Lista os dispositivos da empresa.
   *
   * GET /devices
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.devicesService.list(
      req.user.companyId,
    );
  }

  /**
   * Retorna o preview de um dispositivo.
   *
   * GET /devices/:id/preview
   */
  @Get(':id/preview')
  @UseGuards(JwtAuthGuard)
  preview(
    @Param('id')
    id: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.devicesService.preview(
      id,
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
    @Param('id')
    id: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.devicesService.logs(
      id,
      req.user.companyId,
    );
  }
}