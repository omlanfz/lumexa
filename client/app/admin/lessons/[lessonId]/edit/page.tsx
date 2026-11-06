'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Card } from '@/components/admin/AdminUI';
import LessonMarkdown from '@/components/lesson/LessonMarkdown';
import { LessonRenderContext } from '@/components/lesson/LessonContext';
import ProjectLinksSection, { ProjectLink } from '@/components/curriculum/ProjectLinksSection';
import QuizEditor, { toDraftQuestion, type DraftQuestion } from '@/components/admin/lesson-editor/QuizEditor';
import VisualsEditor, { type VisualTypeInfo } from '@/components/admin/lesson-editor/VisualsEditor';
import LessonPreview, { usePreview, type Draft } from '@/components/admin/lesson-editor/LessonPreview';
import type { LessonVisualData } from '@/lib/lesson/types';
import '@/components/lesson/visuals';

interface EditorResponse {
  session: { courseId: string; courseTitle: string };
  lesson: {
    id: string;
    title: string;
    type: string;
    objectives: string[];
    contentMarkdown: string | null;
    homework: string | null;
    checkpoint: string | null;
    teacherNotes: string;
    reviewNotes: string;
    miniQuiz: DraftQuestion[];
    visuals: LessonVisualData[];
    codeSnippets: { label: string; language: string; code: string; part?: string }[];
    projectLinks: ProjectLink[] | null;
    contentReview: { kind: string; detail: string; excerpt?: string }[];
  };
}

const TEXTAREA = 'w-full px-4 py-3 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-sm font-mono leading-relaxed a-focus resize-y';

// A full page rather than a modal — lesson material and homework are long
// markdown documents. The page edits every part of a lesson as structured data
// (quiz questions, visuals, teacher notes) and checks the whole draft with the
// server as you type, so what is saved is what learners and the teacher's shared
// screen will actually get.
export default function AdminLessonEditPage() {
  const params = useParams<{ lessonId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [courseId, setCourseId] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [title, setTitle] = useState('');
  const [objectives, setObjectives] = useState('');
  const [checkpoint, setCheckpoint] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [homework, setHomework] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [miniQuiz, setMiniQuiz] = useState<DraftQuestion[]>([]);
  const [visuals, setVisuals] = useState<LessonVisualData[]>([]);
  const [contentReview, setContentReview] = useState<EditorResponse['lesson']['contentReview']>([]);
  const [codeSnippetCount, setCodeSnippetCount] = useState(0);
  const [projectLinks, setProjectLinks] = useState<ProjectLink[]>([]);
  const [visualTypes, setVisualTypes] = useState<Record<string, VisualTypeInfo>>({});
  const [previewMode, setPreviewMode] = useState<'off' | 'student' | 'presentation'>('off');
  const [saving, setSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const materialRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get<EditorResponse>(`/curriculum/lessons/${params.lessonId}/editor`), api.get<Record<string, VisualTypeInfo>>('/curriculum/visual-types')]).then(([res, types]) => {
      if (cancelled) return;
      const l = res.data.lesson;
      setCourseId(res.data.session.courseId);
      setCourseTitle(res.data.session.courseTitle);
      setTitle(l.title);
      setObjectives(l.objectives.join('\n'));
      setCheckpoint(l.checkpoint ?? '');
      setContentMarkdown(l.contentMarkdown ?? '');
      setHomework(l.homework ?? '');
      setTeacherNotes(l.teacherNotes ?? '');
      setReviewNotes(l.reviewNotes ?? '');
      setMiniQuiz(Array.isArray(l.miniQuiz) ? l.miniQuiz.map((q, i) => toDraftQuestion(q, i)) : []);
      setVisuals(l.visuals ?? []);
      setContentReview(l.contentReview ?? []);
      setCodeSnippetCount(l.codeSnippets?.length ?? 0);
      setProjectLinks(l.projectLinks ?? []);
      setVisualTypes(types.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [params.lessonId]);

  const objectiveList = useMemo(() => objectives.split('\n').map((s) => s.trim()).filter(Boolean), [objectives]);
  const draft: Draft = useMemo(
    () => ({ lessonId: params.lessonId, courseId, courseTitle, title, objectives: objectiveList, contentMarkdown, homework, checkpoint, teacherNotes, miniQuiz, visuals, projectLinks }),
    [params.lessonId, courseId, courseTitle, title, objectiveList, contentMarkdown, homework, checkpoint, teacherNotes, miniQuiz, visuals, projectLinks],
  );
  const { result, failed } = usePreview(draft, !loading);

  const errors = result?.validation.errors ?? [];
  const warnings = result?.validation.warnings ?? [];
  const quizErrors = errors.filter((e) => /^Question \d+:|^The quiz|^A quiz|^Every quiz question/.test(e));
  const visualErrors = errors.filter((e) => /^Visual \d+ |^A lesson can have at most 40 visuals|^Visuals must/.test(e) || /places a visual/.test(e));
  const otherErrors = errors.filter((e) => !quizErrors.includes(e) && !visualErrors.includes(e));

  const visualsById = useMemo(() => Object.fromEntries(visuals.map((v) => [v.id, v])), [visuals]);

  const insertAtCursor = useCallback((text: string) => {
    const el = materialRef.current;
    setContentMarkdown((cur) => {
      const at = el ? el.selectionStart : cur.length;
      return cur.slice(0, at) + text + cur.slice(el ? el.selectionEnd : at);
    });
    el?.focus();
  }, []);
  const insertVisual = (id: string) => insertAtCursor(`\n\n\`\`\`lumexa-visual\n${id}\n\`\`\`\n\n`);
  const hasQuizBlock = /```\s*lumexa-quiz/.test(contentMarkdown);

  const save = async () => {
    setSaving(true);
    setSaveErrors([]);
    setSaved(false);
    try {
      await api.patch(`/curriculum/lessons/${params.lessonId}/content`, {
        title,
        objectives: objectiveList,
        contentMarkdown,
        homework,
        checkpoint,
        teacherNotes,
        miniQuiz,
        visuals,
        projectLinks: projectLinks.map((p) => ({ title: p.title.trim(), url: p.url.trim() })).filter((p) => p.title && p.url),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { errors?: string[]; message?: string } } })?.response?.data;
      setSaveErrors(Array.isArray(data?.errors) && data.errors.length > 0 ? data.errors : [data?.message ?? 'Could not save.']);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-[var(--a-text-muted)] p-6">Loading…</p>;

  const blocking = errors.length > 0;
  const SaveButton = (
    <button
      onClick={save}
      disabled={saving || blocking}
      title={blocking ? 'Fix the problems listed below first' : undefined}
      className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] disabled:opacity-60"
    >
      {saving ? 'Saving…' : 'Save'}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-24">
      <div className="flex items-center justify-between flex-wrap gap-3 sticky top-0 z-10 bg-[var(--a-bg)] py-3 -mx-1 px-1 border-b border-[var(--a-border)]">
        <div>
          <button onClick={() => router.back()} className="text-sm text-[var(--a-accent)] hover:underline">
            ← Back
          </button>
          <h1 className="text-xl font-bold text-[var(--a-text)] mt-1">
            Edit Lesson <span className="font-normal text-[var(--a-text-muted)]">— {courseTitle}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {blocking ? (
            <span className="text-sm text-[var(--a-danger)]" role="status">
              {errors.length} problem{errors.length === 1 ? '' : 's'} to fix
            </span>
          ) : warnings.length > 0 ? (
            <span className="text-sm text-[var(--a-text-muted)]" role="status">
              {warnings.length} suggestion{warnings.length === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="text-sm text-[var(--a-success-text)]" role="status">
              Looks good
            </span>
          )}
          {saved && <span className="text-sm text-[var(--a-success-text)]">Saved ✓</span>}
          {SaveButton}
        </div>
      </div>

      {(saveErrors.length > 0 || errors.length > 0 || warnings.length > 0 || failed) && (
        <Card className="p-4">
          {saveErrors.length > 0 && (
            <ul className="list-disc list-inside text-sm text-[var(--a-danger)] mb-2" role="alert">
              {saveErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          {failed && <p className="text-sm text-[var(--a-danger)] mb-2">{failed}</p>}
          {otherErrors.length > 0 && (
            <ul className="list-disc list-inside text-sm text-[var(--a-danger)] mb-2">
              {otherErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          {(quizErrors.length > 0 || visualErrors.length > 0) && (
            <p className="text-sm text-[var(--a-danger)] mb-2">
              {quizErrors.length > 0 ? `${quizErrors.length} problem(s) in the quiz` : ''}
              {quizErrors.length > 0 && visualErrors.length > 0 ? ' and ' : ''}
              {visualErrors.length > 0 ? `${visualErrors.length} in the visuals` : ''} — they are shown on the questions and visuals below.
            </p>
          )}
          {warnings.length > 0 && (
            <ul className="list-disc list-inside text-sm text-[var(--a-text-muted)]">
              {warnings.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {contentReview.length > 0 && (
        <details className="rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--a-text)]">
            {contentReview.length} item{contentReview.length === 1 ? '' : 's'} flagged for review when this lesson was tidied
          </summary>
          <ul className="mt-3 space-y-2 text-sm text-[var(--a-text)]">
            {contentReview.map((r, i) => (
              <li key={i} className="rounded-lg bg-[var(--a-surface-2)] p-3">
                <span className="text-xs uppercase tracking-wide text-[var(--a-text-muted)]">{r.kind.replace(/-/g, ' ')}</span>
                <p>{r.detail}</p>
                {r.excerpt && <p className="mt-1 text-xs text-[var(--a-text-faint)] font-mono whitespace-pre-wrap">{r.excerpt}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Title" hint="Just the lesson’s own name — the course, module and lesson number are shown automatically.">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-base a-focus" />
        </Section>
        <Section title="Project Checkpoint" hint="What's due by the end of this specific session, if any.">
          <input value={checkpoint} onChange={(e) => setCheckpoint(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] text-sm a-focus" />
        </Section>
      </div>

      <Section title="Learning Objectives" hint="One per line. These are the only place objectives live — don’t repeat them in the lesson material.">
        <div className="grid md:grid-cols-2 gap-4">
          <textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={7} className={TEXTAREA} />
          <div className="rounded-lg border border-[var(--a-border)] p-4 bg-[var(--a-surface)]">
            {objectiveList.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-sm text-[var(--a-text)]">
                {objectiveList.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--a-text-faint)] italic">Nothing to preview yet.</p>
            )}
          </div>
        </div>
      </Section>

      <Section
        title="Lesson Material"
        hint="Markdown — headings, lists, tables, code blocks, links, images and > [!TIP] callouts. Raw HTML is shown as text, never run. Reference another lesson with [Lesson 3](lumexa:lesson/<module-slug>/3)."
      >
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button type="button" className="text-xs px-2.5 py-1.5 rounded-md border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-surface-2)] disabled:opacity-40" disabled={hasQuizBlock} onClick={() => insertAtCursor('\n\n## Knowledge Check\n\n```lumexa-quiz\n```\n\n')}>
            {hasQuizBlock ? 'Quiz is placed ✓' : 'Place the quiz here'}
          </button>
          <select
            className="text-xs px-2 py-1.5 rounded-md border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text)] max-w-[16rem]"
            value=""
            onChange={(e) => e.target.value && insertVisual(e.target.value)}
            aria-label="Place a visual at the cursor"
          >
            <option value="">Place a visual here…</option>
            {visuals.map((v) => (
              <option key={v.id} value={v.id}>{v.id}</option>
            ))}
          </select>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <textarea ref={materialRef} value={contentMarkdown} onChange={(e) => setContentMarkdown(e.target.value)} rows={26} className={TEXTAREA} />
          <div className="rounded-lg border border-[var(--a-border)] p-4 overflow-y-auto max-h-[42rem] bg-[var(--a-surface)]">
            <LessonRenderContext.Provider
              value={{
                lessonId: params.lessonId,
                mode: 'page',
                presentation: false,
                viewer: 'admin',
                refs: result?.refs ?? {},
                visuals: visualsById,
                renderQuiz: miniQuiz.length > 0 ? () => <p className="lesson-visual-missing">The quiz appears here ({miniQuiz.length} question{miniQuiz.length === 1 ? '' : 's'}).</p> : null,
              }}
            >
              <LessonMarkdown markdown={contentMarkdown || '*Nothing to preview yet.*'} />
            </LessonRenderContext.Provider>
          </div>
        </div>
      </Section>

      <Section title="Visuals & Interactive Blocks" hint="Diagrams and demos drawn from data. Each needs alt text and a caption. Place one in the lesson material with the button on its card.">
        <VisualsEditor value={visuals} onChange={setVisuals} types={visualTypes} errors={visualErrors} onInsert={insertVisual} />
      </Section>

      <Section title="Mini Quiz" hint="Learners answer one question at a time and see the result straight away. Answers are checked on the server; the answer key is never sent to the learner’s screen.">
        <QuizEditor value={miniQuiz} onChange={setMiniQuiz} errors={quizErrors} />
      </Section>

      <Section title="Homework / Practice" hint="Markdown. This is the only place homework lives — don’t repeat it in the lesson material.">
        <div className="grid md:grid-cols-2 gap-4">
          <textarea value={homework} onChange={(e) => setHomework(e.target.value)} rows={10} className={TEXTAREA} />
          <div className="rounded-lg border border-[var(--a-border)] p-4 overflow-y-auto max-h-64 bg-[var(--a-surface)]">
            <LessonMarkdown markdown={homework || '*Nothing to preview yet.*'} />
          </div>
        </div>
      </Section>

      <Section title="🔒 Teacher Notes" hint="Teachers only. Shown to the assigned teacher in the Teacher prep panel — never to students, and never on the shared screen or in Presentation Mode. Put instructor guidance and answer keys here, not in the lesson material.">
        <div className="grid md:grid-cols-2 gap-4">
          <textarea value={teacherNotes} onChange={(e) => setTeacherNotes(e.target.value)} rows={12} className={TEXTAREA} />
          <div className="rounded-lg border border-[var(--a-border)] p-4 overflow-y-auto max-h-96 bg-[var(--a-surface)]">
            <LessonMarkdown markdown={teacherNotes || '*No teacher notes.*'} />
          </div>
        </div>
        {reviewNotes && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-[var(--a-text-muted)]">Reviewer notes (also teacher-only, read-only here)</summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-[var(--a-text)] bg-[var(--a-surface-2)] rounded-lg p-3">{reviewNotes}</pre>
          </details>
        )}
      </Section>

      <Section
        title="💻 Project"
        hint='Buttons ("Open Project" / "Copy Link") shown on the lesson page in place of the Code section. Leave empty to keep showing the Code section below instead. Add more than one entry (e.g. a recap session) to show each project under its own heading.'
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {projectLinks.map((link, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center p-3 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)]">
                <input
                  value={link.title}
                  onChange={(e) => setProjectLinks(projectLinks.map((p, k) => (k === i ? { ...p, title: e.target.value } : p)))}
                  placeholder="Project name"
                  className="w-full sm:w-2/5 px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] text-[var(--a-text)] text-sm a-focus"
                />
                <input
                  value={link.url}
                  onChange={(e) => setProjectLinks(projectLinks.map((p, k) => (k === i ? { ...p, url: e.target.value } : p)))}
                  placeholder="https://colab.research.google.com/..."
                  className="w-full flex-1 px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] text-[var(--a-text)] text-sm a-focus"
                />
                <button onClick={() => setProjectLinks(projectLinks.filter((_, idx) => idx !== i))} className="text-sm text-[var(--a-danger)] hover:underline px-1 self-start sm:self-center" type="button">
                  Remove
                </button>
              </div>
            ))}
            <button onClick={() => setProjectLinks([...projectLinks, { title: '', url: '' }])} className="text-sm text-[var(--a-accent)] hover:underline" type="button">
              + Add project
            </button>
          </div>
          <div className="rounded-lg border border-[var(--a-border)] p-4 bg-[var(--a-surface)]">
            {projectLinks.filter((p) => p.title.trim() && p.url.trim()).length > 0 ? (
              <ProjectLinksSection projectLinks={projectLinks.filter((p) => p.title.trim() && p.url.trim())} />
            ) : (
              <p className="text-sm text-[var(--a-text-faint)] italic">Nothing to preview yet — the Code section below will show instead.</p>
            )}
          </div>
        </div>
      </Section>

      {codeSnippetCount > 0 && (
        <p className="text-xs text-[var(--a-text-faint)]">
          {codeSnippetCount} code snippet(s) attached to this lesson — imported from source content; not editable from this page yet.
          {projectLinks.filter((p) => p.title.trim() && p.url.trim()).length > 0 && ' Currently hidden on the lesson page because a Project section above is set.'}
        </p>
      )}

      <Section title="Preview" hint="See the draft exactly as it will appear — before you save it.">
        <div className="flex flex-wrap gap-2 mb-3">
          {(['student', 'presentation'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPreviewMode(previewMode === m ? 'off' : m)}
              aria-pressed={previewMode === m}
              className={`px-3 py-1.5 rounded-lg text-sm border border-[var(--a-border)] ${previewMode === m ? 'bg-[var(--a-accent)] text-white' : 'text-[var(--a-text)] hover:bg-[var(--a-surface-2)]'}`}
            >
              {m === 'student' ? 'Student view' : 'Presentation view'}
            </button>
          ))}
          {previewMode !== 'off' && (
            <button type="button" onClick={() => setPreviewMode('off')} className="px-3 py-1.5 rounded-lg text-sm text-[var(--a-text-muted)] hover:underline">
              Close preview
            </button>
          )}
        </div>
        {previewMode !== 'off' && <LessonPreview draft={draft} result={result} failed={failed} mode={previewMode} onExitPresentation={() => setPreviewMode('off')} />}
      </Section>

      <div className="flex justify-end gap-2 pt-2 items-center">
        {saved && <span className="text-sm text-[var(--a-success-text)]">Saved ✓</span>}
        {saveErrors.length > 0 && <span className="text-sm text-[var(--a-danger)]">{saveErrors[0]}</span>}
        {SaveButton}
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold text-[var(--a-text)] mb-1">{title}</h2>
      {hint && <p className="text-xs text-[var(--a-text-faint)] mb-3">{hint}</p>}
      {!hint && <div className="mb-1" />}
      {children}
    </Card>
  );
}
