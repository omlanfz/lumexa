// FILE PATH: server/src/batches/batches.module.ts
//
// Batches: groups of students learning one curriculum together with one
// teacher. Depends on StudentsModule only for the student ledger (a student
// who takes a batch's curriculum carries their balance forward). SchedulingModule
// deliberately does NOT depend on this module — the per-student scheduler only
// needs the small tx helpers, never the services — so there is no cycle.

import { Module } from '@nestjs/common';
import { StudentsModule } from '../students/students.module';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';
import { BatchSessionsService } from './batch-sessions.service';

@Module({
  imports: [StudentsModule],
  controllers: [BatchesController],
  providers: [BatchesService, BatchSessionsService],
  exports: [BatchesService, BatchSessionsService],
})
export class BatchesModule {}
