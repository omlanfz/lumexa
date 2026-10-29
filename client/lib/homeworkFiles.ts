// FILE PATH: client/lib/homeworkFiles.ts
//
// Opening a homework file. Files live in private storage, so there is no address
// to link to: the server decides, per click and per person, how it opens —
//   code, HTML and notebooks   → Lumexa's own viewer page, in a new tab, shown as
//                                 text (never run)
//   PDFs and images            → the browser's viewer, in a new tab, from a link
//                                 that expires within minutes
//   everything else (.sb3 …)   → an ordinary download
// Files from before homework moved to R2 only have a plain `url`.

import api from '@/lib/axios';

export type HomeworkViewKind = 'SOURCE' | 'NOTEBOOK' | 'PDF' | 'IMAGE' | 'DOWNLOAD';

export interface HomeworkFileRef {
  id?: string;
  url?: string;
  name: string | null;
  size?: number;
  kind?: HomeworkViewKind;
  /** Removed from storage after the review. */
  removed?: boolean;
}

interface AccessResponse {
  kind: HomeworkViewKind;
  viewerPath?: string;
  url?: string;
}

/** The server's own words for what went wrong, or a fallback. */
export function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(message) ? message[0] : message) || fallback;
}

/** Starts a download without leaving the page. */
function download(url: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Opens (or downloads) one file. Throws with a message fit to show the person.
 * A new tab is opened straight away, inside the click, so a pop-up blocker does
 * not mistake the later navigation for an unrequested pop-up.
 */
export async function openHomeworkFile(file: HomeworkFileRef): Promise<void> {
  if (file.url && !file.id) {
    window.open(file.url, '_blank', 'noopener,noreferrer');
    return;
  }
  if (!file.id) throw new Error('This file cannot be opened.');
  if (file.removed) throw new Error('This file was removed after the review.');

  // Code and notebooks: the viewer page does the rest (it asks the server for the text).
  if (file.kind === 'SOURCE' || file.kind === 'NOTEBOOK') {
    window.open(`/homework-viewer/${file.id}`, '_blank', 'noopener,noreferrer');
    return;
  }

  // Formats a browser cannot show: no tab needed.
  if (file.kind === 'DOWNLOAD') {
    const res = await api.get<AccessResponse>(`/submissions/files/${file.id}/access`);
    if (!res.data.url) throw new Error('This file cannot be downloaded right now.');
    download(res.data.url);
    return;
  }

  // PDFs and images: a tab for the browser's own viewer.
  const tab = window.open('about:blank', '_blank');
  try {
    const res = await api.get<AccessResponse>(`/submissions/files/${file.id}/access`);
    if (!res.data.url) throw new Error('This file cannot be opened right now.');
    if (tab) {
      tab.opener = null;
      tab.location.href = res.data.url;
    } else {
      // The browser blocked the tab: fall back to this one's own download.
      download(res.data.url);
    }
  } catch (err) {
    tab?.close();
    throw err;
  }
}

/** A short "12 KB" for a file size. */
export function formatFileSize(bytes: number | undefined): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
