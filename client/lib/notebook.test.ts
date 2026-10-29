import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNotebook } from './notebook.ts';

const nb = (cells: unknown[], extra: object = {}) =>
  JSON.stringify({ nbformat: 4, nbformat_minor: 5, metadata: { language_info: { name: 'python' } }, cells, ...extra });

test('reads code, markdown and raw cells, joining line arrays', () => {
  const parsed = parseNotebook(
    nb([
      { cell_type: 'markdown', source: ['# Title\n', 'Some text'] },
      { cell_type: 'code', source: ['x = 1\n', 'print(x)'], execution_count: 3, outputs: [] },
      { cell_type: 'raw', source: 'raw text' },
    ]),
  );
  assert.ok(parsed);
  assert.equal(parsed.language, 'python');
  assert.deepEqual(
    parsed.cells.map((c) => [c.kind, c.source, c.executionCount]),
    [
      ['markdown', '# Title\nSome text', null],
      ['code', 'x = 1\nprint(x)', 3],
      ['raw', 'raw text', null],
    ],
  );
});

test('keeps text outputs, errors and checked images — all as plain data', () => {
  const parsed = parseNotebook(
    nb([
      {
        cell_type: 'code',
        source: 'x',
        outputs: [
          { output_type: 'stream', name: 'stdout', text: ['hello\n'] },
          { output_type: 'execute_result', data: { 'text/plain': ['42'], 'text/html': ['<script>alert(1)</script>'] } },
          { output_type: 'display_data', data: { 'image/png': 'iVBORw0KGgo=' } },
          { output_type: 'error', ename: 'ValueError', evalue: 'bad', traceback: ['\u001b[31mValueError\u001b[0m: bad'] },
        ],
      },
    ]),
  );
  assert.ok(parsed);
  const out = parsed.cells[0].outputs;
  assert.deepEqual(out[0], { kind: 'text', value: 'hello\n' });
  assert.deepEqual(out[1], { kind: 'text', value: '42' });
  assert.deepEqual(out[2], { kind: 'image', value: 'data:image/png;base64,iVBORw0KGgo=' });
  assert.deepEqual(out[3], { kind: 'error', value: 'ValueError: bad' });
  // HTML output is never carried over.
  assert.ok(!JSON.stringify(parsed).includes('<script>'));
});

test('an image output that is not really base64 is dropped (no data: URL injection)', () => {
  const parsed = parseNotebook(
    nb([{ cell_type: 'code', source: '', outputs: [{ output_type: 'display_data', data: { 'image/png': '"onerror="alert(1)' } }] }]),
  );
  assert.ok(parsed);
  assert.deepEqual(parsed.cells[0].outputs, []);
});

test('reads the older nbformat 3 layout', () => {
  const parsed = parseNotebook(JSON.stringify({ nbformat: 3, worksheets: [{ cells: [{ cell_type: 'code', input: ['1+1'], outputs: [] }] }] }));
  assert.ok(parsed);
  assert.equal(parsed.cells[0].source, '1+1');
});

test('anything that is not a notebook is null', () => {
  assert.equal(parseNotebook('not json'), null);
  assert.equal(parseNotebook('[]'), null);
  assert.equal(parseNotebook('{"hello":1}'), null);
  assert.equal(parseNotebook('null'), null);
});

test('very long outputs are shortened', () => {
  const parsed = parseNotebook(nb([{ cell_type: 'code', source: '', outputs: [{ output_type: 'stream', text: 'a'.repeat(50_000) }] }]));
  assert.ok(parsed);
  assert.ok(parsed.cells[0].outputs[0].value.length < 21_000);
});
