import test from 'node:test';
import assert from 'node:assert/strict';
import { certificatesToMarkSeen } from './seen.ts';
import type { StudentCertificate } from './types.ts';

const cert = (over: Partial<StudentCertificate>): StudentCertificate => ({
  certificateId: 'LXA-2026-A7K9Q2',
  status: 'ACTIVE',
  courseId: 'course-1',
  programName: 'AI Builder',
  recipientName: 'Nusrat Jahan Tamanna',
  completionDate: '2026-10-29',
  issueDate: '2026-11-06',
  verificationUrl: 'https://frontend.example.test/verify/LXA-2026-A7K9Q2',
  canDownload: true,
  hasImage: true,
  isLegacy: false,
  theme: 'ai-data-science',
  seen: false,
  replacedBy: null,
  ...over,
});

test('the student opening their certificates marks the new active ones as seen', () => {
  const list = [
    cert({ certificateId: 'LXA-2026-AAAAA2' }),
    cert({ certificateId: 'LXA-2026-BBBBB3', seen: true }),
    cert({ certificateId: 'LXA-2026-CCCCC4' }),
  ];
  assert.deepEqual(certificatesToMarkSeen(list, false), ['LXA-2026-AAAAA2', 'LXA-2026-CCCCC4']);
});

test('revoked and replaced certificates have no "ready" card to clear', () => {
  const list = [
    cert({ certificateId: 'LXA-2026-AAAAA2', status: 'REVOKED' }),
    cert({ certificateId: 'LXA-2026-BBBBB3', status: 'REPLACED' }),
  ];
  assert.deepEqual(certificatesToMarkSeen(list, false), []);
});

test('an admin viewing the student\'s dashboard (impersonation) clears nothing', () => {
  const list = [cert({ certificateId: 'LXA-2026-AAAAA2' }), cert({ certificateId: 'LXA-2026-CCCCC4' })];
  assert.deepEqual(certificatesToMarkSeen(list, true), []);
});

test('nothing to mark when there are no certificates', () => {
  assert.deepEqual(certificatesToMarkSeen([], false), []);
});
