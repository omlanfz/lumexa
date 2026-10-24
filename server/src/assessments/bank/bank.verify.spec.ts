import {
  pythonAvailable,
  runJavaScript,
  runPython,
  verifyBankCode,
} from './bank.verify';
import { bank, codeOut, mcq, tf, tfOut } from './bank.helpers';
import { TestBank } from './bank.types';

// These tests prove the verifier itself: it must catch a wrong answer key, so
// the "every code answer is verified by execution" gate in bank.spec.ts means
// something.

const hasPython = pythonAvailable();
const itPython = hasPython ? it : it.skip;

function bankWith(
  mcqs: ReturnType<typeof codeOut>[],
  tfs: ReturnType<typeof tfOut>[] = [],
): TestBank {
  return bank({
    id: 'x/verify',
    title: 'Verify',
    type: 'COURSE_TEST',
    mcq: mcqs,
    trueFalse: tfs,
  });
}

describe('runJavaScript', () => {
  it('captures console output', () => {
    const r = runJavaScript('console.log(1 + 2); console.log("a", "b");');
    expect(r).toMatchObject({ ok: true, stdout: '3\na b' });
  });

  it('reports a thrown error instead of crashing', () => {
    const r = runJavaScript('throw new Error("boom")');
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain('boom');
  });

  it('cannot reach the host process or filesystem', () => {
    const r = runJavaScript('console.log(typeof process, typeof require)');
    expect(r.stdout.trim()).toBe('undefined undefined');
  });

  it('gives up on an infinite loop instead of hanging', () => {
    const r = runJavaScript('while (true) {}');
    expect(r.ok).toBe(false);
  }, 30_000);
});

describe('runPython', () => {
  itPython('captures print output', () => {
    expect(runPython('print(2 + 3)')).toMatchObject({
      ok: true,
      stdout: '5\n',
    });
  });

  itPython('reports an error as a failure', () => {
    const r = runPython('print(1/0)');
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain('ZeroDivisionError');
  });
});

describe('verifyBankCode', () => {
  itPython('Python MCQ: a correct key is ok, a wrong key fails', () => {
    const good = bankWith([
      codeOut(1, 'python', 'print(4 + 5)', '9', ['8', '45', '4 + 5'], 'x'),
    ]);
    expect(verifyBankCode(good)).toEqual([
      { bankId: 'x/verify', key: 'M01', status: 'ok' },
    ]);

    const bad = bankWith([
      codeOut(1, 'python', 'print(4 + 5)', '10', ['8', '45', '4 + 5'], 'x'),
    ]);
    const [r] = verifyBankCode(bad);
    expect(r.status).toBe('failed');
    expect(r.detail).toContain('answer key says "10" but the code prints "9"');
  });

  itPython(
    'Python MCQ: a wrong option that equals the real output fails',
    () => {
      const b = bankWith([
        codeOut(1, 'python', 'print(4 + 5)', '9', ['8', ' 9 ', '45'], 'x'),
      ]);
      const [r] = verifyBankCode(b);
      expect(r.status).toBe('failed');
      expect(r.detail).toContain('a wrong option also equals the real output');
    },
  );

  itPython('Python MCQ: multi-line output is compared line by line', () => {
    const b = bankWith([
      codeOut(
        1,
        'python',
        'for i in range(3):\n    print(i)',
        '0\n1\n2',
        ['0 1 2', '1\n2\n3', '0\n1'],
        'x',
      ),
    ]);
    expect(verifyBankCode(b)[0].status).toBe('ok');
  });

  itPython('Python: a snippet that raises is a failure, not a pass', () => {
    const b = bankWith([
      codeOut(1, 'python', 'print(undefined_name)', 'x', ['a', 'b', 'c'], 'x'),
    ]);
    const [r] = verifyBankCode(b);
    expect(r.status).toBe('failed');
    expect(r.detail).toContain('raised an error');
  });

  it('JavaScript MCQ: runs without any Python', () => {
    const good = bankWith([
      codeOut(
        1,
        'javascript',
        'console.log(2 * 3)',
        '6',
        ['5', '23', '8'],
        'x',
      ),
    ]);
    expect(verifyBankCode(good)[0].status).toBe('ok');
    const bad = bankWith([
      codeOut(
        1,
        'javascript',
        'console.log(2 * 3)',
        '5',
        ['6x', '23', '8'],
        'x',
      ),
    ]);
    expect(verifyBankCode(bad)[0].status).toBe('failed');
  });

  it('True/False: the answer must agree with what the code really prints', () => {
    const b = bankWith(
      [],
      [
        tfOut(1, 'javascript', 'console.log(1 + 1)', '2', true, 'x'), // right
        tfOut(1, 'javascript', 'console.log(1 + 1)', '3', false, 'x'), // right
        tfOut(1, 'javascript', 'console.log(1 + 1)', '2', false, 'x'), // wrong key
        tfOut(1, 'javascript', 'console.log(1 + 1)', '3', true, 'x'), // wrong key
      ],
    );
    expect(verifyBankCode(b).map((r) => [r.key, r.status])).toEqual([
      ['T01', 'ok'],
      ['T02', 'ok'],
      ['T03', 'failed'],
      ['T04', 'failed'],
    ]);
  });

  it('a snippet needing a missing Python module is skipped, never failed', () => {
    if (!hasPython) return;
    const b = bankWith([
      codeOut(
        1,
        'python',
        'import definitely_not_installed_xyz\nprint(1)',
        '1',
        ['2', '3', '4'],
        'x',
        undefined,
        { requires: ['definitely_not_installed_xyz'] },
      ),
    ]);
    const [r] = verifyBankCode(b);
    expect(r.status).toBe('skipped');
    expect(r.detail).toContain('definitely_not_installed_xyz');
  });

  it('questions without a code check are ignored', () => {
    const b = bank({
      id: 'x/plain',
      title: 'Plain',
      type: 'COURSE_TEST',
      mcq: [
        mcq(1, 'Plain question text here?', 'a', ['b', 'c', 'd'], 'because'),
      ],
      trueFalse: [tf(1, 'A plain statement to judge.', true, 'because')],
    });
    expect(verifyBankCode(b)).toEqual([]);
  });
});
