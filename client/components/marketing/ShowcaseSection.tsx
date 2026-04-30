const projects = [
  {
    emoji: "🎮",
    title: "Galactic Shooter",
    student: "Rafi, age 12",
    tech: "Roblox · Lua",
    desc: "A full multiplayer space shooter with leaderboards, built in 10 sessions. Rafi's friends play it every day.",
    color: "border-red-700/30",
    tag: "Game Creator Path",
    tagColor: "bg-red-900/40 text-red-400 border-red-800",
  },
  {
    emoji: "🌐",
    title: "Photography Portfolio",
    student: "Priya, age 15",
    tech: "HTML · CSS · JavaScript",
    desc: "A responsive portfolio site showcasing her photography — deployed live on Vercel and shared at her school exhibition.",
    color: "border-blue-700/30",
    tag: "Web Developer Path",
    tagColor: "bg-blue-900/40 text-blue-400 border-blue-800",
  },
  {
    emoji: "🤖",
    title: "Mood Detector AI",
    student: "Tanvir, age 16",
    tech: "Python · TensorFlow",
    desc: "A computer vision model that detects emotions from webcam in real time. Built in the AI Builder Path — in just 24 sessions.",
    color: "border-purple-700/30",
    tag: "AI Builder Path",
    tagColor: "bg-purple-900/40 text-purple-400 border-purple-800",
  },
  {
    emoji: "📊",
    title: "Climate Data Dashboard",
    student: "Emma, age 17",
    tech: "Python · Pandas · Plotly",
    desc: "An interactive dashboard visualizing 30 years of global climate data — presented at her school's science fair and won first place.",
    color: "border-teal-700/30",
    tag: "Data Scientist Path",
    tagColor: "bg-teal-900/40 text-teal-400 border-teal-800",
  },
  {
    emoji: "🦁",
    title: "Safari Adventure Game",
    student: "Lucas, age 9",
    tech: "Scratch",
    desc: "An animated interactive story with 40+ sprites and 3 playable levels. Lucas's first-ever coding project, built in the Little Coders Path.",
    color: "border-yellow-700/30",
    tag: "Little Coders Path",
    tagColor: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  },
  {
    emoji: "🤖",
    title: "Recipe Chatbot",
    student: "Nadia, age 16",
    tech: "Python · OpenAI API",
    desc: "A conversational AI chatbot that suggests recipes based on what's in your fridge — using the OpenAI API and a custom backend.",
    color: "border-green-700/30",
    tag: "AI Builder Path",
    tagColor: "bg-green-900/40 text-green-400 border-green-800",
  },
];

export default function ShowcaseSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-[#07101F] to-[#050D1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-orange-400 text-sm font-bold uppercase tracking-widest mb-2">
            Real Student Projects
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            These Kids Built This. Yours Can Too.
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Every Lumexa AI School student graduates with a real portfolio project — not a certificate, not a quiz score. Something they actually built.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => (
            <div
              key={p.title}
              className={`p-5 bg-gray-900/50 rounded-2xl border ${p.color} hover:bg-gray-900/80 transition-all duration-300 group`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{p.emoji}</div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${p.tagColor}`}>
                  {p.tag}
                </span>
              </div>
              <h3 className="text-white font-bold mb-1">{p.title}</h3>
              <p className="text-gray-600 text-xs mb-2">by {p.student} · {p.tech}</p>
              <p className="text-gray-400 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-gray-600 text-sm mb-4">
            Every Lumexa AI School student graduates with at least 3 projects in their portfolio.
          </p>
          <a
            href="/trial"
            className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 font-semibold transition-colors"
          >
            Start building with a free class →
          </a>
        </div>
      </div>
    </section>
  );
}
