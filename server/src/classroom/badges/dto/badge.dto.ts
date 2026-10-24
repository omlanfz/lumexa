// FILE PATH: server/src/classroom/badges/dto/badge.dto.ts

import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { MAX_STUDENTS_PER_CLASSROOM } from '../../room-ref.util';
import { BADGE_IDS } from '../badge-catalog';

/** Chosen by the teacher's browser for one award action (a UUID). Reusing it
 * for a retry or a double click is what keeps the award from being stored
 * twice; a later, separate award uses a new one. */
const REQUEST_ID = /^[A-Za-z0-9_-]+$/;

export class AwardBadgeDto {
  @IsIn(BADGE_IDS, { message: 'That is not one of the classroom badges.' })
  badgeId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Choose at least one student.' })
  @ArrayMaxSize(MAX_STUDENTS_PER_CLASSROOM)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  studentUserIds: string[];

  @IsString()
  @Length(8, 64)
  @Matches(REQUEST_ID, { message: 'requestId has unsupported characters.' })
  requestId: string;
}

export class UndoBadgeDto {
  @IsString()
  @Length(8, 64)
  @Matches(REQUEST_ID, { message: 'requestId has unsupported characters.' })
  requestId: string;
}
