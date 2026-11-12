import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { CurriculumController } from './curriculum.controller';
import { CurriculumService } from './curriculum.service';
import { CurriculumDocumentsService } from './curriculum-documents.service';
import {
  LESSON_VIDEO_STORAGE,
  LessonVideoStorageService,
} from '../little-coders/videos/lesson-video-storage.service';
import { LessonVideosService } from '../little-coders/videos/lesson-videos.service';

@Module({
  imports: [PrismaModule],
  controllers: [CurriculumController],
  providers: [
    CurriculumService,
    CurriculumDocumentsService,
    // The Little Coders preview videos: their own R2 bucket, kept indefinitely.
    LessonVideoStorageService,
    { provide: LESSON_VIDEO_STORAGE, useExisting: LessonVideoStorageService },
    LessonVideosService,
  ],
  exports: [CurriculumService, CurriculumDocumentsService, LessonVideosService],
})
export class CurriculumModule {}
