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

  @Post('register')
  register() {
    return this.devicesService.registerDevice();
  }

  @Get('code/:code')
  findByCode(
    @Param('code') code: string,
  ) {
    return this.devicesService.findByCode(
      code,
    );
  }

  @Get('current-playlist/:code')
  currentPlaylist(
    @Param('code') code: string,
  ) {
    return this.devicesService.currentPlaylist(
      code,
    );
  }

  @Post('heartbeat')
  heartbeat(
    @Body() dto: HeartbeatDto,
  ) {
    return this.devicesService.heartbeat(
      dto,
    );
  }

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

  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.devicesService.list(
      req.user.companyId,
    );
  }

  @Get(':id/preview')
  @UseGuards(JwtAuthGuard)
  preview(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.devicesService.preview(
      id,
      req.user.companyId,
    );
  }

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