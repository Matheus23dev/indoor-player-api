import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { DeviceAuthGuard } from '../devices/device-auth.guard';
import { WeatherQueryDto } from './dto/weather-query.dto';
import { WeatherService } from './weather.service';

@Controller('weather')
@UseGuards(DeviceAuthGuard)
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  current(@Query() query: WeatherQueryDto) {
    return this.weatherService.getCurrent(query.location);
  }
}
