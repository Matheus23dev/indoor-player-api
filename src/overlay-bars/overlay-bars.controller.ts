import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOverlayBarDto } from './dto/create-overlay-bar.dto';
import { UpdateOverlayBarDto } from './dto/update-overlay-bar.dto';
import { OverlayBarsService } from './overlay-bars.service';

interface AuthenticatedRequest extends Request {
  user: {
    companyId: string;
  };
}

@Controller('overlay-bars')
@UseGuards(JwtAuthGuard)
export class OverlayBarsController {
  constructor(private readonly overlayBarsService: OverlayBarsService) {}

  @Post()
  create(@Body() dto: CreateOverlayBarDto, @Req() req: AuthenticatedRequest) {
    return this.overlayBarsService.create(req.user.companyId, dto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.overlayBarsService.list(req.user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOverlayBarDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.overlayBarsService.update(id, req.user.companyId, dto);
  }

  @Post(':id/playlists/:playlistId')
  attach(
    @Param('id') id: string,
    @Param('playlistId') playlistId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.overlayBarsService.attachToPlaylist(
      id,
      playlistId,
      req.user.companyId,
    );
  }

  @Delete(':id/playlists/:playlistId')
  detach(
    @Param('id') id: string,
    @Param('playlistId') playlistId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.overlayBarsService.detachFromPlaylist(
      id,
      playlistId,
      req.user.companyId,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.overlayBarsService.remove(id, req.user.companyId);
  }
}
