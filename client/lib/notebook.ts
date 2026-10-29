// FILE PATH: client/lib/notebook.ts
//
// A Jupyter notebook (.ipynb) read into plain, safe pieces for a preview: each
// cell's kind, its source text, and its text/image outputs. Everything comes out
// as strings meant to be shown as TEXT (or, for a PNG/JPEG output, as an <img>
// with a data: URL that has been checked) — nothing is ever treated as HTML, so a
// notebook cannot run anything on Lumexa's page. Pure, so it can be tested.

export interface NotebookOutput {
  kind: 'text' | 'error' | 'image';
  /** Text for 'text' and 'error'; a data: URL for 'image'. */
  value: string;
}

export interface NotebookCell {
  kind: 'code' | 'markdown' | 'raw';
  source: string;
  executionCount: number | null;
  outputs: NotebookOutput[];
}

export interface ParsedNotebook {
  language: string | null;
  cells: NotebookCell[];
}

type Json = Record<string, unknown>;

const MAX_CELLS = 500;
const MAX_OUTPUT_CHARS = 20_000;
const BASE64 = /^[A-Za-z0-9+/=\s]+$/;

function joinText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string').join('');
  return '';
}

function clip(text: string): string {
  return text.length > MAX_OUTPUT_CHARS ? `${text.slice(0, MAX_OUTPUT_CHARS)}\n… (output shortened)` : text;
}

/** Strips terminal colour codes that notebooks put in error tracebacks. */
function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
}

function readOutput(raw: unknown): NotebookOutput[] {
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as Json;
  if (o.output_type === 'stream') {
    const text = joinText(o.text);
    return text ? [{ kind: 'text', value: clip(text) }] : [];
  }
  if (o.output_type === 'error') {
    const trace = Array.isArray(o.traceback) ? joinText(o.traceback.map((l) => stripAnsi(String(l))).join('\n')) : '';
    const head = `${String(o.ename ?? 'Error')}: ${String(o.evalue ?? '')}`;
    return [{ kind: 'error', value: clip(trace || head) }];
  }
  if (o.output_type === 'execute_result' || o.output_type === 'display_data') {
    const data = (o.data ?? {}) as Json;
    const out: NotebookOutput[] = [];
    for (const mime of ['image/png', 'image/jpeg'] as const) {
      const b64 = joinText(data[mime]);
      if (b64 && BASE64.test(b64)) {
        out.push({ kind: 'image', value: `data:${mime};base64,${b64.replace(/\s+/g, '')}` });
        break;
      }
    }
    const text = joinText(data['text/plain']);
    if (text) out.push({ kind: 'text', value: clip(text) });
    return out;
  }
  return [];
}

/** The notebook in `text`, or null if it is not a readable notebook. */
export function parseNotebook(text: string): ParsedNotebook | null {
  let nb: unknown;
  try {
    nb = JSON.parse(text);
  } catch {
    return null;
  }
  if (!nb || typeof nb !== 'object') return null;
  const root = nb as Json;

  // nbformat 4 keeps cells at the top; nbformat 3 nests them in worksheets.
  let rawCells: unknown = root.cells;
  if (!Array.isArray(rawCells) && Array.isArray(root.worksheets)) {
    rawCells = (root.worksheets as Json[]).flatMap((w) => (Array.isArray(w.cells) ? (w.cells as unknown[]) : []));
  }
  if (!Array.isArray(rawCells)) return null;

  const cells: NotebookCell[] = rawCells.slice(0, MAX_CELLS).flatMap((c): NotebookCell[] => {
    if (!c || typeof c !== 'object') return [];
    const cell = c as Json;
    const type = cell.cell_type;
    const kind = type === 'code' || type === 'markdown' ? type : 'raw';
    const count = typeof cell.execution_count === 'number' ? cell.execution_count : null;
    return [
      {
        kind,
        source: joinText(cell.source ?? cell.input),
        executionCount: count,
        outputs: Array.isArray(cell.outputs) ? cell.outputs.flatMap(readOutput) : [],
      },
    ];
  });

  const meta = (root.metadata ?? {}) as Json;
  const info = (meta.language_info ?? {}) as Json;
  const spec = (meta.kernelspec ?? {}) as Json;
  const language = typeof info.name === 'string' ? info.name : typeof spec.language === 'string' ? spec.language : null;
  return { language, cells };
}
