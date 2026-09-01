import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/createSchedule.dto';
import { UpdateScheduleDto } from './dto/updateSchedule.dto';
import type { DeviceAuditActor } from '../devices/device-audit';
import {
  ApiServerError,
  ApiUserAuthentication,
  ApiUuidParameter,
} from '../swagger/swagger.decorators';
import {
  ApiErrorResponseDto,
  ScheduleResponseDto,
  SuccessMessageResponseDto,
} from '../swagger/swagger.models';

interface AuthenticatedRequest extends Request {
  user: DeviceAuditActor & {
    companyId: string;
  };
}

@Controller('schedules')
@UseGuards(JwtAuthGuard)
@ApiTags('Agendamentos')
@ApiUserAuthentication()
@ApiServerError()
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar um agendamento',
    description:
      'Associa uma playlist a um Player e notifica o dispositivo para sincronizar sua programação.',
  })
  @ApiCreatedResponse({ type: ScheduleResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  create(
    @Body() createScheduleDto: CreateScheduleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.schedulesService.create(
      req.user.companyId,
      createScheduleDto,
      req.user,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar os agendamentos da empresa' })
  @ApiOkResponse({ type: ScheduleResponseDto, isArray: true })
  list(@Req() req: AuthenticatedRequest) {
    return this.schedulesService.list(req.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar um agendamento e sua playlist' })
  @ApiUuidParameter('id', 'Identificador do agendamento.')
  @ApiOkResponse({ type: ScheduleResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.schedulesService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar um agendamento',
    description:
      'Notifica o Player atual e o anterior quando o dispositivo é alterado.',
  })
  @ApiUuidParameter('id', 'Identificador do agendamento.')
  @ApiOkResponse({ type: ScheduleResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  update(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.schedulesService.update(
      id,
      req.user.companyId,
      updateScheduleDto,
      req.user,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir um agendamento' })
  @ApiUuidParameter('id', 'Identificador do agendamento.')
  @ApiOkResponse({ type: SuccessMessageResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.schedulesService.remove(id, req.user.companyId, req.user);
  }
}
