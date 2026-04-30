import Link from "next/link";

const pathways = [
  {
    emoji: "🎮",
    title: "Game Creator Path",
    outcome: "Build 3 Real Games",
    description: "From Roblox worlds to Python arcade games. Your child will design, code, and ship games friends can actually play.",
    tools: ["Roblox / Lua", "Python", "Unity Basics"],
    ages: "Ages 10–18",
    sessions: "24 sessions",
    level: "Beginner → Creator",
    projects: ["Multiplayer shooter", "Platform adventure", "Custom RPG world"],
    accent: "from-red-600 to-orange-600",
    border: "border-red-700/30 hover:border-red-500/50",
    badge: "bg-red-900/30 text-red-300",
    glow: "bg-red-700/5",
    tag: "Most Popular",
  },
  {
    emoji: "🤖",
    title: "AI Builder Path",
    outcome: "Build 3 AI Projects",
    description: "Not just using AI — building it. Your child learns Python + machine learning and creates real AI tools that solve real problems.",
    tools: ["Python", "TensorFlow / PyTorch", "OpenAI API"],
    ages: "Ages 12–18",
    sessions: "24 sessions",
    level: "Builder → Innovator",
    projects: ["Emotion detector", "Chatbot with GPT API", "Image classifier"],
    accent: "from-purple-600 to-blue-600",
    border: "border-purple-600/40 hover:border-purple-400/60",
    badge: "bg-purple-900/40 text-purple-300",
    glow: "bg-purple-700/8",
    tag: "🔥 Future-Proof",
    featured: true,
  },
  {
    emoji: "🌐",
    title: "Web Developer Path",
    outcome: "Build 3 Live Websites",
    description: "From first HTML tag to a deployed full-stack app. Your child will have real websites on the internet — not just screenshots.",
    tools: ["HTML / CSS", "JavaScript", "React / Next.js"],
    ages: "Ages 12–18",
    sessions: "24 sessions",
    level: "Beginner → Creator",
    projects: ["Portfolio site", "Interactive web app", "E-commerce store"],
    accent: "from-blue-600 to-cyan-600",
    border: "border-blue-700/30 hover:border-blue-500/50",
    badge: "bg-blue-900/30 text-blue-300",
    glow: "bg-blue-700/5",
    tag: "High Demand",
  },
  {
    emoji: "🌟",
    title: "Little Coders Path",
    outcome: "First 3 Real Projects",
    description: "Designed for younger kids. Starts with Scratch stories and animations, then moves to Python basics — all at their pace, all fun.",
    tools: ["Scratch", "Python Basics", "Animations"],
    ages: "Ages 6–11",
    sessions: "16 sessions",
    level: "Explorer → Builder",
    projects: ["Animated story", "Mini quiz game", "First Python program"],
    accent: "from-yellow-500 to-orange-500",
    border: "border-yellow-700/30 hover:border-yellow-500/50",
    badge: "bg-yellow-900/30 text-yellow-300",
    glow: "bg-yellow-700/5",
    tag: "Best for Beginners",
  },
  {
    emoji: "📊",
    title: "Data Scientist Path",
    outcome: "Build 3 Data Projects",
    description: "The skill every company needs. Your child learns to find patterns in real-world data and build dashboards that tell stories.",
    tools: ["Python", "Pandas / NumPy", "Plotly / Matplotlib"],
    ages: "Ages 13–18",
    sessions: "20 sessions",
    level: "Builder → Innovator",
    projects: ["Sports stats analyzer", "Climate data dashboard", "Market trends predictor"],
    accent: "from-teal-600 to-green-600",
    border: "border-teal-700/30 hover:border-teal-500/50",
    badge: "bg-teal-900/30 text-teal-300",
    glow: "bg-teal-700/5",
    tag: "Career Ready",
  },
];

export default function PathwaysSection() {
  return (
    <section className="py-20 bg-[#050D1A]" id="pathways">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-purple-400 text-sm font-bold uppercase tracking-widest mb-3">
            5 Flagship Learning Pathways
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
            Your Child Doesn't Just Learn.{" "}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              They Build.
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Every pathway ends with 3+ real projects in your child's portfolio — not certificates, not badges. Actual things they built.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pathways.map((p) => (
            <div
              key={p.title}
              className={`relative flex flex-col p-6 rounded-2xl bg-gray-900/60 border ${p.border} transition-all duration-300 group ${
                p.featured ? "ring-1 ring-purple-500/30 shadow-2xl shadow-purple-900/20 md:col-span-2 lg:col-span-1" : ""
              }`}
            >
              {/* Glow background */}
              <div className={`absolute inset-0 rounded-2xl ${p.glow} opacity-0 group-hover:opacity-100 transition-opacity`} />

              {/* Tag */}
              {p.tag && (
                <div className="relative flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${p.badge}`}>
                    {p.tag}
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="relative mb-4">
                <div className="text-4xl mb-3">{p.emoji}</div>
                <h3 className="text-white font-black text-xl mb-1">{p.title}</h3>
                <div className={`inline-block text-sm font-bold bg-gradient-to-r ${p.accent} bg-clip-text text-transparent`}>
                  {p.outcome}
                </div>
              </div>

              <p className="relative text-gray-400 text-sm leading-relaxed mb-4">{p.description}</p>

              {/* Projects */}
              <div className="relative mb-4">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">What they'll build:</p>
                <ul className="space-y-1">
                  {p.projects.map((proj) => (
                    <li key={proj} className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="w-1 h-1 rounded-full bg-purple-500 flex-shrink-0" />
                      {proj}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Meta */}
              <div className="relative flex flex-wrap gap-2 mb-5">
                <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400">{p.ages}</span>
                <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400">{p.sessions}</span>
                <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400">{p.level}</span>
              </div>

              {/* Tools */}
              <div className="relative flex flex-wrap gap-1.5 mb-5">
                {p.tools.map((t) => (
                  <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded border border-gray-700 text-gray-500">
                    {t}
                  </span>
                ))}
              </div>

              {/* Dual CTAs */}
              <div className="relative mt-auto flex flex-col gap-2">
                <Link
                  href="/trial"
                  className={`w-full py-3 text-center text-sm font-bold text-white rounded-xl bg-gradient-to-r ${p.accent} hover:opacity-90 transition-all shadow-lg`}
                >
                  Book Free Trial
                </Link>
                <Link
                  href="/courses"
                  className="w-full py-2.5 text-center text-xs font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-xl transition-all"
                >
                  View Full Curriculum →
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-600 text-sm mt-8">
          Not sure which path is right? Book a free trial — we'll recommend the perfect one.
        </p>
      </div>
    </section>
  );
}
