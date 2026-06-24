import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Req,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { AddPlaylistItemDto } from './dto/add-playlist-item.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
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
  findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playlistsService.findOne(id, req.user.companyId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playlistsService.remove(id, req.user.companyId);
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
    );
  }

  @Patch('items/:id')
updateItem(
  @Param('id') id: string,
  @Body() body: any,
) {
  return this.playlistsService.updateItem(
    id,
    body.duration,
  );
}

@Patch(':id/reorder')
reorder(
  @Param('id') playlistId: string,
  @Body() body: any,
  @Req() req: any,
) {
  return this.playlistsService.reorder(
    playlistId,
    body.items,
    req.user.companyId,
  );
}


  @Delete('items/:id')
  removeItem(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.playlistsService.removeItem(id, req.user.companyId);
  }
}