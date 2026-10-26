import {
  MAX_PEOPLE_PER_CLASSROOM,
  MAX_STUDENTS_PER_CLASSROOM,
  buildIdentity,
  getRoomRef,
  isBatchRoom,
  isCurriculumRoom,
  isLessonRoom,
  isPersonIdentity,
  isTrialRoom,
  parseBatchRoom,
  parseBatchSessionRoom,
  parseTrialRoom,
  personKey,
  roomForBatch,
  roomForBatchSession,
  roomForLessonRecord,
  roomForTrial,
  sanitizeDeviceId,
  trialGuestKey,
} from './room-ref.util';

const TEACHER_ID = '3f2b8a7e-5c1d-4e9a-8f60-1a2b3c4d5e6f';
const START = new Date('2026-11-02T10:00:00.000Z');

describe('classroom limits', () => {
  it('is ten people at once, the teacher included, and the teacher always has a seat', () => {
    expect(MAX_PEOPLE_PER_CLASSROOM).toBe(10);
    expect(MAX_STUDENTS_PER_CLASSROOM).toBe(9);
  });
});

describe('a batch class’s room', () => {
  const SESSION_ID = '9b2f6a10-77c4-4d0e-a3d1-0c5e8f2b7a44';

  it('every student’s row in the class takes the class’s ONE room; a 1:1 lesson keeps its own', () => {
    const base = {
      teacherId: TEACHER_ID,
      start: START,
      classType: 'BATCH' as const,
      batchSessionId: SESSION_ID,
    };
    const a = roomForLessonRecord({ ...base, id: 'row-a' });
    const b = roomForLessonRecord({ ...base, id: 'row-b' });
    expect(a).toBe(roomForBatchSession(SESSION_ID));
    expect(a).toBe(b);
    expect(
      roomForLessonRecord({ ...base, id: 'row-a', batchSessionId: 'other' }),
    ).not.toBe(a);
    expect(
      roomForLessonRecord({
        id: 'solo',
        classType: 'ONE_TO_ONE',
        teacherId: TEACHER_ID,
        start: START,
      }),
    ).toBe('lesson-solo');
  });

  it('is keyed by the class, not by teacher and start — two classes at the same time are two rooms', () => {
    expect(roomForBatchSession('s1')).not.toBe(roomForBatchSession('s2'));
    expect(roomForBatchSession(SESSION_ID)).toBe(`batch-session-${SESSION_ID}`);
  });

  it('is parsed back to the class id, and recognised as a batch and curriculum room', () => {
    const room = roomForBatchSession(SESSION_ID);
    expect(parseBatchSessionRoom(room)).toBe(SESSION_ID);
    expect(getRoomRef(room)).toEqual({
      kind: 'session',
      batchSessionId: SESSION_ID,
    });
    expect(isBatchRoom(room)).toBe(true);
    expect(isCurriculumRoom(room)).toBe(true);
    expect(isLessonRoom(room)).toBe(false);
  });

  it('is never mistaken for an old teacher-and-start batch room, whatever its id ends in', () => {
    expect(parseBatchRoom('batch-session-123-456')).toBeNull();
    expect(parseBatchRoom(roomForBatchSession('a-b-1700000000000'))).toBeNull();
    expect(getRoomRef('batch-session-123-456')).toEqual({
      kind: 'session',
      batchSessionId: '123-456',
    });
  });

  it.each(['batch-session-', 'batch-session', 'lesson-batch-session-x'])(
    '%s is not a class room',
    (room) => {
      expect(parseBatchSessionRoom(room)).toBeNull();
    },
  );

  it('a row that somehow has no class falls back to the old name rather than a room of its own', () => {
    expect(
      roomForLessonRecord({
        id: 'x',
        classType: 'BATCH',
        teacherId: TEACHER_ID,
        start: START,
        batchSessionId: null,
      }),
    ).toBe(roomForBatch(TEACHER_ID, START));
  });
});

describe('room names', () => {
  it('gives a 1:1 lesson a room of its own and a legacy batch one shared room', () => {
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

describe('a free trial class’s room', () => {
  const LEAD_ID = '5d1c7e92-4a3b-4f60-9e1d-2b8c6a0f3d71';

  it('is "trial-<id>" and parses back to the trial', () => {
    expect(roomForTrial(LEAD_ID)).toBe(`trial-${LEAD_ID}`);
    expect(parseTrialRoom(`trial-${LEAD_ID}`)).toBe(LEAD_ID);
    expect(getRoomRef(roomForTrial(LEAD_ID))).toEqual({
      kind: 'trial',
      trialLeadId: LEAD_ID,
    });
    expect(isTrialRoom(roomForTrial(LEAD_ID))).toBe(true);
  });

  it('is not a lesson, batch, curriculum or marketplace room (no payout / gem / recording flow)', () => {
    const room = roomForTrial(LEAD_ID);
    expect(isLessonRoom(room)).toBe(false);
    expect(isBatchRoom(room)).toBe(false);
    expect(isCurriculumRoom(room)).toBe(false);
    expect(getRoomRef(room).kind).not.toBe('booking');
  });

  it('other room names are never mistaken for a trial', () => {
    for (const room of [
      'trial-',
      'lesson-trial-1',
      'batch-session-trial-1',
      LEAD_ID,
      'lumexa-demo-classroom',
    ]) {
      expect(isTrialRoom(room)).toBe(false);
    }
  });

  it('a guest has a LiveKit identity of their own, one person across devices, never a real user id', () => {
    const key = trialGuestKey(LEAD_ID);
    expect(key).toBe(`trial-guest-${LEAD_ID}`);
    const phone = buildIdentity(key, 'aaaa1111');
    const laptop = buildIdentity(key, 'bbbb2222');
    expect(personKey(phone)).toBe(key);
    expect(personKey(phone)).toBe(personKey(laptop));
    expect(isPersonIdentity(phone)).toBe(true);
  });
});
