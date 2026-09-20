import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { CurriculumController } from './curriculum.controller';
import { CurriculumService } from './curriculum.service';
import { CurriculumDocumentsService } from './curriculum-documents.service';

@Module({
  imports: [PrismaModule],
  controllers: [CurriculumController],
  providers: [CurriculumService, CurriculumDocumentsService],
  exports: [CurriculumService, CurriculumDocumentsService],
})
export class CurriculumModule {}
