import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduleDto } from './createSchedule.dto';

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}
