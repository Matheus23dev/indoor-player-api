import {
  Module,
} from '@nestjs/common';

import {
  PrismaModule,
} from '../prisma/prisma.module';

import {
  DeviceAuthGuard,
} from './device-auth.guard';

import {
  DeviceAuthService,
} from './device-auth.service';

import {
  DevicesController,
} from './devices.controller';

import {
  DevicesGateway,
} from './devices.gateway';

import {
  DevicesService,
} from './devices.service';

@Module({
  imports: [
    PrismaModule,
  ],

  controllers: [
    DevicesController,
  ],

  providers: [
    DeviceAuthService,
    DeviceAuthGuard,
    DevicesService,
    DevicesGateway,
  ],

  exports: [
    DeviceAuthService,
    DeviceAuthGuard,
    DevicesService,
    DevicesGateway,
  ],
})
export class DevicesModule {}
