import { Module } from '@nestjs/common';

import { DevicesModule } from '../devices/devices.module';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';

@Module({
  imports: [DevicesModule],
  controllers: [WeatherController],
  providers: [WeatherService],
})
export class WeatherModule {}
