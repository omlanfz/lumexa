// FILE PATH: server/src/classroom/dto/recording.dto.ts
//
// What a teacher's browser sends while it records a class and uploads the file
// (see RecordingController). The global ValidationPipe rejects anything else.

import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_SEGMENT_BYTES } from '../recording.service';

/** No class runs longer than this; it only keeps a nonsense value out. */
const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

export class StartRecordingDto {
  /** The id the browser chose for this recording. Sending the same id again (a
   * retry) returns the recording already made instead of making another. */
  @IsOptional()
  @IsUUID('4', { message: 'segmentId must be a UUID.' })
  segmentId?: string;
}

export class StopRecordingDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_DURATION_MS)
  durationMs?: number;

  /** What the browser actually recorded, e.g. video/webm;codecs=vp8,opus. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;
}

export class RecordingUploadUrlDto {
  /** The size, in bytes, of the finished file about to be uploaded. */
  @IsInt()
  @Min(1)
  @Max(MAX_SEGMENT_BYTES)
  sizeBytes: number;
}

export class CompleteRecordingUploadDto {
  /** The size, in bytes, of the file that was uploaded. It must be the size
   * storage reports, or the recording is not accepted. */
  @IsInt()
  @Min(1)
  @Max(MAX_SEGMENT_BYTES)
  sizeBytes: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_DURATION_MS)
  durationMs?: number;
}
