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
  cardBg: string;
  cardBorder: string;
  tagBg: string;
  tagText: string;
  dotColor: string;
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
    cardBg: "bg-white",
    cardBorder: "border-red-200 hover:border-red-300",
    tagBg: "bg-red-50",
    tagText: "text-red-700",
    dotColor: "bg-red-500",
    tag: "Most Popular",
  },
  {
    id: "ai",
    emoji: "🤖",
    title: "AI Builder Path",
    outcome: "Build 3 AI Projects",
    description:
      "Not just using AI — building it. Your child learns Python and machine learning, then creates real AI tools that detect emotions, recognise objects, and hold conversations.",
    tools: ["Python", "TensorFlow / PyTorch", "OpenAI API"],
    ages: "Ages 12–18",
    sessions: "24 sessions",
    level: "Builder to Innovator",
    projects: ["Real-time emotion detector", "Chatbot with GPT API", "Computer vision classifier"],
    accent: "from-purple-600 to-blue-600",
    cardBg: "bg-white",
    cardBorder: "border-purple-200 hover:border-purple-300",
    tagBg: "bg-purple-50",
    tagText: "text-purple-700",
    dotColor: "bg-purple-500",
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
    cardBg: "bg-white",
    cardBorder: "border-blue-200 hover:border-blue-300",
    tagBg: "bg-blue-50",
    tagText: "text-blue-700",
    dotColor: "bg-blue-500",
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
    accent: "from-amber-500 to-orange-500",
    cardBg: "bg-white",
    cardBorder: "border-amber-200 hover:border-amber-300",
    tagBg: "bg-amber-50",
    tagText: "text-amber-700",
    dotColor: "bg-amber-500",
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
    cardBg: "bg-white",
    cardBorder: "border-teal-200 hover:border-teal-300",
    tagBg: "bg-teal-50",
    tagText: "text-teal-700",
    dotColor: "bg-teal-500",
    tag: "Career Ready",
  },
  {
    id: "digital",
    emoji: "💼",
    title: "Digital Independence Path",
    outcome: "Start Earning Online",
    description:
      "The only pathway where your teen doesn't just learn a skill — they launch a real income stream. Portfolio, Fiverr profile, and LinkedIn that attracts clients.",
    tools: ["Canva", "Fiverr / Upwork", "LinkedIn", "GitHub / Vercel"],
    ages: "Ages 15–18",
    sessions: "24 sessions",
    level: "Builder to Earner",
    projects: ["Live portfolio + personal brand", "Active Fiverr gig + proposal kit", "Professional LinkedIn + content strategy"],
    accent: "from-green-600 to-emerald-600",
    cardBg: "bg-white",
    cardBorder: "border-green-200 hover:border-green-300",
    tagBg: "bg-green-50",
    tagText: "text-green-700",
    dotColor: "bg-green-500",
    tag: "Earn Online",
  },
];

export default function PathwaysSection() {
  return (
    <section className="py-20 bg-[#F7F9FF]" id="pathways">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-purple-600 text-sm font-bold uppercase tracking-widest mb-3">
            6 Flagship Learning Pathways
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] mb-4 leading-tight">
            Your Child Doesn&apos;t Just Learn.{" "}
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              They Build.
            </span>
          </h2>
          <p className="text-[#334155] max-w-2xl mx-auto text-lg">
            Every pathway ends with 3+ real projects in your child&apos;s portfolio.
            Not certificates, not badges. Actual things they built.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pathways.map((p) => (
            <div
              key={p.title}
              className={`relative flex flex-col p-6 rounded-2xl ${p.cardBg} border ${p.cardBorder} transition-all duration-300 hover:shadow-md hover:shadow-slate-100 ${
                p.featured ? "ring-2 ring-purple-200 shadow-md shadow-purple-50" : ""
              }`}
            >
              {/* Featured badge */}
              {p.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                  ⭐ Most Popular
                </div>
              )}

              {/* Tag */}
              {p.tag && (
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${p.tagBg} ${p.tagText}`}>
                    {p.tag}
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="mb-4">
                <div className="text-4xl mb-3">{p.emoji}</div>
                <h3 className="text-[#0F172A] font-black text-xl mb-1">{p.title}</h3>
                <div className={`inline-block text-sm font-bold bg-gradient-to-r ${p.accent} bg-clip-text text-transparent`}>
                  {p.outcome}
                </div>
              </div>

              <p className="text-[#334155] text-sm leading-relaxed mb-4">{p.description}</p>

              {/* What they'll build */}
              <div className="mb-4">
                <p className="text-xs text-[#94A3B8] font-semibold uppercase tracking-wider mb-2">
                  What they&apos;ll build:
                </p>
                <ul className="space-y-1">
                  {p.projects.map((proj) => (
                    <li key={proj} className="flex items-center gap-2 text-xs text-[#334155]">
                      <span className={`w-1.5 h-1.5 rounded-full ${p.dotColor} flex-shrink-0`} />
                      {proj}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="text-xs px-2 py-1 rounded-lg bg-[#F0F4FF] text-[#334155] border border-[#E2E8F0]">{p.ages}</span>
                <span className="text-xs px-2 py-1 rounded-lg bg-[#F0F4FF] text-[#334155] border border-[#E2E8F0]">{p.sessions}</span>
                <span className="text-xs px-2 py-1 rounded-lg bg-[#F0F4FF] text-[#334155] border border-[#E2E8F0]">{p.level}</span>
              </div>

              {/* Tools */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {p.tools.map((t) => (
                  <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#E2E8F0] text-[#64748B] bg-white">
                    {t}
                  </span>
                ))}
              </div>

              {/* CTAs */}
              <div className="mt-auto flex flex-col gap-2">
                <Link
                  href="/trial"
                  className={`w-full py-3 text-center text-sm font-bold text-white rounded-xl bg-gradient-to-r ${p.accent} hover:opacity-90 transition-all shadow-sm`}
                >
                  Book Free Trial
                </Link>
                <Link
                  href={`/courses?pathway=${p.id}`}
                  className="w-full py-2.5 text-center text-xs font-semibold text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] hover:border-[#CBD5E1] bg-white rounded-xl transition-all"
                >
                  View Full Curriculum →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Browse All */}
        <div className="mt-10 text-center">
          <p className="text-[#64748B] text-sm mb-4">
            Not sure which path is right? Start with a free trial and we&apos;ll recommend the perfect one.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 border border-[#E2E8F0] hover:border-purple-200 text-[#334155] hover:text-purple-700 rounded-xl text-sm font-semibold transition-all hover:bg-purple-50"
          >
            Browse All Courses and Lesson Breakdowns →
          </Link>
        </div>
      </div>
    </section>
  );
}
