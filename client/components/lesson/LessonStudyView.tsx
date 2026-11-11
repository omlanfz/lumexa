'use client';

// FILE PATH: client/components/lesson/LessonStudyView.tsx
//
// A learning lesson, laid out for the two things it is used for:
//   * the teacher puts this page on the screen and teaches from it (and can switch to
//     Presentation Mode — larger, calmer, nothing private);
//   * the student comes back later and studies it on their own (table of contents,
//     reading progress, section check-marks, a knowledge check, homework hand-in).
//
// `mode` is explicit. 'page' is the standalone lesson page. 'classroom' is the
// narrow stage inside the live class: it keeps the compact layout it always had —
// no side navigation, no progress bar, nothing that could widen or crowd the room.
//
// What is NOT here matters as much: teacher notes and the quiz answer key are not in
// the lesson payload at all. A teacher opens them on demand from a separate endpoint
// (TeacherPrepPanel), and they are not rendered in Presentation Mode or the classroom.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import CopyCodeButton from '@/components/curriculum/CopyCodeButton';
import HomeworkSubmission from '@/components/curriculum/HomeworkSubmission';
import ProjectLinksSection from '@/components/curriculum/ProjectLinksSection';
import {
  QUIZ_BLOCK_LANG,
  codeAlreadyInText,
  dedupeForRender,
  extractFencedBlocks,
  extractVisualIds,
  normalizeHeadingsFrom,
  splitSections,
  stripLeadingH1,
  type Section,
} from '@/lib/lesson/markdown';
import { emptyProgress, lessonCompletion, mergeProgress, parseStored, type LocalProgress } from '@/lib/lesson/progress';
import type { LessonDetailsResponse, LessonLink, LessonMode, ProgressView, SubmissionInfo, Viewer } from '@/lib/lesson/types';
import { LessonRenderContext } from './LessonContext';
import LessonHeader from './LessonHeader';
import LessonMarkdown from './LessonMarkdown';
import MiniQuiz from './MiniQuiz';
import PresentationShell from './PresentationShell';
import ProgressPanel from './ProgressPanel';
import TableOfContents, { type TocItem } from './TableOfContents';
import TeacherPrepPanel from './TeacherPrepPanel';
import { useActiveHeading, useLessonSidebar, useReadTracking, useScrollProgress } from './hooks';
import SidebarToggle from './SidebarToggle';
import { VISUAL_RENDERERS } from './visuals';

const CARD = 'bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-4 sm:p-5';
const WRAP_UP = /recap|summary|portfolio|homework|wrap/i;

/** The quiz section for a lesson that has a quiz but no place for it in its text. */
const QUIZ_SECTION: Section = {
  id: 'knowledge-check',
  title: 'Knowledge Check',
  startLine: -1,
  endLine: -1,
  markdown: '## Knowledge Check\n\n```' + QUIZ_BLOCK_LANG + '\n```',
  kind: 'core',
  hasQuizBlock: true,
};

function NavCard({ link, dir }: { link: LessonLink; dir: 'prev' | 'next' }) {
  const label = dir === 'prev' ? '← Previous lesson' : 'Next lesson →';
  const body = (
    <>
      <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
      <span className="mt-0.5 block text-sm font-semibold text-gray-900 dark:text-white">
        {link.lessonIndex ? `Lesson ${link.lessonIndex}: ` : ''}
        {link.title}
      </span>
      {link.locked && <span className="mt-0.5 block text-xs text-amber-700 dark:text-amber-300">🔒 Unlocks after that class</span>}
    </>
  );
  const cls = `block rounded-xl border p-3.5 ${dir === 'next' ? 'sm:text-right' : ''}`;
  if (link.href) {
    return (
      <Link href={link.href} className={`${cls} border-gray-200 bg-white hover:border-violet-400 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-violet-500`}>
        {body}
      </Link>
    );
  }
  return <div className={`${cls} border-dashed border-gray-300 dark:border-gray-700 opacity-80`} aria-disabled="true">{body}</div>;
}

export interface LessonStudyViewProps {
  data: LessonDetailsResponse;
  mode: LessonMode;
  isStudent: boolean;
  onSubmissionChange?: (submission: SubmissionInfo) => void;
  /** Open straight into Presentation Mode (the admin editor's preview). */
  initialPresenting?: boolean;
  /** Called when Presentation Mode is closed (so a host that opened it directly can close the preview). */
  onExitPresentation?: () => void;
}

export default function LessonStudyView({ data, mode, isStudent, onSubmissionChange, initialPresenting, onExitPresentation }: LessonStudyViewProps) {
  const lesson = data.lesson!;
  const isClassroom = mode === 'classroom';
  const viewer: Viewer = data.viewer ?? (isStudent ? 'student' : 'teacher');
  const scheduledLessonId = data.session.scheduledLessonId;
  const canPresent = !isClassroom && viewer !== 'student';
  const trackable = viewer === 'student' && !isClassroom && !!scheduledLessonId;
  const [presenting, setPresenting] = useState(!!initialPresenting && mode !== 'classroom' && (data.viewer ?? (isStudent ? 'student' : 'teacher')) !== 'student');
  // The contents sidebar: open or hidden, remembered across lessons (page mode only).
  const [sidebarOpen, setSidebarOpen] = useLessonSidebar();
  const contentRef = useRef<HTMLDivElement>(null);

  // ── The text, tidied for display ──────────────────────────────────────────
  const markdown = useMemo(
    () => dedupeForRender(lesson.contentMarkdown ?? '', { title: lesson.title, objectives: lesson.objectives, homework: lesson.homework, hideAnswerKeys: true }).markdown,
    [lesson.contentMarkdown, lesson.title, lesson.objectives, lesson.homework],
  );
  const parsed = useMemo(() => splitSections(markdown), [markdown]);
  const visualsById = useMemo(() => Object.fromEntries((lesson.visuals ?? []).map((v) => [v.id, v])), [lesson.visuals]);

  const sections = useMemo(() => {
    // A quiz block without a quiz is just an empty heading: drop it.
    let list = parsed.sections.filter((s) => !(s.hasQuizBlock && !lesson.quiz));
    const quizPlaced = list.some((s) => s.hasQuizBlock) || parsed.intro.includes(QUIZ_BLOCK_LANG);
    if (lesson.quiz && !quizPlaced) {
      const at = list.findIndex((s) => WRAP_UP.test(s.title));
      list = at === -1 ? [...list, QUIZ_SECTION] : [...list.slice(0, at), QUIZ_SECTION, ...list.slice(at)];
    }
    return list;
  }, [parsed, lesson.quiz]);

  const headingIds = useMemo(() => {
    const m = new Map(parsed.headings.map((h) => [h.line, h.id]));
    m.set(-1, QUIZ_SECTION.id);
    return m;
  }, [parsed.headings]);

  const coreIds = useMemo(() => sections.filter((s) => s.kind === 'core' && !s.hasQuizBlock).map((s) => s.id), [sections]);
  const activityIds = useMemo(
    () => extractVisualIds(markdown).filter((id, i, a) => a.indexOf(id) === i && !!VISUAL_RENDERERS[visualsById[id]?.type]?.interactive),
    [markdown, visualsById],
  );

  // ── Table of contents ─────────────────────────────────────────────────────
  const hasObjectives = lesson.objectives.length > 0;
  const hasProject = !!lesson.project || !!lesson.checkpoint;
  const showProjectCard = (lesson.projectLinks && lesson.projectLinks.length > 0) || lesson.codeSnippets?.length > 0;
  const toc: TocItem[] = useMemo(() => {
    const items: TocItem[] = [];
    if (hasObjectives) items.push({ id: 'lesson-objectives', text: 'Learning objectives', level: 2 });
    for (const s of sections) {
      items.push({ id: s.id, text: s.title, level: 2 });
      if (s.kind === 'core') {
        for (const h of parsed.headings) if (h.level === 3 && h.line > s.startLine && h.line < s.endLine) items.push({ id: h.id, text: h.text, level: 3 });
      }
    }
    if (showProjectCard) items.push({ id: 'lesson-project', text: 'Project', level: 2 });
    if (lesson.homework) items.push({ id: 'lesson-homework', text: 'Homework / practice', level: 2 });
    return items.slice(0, 40);
  }, [hasObjectives, sections, parsed.headings, showProjectCard, lesson.homework]);
  const tocIds = useMemo(() => toc.map((t) => t.id), [toc]);
  const activeId = useActiveHeading(tocIds, !isClassroom && !presenting);

  // Supplementary sections are collapsible; navigating into one opens it.
  const [open, setOpen] = useState<Set<string>>(new Set());
  const suppOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sections) {
      if (s.kind !== 'supplementary') continue;
      m.set(s.id, s.id);
      for (const h of parsed.headings) if (h.line > s.startLine && h.line < s.endLine) m.set(h.id, s.id);
    }
    return m;
  }, [sections, parsed.headings]);
  const reveal = useCallback(
    (id: string) => {
      const owner = suppOf.get(id);
      if (owner) setOpen((o) => (o.has(owner) ? o : new Set(o).add(owner)));
    },
    [suppOf],
  );
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opens the collapsed section a deep link points into
    if (id) reveal(id);
  }, [reveal]);

  // ── A student's progress (read / activities / quiz / homework) ────────────
  const [progress, setProgress] = useState<LocalProgress>(emptyProgress);
  const [server, setServer] = useState<ProgressView | null>(null);
  const storageKey = scheduledLessonId ? `lumexa:lesson-progress:${scheduledLessonId}` : null;
  const sent = useRef('');

  const refresh = useCallback(() => {
    if (!trackable || !scheduledLessonId) return;
    api
      .get<{ progress: ProgressView | null }>(`/curriculum/scheduled-lessons/${scheduledLessonId}/progress`)
      .then((res) => {
        if (!res.data.progress) return;
        setServer(res.data.progress);
        setProgress((p) => mergeProgress(p, res.data.progress!));
      })
      .catch(() => undefined);
  }, [trackable, scheduledLessonId]);

  useEffect(() => {
    if (!trackable || !storageKey) return;
    try {
      // Read after mount (not in the initial state) so the server-rendered markup and the first client render match.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgress(parseStored(window.localStorage.getItem(storageKey)));
    } catch {
      /* private mode: progress simply is not remembered locally */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches the saved progress once on mount
    refresh();
  }, [trackable, storageKey, refresh]);

  useEffect(() => {
    if (!trackable || !storageKey) return;
    const snapshot = JSON.stringify(progress);
    try {
      window.localStorage.setItem(storageKey, snapshot);
    } catch {
      /* ignore */
    }
    if (snapshot === sent.current || (progress.sectionsRead.length === 0 && progress.activitiesDone.length === 0)) return;
    const t = setTimeout(() => {
      api
        .put<{ progress: ProgressView | null }>(`/curriculum/scheduled-lessons/${scheduledLessonId}/progress`, {
          sectionsRead: progress.sectionsRead,
          activitiesDone: progress.activitiesDone,
        })
        .then((res) => {
          sent.current = snapshot;
          if (res.data.progress) setServer(res.data.progress);
        })
        .catch(() => undefined);
    }, 1500);
    return () => clearTimeout(t);
  }, [progress, trackable, storageKey, scheduledLessonId]);

  const markRead = useCallback((id: string) => setProgress((p) => (p.sectionsRead.includes(id) ? p : { ...p, sectionsRead: [...p.sectionsRead, id] })), []);
  const markActivity = useCallback(
    (id: string) => {
      if (trackable) setProgress((p) => (p.activitiesDone.includes(id) ? p : { ...p, activitiesDone: [...p.activitiesDone, id] }));
    },
    [trackable],
  );
  useReadTracking(coreIds, trackable && !presenting, markRead);

  const completion = lessonCompletion({
    sectionIds: coreIds,
    activityIds,
    progress,
    quiz: server?.quiz ?? null,
    hasQuiz: !!lesson.quiz,
    hasHomework: !!lesson.homework,
    homeworkSubmitted: !!(server?.homeworkSubmitted || data.submission),
  });
  const readIds = trackable ? new Set(progress.sectionsRead) : null;
  const barProgress = useScrollProgress(contentRef, !isClassroom && !presenting);

  // ── Pieces of the page ────────────────────────────────────────────────────
  const bodyCode = useMemo(() => extractFencedBlocks(markdown), [markdown]);
  const snippets = (lesson.codeSnippets ?? []).filter((s) => !codeAlreadyInText(s.code, bodyCode));
  const homework = lesson.homework ? normalizeHeadingsFrom(stripLeadingH1(lesson.homework), 3) : null;

  const quizNode = lesson.quiz ? (
    <div className="lesson-quiz">
    <MiniQuiz
      lessonId={lesson.id}
      quiz={lesson.quiz}
      scheduledLessonId={scheduledLessonId}
      inClassroom={isClassroom}
      preview={viewer !== 'student'}
      previous={server?.quiz ?? null}
      onAnswered={refresh}
    />
    </div>
  ) : null;

  const renderBody = (presentation: boolean): ReactNode => (
    <LessonRenderContext.Provider
      value={{ lessonId: lesson.id, mode, presentation, viewer, refs: data.refs ?? {}, visuals: visualsById, renderQuiz: quizNode ? () => quizNode : null, onActivityDone: markActivity }}
    >
      {(hasObjectives || hasProject) && (
        <div className={`mb-5 ${hasObjectives && hasProject ? 'grid items-start gap-4 lg:grid-cols-2' : ''}`}>
          {hasObjectives && (
            <section id="lesson-objectives" className={`${CARD} scroll-mt-24`}>
              <h2 className="mb-2 font-bold text-gray-900 dark:text-white">🎯 Learning Objectives</h2>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {lesson.objectives.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </section>
          )}
          {lesson.project ? (
            <section className={CARD}>
              <h2 className="mb-1 font-bold text-gray-900 dark:text-white">🛠️ Project: {lesson.project.title}</h2>
              {lesson.project.description && <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">{lesson.project.description}</p>}
              {lesson.checkpoint && (
                <div className="mt-2 inline-block rounded-lg border border-teal-500/20 bg-teal-500/10 px-3 py-1.5 text-sm font-medium text-teal-700 dark:text-teal-400">
                  ✅ This session&apos;s checkpoint: {lesson.checkpoint}
                </div>
              )}
            </section>
          ) : (
            lesson.checkpoint && (
              <section className={CARD}>
                <div className="inline-block rounded-lg border border-teal-500/20 bg-teal-500/10 px-3 py-1.5 text-sm font-medium text-teal-700 dark:text-teal-400">
                  ✅ This session&apos;s checkpoint: {lesson.checkpoint}
                </div>
              </section>
            )
          )}
        </div>
      )}

      {sections.length > 0 || parsed.intro.trim() !== '' ? (
        <section className={`${CARD} mb-5`} aria-label="Lesson material">
          {parsed.intro.trim() !== '' && <LessonMarkdown markdown={parsed.intro} headingIds={headingIds} />}
          {sections.map((s) => {
            if (s.kind === 'supplementary') {
              const body = s.markdown.split('\n').slice(1).join('\n');
              return (
                <details
                  key={s.id}
                  open={open.has(s.id)}
                  onToggle={(e) => {
                    const isOpen = (e.currentTarget as HTMLDetailsElement).open;
                    setOpen((o) => {
                      const next = new Set(o);
                      if (isOpen) next.add(s.id);
                      else next.delete(s.id);
                      return next;
                    });
                  }}
                  className="my-4 rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/30"
                >
                  <summary id={s.id} className="cursor-pointer select-none scroll-mt-24 text-base font-bold text-gray-900 dark:text-white">
                    {s.title}
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">(optional — tap to {open.has(s.id) ? 'hide' : 'show'})</span>
                  </summary>
                  <div className="mt-2">
                    <LessonMarkdown markdown={body} lineOffset={s.startLine + 1} headingIds={headingIds} />
                  </div>
                </details>
              );
            }
            return (
              <div key={s.id} data-section={s.id}>
                <LessonMarkdown markdown={s.markdown} lineOffset={Math.max(0, s.startLine)} headingIds={headingIds} />
                <span data-section-end={s.id} aria-hidden="true" className="block h-px" />
              </div>
            );
          })}
        </section>
      ) : null}

      {showProjectCard && (
        <div id="lesson-project" className="mb-5 scroll-mt-24">
          {lesson.projectLinks && lesson.projectLinks.length > 0 ? (
            <ProjectLinksSection projectLinks={lesson.projectLinks} />
          ) : (
            snippets.length > 0 && (
              <section className={CARD}>
                <h2 className="mb-3 font-bold text-gray-900 dark:text-white">💻 Code</h2>
                <div className="space-y-4">
                  {snippets.map((snip, i) => (
                    <div key={i}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {snip.label} {snip.part ? `· ${snip.part}` : ''}
                        </span>
                        <CopyCodeButton code={snip.code} />
                      </div>
                      <LessonMarkdown markdown={'```' + (snip.language || '') + '\n' + snip.code + '\n```'} />
                    </div>
                  ))}
                </div>
              </section>
            )
          )}
        </div>
      )}

      {homework && (
        <section id="lesson-homework" className={`${CARD} mb-5 scroll-mt-24`}>
          <h2 className="mb-2 font-bold text-gray-900 dark:text-white">📝 Homework / Practice</h2>
          <LessonMarkdown markdown={homework} />
          {!presentation && isStudent && scheduledLessonId && (
            <HomeworkSubmission scheduledLessonId={scheduledLessonId} submission={data.submission ?? null} onSubmitted={(s) => onSubmissionChange?.(s)} />
          )}
        </section>
      )}
    </LessonRenderContext.Provider>
  );

  // ── Presentation Mode: the shared screen. Nothing private is rendered. ────
  if (presenting) {
    return (
      <PresentationShell title={lesson.title} onExit={() => { setPresenting(false); onExitPresentation?.(); }}>
        <LessonHeader data={data} />
        {renderBody(true)}
      </PresentationShell>
    );
  }

  // ── The live classroom stage: compact, as it always was ───────────────────
  if (isClassroom) {
    return (
      <>
        <LessonHeader data={data} />
        {renderBody(false)}
      </>
    );
  }

  // ── The standalone lesson page ────────────────────────────────────────────
  const nav = data.navigation;
  const hasSidebar = toc.length > 1;
  return (
    <div ref={contentRef}>
      <div className="fixed left-0 right-0 top-0 z-[60] h-1 bg-transparent" role="progressbar" aria-label="Reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(barProgress * 100)}>
        <div className="h-full bg-gradient-to-r from-violet-500 to-teal-400 transition-[width] duration-150" style={{ width: `${barProgress * 100}%` }} />
      </div>

      <LessonHeader
        data={data}
        actions={
          canPresent ? (
            <button
              type="button"
              onClick={() => setPresenting(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-violet-500/50 bg-violet-50 px-3.5 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-200 dark:hover:bg-violet-900/40"
            >
              <span aria-hidden="true">📺</span> Present
            </button>
          ) : null
        }
      />

      <div className="lesson-layout" data-sidebar={hasSidebar && !sidebarOpen ? 'hidden' : 'open'} data-no-sidebar={hasSidebar ? undefined : ''}>
        {hasSidebar && (
          <>
            <aside className="lesson-sidebar mb-4 hidden lg:block" aria-label="Lesson contents">
              <div className="lesson-sidebar-sticky">
                <div className="lesson-sidebar-head">
                  <SidebarToggle open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} controls="lesson-toc" />
                  <span className="lesson-sidebar-title">On this page</span>
                </div>
                <div id="lesson-toc" className="lesson-sidebar-body" inert={!sidebarOpen} aria-hidden={sidebarOpen ? undefined : true}>
                  <TableOfContents items={toc} activeId={activeId} readIds={readIds} onNavigate={reveal} showHeading={false} />
                </div>
              </div>
            </aside>
            <details className="mb-4 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800/50 lg:hidden">
              <summary className="cursor-pointer select-none text-sm font-semibold text-gray-800 dark:text-gray-100">On this page</summary>
              <div className="mt-3">
                <TableOfContents items={toc} activeId={activeId} readIds={readIds} onNavigate={reveal} showHeading={false} />
              </div>
            </details>
          </>
        )}

        <div className="lesson-content min-w-0">
          {trackable && (
            <div className="mb-5">
              <ProgressPanel completion={completion} quizScore={server?.quiz ? { score: server.quiz.score, total: server.quiz.gradedTotal } : null} />
            </div>
          )}
          {renderBody(false)}

          {viewer !== 'student' && data.canPrepare && (
            <div className="mb-5">
              <TeacherPrepPanel lessonId={lesson.id} />
            </div>
          )}

          {nav && (nav.prev || nav.next) && (
            <nav aria-label="Previous and next lesson" className="mt-8 grid gap-3 sm:grid-cols-2">
              {nav.prev && (nav.prev.href || nav.prev.locked) ? <NavCard link={nav.prev} dir="prev" /> : <span />}
              {nav.next && (nav.next.href || nav.next.locked) ? <NavCard link={nav.next} dir="next" /> : <span />}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
