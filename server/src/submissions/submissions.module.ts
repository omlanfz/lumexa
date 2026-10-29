import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import {
  HOMEWORK_STORAGE,
  HomeworkFilesService,
} from './homework-files.service';
import { HomeworkStorageService } from './homework-storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [SubmissionsController],
  providers: [
    SubmissionsService,
    HomeworkFilesService,
    HomeworkStorageService,
    { provide: HOMEWORK_STORAGE, useExisting: HomeworkStorageService },
  ],
  exports: [SubmissionsService, HomeworkFilesService],
})
export class SubmissionsModule {}
