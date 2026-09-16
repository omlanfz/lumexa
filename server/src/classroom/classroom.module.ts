import { Module } from '@nestjs/common';
import { ClassroomService } from './classroom.service';
import { ClassroomController } from './classroom.controller';
import { StudentsModule } from '../students/students.module';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [StudentsModule, SchedulingModule],
  controllers: [ClassroomController],
  providers: [ClassroomService],
})
export class ClassroomModule {}
