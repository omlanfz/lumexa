'use client';

// FILE PATH: client/components/little-coders/AiDemos.tsx
//
// The live demos of "AI for Kids: Smart Projects" (course 3). They are PRACTICE simulations and say so:
// no webcam or microphone is used on the page. A child adds examples, trains, and tests a tiny practice
// model (lib/littleCoders/aiSim.ts) to see the ideas the lesson teaches — more examples make it more
// confident, varied examples (other light, angle or voice) make it stronger, a label can trigger a
// reaction — before training a REAL model with their own webcam / microphone on the Generation AI
// Teachable Machine in class.

import { useMemo, useState } from 'react';
import { IMAGE_CONDITIONS, VOICE_CONDITIONS, addExample, best, isTrainable, missingExamples, newModel, percent, predict, type Condition } from '@/lib/littleCoders/aiSim';
import type { LcDemo } from '@/lib/littleCoders/types';
import DemoFrame from './DemoFrame';

type ImageDemo = Extract<LcDemo, { kind: 'ai-image' }>;
type VoiceDemo = Extract<LcDemo, { kind: 'ai-voice' }>;

const MIN_EXAMPLES = 5;
const BTN = 'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';

interface Item {
  name: string;
  emoji: string;
}

function Bars({ items, probabilities, actual }: { items: Item[]; probabilities: number[]; actual: number }) {
  const top = best(probabilities);
  return (
    <ul className="space-y-1.5" aria-label="What the model thinks">
      {items.map((it, i) => (
        <li key={it.name} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 truncate font-medium text-gray-800 dark:text-gray-100" title={it.name}>
            {it.emoji} {it.name}
          </span>
          <span className="h-3 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <span className={`block h-full rounded-full ${i === top ? (top === actual ? 'bg-emerald-500' : 'bg-red-500') : 'bg-violet-400'}`} style={{ width: `${Math.round(probabilities[i] * 100)}%`, transitionProperty: 'width' }} />
          </span>
          <span className="w-10 shrink-0 text-right font-mono text-xs text-gray-600 dark:text-gray-300">{percent(probabilities[i])}</span>
        </li>
      ))}
    </ul>
  );
}

function Trainer({
  items,
  kind,
  improve,
  onUsed,
}: {
  items: Item[];
  kind: 'image' | 'voice';
  /** Show the variety chips (other light / angle / voice) instead of one plain button. */
  improve: boolean;
  onUsed: () => void;
}) {
  const conditions = kind === 'image' ? IMAGE_CONDITIONS : VOICE_CONDITIONS;
  const [model, setModel] = useState(() => newModel(items.map((i) => i.name)));
  const [phase, setPhase] = useState<'collect' | 'training' | 'trained'>('collect');
  const [progress, setProgress] = useState(0);
  const [actual, setActual] = useState(0);
  const [condition, setCondition] = useState<Condition>(conditions[0].key);
  const [tested, setTested] = useState(false);
  const noun = kind === 'image' ? 'camera' : 'microphone';
  const addLabel = kind === 'image' ? 'Add example' : 'Record example';
  const missing = missingExamples(model, MIN_EXAMPLES);

  const add = (cls: number, cond: Condition) => {
    onUsed();
    setModel((m) => addExample(m, cls, cond));
    if (phase === 'trained') setPhase('collect'); // new examples mean it must be trained again
  };

  const train = () => {
    onUsed();
    setPhase('training');
    setProgress(0);
    let p = 0;
    const id = setInterval(() => {
      p += 12;
      setProgress(Math.min(100, p));
      if (p >= 100) {
        clearInterval(id);
        setPhase('trained');
      }
    }, 110);
  };

  const probabilities = useMemo(() => predict(model, actual, improve ? condition : conditions[0].key), [model, actual, condition, improve, conditions]);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">1 · Collect examples</h4>
        <div className="grid gap-2 sm:grid-cols-3">
          {items.map((it, i) => {
            const have = model.counts[i];
            return (
              <div key={it.name} className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30">
                <div className="flex items-center gap-2">
                  <span className="text-3xl" aria-hidden="true">{it.emoji}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{it.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{have} example{have === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" role="progressbar" aria-valuemin={0} aria-valuemax={MIN_EXAMPLES} aria-valuenow={Math.min(have, MIN_EXAMPLES)} aria-label={`${it.name} examples`}>
                  <div className={`h-full rounded-full ${have >= MIN_EXAMPLES ? 'bg-emerald-500' : 'bg-violet-400'}`} style={{ width: `${Math.min(100, (have / MIN_EXAMPLES) * 100)}%`, transitionProperty: 'width' }} />
                </div>
                {improve ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {conditions.map((c) => (
                      <button key={c.key} type="button" onClick={() => add(i, c.key)} className="rounded-md border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-medium text-gray-700 hover:bg-violet-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700" title={`${addLabel}: ${c.label}`}>
                        {c.emoji} {c.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button type="button" onClick={() => add(i, conditions[0].key)} className={`${BTN} mt-2 w-full bg-violet-600 text-white hover:bg-violet-500`}>
                    {kind === 'image' ? '📸' : '🎤'} {addLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {missing.length > 0 && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Add at least {MIN_EXAMPLES} examples to every class to train: {missing.map((m) => `${m.name} (${m.need} more)`).join(', ')}.
          </p>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">2 · Train the model</h4>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={train} disabled={!isTrainable(model, MIN_EXAMPLES) || phase === 'training'} className={`${BTN} bg-fuchsia-600 text-white hover:bg-fuchsia-500`}>
            🧠 {phase === 'trained' ? 'Train again' : 'Train Model'}
          </button>
          {phase === 'training' && (
            <span className="h-3 w-40 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Training">
              <span className="block h-full rounded-full bg-fuchsia-500" style={{ width: `${progress}%`, transitionProperty: 'width' }} />
            </span>
          )}
          {phase === 'trained' && <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">✓ Model trained</span>}
        </div>
      </div>

      <div className={phase === 'trained' ? '' : 'pointer-events-none opacity-50'} aria-disabled={phase !== 'trained'}>
        <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">3 · Test it</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{kind === 'image' ? 'Show the camera…' : 'Say into the microphone…'}</p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {items.map((it, i) => (
                <button
                  key={it.name}
                  type="button"
                  onClick={() => {
                    setActual(i);
                    setTested(true);
                    onUsed();
                  }}
                  aria-pressed={actual === i}
                  className={`${BTN} ${actual === i ? 'bg-violet-600 text-white' : 'border border-gray-300 bg-white text-gray-800 hover:bg-violet-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'}`}
                >
                  {it.emoji} {it.name}
                </button>
              ))}
            </div>
            {improve && (
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                Condition
                <select value={condition} onChange={(e) => setCondition(e.target.value)} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                  {conditions.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="mt-3 flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white text-5xl dark:border-gray-600 dark:bg-gray-800" aria-hidden="true">
              {tested ? items[actual].emoji : kind === 'image' ? '📷' : '🎙️'}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">What the model thinks</p>
            {tested ? (
              <>
                <Bars items={items} probabilities={probabilities} actual={actual} />
                <p className="mt-2 text-sm font-medium text-gray-800 dark:text-gray-100" aria-live="polite">
                  {best(probabilities) === actual
                    ? `✅ Right! It is ${items[actual].name}.`
                    : `🤔 It is not sure about the ${noun}. Add more examples${improve ? ' in different conditions' : ''} and train again.`}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Pick one above to see its prediction.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** "When the label is recognised, the sprite reacts": the event-driven idea of Stretch3 + TM2Scratch. */
function EventsPreview({ items, kind, onUsed }: { items: Item[]; kind: 'image' | 'voice'; onUsed: () => void }) {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700 dark:text-gray-200">
        A trained model sends a message when it recognises one of its labels. In Stretch3 a script can <strong>wait for that message</strong> and react. Tap a {kind === 'image' ? 'label the camera would see' : 'word the microphone would hear'}:
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {items.map((it, i) => (
          <button
            key={it.name}
            type="button"
            onClick={() => {
              setActive(i);
              onUsed();
            }}
            aria-pressed={active === i}
            className={`rounded-xl border p-3 text-left ${active === i ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 bg-gray-50 hover:bg-violet-50 dark:border-gray-700 dark:bg-gray-900/30'}`}
          >
            <span className="text-3xl" aria-hidden="true">{it.emoji}</span>
            <span className="mt-1 block text-sm font-bold text-gray-900 dark:text-white">{it.name}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{kind === 'image' ? 'image label' : 'sound label'}</span>
          </button>
        ))}
      </div>
      <div className="flex min-h-24 items-center justify-center gap-4 rounded-xl bg-gradient-to-b from-indigo-950 to-indigo-800 p-4 text-white" aria-live="polite">
        {active === null ? (
          <span className="text-sm text-indigo-200">Waiting for a label…</span>
        ) : (
          <>
            <span className="text-5xl" aria-hidden="true">🤖</span>
            <div className="rounded-2xl border-2 border-gray-700 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900">I recognised {items[active].emoji} {items[active].name}!</div>
          </>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">In class you will build this with the real blocks: each label gets its own reaction.</p>
    </div>
  );
}

function QuizPreview({ items, onUsed }: { items: Item[]; onUsed: () => void }) {
  const [score, setScore] = useState(0);
  const [turn, setTurn] = useState(0);
  const [say, setSay] = useState('The host is ready. Answer with your voice!');
  const questions = [
    { q: 'Is the Sun a star?', answer: items[0]?.name },
    { q: 'Can a rocket fly with no fuel?', answer: items[1]?.name },
  ];
  const current = questions[turn];
  const answer = (name: string) => {
    onUsed();
    if (!current) return;
    if (name === items[2]?.name) {
      setSay('Hint: think about what makes a star shine, or what a rocket burns.');
      return;
    }
    if (name === current.answer) {
      setScore((s) => s + 1);
      setSay('Correct! +1 point.');
    } else setSay('Not this time.');
    setTurn((t) => t + 1);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-white">
        <span className="font-bold">🎤 Quiz show</span>
        <span className="rounded-full bg-white/20 px-3 py-0.5 text-sm font-semibold">score: {score}</span>
      </div>
      <p className="text-lg font-semibold text-gray-900 dark:text-white">{current ? current.q : `Quiz over! Your final score is ${score} out of ${questions.length}.`}</p>
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/15 dark:text-amber-100" aria-live="polite">🎙️ Host: {say}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <button key={it.name} type="button" disabled={!current} onClick={() => answer(it.name)} className={`${BTN} border border-gray-300 bg-white text-gray-800 hover:bg-violet-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100`}>
            {it.emoji} “{it.name}”
          </button>
        ))}
        {!current && (
          <button type="button" onClick={() => { setTurn(0); setScore(0); setSay('Let’s play again!'); }} className={`${BTN} bg-violet-600 text-white`}>
            ↺ Play again
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">Tapping a word stands in for saying it. In class the microphone model listens to your real voice.</p>
    </div>
  );
}

export function AiImageDemo({ demo, onUsed }: { demo: ImageDemo; onUsed: () => void }) {
  const items = demo.classes.map((c) => ({ name: c.name, emoji: c.emoji }));
  return (
    <DemoFrame title={demo.title} intro={demo.intro} hint={demo.hint} practice="Practice simulation — no camera is used here">
      {demo.mode === 'events' ? <EventsPreview items={items} kind="image" onUsed={onUsed} /> : <Trainer items={items} kind="image" improve={demo.mode === 'improve'} onUsed={onUsed} />}
    </DemoFrame>
  );
}

export function AiVoiceDemo({ demo, onUsed }: { demo: VoiceDemo; onUsed: () => void }) {
  const words = demo.words.map((w) => ({ name: w.word, emoji: w.emoji }));
  // Sound models also get a Background Noise class, so they do not react to the room itself.
  const withNoise = [...words, { name: 'Background Noise', emoji: '🔇' }];
  return (
    <DemoFrame title={demo.title} intro={demo.intro} hint={demo.hint} practice="Practice simulation — no microphone is used here">
      {demo.mode === 'events' ? <EventsPreview items={words} kind="voice" onUsed={onUsed} /> : demo.mode === 'quiz' ? <QuizPreview items={words} onUsed={onUsed} /> : <Trainer items={withNoise} kind="voice" improve={false} onUsed={onUsed} />}
    </DemoFrame>
  );
}
