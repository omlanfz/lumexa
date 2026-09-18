'use client';

import { useState } from 'react';

export default function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — silently no-op, button just won't confirm
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2.5 py-1 rounded-md bg-gray-700/80 hover:bg-gray-600 text-gray-100 border border-gray-600 transition-colors flex-shrink-0"
      type="button"
    >
      {copied ? '✓ Copied' : 'Copy code'}
    </button>
  );
}
