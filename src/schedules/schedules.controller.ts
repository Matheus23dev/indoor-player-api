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

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { SchedulesService } from './schedules.service';
import { UpdateScheduleDto } from './dto/updateSchedule.dto';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
  ) {}

  @Post()
  create(
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.schedulesService.create({
      ...body,
      companyId: req.user.companyId,
    });
  }

  @Patch(':id')
@UseGuards(JwtAuthGuard)
update(
  @Param('id') id: string,
  @Body() dto: UpdateScheduleDto,
) {
  return this.schedulesService.update(
    id,
    dto,
  );
}

  @Get()
  list(
    @Req() req: any,
  ) {
    return this.schedulesService.list(
      req.user.companyId,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.schedulesService.findOne(id);
  }
}