import Link from "next/link";

interface Pathway {
  id: string;
  emoji: string;
  title: string;
  outcome: string;
  description: string;
  tools: string[];
  ages: string;
  sessions: string;
  level: string;
  projects: string[];
  accent: string;
  border: string;
  badge: string;
  glow: string;
  tag?: string;
  featured?: boolean;
}

const pathways: Pathway[] = [
  {
    id: "game",
    emoji: "🎮",
    title: "Game Creator Path",
    outcome: "Build 3 Real Games",
    description:
      "From Roblox worlds to Python arcade games. Your child designs, codes, and ships games that friends can actually play — not just a certificate saying they could.",
    tools: ["Roblox / Lua", "Python", "Unity Basics"],
    ages: "Ages 10–18",
    sessions: "24 sessions",
    level: "Beginner to Creator",
    projects: ["Multiplayer Roblox shooter", "Python arcade game", "Custom RPG world"],
    accent: "from-red-600 to-orange-600",
    border: "border-red-700/30 hover:border-red-500/50",
    badge: "bg-red-900/30 text-red-300",
    glow: "bg-red-700/5",
    tag: "Most Popular",
  },
  {
    id: "ai",
    emoji: "🤖",
    title: "AI Builder Path",
    outcome: "Build 3 AI Projects",
    description:
      "Not just using AI — building it. Your child learns Python and machine learning, then creates real AI tools that detect emotions, recognize objects, and hold conversations.",
    tools: ["Python", "TensorFlow / PyTorch", "OpenAI API"],
    ages: "Ages 12–18",
    sessions: "24 sessions",
    level: "Builder to Innovator",
    projects: ["Real-time emotion detector", "Chatbot with GPT API", "Computer vision classifier"],
    accent: "from-purple-600 to-blue-600",
    border: "border-purple-600/40 hover:border-purple-400/60",
    badge: "bg-purple-900/40 text-purple-300",
    glow: "bg-purple-700/8",
    tag: "Future-Proof",
    featured: true,
  },
  {
    id: "web",
    emoji: "🌐",
    title: "Web Developer Path",
    outcome: "Build 3 Live Websites",
    description:
      "From first HTML tag to a deployed full-stack React app. Your child will have real websites on the internet — with working code, not just screenshots.",
    tools: ["HTML / CSS", "JavaScript", "React / Next.js"],
    ages: "Ages 12–18",
    sessions: "24 sessions",
    level: "Beginner to Creator",
    projects: ["Live portfolio site", "Interactive web app", "Full-stack React project"],
    accent: "from-blue-600 to-cyan-600",
    border: "border-blue-700/30 hover:border-blue-500/50",
    badge: "bg-blue-900/30 text-blue-300",
    glow: "bg-blue-700/5",
    tag: "High Demand",
  },
  {
    id: "little",
    emoji: "🌟",
    title: "Little Coders Path",
    outcome: "Build 3 Real Projects",
    description:
      "Designed for younger kids. Starts with Scratch animations, moves to Python basics, then introduces AI — all at their pace, all hands-on, all genuinely fun.",
    tools: ["Scratch", "Python Basics", "Teachable Machine"],
    ages: "Ages 6–11",
    sessions: "24 sessions",
    level: "Explorer to Builder",
    projects: ["Animated Scratch story", "Python mini-game", "AI-powered project"],
    accent: "from-yellow-500 to-orange-500",
    border: "border-yellow-700/30 hover:border-yellow-500/50",
    badge: "bg-yellow-900/30 text-yellow-300",
    glow: "bg-yellow-700/5",
    tag: "Best for Beginners",
  },
  {
    id: "data",
    emoji: "📊",
    title: "Data Scientist Path",
    outcome: "Build 3 Data Projects",
    description:
      "The skill every company needs. Your child learns to find patterns in real-world data and build dashboards and prediction models that tell stories people care about.",
    tools: ["Python", "Pandas / NumPy", "Plotly / Matplotlib"],
    ages: "Ages 13–18",
    sessions: "24 sessions",
    level: "Builder to Innovator",
    projects: ["Sports stats analyser", "Climate data dashboard", "Market trends predictor"],
    accent: "from-teal-600 to-green-600",
    border: "border-teal-700/30 hover:border-teal-500/50",
    badge: "bg-teal-900/30 text-teal-300",
    glow: "bg-teal-700/5",
    tag: "Career Ready",
  },
  {
    id: "digital",
    emoji: "💼",
    title: "Digital Independence Path",
    outcome: "Start Earning Online",
    description:
      "The only pathway where your teen doesn't just learn a skill — they launch a real income stream. By the end they have a live portfolio, active freelancing profiles, and a professional LinkedIn that attracts clients.",
    tools: ["Canva", "Fiverr / Upwork", "LinkedIn", "GitHub / Vercel"],
    ages: "Ages 15–18",
    sessions: "24 sessions",
    level: "Builder to Earner",
    projects: ["Live portfolio + personal brand", "Active Fiverr gig + proposal kit", "Professional LinkedIn + content strategy"],
    accent: "from-green-600 to-emerald-600",
    border: "border-green-700/30 hover:border-green-500/50",
    badge: "bg-green-900/30 text-green-300",
    glow: "bg-green-700/5",
    tag: "Earn Online",
  },
];

export default function PathwaysSection() {
  return (
    <section className="py-20 bg-[#050D1A]" id="pathways">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-purple-400 text-sm font-bold uppercase tracking-widest mb-3">
            6 Flagship Learning Pathways
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
            Your Child Doesn&apos;t Just Learn.{" "}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              They Build.
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Every pathway ends with 3+ real projects in your child&apos;s portfolio.
            Not certificates, not badges. Actual things they built.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pathways.map((p) => (
            <div
              key={p.title}
              className={`relative flex flex-col p-6 rounded-2xl bg-gray-900/60 border ${p.border} transition-all duration-300 group ${
                p.featured ? "ring-1 ring-purple-500/30 shadow-2xl shadow-purple-900/20" : ""
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

              {/* What they'll build */}
              <div className="relative mb-4">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">
                  What they&apos;ll build:
                </p>
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

              {/* CTAs */}
              <div className="relative mt-auto flex flex-col gap-2">
                <Link
                  href="/trial"
                  className={`w-full py-3 text-center text-sm font-bold text-white rounded-xl bg-gradient-to-r ${p.accent} hover:opacity-90 transition-all shadow-lg`}
                >
                  Book Free Trial
                </Link>
                <Link
                  href={`/courses?pathway=${p.id}`}
                  className="w-full py-2.5 text-center text-xs font-semibold text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 bg-gray-800/40 hover:bg-gray-800 rounded-xl transition-all"
                >
                  View Full Curriculum →
                </Link>
                <Link
                  href="/pricing"
                  className="w-full py-2 text-center text-xs font-semibold text-gray-600 hover:text-gray-400 transition-colors"
                >
                  Buy Now
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Browse All */}
        <div className="mt-10 text-center">
          <p className="text-gray-500 text-sm mb-4">
            Not sure which path is right? Start with a free trial and we&apos;ll recommend the perfect one.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 border border-gray-700 hover:border-purple-600/60 text-gray-300 hover:text-white rounded-xl text-sm font-semibold transition-all hover:bg-purple-900/10"
          >
            Browse All Courses and Lesson Breakdowns →
          </Link>
        </div>
      </div>
    </section>
  );
}
