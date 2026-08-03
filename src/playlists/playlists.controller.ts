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

import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { AddPlaylistItemDto } from './dto/add-playlist-item.dto';
import { UpdatePlaylistItemDto } from './dto/update-playlist-item.dto';
import { ReorderPlaylistDto } from './dto/reorder-playlist.dto';
import type { DeviceAuditActor } from '../devices/device-audit';

interface AuthenticatedRequest extends Request {
  user: DeviceAuditActor & {
    companyId: string;
  };
}

@Controller('playlists')
@UseGuards(JwtAuthGuard)
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Post()
  create(
    @Body() createPlaylistDto: CreatePlaylistDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playlistsService.create(req.user.companyId, createPlaylistDto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.playlistsService.list(req.user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.playlistsService.findOne(id, req.user.companyId);
  }

  @Post(':id/items')
  addItem(
    @Param('id') playlistId: string,
    @Body() addPlaylistItemDto: AddPlaylistItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playlistsService.addItem(
      playlistId,
      req.user.companyId,
      addPlaylistItemDto,
      req.user,
    );
  }
  @Patch('items/:id')
  updateItem(
    @Param('id')
    id: string,

    @Body()
    dto: UpdatePlaylistItemDto,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.playlistsService.updateItem(
      id,
      dto,
      req.user.companyId,
      req.user,
    );
  }
  @Patch(':id/reorder')
  reorder(
    @Param('id') playlistId: string,
    @Body() dto: ReorderPlaylistDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playlistsService.reorder(
      playlistId,
      dto.items,
      req.user.companyId,
      req.user,
    );
  }

  @Delete('items/:id')
  removeItem(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.playlistsService.removeItem(id, req.user.companyId, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.playlistsService.remove(id, req.user.companyId, req.user);
  }
}
