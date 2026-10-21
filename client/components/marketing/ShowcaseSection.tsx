"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  FEATURED_IDS,
  INTEREST_META,
  STUDENT_PROJECTS,
  projectImage,
  type Interest,
  type StudentProject,
} from "@/lib/studentProjects";

// The popup (and its 18 demos) only loads when someone asks for it, and starts
// loading as soon as a "Try it" button is hovered or focused.
const loadModal = () => import("./projects/ProjectDemoModal");
const ProjectDemoModal = dynamic(loadModal, { ssr: false });

const ACCENT: Record<Interest, { border: string; tag: string; dot: string }> = {
  games: { border: "hover:border-red-300 dark:hover:border-red-500/50", tag: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30", dot: "bg-red-500" },
  ai: { border: "hover:border-purple-300 dark:hover:border-purple-500/50", tag: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30", dot: "bg-purple-500" },
  web: { border: "hover:border-blue-300 dark:hover:border-blue-500/50", tag: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30", dot: "bg-blue-500" },
  data: { border: "hover:border-teal-300 dark:hover:border-teal-500/50", tag: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30", dot: "bg-teal-500" },
  young: { border: "hover:border-amber-300 dark:hover:border-amber-500/50", tag: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30", dot: "bg-amber-500" },
  career: { border: "hover:border-green-300 dark:hover:border-green-500/50", tag: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30", dot: "bg-green-500" },
};

interface Props {
  interest: Interest | null;
  onClear: () => void;
}

export default function ShowcaseSection({ interest, onClear }: Props) {
  const [open, setOpen] = useState<StudentProject | null>(null);

  const projects = interest
    ? STUDENT_PROJECTS.filter((p) => p.interest === interest)
    : FEATURED_IDS.map((id) => STUDENT_PROJECTS.find((p) => p.id === id)!);

  return (
    <section id="showcase" className="scroll-mt-20 py-20 bg-[#F7F9FF] dark:bg-[#050D1A] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-orange-600 dark:text-orange-400 text-sm font-bold uppercase tracking-widest mb-2">
            Real Student Projects
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] dark:text-white mb-4">
            These Kids Built This. Yours Can Too.
          </h2>
          <p className="text-[#334155] dark:text-gray-400 max-w-xl mx-auto">
            Every Lumexa student builds a real portfolio. Not a certificate, not a quiz score. Something they made and
            can show the world. Tap <span className="font-bold text-[#0F172A] dark:text-white">Try it</span> on any
            project to play with a mini version right here.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-6 min-h-[2rem]" aria-live="polite">
          {interest ? (
            <>
              <span className="text-sm font-bold text-[#0F172A] dark:text-white">
                {INTEREST_META[interest].emoji} {INTEREST_META[interest].label} projects
              </span>
              <button
                type="button"
                onClick={onClear}
                className="text-xs font-semibold text-purple-600 dark:text-purple-300 hover:underline underline-offset-2"
              >
                Show featured projects
              </button>
            </>
          ) : (
            <span className="text-sm text-[#64748B] dark:text-gray-400">
              Featured projects from every area. Pick what your child would like to build above to see more.
            </span>
          )}
        </div>

        <div
          key={interest ?? "featured"}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 section-fade-up"
        >
          {projects.map((p) => (
            <article
              key={p.id}
              className={`group flex flex-col bg-white dark:bg-gray-900/50 rounded-2xl border border-[#E2E8F0] dark:border-gray-700/60 overflow-hidden card-hover ${ACCENT[p.interest].border}`}
            >
              <button
                type="button"
                onClick={() => setOpen(p)}
                onPointerEnter={() => void loadModal()}
                onFocus={() => void loadModal()}
                aria-label={`Try ${p.title}`}
                className="relative block w-full aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800 text-left"
              >
                <Image
                  src={projectImage(p.id)}
                  alt={`${p.title} output screenshot`}
                  fill
                  sizes="(min-width: 1024px) 380px, (min-width: 640px) 46vw, 92vw"
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                <span className={`absolute left-3 top-3 text-[10px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-sm ${ACCENT[p.interest].tag}`}>
                  {p.program}
                </span>
                <span className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 text-purple-700 text-xs font-black px-3 py-1.5 shadow-lg group-hover:scale-105 transition-transform">
                  ▶︎ Try it
                </span>
              </button>

              <div className="flex flex-col flex-1 p-5">
                <div className="flex items-start gap-3 mb-2">
                  <div className="text-3xl leading-none group-hover:scale-110 transition-transform duration-200">{p.emoji}</div>
                  <div className="min-w-0">
                    <h3 className="text-[#0F172A] dark:text-white font-bold leading-snug">{p.title}</h3>
                    <p className="text-[#64748B] dark:text-gray-500 text-xs">
                      by {p.student}, age {p.age}
                    </p>
                  </div>
                </div>
                <p className="text-[#334155] dark:text-gray-400 text-sm leading-relaxed mb-3">{p.desc}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {p.tech.map((t) => (
                    <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#E2E8F0] dark:border-gray-700/60 text-[#64748B] dark:text-gray-400 bg-[#F8FAFF] dark:bg-gray-800/40">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-auto pt-3 border-t border-[#EEF2F7] dark:border-gray-800 flex items-center gap-2 text-xs text-[#334155] dark:text-gray-300">
                  <span className={`w-1.5 h-1.5 rounded-full flex-none ${ACCENT[p.interest].dot}`} />
                  <span>
                    <span className="font-bold">Skill demonstrated:</span> {p.skill}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-[#64748B] dark:text-gray-500 text-sm mb-4">
            Every Lumexa student graduates with at least 9 portfolio projects.
          </p>
          <Link
            href="/trial"
            className="inline-flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold transition-colors"
          >
            Start building with a free lesson →
          </Link>
        </div>
      </div>

      {open && <ProjectDemoModal project={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
