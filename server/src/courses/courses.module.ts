import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { PrismaModule } from '../prisma.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { BatchesModule } from '../batches/batches.module';

@Module({
  imports: [PrismaModule, SchedulingModule, BatchesModule],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
