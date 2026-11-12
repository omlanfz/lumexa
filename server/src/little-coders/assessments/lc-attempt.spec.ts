import { SessionType } from '@prisma/client';
import { LC_FILE_LIMITS } from '../lc.constants';
import { course1Bank, finalBank } from './index';
import {
  cleanNote,
  lcAssessmentMeta,
  normalizeLinks,
  pickPractical,
  pickVariant,
  readPracticalSpec,
  studentPracticalSpec,
} from './lc-attempt';

describe('pickVariant — which version of the practical a class is given', () => {
  it('a class override wins, then the assessment’s default, then Scratch / AI', () => {
    expect(
      pickVariant({ classVariant: 'PYTHON', assessmentVariant: 'SCRATCH_AI' }),
    ).toBe('PYTHON');
    expect(
      pickVariant({ classVariant: null, assessmentVariant: 'PYTHON' }),
    ).toBe('PYTHON');
    expect(pickVariant({ classVariant: null, assessmentVariant: null })).toBe(
      'SCRATCH_AI',
    );
    expect(pickVariant({})).toBe('SCRATCH_AI');
  });

  it('ignores a value that is not one of the two versions', () => {
    expect(
      pickVariant({ classVariant: 'RUBY', assessmentVariant: 'PYTHON' }),
    ).toBe('PYTHON');
    expect(
      pickVariant({ classVariant: 'RUBY', assessmentVariant: 'JAVA' }),
    ).toBe('SCRATCH_AI');
  });
});

describe('pickPractical', () => {
  const scratch = { id: 's', variantKey: 'SCRATCH_AI' };
  const python = { id: 'p', variantKey: 'PYTHON' };

  it('a course assessment has one practical, whatever the variant', () => {
    const only = { id: 'x', variantKey: null };
    expect(pickPractical([only], 'PYTHON')).toBe(only);
    expect(pickPractical([only], 'SCRATCH_AI')).toBe(only);
  });

  it('the final gives the version chosen', () => {
    expect(pickPractical([scratch, python], 'PYTHON')).toBe(python);
    expect(pickPractical([scratch, python], 'SCRATCH_AI')).toBe(scratch);
  });

  it('falls back to the first practical when the chosen version is not published', () => {
    expect(pickPractical([scratch], 'PYTHON')).toBe(scratch);
  });

  it('is null when there is no practical at all', () => {
    expect(pickPractical([], 'PYTHON')).toBeNull();
  });
});

describe('normalizeLinks — project links a student hands in', () => {
  it('accepts https links, trims and removes duplicates', () => {
    const r = normalizeLinks([
      ' https://scratch.mit.edu/projects/1/ ',
      'https://scratch.mit.edu/projects/1/',
      '',
      'https://stretch3.github.io/x',
    ]);
    expect(r).toEqual({
      links: [
        'https://scratch.mit.edu/projects/1/',
        'https://stretch3.github.io/x',
      ],
      error: null,
    });
  });

  it('nothing is fine', () => {
    expect(normalizeLinks(undefined)).toEqual({ links: [], error: null });
    expect(normalizeLinks(null)).toEqual({ links: [], error: null });
    expect(normalizeLinks([])).toEqual({ links: [], error: null });
  });

  it.each([
    'http://example.com/a',
    'javascript:alert(1)',
    'ftp://x.org/a',
    'not a link',
    'data:text/html,hi',
    'https://',
    'https://exa mple.com',
  ])('refuses %s', (bad) => {
    expect(normalizeLinks([bad]).error).toMatch(/not a full https/);
  });

  it('refuses a list that is not a list, and a link that is not text', () => {
    expect(normalizeLinks('https://a.org').error).toMatch(/list/);
    expect(normalizeLinks([1 as never]).error).toMatch(/text/);
  });

  it('limits how many links and how long each is', () => {
    const many = Array.from(
      { length: LC_FILE_LIMITS.maxLinks + 1 },
      (_, i) => `https://a.org/${i}`,
    );
    expect(normalizeLinks(many).error).toMatch(/up to/);
    expect(
      normalizeLinks([
        `https://a.org/${'x'.repeat(LC_FILE_LIMITS.maxLinkLength)}`,
      ]).error,
    ).toMatch(/longer than/);
  });
});

describe('cleanNote', () => {
  it('trims, caps and empties', () => {
    expect(cleanNote('  hello  ')).toBe('hello');
    expect(cleanNote('   ')).toBeNull();
    expect(cleanNote(undefined)).toBeNull();
    expect(cleanNote(5)).toBeNull();
    expect(cleanNote('x'.repeat(5000))).toHaveLength(
      LC_FILE_LIMITS.maxNoteLength,
    );
  });
});

describe('the practical specification as the student sees it', () => {
  const spec = finalBank.practicals.find(
    (p) => p.variant === 'SCRATCH_AI',
  )!.spec;

  it('a stored specification that does not validate is never served', () => {
    expect(readPracticalSpec({ nonsense: true })).toBeNull();
    expect(readPracticalSpec(null)).toBeNull();
    expect(readPracticalSpec(spec)).not.toBeNull();
  });

  it('the staff note about a required starter is replaced by a message for the student', () => {
    const needs = {
      ...spec,
      starter: {
        ...spec.starter,
        required: true,
        kind: 'MODEL_URL' as const,
        url: '',
        note: 'ADMIN: paste the model here',
      },
    };
    const waiting = studentPracticalSpec(needs);
    expect(waiting.starter.note).toBe(
      'Your teacher will share the prepared link in class.',
    );
    expect(JSON.stringify(waiting)).not.toMatch(/ADMIN/);
    const ready = studentPracticalSpec({
      ...needs,
      starter: { ...needs.starter, url: 'https://example.org/model' },
    });
    expect(ready.starter.note).toMatch(/do not need to train/i);
    expect(ready.starter.url).toBe('https://example.org/model');
  });

  it('the admin bookkeeping flag is not part of what the student receives', () => {
    expect(
      studentPracticalSpec({ ...spec, adminEdited: true }),
    ).not.toHaveProperty('adminEdited');
  });

  it('shows the standardized header: 40 minutes, 40 marks, four sections, no negative marking', () => {
    const m = lcAssessmentMeta(SessionType.COURSE_TEST);
    expect(m).toMatchObject({
      brand: 'LUMEXA · LITTLE CODERS',
      title: 'Course Assessment',
      minutes: 40,
      marks: 40,
      negativeMarking: false,
    });
    expect(m.sections.map((s) => [s.key, s.marks, s.minutes])).toEqual([
      ['mcq', 10, 10],
      ['trueFalse', 5, 5],
      ['practical', 25, 20],
      ['review', null, 5],
    ]);
    expect(lcAssessmentMeta(SessionType.FINAL_TEST).title).toBe(
      'Final Assessment',
    );
    expect(course1Bank.kind).toBe('COURSE');
  });
});
