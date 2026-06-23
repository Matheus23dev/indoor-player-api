export class UpdateScheduleDto {
    name?: string;

    startDate?: Date;

    endDate?: Date;

    startTime?: string;

    endTime?: string;

    daysOfWeek?: string;

    priority?: number;
  }