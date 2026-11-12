'use client';

// FILE PATH: client/app/admin/coding-platforms/page.tsx
//
// Where "Start Coding" opens. The Little Coders lessons and assessments never store a platform address:
// their buttons name a platform (MIT Scratch, Stretch3, Generation AI Teachable Machine, EduBlocks) and
// the address comes from here — so one change updates every lesson, and a platform can be switched off
// (its buttons then show as unavailable) without touching a single lesson.

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/axios';
import { Card } from '@/components/admin/AdminUI';
import type { LcPlatform } from '@/lib/littleCoders/types';

const INPUT = 'w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-sm a-focus';

const ICON: Record<string, string> = { SCRATCH: '🐱', STRETCH3: '🧩', TEACHABLE_MACHINE: '🧠', EDUBLOCKS: '🐍' };

function Row({ platform, onSaved }: { platform: LcPlatform; onSaved: (p: LcPlatform) => void }) {
  const [name, setName] = useState(platform.name);
  const [startUrl, setStartUrl] = useState(platform.startUrl);
  const [description, setDescription] = useState(platform.description ?? '');
  const [isActive, setIsActive] = useState(platform.isActive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = name !== platform.name || startUrl !== platform.startUrl || description !== (platform.description ?? '') || isActive !== platform.isActive;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.patch<LcPlatform>(`/curriculum/coding-platforms/${platform.key}`, { name, startUrl, description, isActive });
      onSaved(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(m) ? m.join(' ') : (m ?? 'Could not save.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="font-semibold text-[var(--a-text)]">
          <span aria-hidden="true">{ICON[platform.key] ?? '💻'}</span> {platform.key.replace(/_/g, ' ')}
        </h2>
        <label className="flex items-center gap-2 text-sm text-[var(--a-text)]">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Switched on
        </label>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs font-semibold text-[var(--a-text)] mb-1">Name (shown on buttons that explain it)</span>
          <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className={INPUT} />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-[var(--a-text)] mb-1">“Start Coding” address</span>
          <input type="url" value={startUrl} onChange={(e) => setStartUrl(e.target.value)} className={INPUT} />
          <span className="block text-[11px] text-[var(--a-text-faint)] mt-1">A full https:// address. It opens in a new tab.</span>
        </label>
      </div>
      <label className="block mt-3">
        <span className="block text-xs font-semibold text-[var(--a-text)] mb-1">Note (optional)</span>
        <input value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} className={INPUT} />
      </label>
      {!isActive && <p className="mt-2 text-xs text-[var(--a-warning-text)]">While this is switched off, every “Start Coding” button for it shows as unavailable.</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-[var(--a-danger)]">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3 mt-3">
        <button type="button" onClick={() => void save()} disabled={busy || !dirty} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] disabled:opacity-60">
          {busy ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-sm text-[var(--a-success-text)]">Saved ✓</span>}
      </div>
    </Card>
  );
}

export default function CodingPlatformsPage() {
  const [platforms, setPlatforms] = useState<LcPlatform[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPlatforms = useCallback(
    () =>
      api
        .get<LcPlatform[]>('/curriculum/coding-platforms')
        .then((res) => setPlatforms(res.data))
        .catch((err) => setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not load the platforms.')),
    [],
  );
  const load = useCallback(() => {
    setError(null);
    void fetchPlatforms();
  }, [fetchPlatforms]);

  useEffect(() => {
    void fetchPlatforms();
  }, [fetchPlatforms]);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--a-text)]">Coding platforms</h1>
        <p className="text-sm text-[var(--a-text-muted)] mt-1">
          Where the “Start Coding” buttons of Little Coders lessons and assessments open. Change an address here and every lesson follows — no lesson needs editing.
        </p>
      </div>
      {error && (
        <div role="alert" className="space-y-1">
          <p className="text-sm text-[var(--a-danger)]">{error}</p>
          <button onClick={load} className="text-sm text-[var(--a-accent)] hover:underline">
            Try again
          </button>
        </div>
      )}
      {!platforms && !error && <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>}
      {platforms?.map((p) => (
        <Row key={p.key} platform={p} onSaved={(next) => setPlatforms((list) => list?.map((x) => (x.key === next.key ? next : x)) ?? list)} />
      ))}
    </div>
  );
}
