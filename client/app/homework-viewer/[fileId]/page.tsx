'use client';

// Shows a student's code file (or notebook) as readable TEXT in its own tab.
//
// The text comes from the server as JSON and is drawn by React as plain text —
// nothing in it is ever inserted as HTML or executed, however it is named or
// whatever it contains (an .html file is shown as its source, on Lumexa's page,
// without running). Teachers open it from the review queue; the student can open
// their own file the same way. Opening needs the signed-in person's login, which
// is why this is a page of Lumexa's rather than a link to the file.

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, FileCode2 } from 'lucide-react';
import api from '@/lib/axios';
import { errorMessage, formatFileSize } from '@/lib/homeworkFiles';
import { parseNotebook, type NotebookCell } from '@/lib/notebook';

interface FileText {
  name: string;
  kind: 'SOURCE' | 'NOTEBOOK';
  size: number;
  text?: string;
  tooLarge?: boolean;
  binary?: boolean;
}

function Code({ text }: { text: string }) {
  const lines = useMemo(() => text.replace(/\r\n?/g, '\n').split('\n'), [text]);
  return (
    <div className="overflow-auto rounded-xl border border-gray-200 bg-gray-950 text-gray-100 dark:border-gray-700">
      <pre className="m-0 min-w-full p-0 text-[13px] leading-6">
        <code className="grid" style={{ gridTemplateColumns: 'auto 1fr' }}>
          {lines.map((line, i) => (
            <span key={i} className="contents">
              <span className="select-none border-r border-white/10 px-3 text-right text-gray-500">{i + 1}</span>
              <span className="whitespace-pre px-4">{line || ' '}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function Cell({ cell, language }: { cell: NotebookCell; language: string | null }) {
  if (cell.kind === 'markdown' || cell.kind === 'raw') {
    return (
      <div className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
        {cell.source || ' '}
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <span className="w-14 flex-shrink-0 pt-3 text-right font-mono text-[11px] text-gray-400">
          [{cell.executionCount ?? ' '}]
        </span>
        <div className="min-w-0 flex-1">
          <div className="overflow-x-auto rounded-lg bg-gray-950 p-3 text-[13px] leading-6 text-gray-100">
            <pre className="m-0 whitespace-pre" aria-label={language ? `${language} code` : 'code'}>
              {cell.source || ' '}
            </pre>
          </div>
          {cell.outputs.map((o, i) =>
            o.kind === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={o.value} alt="Notebook output" className="mt-1 max-w-full rounded-md border border-gray-200 dark:border-gray-700" />
            ) : (
              <pre
                key={i}
                className={`m-0 mt-1 overflow-x-auto whitespace-pre-wrap rounded-md p-3 text-[13px] leading-5 ${
                  o.kind === 'error'
                    ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}
              >
                {o.value}
              </pre>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomeworkViewerPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const [file, setFile] = useState<FileText | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<FileText>(`/submissions/files/${fileId}/text`)
      .then((res) => {
        if (!cancelled) setFile(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Could not open this file.'));
      });
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  const notebook = useMemo(
    () => (file?.kind === 'NOTEBOOK' && file.text ? parseNotebook(file.text) : null),
    [file],
  );

  const downloadFile = async () => {
    setDownloadError(null);
    try {
      const res = await api.get<{ url: string }>(`/submissions/files/${fileId}/access`, { params: { download: 1 } });
      const a = document.createElement('a');
      a.href = res.data.url;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setDownloadError(errorMessage(err, 'Could not download this file.'));
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-3 py-5 sm:px-6 sm:py-6">
      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          <p className="font-medium" role="alert">
            {error}
          </p>
        </div>
      ) : !file ? (
        <div className="space-y-3">
          <div className="h-6 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-72 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <FileCode2 size={20} className="flex-shrink-0 text-teal-600 dark:text-teal-400" />
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-white">{file.name}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)} · shown as text — it is not run
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void downloadFile()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Download size={14} /> Download
            </button>
          </div>
          {downloadError && (
            <p className="mb-3 text-sm text-red-500" role="alert">
              {downloadError}
            </p>
          )}

          {file.tooLarge ? (
            <p className="rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
              This file is too large to preview. Use Download to open it.
            </p>
          ) : file.binary ? (
            <p className="rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
              This file is not text, so it cannot be previewed. Use Download to open it.
            </p>
          ) : file.kind === 'NOTEBOOK' && notebook ? (
            <div className="space-y-3" data-testid="notebook-preview">
              {notebook.cells.length === 0 && <p className="text-sm text-gray-500">This notebook has no cells.</p>}
              {notebook.cells.map((cell, i) => (
                <Cell key={i} cell={cell} language={notebook.language} />
              ))}
            </div>
          ) : (
            <>
              {file.kind === 'NOTEBOOK' && (
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  This notebook could not be read cell by cell, so its raw contents are shown.
                </p>
              )}
              <Code text={file.text ?? ''} />
            </>
          )}
        </>
      )}
    </div>
  );
}
