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

import { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { SchedulesService } from './schedules.service';

import { CreateScheduleDto } from './dto/createSchedule.dto';
import { UpdateScheduleDto } from './dto/updateSchedule.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    companyId: string;
  };
}

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
  ) {}

  /**
   * Cria um novo agendamento.
   *
   * POST /schedules
   */
  @Post()
  create(
    @Body() createScheduleDto: CreateScheduleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.schedulesService.create(
      req.user.companyId,
      createScheduleDto,
    );
  }

  /**
   * Lista os agendamentos da empresa.
   *
   * GET /schedules
   */
  @Get()
  list(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.schedulesService.list(
      req.user.companyId,
    );
  }

  /**
   * Busca um agendamento pelo ID.
   *
   * GET /schedules/:id
   */
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.schedulesService.findOne(
      id,
      req.user.companyId,
    );
  }

  /**
   * Atualiza um agendamento.
   *
   * PATCH /schedules/:id
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.schedulesService.update(
      id,
      req.user.companyId,
      updateScheduleDto,
    );
  }

  /**
   * Exclui um agendamento.
   *
   * DELETE /schedules/:id
   */
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.schedulesService.remove(
      id,
      req.user.companyId,
    );
  }
}