import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AppService } from './app.service';
import {
  ApiErrorResponseDto,
  HealthResponseDto,
  ReadinessResponseDto,
} from './swagger/swagger.models';
import { ApiServerError } from './swagger/swagger.decorators';

@Controller()
@ApiTags('Saúde')
@ApiServerError()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar informações básicas da API' })
  @ApiOkResponse({ type: HealthResponseDto })
  getInfo() {
    return this.appService.getHealth();
  }

  @Get('health')
  @ApiOperation({ summary: 'Verificar se o processo da API está ativo' })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('health/ready')
  @ApiOperation({
    summary: 'Verificar se a API e o banco estão prontos para receber tráfego',
  })
  @ApiOkResponse({ type: ReadinessResponseDto })
  @ApiServiceUnavailableResponse({
    description: 'O banco de dados não está disponível.',
    type: ApiErrorResponseDto,
  })
  getReadiness() {
    return this.appService.getReadiness();
  }
}
