import {
  Body,
  Controller,
  Param,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { DevicesService } from './devices.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { LinkDeviceDto } from './dto/link-device.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { PairDeviceDto } from './dto/pair-device.dto';

@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
  ) {}

  @Post('register')
  register() {
    return this.devicesService.registerDevice();
  }

@Post('link')
@UseGuards(JwtAuthGuard)
link(
  @Body() dto: LinkDeviceDto,
  @Req() req: any,
) {
  return this.devicesService.linkDevice(
    dto.code,
    req.user.companyId,
  );
}

  @Get()
@UseGuards(JwtAuthGuard)
list(
  @Req() req: any,
) {
  return this.devicesService.list(
    req.user.companyId,
  );
}

  @Get('code/:code')
findByCode(
  @Param('code') code: string,
) {
  return this.devicesService.findByCode(
    code,
  );
}
@Post('pair')
@UseGuards(JwtAuthGuard)
pair(
  @Body() dto: PairDeviceDto,
  @Req() req: any,
) {
  return this.devicesService.pairDevice(
    dto.code,
    dto.name,
    req.user.companyId,
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
    dto.code,
  );
}

@Get(':id/logs')
@UseGuards(JwtAuthGuard)
logs(
  @Param('id') id: string,
) {
  return this.devicesService.logs(id);
}
}