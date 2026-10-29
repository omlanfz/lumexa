import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BookOpenCheck,
  ClipboardCheck,
  ClipboardList,
  Gamepad2,
  Globe,
  Layers,
  LifeBuoy,
  Lock,
  PawPrint,
  Presentation,
  Quote,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
  Lightbulb,
  Check,
} from "lucide-react";
import PolicyTrigger from "@/components/about/PolicyTrigger";
import { FOUNDER, TITIR } from "@/lib/brand";

export const metadata: Metadata = {
  title: "About Lumexa AI School",
  description:
    "Discover Lumexa's approach to live coding education for ages 6–18, with teacher-guided lessons, practical projects, and structured learning pathways.",
};

// ── Shared styles ───────────────────────────────────────────────────────────

const eyebrow = "text-purple-600 dark:text-purple-400 text-sm font-bold uppercase tracking-widest mb-3";
const h2 = "text-3xl sm:text-4xl font-black leading-tight tracking-tight text-[#0F172A] dark:text-white";
const lead = "text-lg text-[#475569] dark:text-gray-400 leading-relaxed";
const gradientText =
  "bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent";
const sectionPad = "px-4 sm:px-6 lg:px-8 py-20 sm:py-24";

// ── Content ─────────────────────────────────────────────────────────────────

const BUILDS = [
  { icon: Gamepad2, label: "Games", tone: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30" },
  { icon: Globe, label: "Websites", tone: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30" },
  { icon: Bot, label: "AI projects", tone: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30" },
];

const MEANINGFUL = ["Understand what they build", "Apply their skills", "Measure their progress", "Explain their work"];

const PILLARS = [
  {
    icon: Users,
    title: "Live, Personal Guidance",
    text: "Choose private 1:1 mentorship or a small learning batch of 2–4 students. Teachers guide students through challenges and adapt their teaching to each child's learning pace.",
    tile: "from-purple-600 to-indigo-600",
  },
  {
    icon: Lightbulb,
    title: "Projects With Purpose",
    text: "Students apply their coding skills to practical projects inspired by real-world technology. The goal is to create work they understand, can demonstrate, and can proudly showcase in a portfolio.",
    tile: "from-blue-600 to-cyan-600",
  },
  {
    icon: ClipboardCheck,
    title: "Assessments Every 8 Lessons",
    text: "After every 8 lessons, students complete a structured assessment to check their understanding, identify areas for improvement, and reinforce what they've learned.",
    tile: "from-teal-600 to-green-600",
  },
  {
    icon: Presentation,
    title: "Project Demos in Every Course",
    text: "Every course includes a dedicated project demonstration lesson. Students present their work to classmates, explain how it works, and develop their technical communication and public-speaking skills.",
    tile: "from-orange-500 to-red-500",
  },
  {
    icon: Layers,
    title: "Structured Learning Programs",
    text: "From coding fundamentals to specialized fields, our programs help children build their skills step by step and explore the areas that interest them.",
    tile: "from-indigo-600 to-blue-600",
  },
  {
    icon: LifeBuoy,
    title: "Support for Parents",
    text: "Parents can connect directly with their child's assigned teacher and Lumexa's support team for help with learning, scheduling, or technical issues.",
    tile: "from-pink-500 to-rose-500",
  },
];

const STANDARDS = [
  { icon: ShieldCheck, title: "Background verification", text: "Identity and qualifications are checked and reviewed by our team." },
  { icon: BookOpenCheck, title: "Preparation for assigned programs", text: "Teachers work from the curriculum of the program they teach." },
  { icon: ClipboardList, title: "Ongoing reviews of teaching quality", text: "Parent feedback, recorded classes and conduct reviews keep standards high." },
];

const TRUST = [
  {
    doc: "child-safety",
    icon: ShieldCheck,
    title: "Child Safety Policy",
    text: "Understand our approach to child protection, appropriate communication, and reporting concerns.",
    tile: "from-green-600 to-emerald-600",
  },
  {
    doc: "privacy",
    icon: Lock,
    title: "Privacy Policy",
    text: "Learn what information we collect, why we collect it, and how we handle it.",
    tile: "from-blue-600 to-cyan-600",
  },
  {
    doc: "refund",
    icon: ReceiptText,
    title: "Refund Policy",
    text: "Understand our cancellation terms, refunds for unused prepaid lessons, and refund processing.",
    tile: "from-purple-600 to-indigo-600",
  },
] as const;

// ── Page ────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="bg-[#F7F9FF] dark:bg-[#050D1A] text-[#0F172A] dark:text-white transition-colors duration-200">
      {/* 1 · Our mission */}
      <section id="mission" className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-300/25 dark:bg-purple-700/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-300/20 dark:bg-blue-700/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <p className={eyebrow}>Our Mission</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight mb-6">
            We Teach Kids to Build the <span className={gradientText}>Future of Technology</span>
          </h1>
          <p className={`${lead} sm:text-xl max-w-2xl mx-auto`}>
            Lumexa AI School offers live, hands-on coding classes for ages 6–18. Students learn to build games,
            websites, and AI projects with guidance from a dedicated teacher.
          </p>
          <ul className="mt-10 flex flex-wrap justify-center gap-3">
            {BUILDS.map(({ icon: Icon, label, tone }) => (
              <li
                key={label}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${tone}`}
              >
                <Icon className="w-4 h-4" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2 · The thinking behind Lumexa (founder story, with the Titir story inside it) */}
      <section id="founder" className={`${sectionPad} bg-white dark:bg-[#07101F] transition-colors duration-200`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className={h2}>The Thinking Behind Lumexa</h2>
            <div aria-hidden className="mx-auto mt-5 h-1 w-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] gap-12 lg:gap-20 items-center">
            {/* Story, on the left on large screens */}
            <div className="order-2 lg:order-1">
              <Quote aria-hidden className="w-9 h-9 text-purple-300 dark:text-purple-500/50 mb-4" strokeWidth={1.5} />
              <h3 className="text-2xl sm:text-3xl font-black leading-snug mb-6">
                Learning Should Lead to Something a Child Can <span className={gradientText}>Be Proud Of.</span>
              </h3>
              <div className="space-y-5 text-lg leading-8 text-[#334155] dark:text-gray-300">
                <p>
                  Teaching coding introduced me to the moment when a student goes from wondering, &ldquo;Can I make
                  this?&rdquo; to proudly showing something they created.
                </p>
                <p>
                  I wanted more children to experience that shift, with patient guidance and the opportunity to explore
                  technology by building with it. That idea became Lumexa: a learning experience built around helping
                  children turn their curiosity into something real.
                </p>
              </div>
            </div>

            {/* Photo, on the right */}
            <figure className="order-1 lg:order-2 mx-auto w-full max-w-xs sm:max-w-sm">
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-purple-500/30 via-blue-500/20 to-cyan-400/20 blur-xl"
                />
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border-4 border-white dark:border-[#0D1B2E] shadow-xl shadow-purple-200/70 dark:shadow-purple-900/40 ring-1 ring-[#E2E8F0] dark:ring-white/10">
                  <Image
                    src={FOUNDER.photo.src}
                    alt={FOUNDER.photo.alt}
                    width={FOUNDER.photo.width}
                    height={FOUNDER.photo.height}
                    sizes="(min-width: 1024px) 384px, 90vw"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <figcaption className="mt-6 text-center">
                <p className="text-xl font-black">{FOUNDER.name}</p>
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mt-0.5">{FOUNDER.role}</p>
                <p className="text-sm text-[#64748B] dark:text-gray-400 leading-relaxed mt-2">{FOUNDER.credentials}</p>
              </figcaption>
            </figure>
          </div>

          {/* Titir: a quiet sub-story, set apart only by a softer panel */}
          <div
            id="titir"
            className="relative mt-20 lg:mt-28 overflow-hidden rounded-[2rem] border border-[#E2E8F0]/80 dark:border-white/5 bg-[#F1F4FC] dark:bg-white/[0.035] px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20"
          >
            {/* Two faint paw prints in the corner, found rather than announced */}
            <PawPrint
              aria-hidden
              fill="currentColor"
              strokeWidth={0}
              className="pointer-events-none absolute -bottom-2 right-8 h-24 w-24 -rotate-[14deg] text-slate-900/[0.06] dark:text-white/[0.06]"
            />
            <PawPrint
              aria-hidden
              fill="currentColor"
              strokeWidth={0}
              className="pointer-events-none absolute bottom-16 right-32 h-14 w-14 rotate-[16deg] text-slate-900/[0.045] dark:text-white/[0.045]"
            />

            <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-12 lg:gap-20 items-center">
              <figure className="mx-auto w-full max-w-xs sm:max-w-sm">
                <div className="relative aspect-square overflow-hidden rounded-3xl bg-black shadow-xl shadow-slate-400/30 dark:shadow-black/50 ring-1 ring-slate-900/10 dark:ring-white/10">
                  <Image
                    src={TITIR.photo.src}
                    alt={TITIR.photo.alt}
                    width={TITIR.photo.width}
                    height={TITIR.photo.height}
                    sizes="(min-width: 1024px) 384px, 90vw"
                    className="h-full w-full object-cover"
                  />
                </div>
                <figcaption className="mt-4 text-center text-sm italic tracking-wide text-slate-500 dark:text-gray-500">
                  {TITIR.caption}
                </figcaption>
              </figure>

              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="relative h-7 w-7 overflow-hidden rounded-lg bg-[#0B1026]">
                    <Image src="/logo-mark.png" alt="" width={28} height={28} className="h-full w-full object-cover" />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-gray-500">
                    The story behind our logo
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold leading-snug mb-8 text-[#1E293B] dark:text-gray-100">
                  A Little Star Named Titir{" "}
                  <Sparkles aria-hidden className="inline-block h-5 w-5 -mt-1 text-amber-400" strokeWidth={1.75} />
                </h3>
                <div className="space-y-6 text-base leading-8 text-[#475569] dark:text-gray-400">
                  <p>There is a little story behind the Lumexa logo that means more to me than I can put into words.</p>
                  <p>
                    The symbol is inspired by Titir, my cat, whom I lost years ago. Time has passed, but I still miss
                    her.{" "}
                    <em className="not-italic font-medium text-[#334155] dark:text-gray-300">
                      Some kinds of love never really leave us. They simply find quieter ways to stay.
                    </em>
                  </p>
                  <p>
                    For me, Titir lives on in this little symbol. As I build Lumexa, I carry a piece of her with me, a
                    reminder that even when someone is no longer beside us, the love they leave behind can become part
                    of something new.
                  </p>
                  <p>
                    Lumexa is about helping children create things that can live beyond the moment they are made. And
                    I like to think that Titir is a part of that story too.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 · Learning designed around your child */}
      <section id="learning" className={sectionPad}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <p className={eyebrow}>Learning Designed Around Your Child</p>
            <h2 className={`${h2} mb-5`}>Not Just More Projects. More Meaningful Learning.</h2>
            <p className={lead}>
              A long list of projects doesn&apos;t necessarily tell you how much a child has learned. We focus on
              helping students understand what they build, apply their skills, measure their progress, and confidently
              explain their work.
            </p>
          </div>

          <ul className="mb-12 flex flex-wrap justify-center gap-2.5">
            {MEANINGFUL.map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-1.5 rounded-full border border-green-200 dark:border-green-700/40 bg-green-50 dark:bg-green-900/20 px-3.5 py-1.5 text-sm font-semibold text-green-800 dark:text-green-300"
              >
                <Check className="w-3.5 h-3.5" aria-hidden strokeWidth={3} />
                {item}
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PILLARS.map(({ icon: Icon, title, text, tile }) => (
              <article
                key={title}
                className="rounded-2xl border border-[#E2E8F0] dark:border-gray-700/60 bg-white dark:bg-gray-900/50 p-6 card-hover"
              >
                <div className={`mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${tile} text-white shadow-sm`}>
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="text-lg font-black mb-2">{title}</h3>
                <p className="text-sm leading-relaxed text-[#64748B] dark:text-gray-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4 · Our teaching standards */}
      <section id="teaching" className={`${sectionPad} bg-white dark:bg-[#07101F] transition-colors duration-200`}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <p className={eyebrow}>Our Teaching Standards</p>
            <h2 className={`${h2} mb-5`}>Great Teachers Make a Real Difference.</h2>
            <div className={`${lead} space-y-4`}>
              <p>
                Knowing how to code and knowing how to teach children are two different skills. Lumexa selects teachers
                for their subject knowledge, teaching ability, and ability to communicate patiently with young learners.
              </p>
              <p>
                Our approach includes background verification, preparation for assigned programs, and ongoing reviews of
                teaching quality to help ensure children receive effective, age-appropriate instruction.
              </p>
            </div>
            <PolicyTrigger
              doc="teaching-standards"
              className="group mt-8 inline-flex items-center gap-2 rounded-xl border-2 border-purple-200 dark:border-purple-700/50 bg-purple-50 dark:bg-purple-900/20 px-6 py-3 text-sm font-bold text-purple-700 dark:text-purple-300 transition-all hover:border-purple-400 dark:hover:border-purple-500 hover:brightness-95 dark:hover:brightness-125"
            >
              Learn About Our Teaching Standards
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </PolicyTrigger>
          </div>

          <ol className="relative space-y-4">
            <div aria-hidden className="absolute left-[2.1rem] top-10 bottom-10 w-px bg-gradient-to-b from-purple-300 to-blue-300 dark:from-purple-500/40 dark:to-blue-500/40" />
            {STANDARDS.map(({ icon: Icon, title, text }, i) => (
              <li
                key={title}
                className="relative flex gap-4 rounded-2xl border border-[#E2E8F0] dark:border-gray-700/60 bg-[#F8FAFF] dark:bg-gray-900/50 p-5"
              >
                <div className="relative z-10 grid h-12 w-12 flex-none place-items-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-sm">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Step {i + 1}
                  </p>
                  <h3 className="font-black leading-snug">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#64748B] dark:text-gray-400">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5 · Trust, safety & transparency */}
      <section id="trust" className={sectionPad}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className={eyebrow}>Trust, Safety &amp; Transparency</p>
            <h2 className={`${h2} mb-5`}>Your Child&apos;s Learning Matters. So Does Your Peace of Mind.</h2>
            <p className={lead}>
              Parents deserve clear information about how their children are supported, how their personal information
              is handled, and what happens when plans change.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TRUST.map(({ doc, icon: Icon, title, text, tile }) => (
              <PolicyTrigger
                key={doc}
                doc={doc}
                className="group flex h-full flex-col rounded-2xl border border-[#E2E8F0] dark:border-gray-700/60 bg-white dark:bg-gray-900/50 p-6 text-left card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
              >
                <span className={`mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${tile} text-white shadow-sm`}>
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <span className="text-lg font-black mb-2">{title}</span>
                <span className="text-sm leading-relaxed text-[#64748B] dark:text-gray-400">{text}</span>
                <span className="mt-5 inline-flex items-center gap-1.5 pt-1 text-sm font-bold text-purple-600 dark:text-purple-400">
                  Read the policy
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </PolicyTrigger>
            ))}
          </div>
        </div>
      </section>

      {/* 6 · Final call to action */}
      <section id="start" className={`${sectionPad} bg-white dark:bg-[#07101F] transition-colors duration-200`}>
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-purple-200 dark:border-purple-700/30 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-purple-900/20 dark:via-transparent dark:to-blue-900/20 px-6 py-14 text-center sm:px-12">
          <div aria-hidden className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-purple-300/30 dark:bg-purple-600/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-blue-300/30 dark:bg-blue-600/10 blur-3xl" />
          <div className="relative">
            <h2 className={`${h2} mb-4`}>Ready to See the Difference?</h2>
            <p className={`${lead} mb-8 max-w-xl mx-auto`}>
              Give your child a chance to experience Lumexa&apos;s live coding classes, meet their teacher, and
              discover what&apos;s possible.
            </p>
            <Link
              href="/trial"
              className="inline-block rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-4 font-black text-white shadow-xl shadow-purple-200 dark:shadow-purple-900/40 transition-all hover:from-purple-500 hover:to-blue-500 hover:scale-[1.02]"
            >
              Book Free Trial Class
              <span className="block text-xs font-normal opacity-70 mt-0.5">First class free, no card needed</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
