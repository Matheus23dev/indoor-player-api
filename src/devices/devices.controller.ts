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

import type { Request } from 'express';

import { DevicesService } from './devices.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import {
  DeviceAuthGuard,
  type DeviceAuthenticatedRequest,
} from './device-auth.guard';

import { ActivateDeviceDto } from './dto/activate-device.dto';

import { HeartbeatDto } from './dto/heartbeat.dto';

import { PairDeviceDto } from './dto/pair-device.dto';
import type { DeviceAuditActor } from './device-audit';

interface AuthenticatedRequest extends Request {
  user: DeviceAuditActor & {
    companyId: string;
  };
}

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  register() {
    return this.devicesService.registerDevice();
  }

  @Post('activate')
  activate(
    @Body()
    dto: ActivateDeviceDto,
  ) {
    return this.devicesService.activateDevice(dto.code, dto.activationSecret);
  }

  @Get('code/:code')
  findByCode(
    @Param('code')
    code: string,
  ) {
    return this.devicesService.findByCode(code);
  }

  @Get('current-playlist')
  @UseGuards(DeviceAuthGuard)
  currentPlaylist(
    @Req()
    req: DeviceAuthenticatedRequest,
  ) {
    return this.devicesService.currentPlaylist(req.device.code);
  }

  @Get('programming')
  @UseGuards(DeviceAuthGuard)
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
  list(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.devicesService.list(req.user.companyId);
  }

  @Get(':id/preview')
  @UseGuards(JwtAuthGuard)
  preview(
    @Param('id')
    id: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.devicesService.preview(id, req.user.companyId);
  }

  @Get(':id/logs')
  @UseGuards(JwtAuthGuard)
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
  delete(
    @Param('id')
    id: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.devicesService.deleteDevice(id, req.user.companyId);
  }
}
