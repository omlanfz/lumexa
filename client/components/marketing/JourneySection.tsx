const milestones = [
  {
    level: "Level 1",
    name: "Explorer",
    emoji: "🔭",
    weeks: "Weeks 1–4",
    tagline: "Think like a coder",
    description: "Your child learns how computers think, writes their first real code, and discovers what they want to build.",
    skills: ["Computational thinking", "First programs in Scratch or Python", "Logic & problem-solving"],
    textColor: "text-amber-600",
    border: "border-amber-200",
    bg: "bg-amber-50",
    circleBg: "bg-amber-50",
    checkColor: "text-amber-600",
  },
  {
    level: "Level 2",
    name: "Builder",
    emoji: "🔨",
    weeks: "Weeks 5–12",
    tagline: "Ship your first real project",
    description: "From concept to code to finished product. Your child builds their first complete project and shares it.",
    skills: ["Complete a real project", "Debugging & testing", "Version control basics"],
    textColor: "text-blue-600",
    border: "border-blue-200",
    bg: "bg-blue-50",
    circleBg: "bg-blue-50",
    checkColor: "text-blue-600",
  },
  {
    level: "Level 3",
    name: "Creator",
    emoji: "⚡",
    weeks: "Weeks 13–20",
    tagline: "Build a portfolio of 3 projects",
    description: "Your child works like a junior developer: planning features, writing clean code, and iterating. Three finished projects, ready to show.",
    skills: ["Advanced project architecture", "APIs & databases", "3 portfolio projects done"],
    textColor: "text-purple-600",
    border: "border-purple-200",
    bg: "bg-purple-50",
    circleBg: "bg-purple-50",
    checkColor: "text-purple-600",
  },
  {
    level: "Level 4",
    name: "AI Innovator",
    emoji: "🚀",
    weeks: "Week 21+",
    tagline: "Use AI to solve real problems",
    description: "The top tier. Your child integrates AI into their own projects — building tools that would impress most adults.",
    skills: ["Machine learning models", "AI API integration", "Real-world impact projects"],
    textColor: "text-teal-600",
    border: "border-teal-200",
    bg: "bg-teal-50",
    circleBg: "bg-teal-50",
    checkColor: "text-teal-600",
  },
];

export default function JourneySection() {
  return (
    <section className="py-20 bg-[#F7F9FF]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-blue-600 text-sm font-bold uppercase tracking-widest mb-3">
            The Lumexa AI School Journey
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] mb-4 leading-tight">
            A Clear Path from{" "}
            <span className="bg-gradient-to-r from-amber-500 to-teal-500 bg-clip-text text-transparent">
              Beginner to AI Innovator
            </span>
          </h2>
          <p className="text-[#334155] max-w-xl mx-auto">
            Every student progresses through 4 milestone levels. You see exactly where they are and where they&apos;re headed.
          </p>
        </div>

        {/* Desktop: horizontal timeline */}
        <div className="hidden md:grid grid-cols-4 gap-0 relative mb-12">
          {/* Connecting line */}
          <div className="absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-amber-300 via-purple-300 to-teal-300" />

          {milestones.map((m) => (
            <div key={m.name} className="relative flex flex-col items-center text-center px-3">
              {/* Circle */}
              <div className={`relative z-10 w-20 h-20 rounded-full ${m.bg} border-2 ${m.border} flex items-center justify-center mb-4 shadow-sm`}>
                <span className="text-3xl">{m.emoji}</span>
              </div>

              <span className={`text-[10px] font-bold uppercase tracking-widest ${m.textColor} mb-1`}>
                {m.level}
              </span>
              <h3 className={`text-lg font-black ${m.textColor} mb-1`}>{m.name}</h3>
              <p className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-wider mb-2">{m.weeks}</p>
              <p className="text-[#0F172A] text-xs font-semibold mb-2">{m.tagline}</p>
              <p className="text-[#64748B] text-xs leading-relaxed">{m.description}</p>
            </div>
          ))}
        </div>

        {/* Mobile: vertical timeline */}
        <div className="md:hidden space-y-0">
          {milestones.map((m, idx) => (
            <div key={m.name} className="relative">
              <div className={`flex gap-4 p-5 rounded-2xl border ${m.border} ${m.bg} mb-2`}>
                <div className="flex-shrink-0">
                  <div className={`w-14 h-14 rounded-full ${m.circleBg} border-2 ${m.border} flex items-center justify-center text-2xl`}>
                    {m.emoji}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${m.textColor}`}>{m.level}</span>
                    <span className="text-[#CBD5E1] text-[10px]">·</span>
                    <span className="text-[#94A3B8] text-[10px]">{m.weeks}</span>
                  </div>
                  <h3 className={`font-black text-base ${m.textColor} mb-1`}>{m.name}</h3>
                  <p className="text-[#0F172A] text-xs font-semibold mb-1">{m.tagline}</p>
                  <p className="text-[#64748B] text-xs leading-relaxed">{m.description}</p>
                </div>
              </div>
              {idx < milestones.length - 1 && (
                <div className="w-0.5 h-4 bg-gradient-to-b from-[#E2E8F0] to-[#CBD5E1] mx-auto mb-2" />
              )}
            </div>
          ))}
        </div>

        {/* Skills grid (desktop) */}
        <div className="hidden md:grid grid-cols-4 gap-4 mt-4">
          {milestones.map((m) => (
            <div key={m.name + "-skills"} className="space-y-1.5">
              {m.skills.map((s) => (
                <div key={s} className="flex items-start gap-1.5 text-xs text-[#64748B]">
                  <span className={`${m.checkColor} mt-0.5 flex-shrink-0`}>✓</span>
                  {s}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-[#64748B] text-sm mb-4">
            Most students reach Level 3 (Creator) within 5–6 months.
          </p>
          <a
            href="/trial"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-sm rounded-xl shadow-md shadow-purple-100 transition-all"
          >
            Start Their Journey Free →
          </a>
        </div>
      </div>
    </section>
  );
}
