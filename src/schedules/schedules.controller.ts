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
import type { DeviceAuditActor } from '../devices/device-audit';

interface AuthenticatedRequest extends Request {
  user: DeviceAuditActor & {
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
    return this.schedulesService.create(
      req.user.companyId,
      createScheduleDto,
      req.user,
    );
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.schedulesService.list(req.user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.schedulesService.findOne(id, req.user.companyId);
  }

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
      req.user,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.schedulesService.remove(id, req.user.companyId, req.user);
  }
}
