import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { DeviceAuthGuard } from '../devices/device-auth.guard';
import { WeatherQueryDto } from './dto/weather-query.dto';
import { WeatherService } from './weather.service';
import {
  ApiDeviceAuthentication,
  ApiServerError,
} from '../swagger/swagger.decorators';
import {
  ApiErrorResponseDto,
  WeatherResponseDto,
} from '../swagger/swagger.models';

@Controller('weather')
@UseGuards(DeviceAuthGuard)
@ApiTags('Clima')
@ApiDeviceAuthentication()
@ApiServerError()
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  @ApiOperation({
    summary: 'Consultar o clima atual de uma região',
    description: 'Resposta armazenada em cache por 15 minutos.',
  })
  @ApiOkResponse({ type: WeatherResponseDto })
  @ApiNotFoundResponse({
    description: 'Região não encontrada.',
    type: ApiErrorResponseDto,
  })
  @ApiBadGatewayResponse({
    description: 'O provedor externo de clima não respondeu corretamente.',
    type: ApiErrorResponseDto,
  })
  current(@Query() query: WeatherQueryDto) {
    return this.weatherService.getCurrent(query.location);
  }
}
