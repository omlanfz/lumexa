import { IsDateString } from 'class-validator';

export class CreateShiftDto {
  @IsDateString(
    {},
    { message: 'Start time must be a valid ISO 8601 date string.' },
  )
  start: string;

  @IsDateString(
    {},
    { message: 'End time must be a valid ISO 8601 date string.' },
  )
  end: string;
}
