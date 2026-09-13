import Link from "next/link";

const steps = [
  {
    step: "01",
    icon: "🎯",
    title: "Book a Free Trial",
    desc: "Pick a subject and a time. We match your child with the perfect teacher. Zero commitment, no card required.",
    accentBg: "bg-purple-50 dark:bg-purple-900/20",
    accentBorder: "border-purple-200 dark:border-purple-700/40",
    accentText: "text-purple-600 dark:text-purple-400",
    numColor: "text-purple-200 dark:text-purple-700",
  },
  {
    step: "02",
    icon: "📚",
    title: "Learn Live with Expert Teachers",
    desc: "Real-time classes in your preferred format: group, small-group, or 1-on-1. Your teacher adapts to your child's exact pace and goals.",
    accentBg: "bg-blue-50 dark:bg-blue-900/20",
    accentBorder: "border-blue-200 dark:border-blue-700/40",
    accentText: "text-blue-600 dark:text-blue-400",
    numColor: "text-blue-200 dark:text-blue-700",
  },
  {
    step: "03",
    icon: "🏆",
    title: "Build Real Projects",
    desc: "Students finish each course with a portfolio-ready project: a game, website, or AI model they can show anyone.",
    accentBg: "bg-teal-50 dark:bg-teal-900/20",
    accentBorder: "border-teal-200 dark:border-teal-700/40",
    accentText: "text-teal-600 dark:text-teal-400",
    numColor: "text-teal-200 dark:text-teal-700",
  },
];

const odysseyStages = [
  {
    stage: "Stage 1",
    name: "Foundation",
    emoji: "🕹️",
    weeks: "Weeks 1–24",
    tagline: "Scratch · Python · Arcade Games",
    description: "Building real coding instincts from zero, one playable project at a time.",
    textColor: "text-amber-600",
    border: "border-amber-200",
    bg: "bg-amber-50",
  },
  {
    stage: "Stage 2",
    name: "Create & Apply",
    emoji: "🌐",
    weeks: "Weeks 25–48",
    tagline: "HTML/CSS · Digital Identity · JavaScript",
    description: "Real websites, a professional online identity, and interactive JavaScript projects.",
    textColor: "text-blue-600",
    border: "border-blue-200",
    bg: "bg-blue-50",
  },
  {
    stage: "Stage 3",
    name: "Explore & Advance",
    emoji: "🔭",
    weeks: "Weeks 49–72",
    tagline: "Data · AI Foundations · Roblox",
    description: "A guided tour of data, AI, and 3D worlds before choosing a specialty.",
    textColor: "text-purple-600",
    border: "border-purple-200",
    bg: "bg-purple-50",
  },
];

const nextPathways = [
  { emoji: "🎮", label: "Game Creator", textColor: "text-red-600 dark:text-red-400" },
  { emoji: "🤖", label: "AI Builder", textColor: "text-purple-600 dark:text-purple-400" },
  { emoji: "🌐", label: "Web Developer", textColor: "text-blue-600 dark:text-blue-400" },
  { emoji: "🌟", label: "Little Coders", textColor: "text-amber-600 dark:text-amber-400" },
  { emoji: "📊", label: "Data Scientist", textColor: "text-teal-600 dark:text-teal-400" },
  { emoji: "💼", label: "Digital Independence", textColor: "text-green-600 dark:text-green-400" },
];

export default function HowItWorksSection() {
  return (
    <section className="py-20 bg-white dark:bg-[#07101F] transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Part 1: 3 steps */}
        <div className="text-center mb-14">
          <p className="text-teal-600 dark:text-teal-400 text-sm font-semibold uppercase tracking-widest mb-2">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] dark:text-white mb-4">
            From Zero to Builder in 3 Steps
          </h2>
          <p className="text-[#334155] dark:text-gray-400 max-w-lg mx-auto">
            No experience needed. We take care of everything: matching the
            right teacher and tracking progress every session.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative mb-20">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px bg-gradient-to-r from-purple-200 via-blue-200 to-teal-200 dark:from-purple-700/40 dark:via-blue-700/40 dark:to-teal-700/40" />

          {steps.map((s, i) => (
            <div
              key={i}
              className={`relative p-6 rounded-2xl ${s.accentBg} border ${s.accentBorder} card-hover group`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`text-4xl font-black ${s.numColor} select-none`}>{s.step}</div>
                <div className="text-3xl group-hover:scale-110 transition-transform duration-200">{s.icon}</div>
              </div>
              <h3 className="text-[#0F172A] dark:text-white font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-[#334155] dark:text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-[#E2E8F0] dark:border-gray-800 mb-20" />

        {/* Part 2: Journey levels */}
        <div className="text-center mb-14">
          <p className="text-blue-600 dark:text-blue-400 text-sm font-bold uppercase tracking-widest mb-3">
            Your Child&apos;s Learning Journey
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] dark:text-white mb-4 leading-tight">
            A Clear Path from{" "}
            <span className="bg-gradient-to-r from-amber-500 to-teal-500 bg-clip-text text-transparent">
              Beginner to AI Innovator
            </span>
          </h2>
          <p className="text-[#334155] dark:text-gray-400 max-w-xl mx-auto">
            Every student starts with Lumexa Odyssey: three guided stages before choosing where to specialize.
          </p>
        </div>

        {/* Desktop: horizontal timeline (3 stages) */}
        <div className="hidden md:grid grid-cols-3 gap-0 relative mb-10">
          {/* Connecting line */}
          <div className="absolute top-10 left-[16.6%] right-[16.6%] h-0.5 bg-gradient-to-r from-amber-300 via-blue-300 to-purple-300 dark:from-amber-600/50 dark:via-blue-600/50 dark:to-purple-600/50" />

          {odysseyStages.map((s) => (
            <div key={s.name} className="relative flex flex-col items-center text-center px-3">
              {/* Circle */}
              <div className={`relative z-10 w-20 h-20 rounded-full ${s.bg} border-2 ${s.border} flex items-center justify-center mb-4 shadow-sm hover:scale-110 transition-transform duration-200`}>
                <span className="text-3xl">{s.emoji}</span>
              </div>

              <span className={`text-[10px] font-bold uppercase tracking-widest ${s.textColor} mb-1`}>
                {s.stage}
              </span>
              <h3 className={`text-lg font-black ${s.textColor} mb-1`}>{s.name}</h3>
              <p className="text-[#94A3B8] dark:text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-2">{s.weeks}</p>
              <p className="text-[#0F172A] dark:text-white text-xs font-semibold mb-2">{s.tagline}</p>
              <p className="text-[#64748B] dark:text-gray-400 text-xs leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>

        {/* Mobile: vertical timeline (3 stages) */}
        <div className="md:hidden space-y-3 mb-6">
          {odysseyStages.map((s, idx) => (
            <div key={s.name} className="relative">
              <div className={`flex gap-4 p-5 rounded-2xl border ${s.border} ${s.bg}`}>
                <div className="flex-shrink-0">
                  <div className={`w-14 h-14 rounded-full ${s.bg} border-2 ${s.border} flex items-center justify-center text-2xl`}>
                    {s.emoji}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${s.textColor}`}>{s.stage}</span>
                    <span className="text-[#CBD5E1] dark:text-gray-600 text-[10px]">·</span>
                    <span className="text-[#94A3B8] dark:text-gray-500 text-[10px]">{s.weeks}</span>
                  </div>
                  <h3 className={`font-black text-base ${s.textColor} mb-1`}>{s.name}</h3>
                  <p className="text-[#0F172A] dark:text-white text-xs font-semibold mb-1">{s.tagline}</p>
                  <p className="text-[#64748B] dark:text-gray-400 text-xs leading-relaxed">{s.description}</p>
                </div>
              </div>
              {idx < odysseyStages.length - 1 && (
                <div className="w-0.5 h-4 bg-gradient-to-b from-[#E2E8F0] to-[#CBD5E1] dark:from-gray-700 dark:to-gray-800 mx-auto mt-1" />
              )}
            </div>
          ))}
        </div>

        {/* Connector into the destination node */}
        <div className="flex justify-center mb-4">
          <svg className="w-5 h-5 text-[#CBD5E1] dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        {/* Destination: Choose Your Path (not a stage — fans out into the 6 pathways) */}
        <div className="max-w-2xl mx-auto text-center p-6 sm:p-8 rounded-2xl border-2 border-dashed border-teal-200 dark:border-teal-700/50 bg-teal-50/60 dark:bg-teal-900/10 mb-12">
          <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-900/30 border-2 border-teal-200 dark:border-teal-700/50 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <span className="text-2xl">🚀</span>
          </div>
          <h3 className="text-lg font-black text-teal-600 dark:text-teal-400 mb-1">Choose Your Path</h3>
          <p className="text-[#64748B] dark:text-gray-400 text-xs leading-relaxed mb-5 max-w-md mx-auto">
            After Odyssey, every student picks a specialized pathway to go deep — based on real experience, not guesswork.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {nextPathways.map((p) => (
              <span
                key={p.label}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white dark:bg-gray-800/60 border border-[#E2E8F0] dark:border-gray-700/60 ${p.textColor}`}
              >
                <span>{p.emoji}</span>
                {p.label}
              </span>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/trial"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-purple-100 dark:shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            Start Odyssey Free
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
