import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { PlaylistsService } from './playlists.service';

@Controller('playlists')
@UseGuards(JwtAuthGuard)
export class PlaylistsController {
  constructor(
    private readonly playlistsService: PlaylistsService,
  ) {}

  @Post()
  create(
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.playlistsService.create(
      body.name,
      req.user.companyId,
    );
  }

  @Get()
  list(
    @Req() req: any,
  ) {
    return this.playlistsService.list(
      req.user.companyId,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.playlistsService.findOne(
      id,
      req.user.companyId,
    );
  }

  @Delete(':id')
@UseGuards(JwtAuthGuard)
remove(
  @Param('id') id: string,
) {
  return this.playlistsService.remove(id);
}

  @Post(':id/items')
  addItem(
    @Param('id') playlistId: string,
    @Body() body: any,
  ) {
    return this.playlistsService.addItem(
      playlistId,
      body.mediaId,
      body.duration,
    );
  }

@Delete('items/:id')
@UseGuards(JwtAuthGuard)
removeItem(
  @Param('id') id: string,
) {
  return this.playlistsService.removeItem(id);
}
}