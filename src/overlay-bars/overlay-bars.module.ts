import { Module } from '@nestjs/common';

import { DevicesModule } from '../devices/devices.module';
import { OverlayBarsController } from './overlay-bars.controller';
import { OverlayBarsService } from './overlay-bars.service';

@Module({
  imports: [DevicesModule],
  controllers: [OverlayBarsController],
  providers: [OverlayBarsService],
})
export class OverlayBarsModule {}
