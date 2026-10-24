import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  BADGE_CATALOG,
  BADGE_IDS,
  describeBadge,
  findBadge,
} from './badge-catalog';
import { AwardBadgeDto, UndoBadgeDto } from './dto/badge.dto';

// The sixteen badges as specified — name, emoji and what each recognises.
const SPEC: [id: string, emoji: string, name: string, criteria: RegExp][] = [
  ['bright-spark', '⭐', 'Bright Spark', /great idea/i],
  ['problem-solver', '🧠', 'Problem Solver', /challenging problem/i],
  ['creative-mind', '💡', 'Creative Mind', /original solution/i],
  ['bug-buster', '🐛', 'Bug Buster', /finding and fixing a bug/i],
  ['code-explorer', '🚀', 'Code Explorer', /something new in coding/i],
  ['homework-hero', '🏆', 'Homework Hero', /homework on time/i],
  ['curious-mind', '🙋', 'Curious Mind', /thoughtful questions/i],
  ['never-give-up', '💪', 'Never Give Up', /persisting through a difficult/i],
  ['team-star', '🤝', 'Team Star', /helping classmates/i],
  ['game-maker', '🎮', 'Game Maker', /game project/i],
  ['web-weaver', '🌐', 'Web Weaver', /website project/i],
  ['ai-pioneer', '🤖', 'AI Pioneer', /AI activity or project/i],
  ['demo-star', '🎤', 'Demo Star', /presenting a project/i],
  [
    'milestone-master',
    '🎯',
    'Milestone Master',
    /important learning milestone/i,
  ],
  ['knowledge-star', '📚', 'Knowledge Star', /understanding in an assessment/i],
  ['rising-star', '🌟', 'Rising Star', /progress over time/i],
];

describe('badge catalog', () => {
  it('has exactly the sixteen specified badges, in order', () => {
    expect(BADGE_CATALOG).toHaveLength(16);
    expect(BADGE_CATALOG.map((b) => b.id)).toEqual(SPEC.map(([id]) => id));
  });

  it.each(SPEC)('%s: emoji, name and criteria', (id, emoji, name, criteria) => {
    const badge = findBadge(id)!;
    expect(badge.emoji).toBe(emoji);
    expect(badge.name).toBe(name);
    expect(badge.criteria).toMatch(criteria);
  });

  it('ids are unique and URL/DB safe; names are unique', () => {
    expect(new Set(BADGE_IDS).size).toBe(BADGE_IDS.length);
    for (const id of BADGE_IDS) expect(id).toMatch(/^[a-z][a-z-]*$/);
    expect(new Set(BADGE_CATALOG.map((b) => b.name)).size).toBe(16);
  });

  it('still describes an award for a badge that was later retired', () => {
    expect(describeBadge('retired-badge')).toMatchObject({
      id: 'retired-badge',
      emoji: '🏅',
      name: 'retired-badge',
    });
    expect(findBadge('retired-badge')).toBeUndefined();
  });
});

describe('award / undo request validation', () => {
  const ok = {
    badgeId: 'bright-spark',
    studentUserIds: ['student-1'],
    requestId: '0b0e5c3e-1c0f-4d57-9a38-9d0d52e1c001',
  };
  const errorsFor = async (body: object) =>
    (await validate(plainToInstance(AwardBadgeDto, body))).map(
      (e) => e.property,
    );

  it('accepts a good request, for one student or nine', async () => {
    expect(await errorsFor(ok)).toEqual([]);
    expect(
      await errorsFor({
        ...ok,
        studentUserIds: Array.from({ length: 9 }, (_, i) => `s${i}`),
      }),
    ).toEqual([]);
  });

  it.each([
    ['an unknown badge', { badgeId: 'gold-medal' }, 'badgeId'],
    ['no students', { studentUserIds: [] }, 'studentUserIds'],
    [
      'more students than a classroom holds',
      { studentUserIds: Array.from({ length: 10 }, (_, i) => `s${i}`) },
      'studentUserIds',
    ],
    [
      'the same student twice',
      { studentUserIds: ['a', 'a'] },
      'studentUserIds',
    ],
    ['a non-string student id', { studentUserIds: [5] }, 'studentUserIds'],
    ['a short request id', { requestId: 'abc' }, 'requestId'],
    [
      'a request id with odd characters',
      { requestId: 'has spaces in it!!' },
      'requestId',
    ],
  ])('rejects %s', async (_label, patch, property) => {
    expect(await errorsFor({ ...ok, ...patch })).toContain(property);
  });

  it('undo needs a well-formed request id', async () => {
    expect(
      await validate(
        plainToInstance(UndoBadgeDto, { requestId: ok.requestId }),
      ),
    ).toHaveLength(0);
    expect(
      await validate(plainToInstance(UndoBadgeDto, { requestId: '' })),
    ).not.toHaveLength(0);
  });
});
