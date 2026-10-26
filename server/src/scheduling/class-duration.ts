// FILE PATH: server/src/scheduling/class-duration.ts
//
// How long a class of each type runs. A constant file of its own so the batch
// code can share it without importing SchedulingService.

import { ClassType } from '@prisma/client';

export const CLASS_DURATION_MINUTES: Record<ClassType, number> = {
  ONE_TO_ONE: 45,
  BATCH: 60,
};
