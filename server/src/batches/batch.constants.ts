// FILE PATH: server/src/batches/batch.constants.ts

import { MAX_STUDENTS_PER_CLASSROOM } from '../classroom/room-ref.util';

/** The hard ceiling for a batch: what one classroom holds besides its teacher. */
export const MAX_BATCH_STUDENTS = MAX_STUDENTS_PER_CLASSROOM;

/** The size Lumexa aims for; Operations may raise it up to the ceiling. */
export const DEFAULT_BATCH_STUDENTS = 4;

/** The classroom opens this long before a class, so a class inside this window
 * is treated as under way: regenerating a schedule never touches it. */
export const SESSION_FREEZE_MINUTES = 10;

/** A class that started this long ago with nobody in it (teacher or students)
 * never happened. It is not counted as progress and is cleared when the
 * batch's schedule is rebuilt. */
export const DEAD_SESSION_AFTER_MINUTES = 120;
