'use client';

// "Check another certificate": type or paste the ID printed on a certificate.
// The only client-side piece of the otherwise server-rendered verification page.

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyAnotherForm() {
  const router = useRouter();
  const [value, setValue] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const id = value.trim();
    if (!id) return;
    router.push(`/verify/${encodeURIComponent(id)}`);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row" aria-label="Check another certificate">
      <label htmlFor="verify-id" className="sr-only">
        Certificate ID
      </label>
      <input
        id="verify-id"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Certificate ID, e.g. LXA-2026-A7K9Q2"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-mono text-sm text-gray-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Verify
      </button>
    </form>
  );
}
