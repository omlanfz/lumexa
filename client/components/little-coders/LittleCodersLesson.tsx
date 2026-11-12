'use client';

// FILE PATH: client/components/little-coders/LittleCodersLesson.tsx
//
// The body of a redesigned Little Coders lesson (ages 6–12): big ideas as tap cards, a live demo, real
// blocks, tips and common mistakes, a quick challenge, the in-class project and the homework — all drawn
// from the lesson's stored, validated data. The section ids are the ones the lesson page tracks reading
// against; the two interactive parts report back so a student's progress counts them.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { blockColor, categoryLabel } from '@/lib/littleCoders/blockLines';
import type { LcAiPlan, LcConcept, LcExperience, LcProject, LcSharedLesson } from '@/lib/littleCoders/types';
import { AiImageDemo, AiVoiceDemo } from './AiDemos';
import BlockStack from './BlockStack';
import ChallengeCard from './ChallengeCard';
import LearningPreview from './LearningPreview';
import ProjectCard, { HomeworkCard } from './ProjectCard';
import PythonDemo from './PythonDemo';
import ScratchStageDemo from './ScratchStageDemo';

export interface LcSection {
  id: string;
  title: string;
  /** Counts towards "read" (the homework is tracked by its own hand-in). */
  core: boolean;
}

/** The sections a lesson shows, in order — the contents list and the reading tracker use the same list. */
export function lcSections(lc: LcSharedLesson, hasHomework: boolean): LcSection[] {
  const e = lc.experience;
  const out: LcSection[] = [{ id: 'lc-mission', title: 'Your mission', core: true }, { id: 'lc-preview', title: 'Your Learning Preview', core: true }, { id: 'lc-ideas', title: 'Big ideas', core: true }, { id: 'lc-demo', title: 'Try it live', core: true }];
  if (e.ai) out.push({ id: 'lc-ai', title: e.ai.kind === 'sound' ? 'Train your sound model' : 'Train your image model', core: true });
  out.push({ id: 'lc-blocks', title: 'How the blocks look', core: true }, { id: 'lc-tips', title: 'Tips and common mistakes', core: true }, { id: 'lc-challenge', title: 'Quick challenge', core: true }, { id: 'lc-project', title: 'In-class project', core: true });
  if (hasHomework) out.push({ id: 'lc-homework', title: 'Homework', core: false });
  return out;
}

/** The interactive parts a student can do (counted in their progress). */
export const LC_ACTIVITIES = ['lc-demo', 'lc-challenge'];

function Section({ id, title, icon, children }: { id: string; title: string; icon: string; children: ReactNode }) {
  return (
    <section id={id} data-section={id} className="scroll-mt-24">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-gray-900 dark:text-white sm:text-xl">
        <span aria-hidden="true">{icon}</span> {title}
      </h2>
      {children}
      <span data-section-end={id} aria-hidden="true" className="block h-px" />
    </section>
  );
}

// ─── Mission ────────────────────────────────────────────────────────────────

function Mission({ e, title }: { e: LcExperience; title: string }) {
  return (
    <section id="lc-mission" data-section="lc-mission" className="scroll-mt-24 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-teal-500 p-5 text-white shadow-md sm:p-6">
      <div className="flex items-start gap-4">
        <span className="text-5xl sm:text-6xl" aria-hidden="true">{e.emoji}</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
            Lesson {e.lessonNumber} of 8 · Little Coders
          </p>
          <h2 className="text-xl font-extrabold leading-tight sm:text-2xl">{title}</h2>
          <p className="mt-2 text-base font-medium text-white/95 sm:text-lg">{e.mission.hook}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <p className="rounded-xl bg-white/15 px-3.5 py-2.5 text-sm font-medium sm:text-base">
          <span aria-hidden="true">🎯</span> <span className="font-bold">Your mission:</span> {e.mission.objective}
        </p>
        <p className="self-start rounded-xl bg-white/20 px-3.5 py-2.5 text-sm font-bold" title="The name of this lesson's mission">
          <span aria-hidden="true">🏅</span> {e.mission.badge}
        </p>
      </div>
      <span data-section-end="lc-mission" aria-hidden="true" className="block h-px" />
    </section>
  );
}

// ─── Big ideas ──────────────────────────────────────────────────────────────

function ConceptCard({ c }: { c: LcConcept }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-gray-700 dark:bg-gray-800/60"
    >
      <span className="text-3xl" aria-hidden="true">{c.emoji}</span>
      <span className="mt-2 font-bold text-gray-900 dark:text-white">{c.title}</span>
      <span className="mt-1 text-sm text-gray-700 dark:text-gray-300">{c.text}</span>
      {open ? (
        <span className="mt-2 rounded-lg bg-violet-50 px-2.5 py-2 text-sm text-violet-900 dark:bg-violet-900/20 dark:text-violet-100">✨ {c.reveal}</span>
      ) : (
        <span className="mt-auto pt-2 text-xs font-semibold text-violet-700 dark:text-violet-300">Tap to learn more ▾</span>
      )}
    </button>
  );
}

// ─── AI plan ────────────────────────────────────────────────────────────────

function AiPlan({ ai }: { ai: LcAiPlan }) {
  const sound = ai.kind === 'sound';
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        You will train your own AI on the <strong>Generation AI Teachable Machine</strong>, then bring it to life in <strong>Stretch3</strong> with the TM2Scratch extension. Use {sound ? 'your voice and the microphone' : 'real objects and your webcam'} — {sound ? 'say each word clearly' : 'hold each object up in front of the camera'}.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {ai.classes.map((c) => (
          <div key={c.name} className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/60 p-3 dark:border-fuchsia-500/30 dark:bg-fuchsia-900/10">
            <p className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
              <span className="text-2xl" aria-hidden="true">{c.emoji}</span> {c.name}
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{c.collect}</p>
            <p className="mt-1 text-xs font-semibold text-fuchsia-800 dark:text-fuchsia-200">At least {c.minExamples} examples</p>
          </div>
        ))}
      </div>
      {ai.background && (
        <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
          <span aria-hidden="true">🔇</span> <strong>Background Noise</strong> — a fourth class where you stay quiet, so the model does not react to the room itself.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            ['1 · Collect good examples', ai.collectTips],
            ['2 · Test your model', ai.testSteps],
            ['3 · Get your model link', ai.exportSteps],
            ['4 · Connect it in Stretch3', ai.connectSteps],
          ] as const
        ).map(([title, steps]) => (
          <details key={title} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800/60" open={title.startsWith('1')}>
            <summary className="cursor-pointer select-none text-sm font-bold text-gray-900 dark:text-white">{title}</summary>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-gray-700 dark:text-gray-300">
              {steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </details>
        ))}
      </div>
    </div>
  );
}

// ─── Tools ──────────────────────────────────────────────────────────────────

function Toolbox({ e }: { e: LcExperience }) {
  const language = e.platform === 'EDUBLOCKS' ? 'edublocks' : 'scratch';
  return (
    <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
      <h3 className="mb-2 font-bold text-gray-900 dark:text-white">🧰 Blocks you will use</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {e.toolbox.map((g) => {
          const c = blockColor(language, g.category);
          return (
            <div key={g.category}>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: c.fill }} aria-hidden="true" /> {categoryLabel(g.category)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {g.blocks.map((b) => (
                  <span key={b} className="rounded-md px-2 py-1 font-mono text-xs font-semibold text-white" style={{ background: c.fill, boxShadow: `inset 0 -2px 0 ${c.edge}` }}>
                    {b}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Project ────────────────────────────────────────────────────────────────

/** The "My project can…" ticks, remembered on this device only (never sent anywhere). */
function useTicks(key: string, size: number): [boolean[], (i: number) => void] {
  const [ticks, setTicks] = useState<boolean[]>(() => Array.from({ length: size }, () => false));
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the saved ticks once on mount
          setTicks(Array.from({ length: size }, (_, i) => parsed[i] === true));
        }
      }
    } catch {
      /* private mode: ticks are simply not remembered */
    }
  }, [key, size]);
  const toggle = useCallback(
    (i: number) =>
      setTicks((t) => {
        const next = t.map((v, j) => (j === i ? !v : v));
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      }),
    [key],
  );
  return [ticks, toggle];
}

function ProjectPlan({ project, lessonId, language }: { project: LcProject; lessonId: string; language: 'scratch' | 'edublocks' }) {
  const [ticks, toggle] = useTicks(`lumexa:lc-checklist:${lessonId}`, project.checklist.length);
  const stacks = useMemo(() => Object.fromEntries(project.stacks.map((s) => [s.id, s])), [project.stacks]);
  void language;
  return (
    <div className="space-y-4">
      <p className="text-base font-medium text-gray-800 dark:text-gray-200">
        <span aria-hidden="true">🛠️</span> <span className="font-bold">{project.name}:</span> {project.goal}
      </p>

      {project.assets && project.assets.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800/60">
          <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">🎭 Sprites and costumes (from the built-in Scratch library)</h4>
          <ul className="space-y-1.5">
            {project.assets.map((a) => (
              <li key={a.name} className="flex flex-wrap items-center gap-1.5 text-sm">
                <span className="font-semibold text-gray-900 dark:text-white">{a.name}</span>
                {a.costumes?.map((c) => (
                  <span key={c} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    {c}
                  </span>
                ))}
                {a.note && <span className="text-xs text-gray-500 dark:text-gray-400">— {a.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className="space-y-3">
        {project.steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white" aria-hidden="true">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.text}</p>
              {s.stack && stacks[s.stack] && <BlockStack className="mt-2" lines={stacks[s.stack].lines} language={stacks[s.stack].language} title={stacks[s.stack].title} sprite={stacks[s.stack].sprite} intro={stacks[s.stack].intro} notes={stacks[s.stack].notes} />}
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/30 dark:bg-emerald-900/10">
        <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">✅ My project can…</h4>
        <ul className="space-y-1.5">
          {project.checklist.map((c, i) => (
            <li key={i}>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-800 dark:text-gray-100">
                <input type="checkbox" checked={ticks[i] ?? false} onChange={() => toggle(i)} className="mt-0.5 h-4 w-4 accent-emerald-600" />
                <span className={ticks[i] ? 'line-through opacity-70' : ''}>{c}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {project.stretch && (
        <p className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/60 px-3 py-2.5 text-sm text-gray-800 dark:border-fuchsia-500/30 dark:bg-fuchsia-900/10 dark:text-gray-100">
          <span aria-hidden="true">🚀</span> <span className="font-bold">Stretch challenge:</span> {project.stretch}
        </p>
      )}
    </div>
  );
}

// ─── The lesson ─────────────────────────────────────────────────────────────

export interface LittleCodersLessonProps {
  lc: LcSharedLesson;
  lessonId: string;
  title: string;
  /** An interactive part was used (counted in a student's progress). */
  onActivity: (id: string) => void;
  /** The homework hand-in form (students only). */
  homeworkSlot?: ReactNode;
  hasHomework: boolean;
}

export default function LittleCodersLesson({ lc, lessonId, title, onActivity, homeworkSlot, hasHomework }: LittleCodersLessonProps) {
  const e = lc.experience;
  const language = e.platform === 'EDUBLOCKS' ? 'edublocks' : 'scratch';
  const demoUsed = useCallback(() => onActivity('lc-demo'), [onActivity]);
  const challengeDone = useCallback(() => onActivity('lc-challenge'), [onActivity]);
  const d = e.demo;

  return (
    <div className="space-y-7" data-little-coders>
      <Mission e={e} title={title} />

      <Section id="lc-preview" title="Your Learning Preview" icon="🎬">
        <LearningPreview video={lc.previewVideo} emoji={e.emoji} objective={e.mission.objective} />
      </Section>

      <Section id="lc-ideas" title="Big ideas" icon="💡">
        <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {e.concepts.map((c) => (
            <ConceptCard key={c.title} c={c} />
          ))}
        </div>
      </Section>

      <Section id="lc-demo" title="Try it live" icon="▶️">
        {d.kind === 'scratch-stage' && <ScratchStageDemo demo={d} onUsed={demoUsed} />}
        {d.kind === 'python-run' && <PythonDemo demo={d} onUsed={demoUsed} />}
        {d.kind === 'ai-image' && <AiImageDemo demo={d} onUsed={demoUsed} />}
        {d.kind === 'ai-voice' && <AiVoiceDemo demo={d} onUsed={demoUsed} />}
      </Section>

      {e.ai && (
        <Section id="lc-ai" title={e.ai.kind === 'sound' ? 'Train your sound model' : 'Train your image model'} icon="🧠">
          <AiPlan ai={e.ai} />
        </Section>
      )}

      <Section id="lc-blocks" title="How the blocks look" icon="🧱">
        <div className="grid gap-3 lg:grid-cols-2">
          {e.examples.map((s) => (
            <BlockStack key={s.id} lines={s.lines} language={s.language} title={s.title} sprite={s.sprite} intro={s.intro} notes={s.notes} />
          ))}
        </div>
        <Toolbox e={e} />
      </Section>

      <Section id="lc-tips" title="Tips and common mistakes" icon="🛟">
        <div className="grid gap-3 sm:grid-cols-2">
          {e.tips.map((t) =>
            t.kind === 'tip' ? (
              <div key={t.title} className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-900/10">
                <p className="font-bold text-gray-900 dark:text-white">
                  <span aria-hidden="true">⭐</span> {t.title}
                </p>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{t.text}</p>
              </div>
            ) : (
              <div key={t.title} className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/30 dark:bg-amber-900/10">
                <p className="font-bold text-gray-900 dark:text-white">
                  <span aria-hidden="true">🐞</span> Common mistake: {t.title}
                </p>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{t.text}</p>
                {t.fix && (
                  <p className="mt-2 rounded-lg bg-white/80 px-2.5 py-1.5 text-sm font-medium text-emerald-900 dark:bg-white/10 dark:text-emerald-100">
                    <span aria-hidden="true">🔧</span> Fix: {t.fix}
                  </p>
                )}
              </div>
            ),
          )}
        </div>
      </Section>

      <Section id="lc-challenge" title="Quick challenge" icon="🎯">
        <ChallengeCard challenge={e.challenge} onDone={challengeDone} />
      </Section>

      <Section id="lc-project" title="In-class project" icon="💻">
        <div className="space-y-4">
          {lc.projectCard && <ProjectCard card={lc.projectCard} />}
          <ProjectPlan project={e.project} lessonId={lessonId} language={language} />
        </div>
      </Section>

      {hasHomework && (
        <section id="lc-homework" data-section="lc-homework" className="scroll-mt-24">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-gray-900 dark:text-white sm:text-xl">
            <span aria-hidden="true">📝</span> Homework
          </h2>
          {lc.homeworkCard ? (
            <HomeworkCard card={lc.homeworkCard}>{homeworkSlot}</HomeworkCard>
          ) : (
            <div className="rounded-xl border border-amber-300/70 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-900/10">
              <p className="font-bold text-gray-900 dark:text-white">{e.homework.name}</p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{e.homework.instructions}</p>
              <p className="mt-2 text-sm font-medium">Hand in: {e.homework.deliverable}</p>
              {homeworkSlot}
            </div>
          )}
          {e.homework.stack && <BlockStack className="mt-3" lines={e.homework.stack.lines} language={e.homework.stack.language} title={e.homework.stack.title} sprite={e.homework.stack.sprite} notes={e.homework.stack.notes} />}
          {e.homework.hint && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">💭 Hint: {e.homework.hint}</p>}
        </section>
      )}
    </div>
  );
}
