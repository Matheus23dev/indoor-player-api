import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';

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
import { OverlayBarsModule } from './overlay-bars/overlay-bars.module';
import { WeatherModule } from './weather/weather.module';
import { getMediaPublicPath, getMediaStoragePath } from './config/environment';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),

    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          rootPath: getMediaStoragePath(
            config.get<string>('MEDIA_STORAGE_PATH'),
          ),
          serveRoot: getMediaPublicPath(
            config.get<string>('MEDIA_PUBLIC_PATH'),
          ),
          serveStaticOptions: {
            acceptRanges: true,
            cacheControl: true,
            etag: true,
            index: false,
            maxAge: '1h',
          },
        },
      ],
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    DevicesModule,
    MediasModule,
    PlaylistsModule,
    SchedulesModule,
    FoldersModule,
    OverlayBarsModule,
    WeatherModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}
