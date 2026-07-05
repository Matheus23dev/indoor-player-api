import { Module } from '@nestjs/common';

import { DevicesModule } from '../devices/devices.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
  imports: [
    PrismaModule,
    DevicesModule,
  ],

  controllers: [
    SchedulesController,
  ],

  providers: [
    SchedulesService,
  ],

  exports: [
    SchedulesService,
  ],
})
export class SchedulesModule {}
