"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  useCatalog,
  findCourse,
  describeRange,
  type Catalog,
  type CatalogCourse,
  type CatalogModule,
} from "@/lib/catalog";
import {
  ODYSSEY,
  PROGRAMS,
  STAGE_NAMES,
  ageSpan,
  COURSE_OUTCOMES,
  resolveProgramId,
  type ProgramId,
  type ProgramMeta,
} from "@/lib/programs";

// Shown on the card of the program most families start with.
const MOST_POPULAR: ProgramId = "ai";

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

const trialHref = (id: string) => `/trial?program=${id}`;
const pricingHref = (id: string) => `/pricing?program=${id}#prices`;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ── Odyssey: a simple overview of its stages, no lesson-by-lesson detail ────

function OdysseySection({ course }: { course: CatalogCourse }) {
  const finalTests = course.closingAssessments.length;
  return (
    <div id="program-odyssey" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
      <div className={`relative rounded-3xl p-[2px] bg-gradient-to-r ${ODYSSEY.color} glow-pulse`}>
        <div className="rounded-[22px] bg-white dark:bg-gray-900 p-6 sm:p-8">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r ${ODYSSEY.color} text-white mb-4`}>
            🚀 The broader journey · Start here
          </span>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white">{ODYSSEY.title}</h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${ODYSSEY.badge}`}>{ODYSSEY.ages}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">
                  For complete beginners
                </span>
              </div>
              <p className="font-bold text-sm bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-1">
                {ODYSSEY.tagline}
              </p>
              <p className="text-[#64748B] dark:text-gray-400 text-xs mb-3">
                {course.totalLessons} lessons · {plural(course.modules.length, "course")} · {plural(course.stages.length, "stage")}
              </p>
              <p className="text-[#334155] dark:text-gray-400 text-sm leading-relaxed max-w-xl">
                Start from zero. Explore games, web, data and AI across three stages, then discover the specialized
                program that&apos;s right for them.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2 flex-shrink-0">
              <a
                href={`/curriculums/${ODYSSEY.curriculumFile}`}
                download
                className="inline-flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-bold rounded-xl border-2 border-purple-200 dark:border-purple-700/50 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:brightness-95 dark:hover:brightness-125 active:brightness-90 transition-all"
              >
                <DownloadIcon className="w-4 h-4" />
                Download Curriculum
              </a>
              <Link
                href={trialHref(ODYSSEY.id)}
                className={`inline-flex items-center justify-center px-5 py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r ${ODYSSEY.color} hover:opacity-90 transition-all shadow-md shadow-purple-900/20`}
              >
                Book Free Trial
              </Link>
              <Link
                href={pricingHref(ODYSSEY.id)}
                className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-[#334155] dark:text-gray-300 hover:text-[#0F172A] dark:hover:text-white border border-[#CBD5E1] dark:border-gray-700 hover:border-purple-300 dark:hover:border-gray-500 rounded-xl transition-all"
              >
                View Pricing
              </Link>
            </div>
          </div>

          {/* The three stages: an overview, not a lesson list */}
          {course.stages.length > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {course.stages.map((stage) => {
                const lessons =
                  stage.modules.reduce((sum, m) => sum + m.lessonCount, 0) + stage.assessments.length;
                return (
                  <div
                    key={stage.number}
                    className="rounded-2xl border border-[#E2E8F0] dark:border-gray-700/60 bg-[#F8FAFF] dark:bg-gray-900/50 p-5"
                  >
                    <p className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Stage {stage.number}
                    </p>
                    <h3 className="text-lg font-black text-[#0F172A] dark:text-white mb-1">
                      {STAGE_NAMES[stage.number] ?? `Stage ${stage.number}`}
                    </h3>
                    <p className="text-xs text-[#64748B] dark:text-gray-400 mb-3">
                      {plural(stage.modules.length, "course")} · {lessons} lessons
                    </p>
                    <ul className="space-y-1.5">
                      {stage.modules.map((m) => (
                        <li key={m.slug} className="flex items-start gap-2 text-sm text-[#334155] dark:text-gray-300">
                          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${ODYSSEY.dot}`} />
                          {m.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-5 text-xs text-[#64748B] dark:text-gray-400">
            Each course ends with a course test{course.stages.length > 0 && ", each stage with a stage test"}
            {finalTests > 0 && ", and the journey with a final test"}. After Odyssey, your child can choose a
            specialized program to go deeper.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Specialized programs ────────────────────────────────────────────────────

function ProgramCard({
  program,
  course,
  isOpen,
  onToggle,
}: {
  program: ProgramMeta;
  course: CatalogCourse;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex flex-col p-6 rounded-2xl bg-white dark:bg-gray-900/50 border-2 transition-all ${
        isOpen
          ? `${program.border} shadow-lg`
          : "border-[#E2E8F0] dark:border-gray-700/60 card-hover"
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-12 h-12 flex-none rounded-xl bg-gradient-to-br ${program.color} grid place-items-center text-2xl shadow-sm`}>
          {program.emoji}
        </div>
        <div className="min-w-0">
          <h3 className="text-[#0F172A] dark:text-white font-black text-xl leading-tight">{program.title}</h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${program.badge}`}>{program.ages}</span>
            {program.id === MOST_POPULAR && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                Most Popular
              </span>
            )}
          </div>
        </div>
      </div>

      <p className={`font-bold text-sm mb-1 ${program.accent}`}>{program.tagline}</p>
      <p className="text-[#64748B] dark:text-gray-400 text-xs mb-4">
        {plural(course.modules.length, "course")} · {course.totalLessons} lessons
      </p>

      <ul className="space-y-1.5 mb-5">
        {course.modules.map((m) => (
          <li key={m.slug} className="flex items-start gap-2 text-sm text-[#334155] dark:text-gray-300">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${program.dot}`} />
            {m.title}
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`program-${program.id}`}
          className={`w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-xl border ${program.border} ${program.badge} hover:brightness-95 dark:hover:brightness-125 transition-all`}
        >
          {isOpen ? "Hide Curriculum" : "View Curriculum"}
          <span aria-hidden className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
        </button>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={trialHref(program.id)}
            className={`text-center px-3 py-2.5 text-sm font-bold text-white rounded-xl bg-gradient-to-r ${program.color} hover:opacity-90 transition-all`}
          >
            Free Trial
          </Link>
          <Link
            href={pricingHref(program.id)}
            className="text-center px-3 py-2.5 text-sm font-semibold text-[#334155] dark:text-gray-300 hover:text-[#0F172A] dark:hover:text-white border border-[#CBD5E1] dark:border-gray-700 hover:border-purple-300 dark:hover:border-gray-500 rounded-xl transition-all"
          >
            View Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}

function CourseRow({
  program,
  module,
  number,
  isOpen,
  onToggle,
}: {
  program: ProgramMeta;
  module: CatalogModule;
  number: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const outcome = COURSE_OUTCOMES[module.slug];
  const hasTest = module.lessonCount > module.learningCount;
  const teachingLessons = module.lessons.filter((l) => l.type === "LEARNING");
  const lessonSummary = `${module.learningCount} lessons${hasTest ? " + test" : ""}`;

  return (
    <div className={`border rounded-2xl overflow-hidden ${program.border} bg-white dark:bg-gray-900/40`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 text-left hover:bg-[#F7F9FF] dark:hover:bg-gray-900/60 transition-colors"
      >
        <div className={`text-2xl font-black ${program.accent} flex-shrink-0 w-6 sm:w-8 text-center`}>{number}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[#0F172A] dark:text-white font-bold text-base">{module.title}</h4>
          {outcome && <p className="text-[#64748B] dark:text-gray-400 text-sm leading-relaxed mt-0.5">{outcome}</p>}
          <span className="sm:hidden inline-block mt-2 text-xs px-2.5 py-1 rounded-lg bg-[#F1F5F9] dark:bg-gray-800 text-[#64748B] dark:text-gray-400">
            {lessonSummary}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="hidden sm:inline-block text-xs px-2.5 py-1 rounded-lg bg-[#F1F5F9] dark:bg-gray-800 text-[#64748B] dark:text-gray-400 whitespace-nowrap">
            {lessonSummary}
          </span>
          <span aria-hidden className={`text-xs transition-transform text-[#94A3B8] dark:text-gray-500 ${isOpen ? "rotate-180" : ""}`}>
            ▾
          </span>
        </div>
      </button>

      {isOpen && (
        <ol className="px-5 pb-5 pt-4 border-t border-[#E2E8F0] dark:border-gray-800/60 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {module.lessons.map((lesson) => {
            if (lesson.type !== "LEARNING") {
              return (
                <li
                  key={lesson.order}
                  className={`flex items-start gap-2 text-sm font-semibold sm:col-span-2 mt-1 pt-3 border-t border-dashed border-[#E2E8F0] dark:border-gray-800 ${program.accent}`}
                >
                  <span aria-hidden>✓</span>
                  <span>
                    Course Test
                    <span className="font-normal text-[#64748B] dark:text-gray-400">
                      {" "}· a check of everything covered in this course
                    </span>
                  </span>
                </li>
              );
            }
            return (
              <li key={lesson.order} className="flex items-start gap-2 text-sm text-[#475569] dark:text-gray-400">
                <span className={`font-bold flex-shrink-0 w-5 ${program.accent}`}>{teachingLessons.indexOf(lesson) + 1}.</span>
                <span>{lesson.title}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function ProgramDetail({
  program,
  course,
  expandedCourse,
  setExpandedCourse,
  onClose,
}: {
  program: ProgramMeta;
  course: CatalogCourse;
  expandedCourse: string | null;
  setExpandedCourse: (key: string | null) => void;
  onClose: () => void;
}) {
  const learning = course.learningLessons;
  return (
    <div id={`program-${program.id}`} className="scroll-mt-24 mt-8 rounded-3xl border border-[#E2E8F0] dark:border-gray-700/60 bg-[#F8FAFF] dark:bg-gray-900/30 p-5 sm:p-8">
      <div className={`flex flex-col sm:flex-row sm:items-center gap-4 mb-6 pb-6 border-b ${program.border}`}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="text-4xl sm:text-5xl">{program.emoji}</div>
          <div className="min-w-0">
            <h3 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white">{program.title} curriculum</h3>
            <p className={`font-bold text-sm ${program.accent}`}>{program.tagline}</p>
            <p className="text-[#64748B] dark:text-gray-400 text-xs mt-0.5">
              {course.totalLessons} lessons: {learning} teaching lessons plus {course.assessmentLessons}{" "}
              {course.assessmentLessons === 1 ? "assessment" : "assessments"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          <a
            href={`/curriculums/${program.curriculumFile}`}
            download
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border ${program.border} ${program.badge} text-xs font-bold hover:brightness-95 dark:hover:brightness-125 transition-all`}
          >
            <DownloadIcon className="w-4 h-4" />
            Download Curriculum
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-[#CBD5E1] dark:border-gray-700 text-xs font-semibold text-[#64748B] dark:text-gray-400 hover:text-[#0F172A] dark:hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {course.modules.map((module, i) => {
          const key = `${program.id}:${module.slug}`;
          return (
            <CourseRow
              key={module.slug}
              program={program}
              module={module}
              number={i + 1}
              isOpen={expandedCourse === key}
              onToggle={() => setExpandedCourse(expandedCourse === key ? null : key)}
            />
          );
        })}

        {course.closingAssessments.map((test) => (
          <div
            key={test.order}
            className={`flex items-start gap-3 border border-dashed rounded-2xl p-5 ${program.border} bg-white dark:bg-gray-900/40`}
          >
            <span aria-hidden className="text-xl">🏆</span>
            <div>
              <p className="text-[#0F172A] dark:text-white font-bold text-base">{test.title}</p>
              <p className="text-[#64748B] dark:text-gray-400 text-sm leading-relaxed mt-0.5">
                A practical challenge and a short live viva with the teacher. Passing it earns your child a completion
                certificate.
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <Link
          href={trialHref(program.id)}
          className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl bg-gradient-to-r ${program.color} hover:opacity-90 transition-all`}
        >
          Book Free Trial for {program.title}
        </Link>
        <Link
          href={pricingHref(program.id)}
          className="px-5 py-2.5 text-sm font-semibold text-[#334155] dark:text-gray-300 hover:text-[#0F172A] dark:hover:text-white border border-[#CBD5E1] dark:border-gray-700 hover:border-purple-300 dark:hover:border-gray-500 rounded-xl transition-all"
        >
          View {program.title} Pricing
        </Link>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

function JourneyChoice({ catalog, odyssey }: { catalog: Catalog; odyssey: CatalogCourse | undefined }) {
  const specialized = catalog.courses.filter((c) => c.kind === "specialized");
  const lessons = describeRange(specialized.map((c) => c.totalLessons));
  const courses = describeRange(specialized.map((c) => c.modules.length));

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <div className="text-center mb-8">
        <p className="text-purple-600 dark:text-purple-400 text-sm font-bold uppercase tracking-widest mb-2">
          Step 1 · Choose a journey
        </p>
        <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white">Two ways to learn at Lumexa</h2>
      </div>

      <div className={`grid grid-cols-1 ${odyssey ? "md:grid-cols-2" : ""} gap-5`}>
        {odyssey && (
          <a
            href="#program-odyssey"
            className="group flex flex-col p-6 sm:p-7 rounded-3xl bg-white dark:bg-gray-900/50 border-2 border-purple-200 dark:border-purple-700/40 hover:border-purple-400 dark:hover:border-purple-500/60 card-hover"
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2">
              The broader journey
            </span>
            <h3 className="text-xl font-black text-[#0F172A] dark:text-white mb-2">🚀 {ODYSSEY.title}</h3>
            <p className="text-[#334155] dark:text-gray-300 text-sm leading-relaxed mb-4">
              A guided path for beginners. Your child explores games, websites, data and AI before choosing what to
              specialize in.
            </p>
            <p className="text-xs font-semibold text-[#64748B] dark:text-gray-400 mb-1">
              {odyssey.totalLessons} lessons · {plural(odyssey.modules.length, "course")} · {plural(odyssey.stages.length, "stage")}
            </p>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mb-5">{ODYSSEY.ages} · No experience needed</p>
            <span className="mt-auto text-sm font-black text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
              See the {odyssey.stages.length || 3} stages ↓
            </span>
          </a>
        )}

        <a
          href="#specialized"
          className="group flex flex-col p-6 sm:p-7 rounded-3xl bg-white dark:bg-gray-900/50 border-2 border-blue-200 dark:border-blue-700/40 hover:border-blue-400 dark:hover:border-blue-500/60 card-hover"
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
            A focused journey
          </span>
          <h3 className="text-xl font-black text-[#0F172A] dark:text-white mb-2">🎯 Specialized Program</h3>
          <p className="text-[#334155] dark:text-gray-300 text-sm leading-relaxed mb-4">
            Go deep in one area your child already loves. Choose from {specialized.length} programs, each a complete
            path that ends with a final test and certificate.
          </p>
          <p className="text-xs font-semibold text-[#64748B] dark:text-gray-400 mb-1">
            {lessons} lessons · {courses} courses per program
          </p>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mb-5">{ageSpan(PROGRAMS)}, depending on the program</p>
          <span className="mt-auto text-sm font-black text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
            Explore the {specialized.length} programs ↓
          </span>
        </a>
      </div>

      <p className="text-center text-sm text-[#64748B] dark:text-gray-400 mt-6">
        Not sure which is right?{" "}
        <Link href="/trial" className="font-semibold text-purple-600 dark:text-purple-400 hover:underline underline-offset-2">
          Book a free trial
        </Link>{" "}
        and we&apos;ll recommend one for your child&apos;s age and interests.
      </p>
    </section>
  );
}

function ProgramsContent() {
  const searchParams = useSearchParams();
  // `program` is the canonical query param; `pathway` is kept so old links still work.
  const programParam = resolveProgramId(searchParams.get("program") || searchParams.get("pathway"));
  const { catalog } = useCatalog();

  const [openProgram, setOpenProgram] = useState<ProgramId | null>(
    programParam && programParam !== "odyssey" ? programParam : null,
  );
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  // A new ?program= (e.g. a link clicked while already on this page) opens that
  // program. Odyssey has no panel; it just scrolls to its section below.
  const [seenParam, setSeenParam] = useState(programParam);
  if (seenParam !== programParam) {
    setSeenParam(programParam);
    if (programParam && programParam !== "odyssey") setOpenProgram(programParam);
  }

  // Bring the linked program into view.
  useEffect(() => {
    if (!programParam) return;
    const timer = setTimeout(() => {
      document.getElementById(`program-${programParam}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(timer);
  }, [programParam]);

  const odyssey = findCourse(catalog, ODYSSEY.catalogSlug);
  const visible = useMemo(
    () =>
      PROGRAMS.flatMap((meta) => {
        const course = findCourse(catalog, meta.catalogSlug);
        return course ? [{ meta, course }] : [];
      }),
    [catalog],
  );
  const open = visible.find((v) => v.meta.id === openProgram);

  const toggleProgram = (id: ProgramId) => {
    const next = openProgram === id ? null : id;
    setOpenProgram(next);
    setExpandedCourse(null);
    if (next) {
      setTimeout(() => {
        document.getElementById(`program-${next}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  };

  return (
    <div className="bg-[#F7F9FF] dark:bg-[#050D1A] text-[#0F172A] dark:text-white transition-colors duration-200">
      {/* Hero */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-700/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-blue-700/6 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-[#0F172A] dark:text-white leading-tight mb-4">
            Find the Right Program for Your Child
          </h1>
          <p className="text-lg text-[#334155] dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Every program is taught live by a verified expert teacher. Every lesson ends with something your child
            built, and every program ends with real portfolio work.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/trial"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black rounded-xl shadow-xl shadow-purple-900/40 transition-all hover:scale-[1.02]"
            >
              Book Free Trial Class
              <span className="block text-xs font-normal opacity-70 mt-0.5">First class free, no card needed</span>
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 text-sm font-semibold text-[#334155] dark:text-gray-400 hover:text-[#0F172A] dark:hover:text-white border border-[#CBD5E1] dark:border-gray-700 hover:border-[#94A3B8] dark:hover:border-gray-500 rounded-xl transition-all"
            >
              View Pricing →
            </Link>
          </div>
        </div>
      </section>

      {/* The parent decision comes first */}
      <JourneyChoice catalog={catalog} odyssey={odyssey} />

      {/* Odyssey */}
      {odyssey && (
        <div className="pb-16">
          <OdysseySection course={odyssey} />
        </div>
      )}

      {/* Specialized programs */}
      <section id="specialized" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 scroll-mt-24">
        <div className="text-center mb-10">
          <p className="text-blue-600 dark:text-blue-400 text-sm font-bold uppercase tracking-widest mb-2">
            Step 2 · Pick a program
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white mb-2">Specialized Programs</h2>
          <p className="text-[#64748B] dark:text-gray-400 max-w-xl mx-auto text-sm">
            Choose the program that matches what your child loves. Open its curriculum whenever you want the
            lesson-by-lesson detail.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map(({ meta, course }) => (
            <ProgramCard
              key={meta.id}
              program={meta}
              course={course}
              isOpen={openProgram === meta.id}
              onToggle={() => toggleProgram(meta.id as ProgramId)}
            />
          ))}
        </div>

        {open && (
          <ProgramDetail
            program={open.meta}
            course={open.course}
            expandedCourse={expandedCourse}
            setExpandedCourse={setExpandedCourse}
            onClose={() => {
              setOpenProgram(null);
              setExpandedCourse(null);
            }}
          />
        )}
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gradient-to-b dark:from-[#07101F] dark:to-[#050D1A] transition-colors duration-200">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-4">Not Sure Where to Start?</h2>
          <p className="text-[#64748B] dark:text-gray-400 mb-8">
            Book a free trial and we&apos;ll recommend the perfect program for your child&apos;s age,
            interests, and goals.
          </p>
          <Link
            href="/trial"
            className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black rounded-xl shadow-xl shadow-purple-900/40 transition-all hover:scale-[1.02]"
          >
            Book Free Trial Class
            <span className="block text-xs font-normal opacity-70 mt-0.5">
              We&apos;ll match your child with the perfect program
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function ProgramsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F9FF] dark:bg-[#050D1A] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
        </div>
      }
    >
      <ProgramsContent />
    </Suspense>
  );
}
