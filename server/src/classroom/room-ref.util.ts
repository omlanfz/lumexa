// FILE PATH: server/src/classroom/room-ref.util.ts
//
// LiveKit room-name parsing shared by ClassroomService and the recording /
// presence / admission services alongside it. Room names are one of:
// "lesson-<scheduledLessonId>" (curriculum flow), a raw bookingId
// (marketplace flow), or the fixed QA demo room name.

export const DEMO_ROOM_NAME = 'lumexa-demo-classroom';

export type RoomRef =
  | { kind: 'lesson'; scheduledLessonId: string }
  | { kind: 'booking'; bookingId: string }
  | { kind: 'demo' };

export function isLessonRoom(room: string): boolean {
  return room.startsWith('lesson-');
}

export function lessonIdFromRoom(room: string): string {
  return room.slice('lesson-'.length);
}

export function roomForLesson(scheduledLessonId: string): string {
  return `lesson-${scheduledLessonId}`;
}

export function getRoomRef(room: string): RoomRef {
  if (room === DEMO_ROOM_NAME) return { kind: 'demo' };
  if (isLessonRoom(room)) {
    return { kind: 'lesson', scheduledLessonId: lessonIdFromRoom(room) };
  }
  return { kind: 'booking', bookingId: room };
}
