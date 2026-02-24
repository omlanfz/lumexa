import { IsString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsUUID('4', { message: 'shiftId must be a valid UUID.' })
  shiftId: string;

  @IsString()
  @IsUUID('4', { message: 'studentId must be a valid UUID.' })
  studentId: string;
}
