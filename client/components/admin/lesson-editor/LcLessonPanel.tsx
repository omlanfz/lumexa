'use client';

// FILE PATH: client/components/admin/lesson-editor/LcLessonPanel.tsx
//
// The Little Coders part of the lesson editor. A redesigned Little Coders lesson is drawn from four
// stored documents, edited here one by one (each has its own Save, and each is validated in full by the
// server before it is stored — a save with problems is refused with every problem listed):
//
//   Project card        title · "Open Project" address · "Copy Link" address · button labels · the
//                       platform buttons (and their order) · teacher instructions
//   Learning Preview    the video address (MP4), poster, captions, duration — plus the production
//                       script and storyboard for whoever makes the video
//   Homework card       title · instructions · what to hand in · its platform buttons
//   Lesson page         the interactive page itself (advanced: edited as JSON, checked as you type)
//
// Where each platform button opens ("Start Coding") is NOT set here: it comes from the platform
// table (Admin → Coding platforms), so one change updates every lesson.
//
// What an admin saves is remembered, so a later release of the standard curriculum never overwrites it.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { Card } from '@/components/admin/AdminUI';
import LcVideoStorage from './LcVideoStorage';
import type {
  LcEditorData,
  LcExperience,
  LcHomeworkCard,
  LcPlatformButton,
  LcPlatformKey,
  LcPreviewVideo,
  LcProjectCard,
} from '@/lib/littleCoders/types';

export interface LcDraft {
  experience?: LcExperience;
  previewVideo?: LcPreviewVideo;
  projectCard?: LcProjectCard;
  homeworkCard?: LcHomeworkCard;
}

const INPUT = 'w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-sm a-focus';
const LABEL = 'block text-xs font-semibold text-[var(--a-text)] mb-1';
const HINT = 'text-[11px] text-[var(--a-text-faint)] mt-1';
const BTN = 'px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] disabled:opacity-60';

type Which = 'projectCard' | 'previewVideo' | 'homeworkCard' | 'experience';

const wordCount = (t: string) => t.split(/\s+/).filter(Boolean).length;

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      {children}
      {hint && <span className={`${HINT} block`}>{hint}</span>}
    </label>
  );
}

function PlatformButtonsEditor({ value, onChange, platforms }: { value: LcPlatformButton[]; onChange: (v: LcPlatformButton[]) => void; platforms: LcEditorData['platforms'] }) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {value.map((b, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] p-2">
          <span className="text-xs font-bold text-[var(--a-text-faint)] w-4 text-center">{i + 1}</span>
          <select
            value={b.platform}
            aria-label={`Button ${i + 1} platform`}
            onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, platform: e.target.value as LcPlatformKey } : x)))}
            className="px-2 py-1.5 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] text-[var(--a-text)] text-sm"
          >
            {platforms.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
                {p.isActive ? '' : ' (switched off)'}
              </option>
            ))}
          </select>
          <input
            value={b.label}
            maxLength={40}
            aria-label={`Button ${i + 1} label`}
            placeholder="Button label"
            onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))}
            className="flex-1 min-w-[10rem] px-3 py-1.5 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] text-[var(--a-text)] text-sm"
          />
          <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-xs px-1.5 text-[var(--a-text-muted)] disabled:opacity-30" aria-label="Move up">
            ↑
          </button>
          <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} className="text-xs px-1.5 text-[var(--a-text-muted)] disabled:opacity-30" aria-label="Move down">
            ↓
          </button>
          <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} disabled={value.length <= 1} className="text-xs text-[var(--a-danger)] hover:underline disabled:opacity-30">
            Remove
          </button>
        </div>
      ))}
      {value.length < 3 && (
        <button type="button" onClick={() => onChange([...value, { platform: platforms[0]?.key ?? 'SCRATCH', label: 'Start Coding' }])} className="text-sm text-[var(--a-accent)] hover:underline">
          + Add a button
        </button>
      )}
      <p className={HINT}>Buttons appear in this order. Where each one opens is set under Admin → Coding platforms.</p>
    </div>
  );
}

export default function LcLessonPanel({ lessonId, data, onDraft }: { lessonId: string; data: LcEditorData; onDraft: (draft: LcDraft) => void }) {
  const [card, setCard] = useState<LcProjectCard | null>(data.projectCard);
  const [video, setVideo] = useState<LcPreviewVideo | null>(data.previewVideo);
  const [hw, setHw] = useState<LcHomeworkCard | null>(data.homeworkCard);
  const [expText, setExpText] = useState(() => JSON.stringify(data.experience, null, 2));
  const [edited, setEdited] = useState<string[]>(data.edited);
  const [busy, setBusy] = useState<Which | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Which, string[]>>>({});
  const [saved, setSaved] = useState<Which | null>(null);

  const parsed = useMemo(() => {
    try {
      return { value: JSON.parse(expText) as LcExperience, error: null as string | null };
    } catch (e) {
      return { value: null, error: (e as Error).message };
    }
  }, [expText]);

  // The editor's preview shows these drafts through the server's own validators.
  useEffect(() => {
    onDraft({
      projectCard: card ?? undefined,
      previewVideo: video ?? undefined,
      homeworkCard: hw ?? undefined,
      experience: parsed.value ?? undefined,
    });
  }, [card, video, hw, parsed.value, onDraft]);

  async function save(which: Which, body: Record<string, unknown>) {
    setBusy(which);
    setErrors((e) => ({ ...e, [which]: undefined }));
    setSaved(null);
    try {
      const res = await api.patch<{ edited: string[] }>(`/curriculum/lessons/${lessonId}/little-coders`, body);
      setEdited(res.data.edited ?? []);
      setSaved(which);
      setTimeout(() => setSaved((s) => (s === which ? null : s)), 2500);
    } catch (err) {
      const d = (err as { response?: { data?: { errors?: string[]; message?: string } } })?.response?.data;
      setErrors((e) => ({ ...e, [which]: Array.isArray(d?.errors) && d.errors.length ? d.errors : [d?.message ?? 'Could not save.'] }));
    } finally {
      setBusy(null);
    }
  }

  const ErrorList = ({ which }: { which: Which }) =>
    errors[which] ? (
      <ul role="alert" className="list-disc list-inside text-sm text-[var(--a-danger)] mt-2">
        {errors[which]!.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    ) : null;
  const SaveRow = ({ which, onClick, disabled }: { which: Which; onClick: () => void; disabled?: boolean }) => (
    <div className="flex items-center gap-3 mt-3">
      <button type="button" onClick={onClick} disabled={busy !== null || disabled} className={BTN}>
        {busy === which ? 'Saving…' : 'Save'}
      </button>
      {saved === which && <span className="text-sm text-[var(--a-success-text)]">Saved ✓</span>}
      {edited.includes(which) && saved !== which && <span className="text-xs text-[var(--a-text-faint)]">edited by an admin — kept when the standard curriculum is updated</span>}
    </div>
  );

  const brief = video?.brief;
  const narration = brief?.scenes.map((s) => s.narration).join(' ') ?? '';

  return (
    <div className="space-y-5" data-testid="lc-panel">
      <div className="rounded-xl border border-violet-300/50 bg-violet-50/60 dark:bg-violet-900/10 px-4 py-3 text-sm text-[var(--a-text)]">
        <p className="font-semibold">🧩 This is a redesigned Little Coders lesson</p>
        <p className="text-xs text-[var(--a-text-muted)] mt-0.5">
          Its page is built from the four parts below (not from the Markdown text). Where “Start Coding” buttons open is set once, for every lesson, under{' '}
          <Link href="/admin/coding-platforms" className="underline text-[var(--a-accent)]">
            Coding platforms
          </Link>
          .
        </p>
      </div>

      {/* ── Project card ─────────────────────────────────────────────────── */}
      {card && (
        <Card className="p-5">
          <h2 className="font-semibold text-[var(--a-text)] mb-1">💻 Project card</h2>
          <p className="text-xs text-[var(--a-text-faint)] mb-3">The “Project” box of the lesson: its buttons and teacher instructions. Leave an address empty and its button shows as “not added yet” — nothing is guessed.</p>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Project name (the card title)">
              <input value={card.title} maxLength={80} onChange={(e) => setCard({ ...card, title: e.target.value })} className={INPUT} />
            </Field>
            <Field label="“Open Project” button label">
              <input value={card.openLabel} maxLength={40} onChange={(e) => setCard({ ...card, openLabel: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Project link (opens in a new tab)" hint="A full https:// address, or empty.">
              <input type="url" value={card.projectUrl} placeholder="https://scratch.mit.edu/projects/…" onChange={(e) => setCard({ ...card, projectUrl: e.target.value })} className={INPUT} />
            </Field>
            <Field label="“Copy Link” button label">
              <input value={card.copyLabel} maxLength={40} onChange={(e) => setCard({ ...card, copyLabel: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Link that “Copy Link” copies" hint="Empty = the project link above.">
              <input type="url" value={card.copyUrl} placeholder="https://…" onChange={(e) => setCard({ ...card, copyUrl: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Sentence under the buttons (students see it)">
              <input value={card.helper} maxLength={200} onChange={(e) => setCard({ ...card, helper: e.target.value })} className={INPUT} />
            </Field>
          </div>
          <div className="mt-3">
            <span className={LABEL}>“Start Coding” buttons</span>
            <PlatformButtonsEditor value={card.platforms} onChange={(platforms) => setCard({ ...card, platforms })} platforms={data.platforms} />
          </div>
          <div className="mt-3">
            <Field label="🔒 Teacher instructions (teachers only)">
              <textarea value={card.teacherInstructions} rows={3} maxLength={1200} onChange={(e) => setCard({ ...card, teacherInstructions: e.target.value })} className={INPUT} />
            </Field>
          </div>
          <ErrorList which="projectCard" />
          <SaveRow which="projectCard" onClick={() => void save('projectCard', { projectCard: card })} />
        </Card>
      )}

      {/* ── Learning Preview ─────────────────────────────────────────────── */}
      {video && (
        <Card className="p-5">
          <h2 className="font-semibold text-[var(--a-text)] mb-1">🎬 “Your Learning Preview” video</h2>
          <p className="text-xs text-[var(--a-text-faint)] mb-3">
            The video is kept in Lumexa’s own lesson-video storage: upload the MP4 (1920×1080, 60–100 seconds, up to 120) below and students watch it on the lesson page. Until a lesson has a video, students see “Video coming soon” — the page never pretends a video exists.
          </p>
          <LcVideoStorage lessonId={lessonId} video={video} onVideo={setVideo} />
          <p className="text-xs text-[var(--a-text-faint)] mb-2">
            Or, instead of storage, host the MP4 anywhere that serves it over https and paste its address here (a stored video always wins over a pasted address).
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Video address (MP4)">
              <input type="url" value={video.videoUrl} placeholder="https://…/preview.mp4" onChange={(e) => setVideo({ ...video, videoUrl: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Length in seconds" hint="1–120. Shown on the player.">
              <input
                type="number"
                min={1}
                max={120}
                value={video.durationSeconds ?? ''}
                onChange={(e) => setVideo({ ...video, durationSeconds: e.target.value === '' ? null : Number(e.target.value) })}
                className={INPUT}
              />
            </Field>
            <Field label="Poster image address (optional)">
              <input type="url" value={video.posterUrl} placeholder="https://…/poster.jpg" onChange={(e) => setVideo({ ...video, posterUrl: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Subtitles address — WebVTT (optional)">
              <input type="url" value={video.captionsUrl} placeholder="https://…/captions.vtt" onChange={(e) => setVideo({ ...video, captionsUrl: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Title">
              <input value={video.title} maxLength={80} onChange={(e) => setVideo({ ...video, title: e.target.value })} className={INPUT} />
            </Field>
            <Field label="One-line summary (shown under the video)">
              <input value={video.summary} maxLength={200} onChange={(e) => setVideo({ ...video, summary: e.target.value })} className={INPUT} />
            </Field>
          </div>
          <ErrorList which="previewVideo" />
          <SaveRow which="previewVideo" onClick={() => void save('previewVideo', { previewVideo: video })} />

          {brief && (
            <details className="mt-4 rounded-lg border border-[var(--a-border)] p-3">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--a-text)]">
                Production script and storyboard · {brief.targetSeconds} s · about {wordCount(narration)} narration words
              </summary>
              <p className="text-xs text-[var(--a-text-muted)] mt-2">
                <strong>Hook:</strong> {brief.hook}
              </p>
              <div className="overflow-x-auto mt-2">
                <table className="w-full min-w-[40rem] text-xs text-left">
                  <thead className="text-[var(--a-text-muted)]">
                    <tr>
                      <th className="py-1 pr-2">Time</th>
                      <th className="py-1 pr-2">Beat</th>
                      <th className="py-1 pr-2">Visuals</th>
                      <th className="py-1 pr-2">Narration</th>
                      <th className="py-1">On-screen text</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--a-border)] align-top text-[var(--a-text)]">
                    {brief.scenes.map((s) => (
                      <tr key={s.time}>
                        <td className="py-1.5 pr-2 font-mono whitespace-nowrap">{s.time}</td>
                        <td className="py-1.5 pr-2 font-semibold">{s.beat}</td>
                        <td className="py-1.5 pr-2">{s.visual}</td>
                        <td className="py-1.5 pr-2">{s.narration}</td>
                        <td className="py-1.5">{s.onScreen}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[var(--a-text-muted)] mt-2">
                <strong>Tip:</strong> {brief.tip} · <strong>Challenge:</strong> {brief.challenge} · <strong>Leads into:</strong> {brief.leadsInto}
              </p>
              <button type="button" onClick={() => void navigator.clipboard?.writeText(narration)} className="mt-2 text-xs text-[var(--a-accent)] hover:underline">
                Copy the narration script
              </button>
            </details>
          )}
        </Card>
      )}

      {/* ── Homework card ────────────────────────────────────────────────── */}
      {hw && (
        <Card className="p-5">
          <h2 className="font-semibold text-[var(--a-text)] mb-1">📝 Homework card</h2>
          <p className="text-xs text-[var(--a-text-faint)] mb-3">Students hand homework in with the usual “Submit Homework” form below this card. For AI lessons the homework reuses the model trained in class.</p>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Homework name">
              <input value={hw.title} maxLength={80} onChange={(e) => setHw({ ...hw, title: e.target.value })} className={INPUT} />
            </Field>
            <Field label="What to hand in">
              <input value={hw.deliverable} maxLength={160} onChange={(e) => setHw({ ...hw, deliverable: e.target.value })} className={INPUT} />
            </Field>
          </div>
          <div className="mt-3 grid gap-3">
            <Field label="Instructions">
              <textarea value={hw.instructions} rows={3} maxLength={400} onChange={(e) => setHw({ ...hw, instructions: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Sentence under the instructions (optional)">
              <input value={hw.helper} maxLength={200} onChange={(e) => setHw({ ...hw, helper: e.target.value })} className={INPUT} />
            </Field>
          </div>
          <div className="mt-3">
            <span className={LABEL}>“Start Coding” buttons</span>
            <PlatformButtonsEditor value={hw.platforms} onChange={(platforms) => setHw({ ...hw, platforms })} platforms={data.platforms} />
          </div>
          <ErrorList which="homeworkCard" />
          <SaveRow which="homeworkCard" onClick={() => void save('homeworkCard', { homeworkCard: hw })} />
        </Card>
      )}

      {/* ── The lesson page itself ───────────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="font-semibold text-[var(--a-text)] mb-1">🧱 Lesson page (advanced)</h2>
        <p className="text-xs text-[var(--a-text-faint)] mb-3">
          The interactive page: mission, big ideas, the live demo, block examples, tips, the challenge and the project steps. It is edited as structured data and checked in full by the server — including every block name against the real Scratch / Stretch3 / EduBlocks blocks — so nothing invented can be saved. The preview below follows what you type.
        </p>
        <textarea
          value={expText}
          onChange={(e) => setExpText(e.target.value)}
          rows={18}
          spellCheck={false}
          aria-label="Lesson page data"
          className="w-full px-4 py-3 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-xs font-mono leading-relaxed a-focus resize-y"
        />
        {parsed.error && <p className="text-sm text-[var(--a-danger)] mt-1">That is not valid JSON yet: {parsed.error}</p>}
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <button type="button" onClick={() => parsed.value && setExpText(JSON.stringify(parsed.value, null, 2))} disabled={!parsed.value} className="text-xs text-[var(--a-accent)] hover:underline disabled:opacity-40">
            Tidy the formatting
          </button>
          <button type="button" onClick={() => setExpText(JSON.stringify(data.experience, null, 2))} className="text-xs text-[var(--a-text-muted)] hover:underline">
            Discard my changes
          </button>
        </div>
        <ErrorList which="experience" />
        <SaveRow which="experience" onClick={() => void save('experience', { experience: parsed.value })} disabled={!parsed.value} />
      </Card>
    </div>
  );
}
