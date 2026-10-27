// What the recording endpoints accept, and who may call them — checked the way
// the running app checks them: through the same ValidationPipe settings as
// main.ts (unknown properties are refused), and by reading the role guards.

import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../auth/roles.decorator';
import { MAX_SEGMENT_BYTES } from './recording.service';
import {
  CompleteRecordingUploadDto,
  RecordingUploadUrlDto,
  StartRecordingDto,
  StopRecordingDto,
} from './dto/recording.dto';
import { RecordingController } from './recording.controller';
import { RecordingsController } from './recordings.controller';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const parse = (dto: Type<unknown>, body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: dto });
const refuses = async (dto: Type<unknown>, body: unknown) => {
  await expect(parse(dto, body)).rejects.toThrow();
};

const UUID_V4 = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('start', () => {
  it('needs nothing at all, or the browser’s own UUID', async () => {
    await expect(parse(StartRecordingDto, {})).resolves.toEqual({});
    await expect(
      parse(StartRecordingDto, { segmentId: UUID_V4 }),
    ).resolves.toMatchObject({ segmentId: UUID_V4 });
  });

  it('refuses an id that is not a UUID, and anything unexpected', async () => {
    await refuses(StartRecordingDto, { segmentId: 'abc' });
    await refuses(StartRecordingDto, { segmentId: '../../x' });
    await refuses(StartRecordingDto, { segmentId: UUID_V4, extra: true });
  });
});

describe('stop', () => {
  it('takes the length and the recorded type, both optional', async () => {
    await expect(parse(StopRecordingDto, {})).resolves.toEqual({});
    await expect(
      parse(StopRecordingDto, {
        durationMs: 754321,
        mimeType: 'video/webm;codecs=vp8,opus',
      }),
    ).resolves.toMatchObject({ durationMs: 754321 });
  });

  it('refuses a nonsense length', async () => {
    await refuses(StopRecordingDto, { durationMs: -1 });
    await refuses(StopRecordingDto, { durationMs: 1.5 });
    await refuses(StopRecordingDto, { durationMs: 25 * 3_600_000 });
    await refuses(StopRecordingDto, { durationMs: '5000' });
    await refuses(StopRecordingDto, { mimeType: 'x'.repeat(500) });
  });
});

describe('upload URL and completion', () => {
  it.each([RecordingUploadUrlDto, CompleteRecordingUploadDto])(
    '%p needs the size of a real file',
    async (dto) => {
      await expect(parse(dto, { sizeBytes: 1 })).resolves.toMatchObject({
        sizeBytes: 1,
      });
      await expect(
        parse(dto, { sizeBytes: MAX_SEGMENT_BYTES }),
      ).resolves.toBeDefined();
      for (const bad of [0, -1, 1.5, '1000', null, MAX_SEGMENT_BYTES + 1]) {
        await refuses(dto, { sizeBytes: bad });
      }
      await refuses(dto, {});
      await refuses(dto, { sizeBytes: 10, contentType: 'text/html' });
    },
  );

  it('completion may also report the length', async () => {
    await expect(
      parse(CompleteRecordingUploadDto, { sizeBytes: 10, durationMs: 60000 }),
    ).resolves.toMatchObject({ durationMs: 60000 });
    await refuses(CompleteRecordingUploadDto, {
      sizeBytes: 10,
      durationMs: -5,
    });
  });
});

describe('who may call', () => {
  const roles = (target: object, method: string): Role[] | undefined =>
    Reflect.getMetadata(
      ROLES_KEY,
      (target as Record<string, object>)[method],
    ) as Role[] | undefined;

  it('only a student lists “my recordings”', () => {
    expect(roles(RecordingsController.prototype, 'mine')).toEqual([
      Role.STUDENT,
    ]);
  });

  it('only an admin opens a class’s full list of parts', () => {
    expect(roles(RecordingsController.prototype, 'forClass')).toEqual([
      Role.ADMIN,
    ]);
  });

  it('students, teachers, parents and admins may ask to watch — the service then checks the class', () => {
    expect(roles(RecordingsController.prototype, 'playback')?.sort()).toEqual(
      [Role.ADMIN, Role.PARENT, Role.STUDENT, Role.TEACHER].sort(),
    );
  });

  it('the teacher’s recording routes are behind the login guard', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      RecordingController,
    ) as unknown[];
    expect(guards).toHaveLength(1);
    const viewer = Reflect.getMetadata(
      '__guards__',
      RecordingsController,
    ) as unknown[];
    expect(viewer).toHaveLength(2); // login + roles
  });
});
