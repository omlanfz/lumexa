// FILE PATH: server/src/scheduling/dto/set-schedule.dto.ts

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ScheduleSlotDto {
  /** 0 = Sunday .. 6 = Saturday (Asia/Dhaka calendar day). */
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  /** 'HH:mm' in Asia/Dhaka local time, e.g. "17:00" or "23:15". */
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'time must be in HH:mm 24-hour format',
  })
  time: string;
}

export class SetScheduleDto {
  @IsIn(['ONE_TO_ONE', 'BATCH'])
  classType: 'ONE_TO_ONE' | 'BATCH';

  /** First scheduled class date, 'YYYY-MM-DD', Asia/Dhaka calendar date. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'firstClassDate must be in YYYY-MM-DD format',
  })
  firstClassDate: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one weekly time slot is required.' })
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  slots: ScheduleSlotDto[];
}
