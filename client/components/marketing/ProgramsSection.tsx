"use client";

import Link from "next/link";
import ScrollReveal from "../ScrollReveal";
import { ODYSSEY, homeOrder, type ProgramMeta } from "@/lib/programs";
import { usePrograms } from "@/lib/usePrograms";
import ProgramBadges from "./ProgramBadges";

/*
  Homepage program picker. Each card answers four things and nothing more:
  what can my child build, what age is it for, is it OK for a beginner, and where
  is the full curriculum and pricing. The whole card is one link to /programs.
  Lesson counts live on /programs, not here.
*/

function Meta({ ages, badges }: Pick<ProgramMeta, "ages" | "badges">) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F0F4FF] dark:bg-gray-800/60 text-[#334155] dark:text-gray-300 border border-[#E2E8F0] dark:border-gray-700/60">
        👤 {ages}
      </span>
      <ProgramBadges badges={badges} />
    </div>
  );
}

export default function ProgramsSection() {
  const { odyssey, specialized } = usePrograms();
  const programs = homeOrder(specialized).map((entry) => entry.meta);
  const flagship = odyssey?.meta ?? ODYSSEY;

  return (
    <section id="programs" className="scroll-mt-20 py-20 bg-[#F7F9FF] dark:bg-[#050D1A] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-12">
          <p className="text-purple-600 dark:text-purple-400 text-sm font-bold uppercase tracking-widest mb-3">
            Explore Lumexa Programs
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-white mb-4 leading-tight">
            Your Child Doesn&apos;t Just Learn.{" "}
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
              They Build.
            </span>
          </h2>
          <p className="text-[#334155] dark:text-gray-400 max-w-2xl mx-auto text-lg">
            Explore hands-on learning programs where children develop practical skills, build real projects, and earn
            certificates, badges, and meaningful milestones that celebrate their progress.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Lumexa Odyssey: the starting point for complete beginners */}
          <Link
            href="/programs?program=odyssey"
            className="group relative md:col-span-2 lg:col-span-3 rounded-3xl p-[2px] bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 shadow-lg shadow-purple-200/60 dark:shadow-purple-900/30 hover:shadow-xl transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
          >
            <div className="rounded-[22px] bg-white dark:bg-gray-900 p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex items-center gap-4 lg:w-[34%]">
                <div className="w-16 h-16 flex-none rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 grid place-items-center text-3xl shadow-md group-hover:scale-105 transition-transform">
                  🚀
                </div>
                <div>
                  <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white mb-1.5">
                    Start here
                  </span>
                  <h3 className="text-2xl font-black text-[#0F172A] dark:text-white leading-tight">Lumexa Odyssey</h3>
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                <p className="text-[#334155] dark:text-gray-300 text-sm sm:text-base leading-relaxed">
                  <span className="font-bold text-[#0F172A] dark:text-white">Your child can build: </span>
                  games, websites, data projects and first AI apps while they explore, before choosing a specialty.
                </p>
                <Meta ages={flagship.ages} badges={flagship.badges} />
              </div>

              <div className="flex-none flex lg:flex-col items-center lg:items-end justify-between gap-1 lg:text-right">
                <span className="text-xs text-[#64748B] dark:text-gray-400">Full curriculum &amp; pricing</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-black bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent group-hover:gap-2.5 transition-all">
                  Explore Programs <span aria-hidden className="text-blue-600">→</span>
                </span>
              </div>
            </div>
          </Link>

          {programs.map((p) => (
            <Link
              key={p.id}
              href={`/programs?program=${p.id}`}
              className={`group flex flex-col p-6 rounded-2xl bg-white dark:bg-gray-900/50 border border-[#E2E8F0] dark:border-gray-700/60 ${p.hover} card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 flex-none rounded-xl bg-gradient-to-br ${p.color} grid place-items-center text-2xl shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                  {p.emoji}
                </div>
                <h3 className="text-[#0F172A] dark:text-white font-black text-xl leading-tight">{p.title}</h3>
              </div>
              <p className="text-[#334155] dark:text-gray-300 text-sm leading-relaxed mb-4">
                <span className="font-bold text-[#0F172A] dark:text-white">Your child can build: </span>
                {p.builds}
              </p>
              <Meta ages={p.ages} badges={p.badges} />
              <div className="mt-auto pt-5 flex items-center justify-between">
                <span className="text-xs text-[#64748B] dark:text-gray-400">Full curriculum &amp; pricing</span>
                <span className={`inline-flex items-center gap-1.5 text-sm font-black bg-gradient-to-r ${p.color} bg-clip-text text-transparent`}>
                  Explore Programs <span aria-hidden className="text-[#64748B] dark:text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
