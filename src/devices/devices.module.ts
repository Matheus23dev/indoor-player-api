import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { DevicesController } from './devices.controller';
import { DevicesGateway } from './devices.gateway';
import { DevicesService } from './devices.service';

@Module({
  imports: [
    PrismaModule,
  ],

  controllers: [
    DevicesController,
  ],

  providers: [
    DevicesService,
    DevicesGateway,
  ],

  exports: [
    DevicesService,
    DevicesGateway,
  ],
})
export class DevicesModule {}
