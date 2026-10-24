import {
  MAX_PEOPLE_PER_CLASSROOM,
  MAX_STUDENTS_PER_CLASSROOM,
  buildIdentity,
  getRoomRef,
  isBatchRoom,
  isCurriculumRoom,
  isLessonRoom,
  isPersonIdentity,
  parseBatchRoom,
  personKey,
  roomForBatch,
  roomForLessonRecord,
  sanitizeDeviceId,
} from './room-ref.util';

const TEACHER_ID = '3f2b8a7e-5c1d-4e9a-8f60-1a2b3c4d5e6f';
const START = new Date('2026-11-02T10:00:00.000Z');

describe('classroom limits', () => {
  it('is ten people at once, the teacher included, and the teacher always has a seat', () => {
    expect(MAX_PEOPLE_PER_CLASSROOM).toBe(10);
    expect(MAX_STUDENTS_PER_CLASSROOM).toBe(9);
  });
});

describe('room names', () => {
  it('gives a 1:1 lesson a room of its own and a batch one shared room', () => {
    const one = {
      id: 'lesson-a',
      classType: 'ONE_TO_ONE' as const,
      teacherId: TEACHER_ID,
      start: START,
    };
    expect(roomForLessonRecord(one)).toBe('lesson-lesson-a');

    const a = { ...one, id: 'a', classType: 'BATCH' as const };
    const b = { ...one, id: 'b', classType: 'BATCH' as const };
    expect(roomForLessonRecord(a)).toBe(roomForLessonRecord(b));
    expect(roomForLessonRecord(a)).toBe(roomForBatch(TEACHER_ID, START));
  });

  it('a different start or teacher is a different batch room', () => {
    const later = new Date(START.getTime() + 3_600_000);
    expect(roomForBatch(TEACHER_ID, later)).not.toBe(
      roomForBatch(TEACHER_ID, START),
    );
    expect(roomForBatch('other-teacher', START)).not.toBe(
      roomForBatch(TEACHER_ID, START),
    );
  });

  it('parses a batch room back into its teacher and start (the id has hyphens)', () => {
    const room = roomForBatch(TEACHER_ID, START);
    expect(parseBatchRoom(room)).toEqual({
      teacherId: TEACHER_ID,
      startMs: START.getTime(),
    });
    expect(getRoomRef(room)).toEqual({
      kind: 'batch',
      teacherId: TEACHER_ID,
      startMs: START.getTime(),
    });
    expect(isBatchRoom(room)).toBe(true);
  });

  it.each([
    'batch-',
    'batch-x',
    'batch-x-notanumber',
    'batch--123',
    'lesson-1',
  ])('%s is not a batch room', (room) => {
    expect(parseBatchRoom(room)).toBeNull();
  });

  it('tells the kinds of room apart', () => {
    expect(getRoomRef('lesson-abc')).toEqual({
      kind: 'lesson',
      scheduledLessonId: 'abc',
    });
    expect(getRoomRef('lumexa-demo-classroom')).toEqual({ kind: 'demo' });
    expect(getRoomRef('6f0e1c22-booking')).toEqual({
      kind: 'booking',
      bookingId: '6f0e1c22-booking',
    });
    // Looks like a batch room but is not one: treated as a plain booking id.
    expect(getRoomRef('batch-nonsense')).toEqual({
      kind: 'booking',
      bookingId: 'batch-nonsense',
    });
  });

  it('counts lessons and batches (not bookings or the demo room) as curriculum', () => {
    expect(isCurriculumRoom('lesson-1')).toBe(true);
    expect(isCurriculumRoom(roomForBatch(TEACHER_ID, START))).toBe(true);
    expect(isCurriculumRoom('some-booking-id')).toBe(false);
    expect(isCurriculumRoom('lumexa-demo-classroom')).toBe(false);
    expect(isLessonRoom(roomForBatch(TEACHER_ID, START))).toBe(false);
  });
});

describe('participant identities', () => {
  it('builds <userId>~<deviceId> and recovers the person from it', () => {
    const identity = buildIdentity('user-1', 'abcd1234');
    expect(identity).toBe('user-1~abcd1234');
    expect(personKey(identity)).toBe('user-1');
  });

  it('two devices of one person are one person; a bare userId still works', () => {
    expect(personKey(buildIdentity('u', 'aaaa'))).toBe(
      personKey(buildIdentity('u', 'bbbb')),
    );
    expect(personKey('u')).toBe('u');
  });

  it('accepts a plain alphanumeric device id and falls back for anything else', () => {
    expect(sanitizeDeviceId('Ab12Cd34')).toBe('Ab12Cd34');
    for (const bad of [
      undefined,
      null,
      42,
      '',
      'abc',
      'has space1',
      'semi;colon',
      'tilde~tilde',
      'x'.repeat(25),
    ]) {
      expect(sanitizeDeviceId(bad)).toBe('main');
    }
  });

  it('counts people only: not the admin observer, not LiveKit egress/ingress/agents', () => {
    expect(isPersonIdentity(buildIdentity('user-1', 'abcd1234'))).toBe(true);
    expect(isPersonIdentity('user-1')).toBe(true);
    expect(isPersonIdentity('admin-observer-1700000000')).toBe(false);
    expect(isPersonIdentity('EG_AbCdEf123456')).toBe(false);
    expect(isPersonIdentity('IN_x')).toBe(false);
    expect(isPersonIdentity('agent-1')).toBe(false);
    expect(isPersonIdentity('user-1~abcd1234', 2)).toBe(false); // non-standard kind
    expect(isPersonIdentity('user-1~abcd1234', 0)).toBe(true);
  });
});
