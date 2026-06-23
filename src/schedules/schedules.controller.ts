import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SchedulesService } from './schedules.service';
import { UpdateScheduleDto } from './dto/updateSchedule.dto';
import { CreateScheduleDto } from './dto/createSchedule.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    companyId: string;
  };
}

@Controller('schedules')
@UseGuards(JwtAuthGuard) 
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  create(
    @Body() createScheduleDto: CreateScheduleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.schedulesService.create(req.user.companyId, createScheduleDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.schedulesService.update(id, req.user.companyId, updateScheduleDto);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.schedulesService.list(req.user.companyId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.schedulesService.findOne(id, req.user.companyId);
  }
}