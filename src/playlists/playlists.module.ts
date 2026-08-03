import { Module } from '@nestjs/common';

import { DevicesModule } from '../devices/devices.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PlaylistsController } from './playlists.controller';
import { PlaylistsService } from './playlists.service';

@Module({
  imports: [PrismaModule, DevicesModule],

  controllers: [PlaylistsController],

  providers: [PlaylistsService],

  exports: [PlaylistsService],
})
export class PlaylistsModule {}
