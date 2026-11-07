// FILE PATH: client/lib/certificates/files.ts
//
// Browser-only helpers for handing a downloaded certificate file to the person:
// save it, or show it in a new tab. (Files are fetched with the login token as
// blobs — see api.ts — so they are saved from an object URL.)

/** Saves a blob as a file download. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser time to start the download before releasing the data.
  setTimeout(() => URL.revokeObjectURL(url), 15_000);
}

/** Shows a file in a new tab. The tab is opened synchronously, inside the click
 * that asked for it (browsers block a window opened after an `await`), and
 * pointed at the file once it has been fetched. */
export async function openInNewTab(load: () => Promise<Blob>): Promise<void> {
  const tab = window.open('', '_blank');
  try {
    const blob = await load();
    const url = URL.createObjectURL(blob);
    if (tab) {
      tab.location.href = url;
    } else {
      // Pop-ups are blocked: show it in this tab instead.
      window.location.href = url;
    }
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
  } catch (err) {
    tab?.close();
    throw err;
  }
}
