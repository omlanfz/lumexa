const milestones = [
  {
    level: "Level 1",
    name: "Explorer",
    emoji: "🔭",
    weeks: "Weeks 1–4",
    tagline: "Think like a coder",
    description: "Your child learns how computers think, writes their first real code, and discovers what they want to build.",
    skills: ["Computational thinking", "First programs in Scratch or Python", "Logic & problem-solving"],
    color: "text-yellow-400",
    border: "border-yellow-700/30",
    bg: "bg-yellow-900/10",
    connector: "bg-gradient-to-b from-yellow-600/40 to-purple-600/40",
  },
  {
    level: "Level 2",
    name: "Builder",
    emoji: "🔨",
    weeks: "Weeks 5–12",
    tagline: "Ship your first real project",
    description: "From concept to code to finished product. Your child builds their first complete project — a game, website, or Python app — and shares it.",
    skills: ["Complete a real project", "Debugging & testing", "Version control basics"],
    color: "text-blue-400",
    border: "border-blue-700/30",
    bg: "bg-blue-900/10",
    connector: "bg-gradient-to-b from-purple-600/40 to-purple-600/40",
  },
  {
    level: "Level 3",
    name: "Creator",
    emoji: "⚡",
    weeks: "Weeks 13–20",
    tagline: "Build a portfolio of 3 projects",
    description: "Your child now works like a junior developer — planning features, writing clean code, and iterating based on feedback. Three finished projects, ready to show.",
    skills: ["Advanced project architecture", "APIs & databases", "3 portfolio projects done"],
    color: "text-purple-400",
    border: "border-purple-700/30",
    bg: "bg-purple-900/10",
    connector: "bg-gradient-to-b from-purple-600/40 to-teal-600/40",
  },
  {
    level: "Level 4",
    name: "AI Innovator",
    emoji: "🚀",
    weeks: "Week 21+",
    tagline: "Use AI to solve real problems",
    description: "The top tier — your child integrates AI into their own projects. They're now building tools that would impress most adults. College-level thinking, at any age.",
    skills: ["Machine learning models", "AI API integration", "Real-world impact projects"],
    color: "text-teal-400",
    border: "border-teal-700/30",
    bg: "bg-teal-900/10",
    connector: null,
  },
];

export default function JourneySection() {
  return (
    <section className="py-20 bg-gradient-to-b from-[#050D1A] to-[#07101F]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-3">
            The Lumexa AI School Journey
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
            A Clear Path from{" "}
            <span className="bg-gradient-to-r from-yellow-400 to-teal-400 bg-clip-text text-transparent">
              Beginner to AI Innovator
            </span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Every student progresses through 4 milestone levels. You see exactly where they are — and where they're headed.
          </p>
        </div>

        {/* Desktop: horizontal timeline */}
        <div className="hidden md:grid grid-cols-4 gap-0 relative mb-16">
          {/* Connecting line */}
          <div className="absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-yellow-600/40 via-purple-600/40 to-teal-600/40" />

          {milestones.map((m) => (
            <div key={m.name} className="relative flex flex-col items-center text-center px-3">
              {/* Circle */}
              <div className={`relative z-10 w-20 h-20 rounded-full ${m.bg} border-2 ${m.border} flex items-center justify-center mb-4 shadow-lg`}>
                <span className="text-3xl">{m.emoji}</span>
              </div>

              <span className={`text-[10px] font-bold uppercase tracking-widest ${m.color} mb-1`}>
                {m.level}
              </span>
              <h3 className={`text-lg font-black ${m.color} mb-1`}>{m.name}</h3>
              <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-wider mb-2">{m.weeks}</p>
              <p className="text-white text-xs font-semibold mb-2">{m.tagline}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{m.description}</p>
            </div>
          ))}
        </div>

        {/* Mobile: vertical timeline */}
        <div className="md:hidden space-y-0">
          {milestones.map((m, idx) => (
            <div key={m.name} className="relative">
              <div className={`flex gap-4 p-5 rounded-2xl border ${m.border} ${m.bg} mb-2`}>
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-gray-900/60 flex items-center justify-center text-2xl">
                    {m.emoji}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${m.color}`}>{m.level}</span>
                    <span className="text-gray-700 text-[10px]">·</span>
                    <span className="text-gray-600 text-[10px]">{m.weeks}</span>
                  </div>
                  <h3 className={`font-black text-base ${m.color} mb-1`}>{m.name}</h3>
                  <p className="text-white text-xs font-semibold mb-1">{m.tagline}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{m.description}</p>
                </div>
              </div>
              {idx < milestones.length - 1 && (
                <div className="w-0.5 h-4 bg-gradient-to-b from-gray-700 to-gray-800 mx-auto mb-2" />
              )}
            </div>
          ))}
        </div>

        {/* Skills grid */}
        <div className="hidden md:grid grid-cols-4 gap-4 mt-4">
          {milestones.map((m) => (
            <div key={m.name + "-skills"} className="space-y-1.5">
              {m.skills.map((s) => (
                <div key={s} className="flex items-start gap-1.5 text-xs text-gray-500">
                  <span className={`${m.color} mt-0.5 flex-shrink-0`}>✓</span>
                  {s}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm mb-4">
            Most students reach Level 3 (Creator) within 5–6 months.
          </p>
          <a
            href="/trial"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-900/40 transition-all"
          >
            Start Their Journey Free →
          </a>
        </div>
      </div>
    </section>
  );
}
