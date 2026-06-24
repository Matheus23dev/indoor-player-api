import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';

import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { DevicesModule } from './devices/devices.module';
import { MediasModule } from './medias/medias.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { SchedulesModule } from './schedules/schedules.module';
import { FoldersModule } from './folders/folders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ServeStaticModule.forRoot({
      rootPath: join(
        __dirname,
        '..',
        'uploads',
      ),

      serveRoot: '/uploads',
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    DevicesModule,
    MediasModule,
    PlaylistsModule,
    SchedulesModule,
    FoldersModule
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}