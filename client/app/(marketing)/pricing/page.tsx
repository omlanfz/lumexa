"use client";

import { useState, useEffect, Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCatalog, findCourse, describeRange } from "@/lib/catalog";
import {
  ODYSSEY,
  PROGRAMS,
  resolveProgramId,
  type ProgramKey,
  type ProgramMeta,
} from "@/lib/programs";
import {
  BATCH_PRICE_RATIO,
  FORMATS,
  FULL_PAYMENT_DISCOUNT_PERCENT,
  LESSONS_PER_BLOCK,
  formatBDT,
  fullPayment,
  pricePerBlock,
  resolveFormat,
  type LearningFormat,
} from "@/lib/pricing";

// The two formats, in plain language. Mirrors the homepage's wording.
const FORMAT_EXPLAINERS: Record<
  LearningFormat,
  { intro: string; size: string; suits: string; tile: string; soft: string }
> = {
  private: {
    intro:
      "Your child learns one-on-one with their teacher. The teacher's full attention is on your child, so every lesson moves at their pace and around their goals.",
    size: "1 student with 1 teacher",
    suits: "Children who like focused attention, need a flexible pace, or have a specific goal in mind.",
    tile: "from-purple-600 to-indigo-600",
    soft: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/40",
  },
  batch: {
    intro:
      "A small group of children learns together with one teacher. They share ideas and show their work to friends, while the group stays small enough for the teacher to guide each child.",
    size: "2 to 4 students with 1 teacher",
    suits: "Children who enjoy learning alongside others and like a bit of friendly company.",
    tile: "from-blue-600 to-cyan-600",
    soft: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/40",
  },
};

const FORMAT_ORDER: LearningFormat[] = ["private", "batch"];

// ── FAQ ─────────────────────────────────────────────────────────────────────
// Written around how Lumexa actually runs: a fixed weekly schedule set up by
// our team, live classes in the Lumexa classroom, recordings and homework in
// the student's account, tests and a certificate at the end of each program.

interface Faq {
  q: string;
  a: ReactNode;
}

const FAQ_GROUPS: { heading: string; items: Faq[] }[] = [
  {
    heading: "Scheduling",
    items: [
      {
        q: "How are classes scheduled?",
        a: `After the free trial, our team agrees a fixed weekly schedule with you, on days and times that suit your family, and matches your child with a teacher for those slots. All times are in Bangladesh time. Private 1:1 lessons are ${FORMATS.private.lessonMinutes} minutes and Small Learning Batch lessons are ${FORMATS.batch.lessonMinutes} minutes.`,
      },
      {
        q: "What if my child misses a class or we need to change a time?",
        a: "Message us on WhatsApp or email as early as you can and we will work with the teacher to find another time. If a class cannot go ahead because of a technical problem, it is not counted against your child's lessons and we schedule a make-up class. We email a reminder about an hour before every class, and the classroom opens 10 minutes early.",
      },
    ],
  },
  {
    heading: "The free trial",
    items: [
      {
        q: "Is the trial class really free?",
        a: "Yes. Your child joins a live class with a real teacher. No card is needed and there is no obligation. Send us the short trial form with your child's age and the program you are interested in, and we will email you the class time and link within a few hours.",
      },
      {
        q: "What happens after the trial?",
        a: "If your child enjoyed it, we set up the weekly schedule and the first block of 8 lessons. If not, you owe nothing. We are also happy to help you choose between Odyssey and a Specialized Program, and between Private 1:1 and a Small Learning Batch.",
      },
    ],
  },
  {
    heading: "What is included",
    items: [
      {
        q: "What does the price include?",
        a: "Live lessons with a verified teacher in your chosen format, lesson materials and homework with teacher feedback, course tests and a final test, and a completion certificate when your child passes the final test. Class recordings appear in your child's account for revision.",
      },
      {
        q: "How can I follow my child's progress?",
        a: "From your Lumexa account you can see upcoming classes, completed lessons and learning progress. Teachers review submitted homework, and your child earns badges and ranks as they move through the program.",
      },
    ],
  },
  {
    heading: "Payments and refunds",
    items: [
      {
        q: "How does paying every 8 lessons work?",
        a: "You pay for one block of 8 lessons at a time, so you never have to commit to the whole program upfront. We remind you when your child has fewer than 3 lessons left, so learning continues without a break. Our team shares the payment details when you enrol.",
      },
      {
        q: "Is it cheaper to pay for the whole program at once?",
        a: `Yes. Pay for the full Odyssey journey upfront and save ${FULL_PAYMENT_DISCOUNT_PERCENT.odyssey}%, or pay for a full Specialized Program upfront and save ${FULL_PAYMENT_DISCOUNT_PERCENT.specialized}%. The discount is applied to the regular lesson rate.`,
      },
      {
        q: "What is your refund policy?",
        a: (
          <>
            If you cancel at least 24 hours before your child&apos;s first class, you receive a full refund. After
            classes begin, you are refunded for unused prepaid lessons after deducting the regular price of the
            lessons already completed, and full-program discounts are recalculated at regular lesson rates. Approved
            refunds are initiated within 7 business days. Read the full{" "}
            <Link href="/refund-policy" className="font-semibold text-purple-600 dark:text-purple-400 hover:underline underline-offset-2">
              Refund Policy
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    heading: "Ongoing learning",
    items: [
      {
        q: "What if my child is not enjoying it or it is not the right fit?",
        a: "Tell us at any time. We can arrange a Parent-Teacher Meeting (PTM) to understand your concerns and improve the experience for your child.",
      },
    ],
  },
];

// ── Small pieces ────────────────────────────────────────────────────────────

function FormatToggle({
  format,
  onChange,
  compact = false,
}: {
  format: LearningFormat;
  onChange: (f: LearningFormat) => void;
  compact?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Learning format"
      className={`inline-grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#E2E8F0] dark:bg-gray-800/70 ${compact ? "" : "w-full max-w-md"}`}
    >
      {FORMAT_ORDER.map((id) => {
        const f = FORMATS[id];
        const active = format === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={`rounded-xl font-bold transition-all ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-3 text-sm"} ${
              active
                ? "bg-white dark:bg-gray-900 text-[#0F172A] dark:text-white shadow-sm"
                : "text-[#64748B] dark:text-gray-400 hover:text-[#0F172A] dark:hover:text-white"
            }`}
          >
            <span aria-hidden>{f.emoji}</span> {compact ? f.short : f.label}
          </button>
        );
      })}
    </div>
  );
}

function PriceCard({
  program,
  format,
  selected,
  wide = false,
}: {
  program: ProgramMeta;
  format: LearningFormat;
  selected: boolean;
  wide?: boolean;
}) {
  const isOdyssey = program.id === "odyssey";
  return (
    <div
      id={`price-${program.id}`}
      className={`relative flex flex-col scroll-mt-28 rounded-2xl border-2 bg-white dark:bg-gray-900/50 p-6 transition-all ${
        wide ? "sm:col-span-2 lg:col-span-3" : ""
      } ${
        selected
          ? "border-purple-400 dark:border-purple-500/70 ring-4 ring-purple-100 dark:ring-purple-500/15 shadow-lg"
          : "border-[#E2E8F0] dark:border-gray-700/60 card-hover"
      }`}
    >
      {selected && (
        <span className="absolute -top-3 left-5 px-3 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider">
          Your selection
        </span>
      )}

      <div className={`flex ${wide ? "flex-col md:flex-row md:items-center md:justify-between gap-5" : "flex-col gap-4"}`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 flex-none rounded-xl bg-gradient-to-br ${program.color} grid place-items-center text-2xl shadow-sm`}>
            {program.emoji}
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-lg text-[#0F172A] dark:text-white leading-tight">{program.title}</h3>
            <p className="text-xs text-[#64748B] dark:text-gray-400">
              {program.ages}
              {isOdyssey && " · Complete journey for beginners"}
            </p>
          </div>
        </div>

        <div className={wide ? "md:text-right" : ""}>
          <div className={`text-4xl font-black ${program.accent}`}>{formatBDT(pricePerBlock(program.id, format))}</div>
          <p className="text-sm text-[#64748B] dark:text-gray-400">
            for every {LESSONS_PER_BLOCK} lessons · {FORMATS[format].short}
          </p>
        </div>
      </div>

      <div className={`flex gap-2 ${wide ? "mt-5 md:mt-4 md:justify-end" : "mt-5"}`}>
        <Link
          href={`/trial?program=${program.id}&format=${format}`}
          className={`${wide ? "flex-1 md:flex-none md:px-10" : "flex-1"} text-center px-4 py-2.5 text-sm font-bold text-white rounded-xl bg-gradient-to-r ${program.color} hover:opacity-90 transition-all`}
        >
          Book Free Trial
        </Link>
        <Link
          href={`/programs?program=${program.id}`}
          className="px-4 py-2.5 text-sm font-semibold text-[#334155] dark:text-gray-300 hover:text-[#0F172A] dark:hover:text-white border border-[#CBD5E1] dark:border-gray-700 hover:border-purple-300 dark:hover:border-gray-500 rounded-xl transition-all"
        >
          Curriculum
        </Link>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

function PricingContent() {
  const searchParams = useSearchParams();
  const selectedProgram: ProgramKey | null = resolveProgramId(searchParams.get("program"));
  const { catalog } = useCatalog();

  const [format, setFormat] = useState<LearningFormat>(resolveFormat(searchParams.get("format")) ?? "private");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  // Keep the chosen format in the address so the page can be shared as-is.
  const chooseFormat = (next: LearningFormat) => {
    setFormat(next);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("format", next);
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* the address is a nicety, never required */
    }
  };

  // Arriving from a program page brings that program's price into view.
  useEffect(() => {
    if (!selectedProgram) return;
    const timer = setTimeout(() => {
      document.getElementById(`price-${selectedProgram}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedProgram]);

  const odysseyCourse = findCourse(catalog, ODYSSEY.catalogSlug);
  const specialized = PROGRAMS.flatMap((meta) => {
    const course = findCourse(catalog, meta.catalogSlug);
    return course ? [{ meta, course }] : [];
  });
  const specializedLessons = describeRange(specialized.map((s) => s.course.totalLessons));

  return (
    <div className="bg-[#F7F9FF] dark:bg-[#050D1A] text-[#0F172A] dark:text-white transition-colors duration-200">
      {/* Hero */}
      <section className="relative pt-20 pb-12 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-300/20 dark:bg-purple-700/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-300 dark:border-purple-700/40 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Simple, transparent pricing · All prices in BDT
          </div>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
            Pay for{" "}
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
              {LESSONS_PER_BLOCK} Lessons at a Time
            </span>
          </h1>
          <p className="text-lg text-[#64748B] dark:text-gray-400 max-w-xl mx-auto">
            Choose how your child learns, pick a program, and pay one block of {LESSONS_PER_BLOCK} lessons at a time.
            Prefer to pay once? Save when you pay for the whole program upfront.
          </p>
        </div>
      </section>

      {/* 1 · The two class formats, in plain language */}
      <section className="px-4 sm:px-6 lg:px-8 pb-14">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-purple-600 dark:text-purple-400 text-sm font-bold uppercase tracking-widest mb-2">
              Two ways to learn
            </p>
            <h2 className="text-2xl sm:text-3xl font-black">How your child can attend class</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FORMAT_ORDER.map((id) => {
              const f = FORMATS[id];
              const e = FORMAT_EXPLAINERS[id];
              return (
                <div key={id} className="flex flex-col p-6 rounded-3xl bg-white dark:bg-gray-900/50 border border-[#E2E8F0] dark:border-gray-700/60">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 flex-none rounded-xl bg-gradient-to-br ${e.tile} grid place-items-center text-2xl shadow-sm`}>
                      {f.emoji}
                    </div>
                    <h3 className="font-black text-xl leading-tight">{f.label}</h3>
                  </div>
                  <p className="text-[#334155] dark:text-gray-300 text-sm leading-relaxed mb-4">{e.intro}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F0F4FF] dark:bg-gray-800/60 border border-[#E2E8F0] dark:border-gray-700/60">
                      {e.size}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F0F4FF] dark:bg-gray-800/60 border border-[#E2E8F0] dark:border-gray-700/60">
                      {f.lessonMinutes}-minute lessons
                    </span>
                  </div>
                  <div className={`mt-auto rounded-xl border px-4 py-3 text-sm ${e.soft}`}>
                    <span className="font-bold">Best for: </span>
                    <span className="text-[#334155] dark:text-gray-300">{e.suits}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2 + 3 · Choose a format, then see the standard 8-lesson price of every program */}
      <section id="prices" className="scroll-mt-20 py-14 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#07101F] transition-colors duration-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-blue-600 dark:text-blue-400 text-sm font-bold uppercase tracking-widest mb-2">
              Standard pricing
            </p>
            <h2 className="text-2xl sm:text-3xl font-black mb-3">Choose a format, see the price</h2>
            <p className="text-[#64748B] dark:text-gray-400 text-sm max-w-xl mx-auto">
              Prices are for every {LESSONS_PER_BLOCK} lessons, in BDT. A Small Learning Batch costs{" "}
              {Math.round(BATCH_PRICE_RATIO * 100)}% of the Private 1:1 price.
            </p>
          </div>

          <div className="flex justify-center mb-10">
            <FormatToggle format={format} onChange={chooseFormat} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <PriceCard program={ODYSSEY} format={format} selected={selectedProgram === "odyssey"} wide />
            {PROGRAMS.map((program) => (
              <PriceCard key={program.id} program={program} format={format} selected={selectedProgram === program.id} />
            ))}
          </div>

          <p className="text-center text-[#64748B] dark:text-gray-400 text-sm mt-8 max-w-xl mx-auto">
            You pay for one block of {LESSONS_PER_BLOCK} lessons at a time. We remind you when your child has fewer
            than 3 lessons left, so learning never has to pause.
          </p>
        </div>
      </section>

      {/* 4 · The full Odyssey option */}
      {odysseyCourse && (
        <section className="py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className={`rounded-3xl p-[2px] bg-gradient-to-r ${ODYSSEY.color}`}>
              <div className="rounded-[22px] bg-white dark:bg-gray-900 p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r ${ODYSSEY.color} text-white`}>
                    🚀 Pay once · Full Odyssey
                  </span>
                  <FormatToggle format={format} onChange={chooseFormat} compact />
                </div>
                <FullPaymentBlock
                  title="The complete Lumexa Odyssey journey"
                  program={ODYSSEY}
                  format={format}
                  lessons={odysseyCourse.totalLessons}
                  saleLine={`Save ${FULL_PAYMENT_DISCOUNT_PERCENT.odyssey}% when paying for all ${odysseyCourse.totalLessons} lessons upfront.`}
                  detail={`${odysseyCourse.totalLessons} lessons across ${odysseyCourse.stages.length || "all"} stages, including every course test, stage test and the final test.`}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5 · The full Specialized Programs */}
      {specialized.length > 0 && (
        <section className="py-14 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#07101F] transition-colors duration-200">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
              <div>
                <p className="text-blue-600 dark:text-blue-400 text-sm font-bold uppercase tracking-widest mb-2">
                  Pay once · Full Specialized Program
                </p>
                <h2 className="text-2xl sm:text-3xl font-black">A whole program, one payment</h2>
              </div>
              <FormatToggle format={format} onChange={chooseFormat} compact />
            </div>
            <p className="text-[#64748B] dark:text-gray-400 text-sm mb-8">
              Save {FULL_PAYMENT_DISCOUNT_PERCENT.specialized}% when paying for all {specializedLessons} lessons
              upfront.
            </p>

            <div className="divide-y divide-[#E2E8F0] dark:divide-gray-800 rounded-2xl border border-[#E2E8F0] dark:border-gray-700/60 overflow-hidden">
              {specialized.map(({ meta, course }) => {
                const pay = fullPayment(meta.id, format, course.totalLessons);
                return (
                  <div
                    key={meta.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 p-4 sm:p-5 bg-[#F8FAFF] dark:bg-gray-900/40 ${
                      selectedProgram === meta.id ? "ring-2 ring-inset ring-purple-400 dark:ring-purple-500/60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:w-64 flex-none">
                      <div className={`w-10 h-10 flex-none rounded-xl bg-gradient-to-br ${meta.color} grid place-items-center text-xl shadow-sm`}>
                        {meta.emoji}
                      </div>
                      <div>
                        <p className="font-bold leading-tight">{meta.title}</p>
                        <p className="text-xs text-[#64748B] dark:text-gray-400">{course.totalLessons} lessons</p>
                      </div>
                    </div>
                    <div className="flex-1 flex items-baseline sm:justify-end gap-3 flex-wrap">
                      <span className="text-sm text-[#94A3B8] dark:text-gray-500 line-through">{formatBDT(pay.regular)}</span>
                      <span className={`text-2xl font-black ${meta.accent}`}>{formatBDT(pay.discounted)}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                        Save {formatBDT(pay.savings)}
                      </span>
                    </div>
                    <Link
                      href={`/trial?program=${meta.id}&format=${format}`}
                      className="text-sm font-bold text-purple-600 dark:text-purple-400 hover:underline underline-offset-2 whitespace-nowrap"
                    >
                      Free trial →
                    </Link>
                  </div>
                );
              })}
            </div>
            <p className="text-[#94A3B8] dark:text-gray-500 text-xs mt-3">
              Full-program prices are available when you enrol after your free trial. Prices shown are for{" "}
              {FORMATS[format].label}.
            </p>
          </div>
        </section>
      )}

      {/* 6 · FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black mb-2">Questions parents ask us</h2>
            <p className="text-[#64748B] dark:text-gray-400 text-sm">
              Something missing? Message us on WhatsApp or email and we will help.
            </p>
          </div>
          <div className="space-y-8">
            {FAQ_GROUPS.map((group) => (
              <div key={group.heading}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#94A3B8] dark:text-gray-500 mb-3">
                  {group.heading}
                </h3>
                <div className="space-y-3">
                  {group.items.map((faq) => {
                    const open = openFaq === faq.q;
                    return (
                      <div key={faq.q} className="border border-[#E2E8F0] dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900/30">
                        <button
                          type="button"
                          onClick={() => setOpenFaq(open ? null : faq.q)}
                          aria-expanded={open}
                          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F7F9FF] dark:hover:bg-gray-900/50 transition-colors"
                        >
                          <span className="text-sm font-semibold">{faq.q}</span>
                          <span
                            aria-hidden
                            className={`text-[#94A3B8] dark:text-gray-500 transition-transform flex-shrink-0 ml-4 ${open ? "rotate-180" : ""}`}
                          >
                            ▾
                          </span>
                        </button>
                        {open && (
                          <div className="px-5 pb-4">
                            <p className="text-sm text-[#64748B] dark:text-gray-400 leading-relaxed">{faq.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing nudge */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto p-8 bg-gradient-to-r from-purple-50 dark:from-purple-900/20 to-blue-50 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700/30 rounded-2xl text-center">
          <h2 className="text-2xl font-black mb-3">Start With a Free Trial Class</h2>
          <p className="text-[#64748B] dark:text-gray-400 mb-6 max-w-lg mx-auto">
            Not ready to commit? Your child joins a live class first, with no card and no obligation. Then you decide.
          </p>
          <Link
            href={`/trial${selectedProgram ? `?program=${selectedProgram}&format=${format}` : `?format=${format}`}`}
            className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black rounded-xl shadow-xl shadow-purple-200 dark:shadow-purple-900/40 transition-all hover:scale-[1.02]"
          >
            Book Free Trial Class
            <span className="block text-xs font-normal opacity-70 mt-0.5">No credit card, no commitment</span>
          </Link>
          <p className="text-xs text-[#94A3B8] dark:text-gray-500 mt-4">
            See our{" "}
            <Link href="/refund-policy" className="underline underline-offset-2 hover:text-[#64748B] dark:hover:text-gray-300">
              Refund Policy
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function FullPaymentBlock({
  title,
  program,
  format,
  lessons,
  saleLine,
  detail,
}: {
  title: string;
  program: ProgramMeta;
  format: LearningFormat;
  lessons: number;
  saleLine: string;
  detail: string;
}) {
  const pay = fullPayment(program.id, format, lessons);
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div className="flex-1 min-w-0">
        <h2 className="text-2xl sm:text-3xl font-black mb-2">{title}</h2>
        <p className="text-green-700 dark:text-green-400 font-bold text-sm mb-2">{saleLine}</p>
        <p className="text-[#64748B] dark:text-gray-400 text-sm leading-relaxed">
          {detail} Prices shown for {FORMATS[format].label}.
        </p>
      </div>
      <div className="md:text-right flex-shrink-0">
        <p className="text-sm text-[#94A3B8] dark:text-gray-500 line-through">{formatBDT(pay.regular)}</p>
        <p className={`text-4xl font-black ${program.accent}`}>{formatBDT(pay.discounted)}</p>
        <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
          You save {formatBDT(pay.savings)}
        </span>
        <div className="mt-4">
          <Link
            href={`/trial?program=${program.id}&format=${format}`}
            className={`inline-block px-6 py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r ${program.color} hover:opacity-90 transition-all`}
          >
            Book Free Trial
          </Link>
        </div>
        <p className="text-[#94A3B8] dark:text-gray-500 text-xs mt-2">Available when you enrol after your trial</p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F9FF] dark:bg-[#050D1A] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
