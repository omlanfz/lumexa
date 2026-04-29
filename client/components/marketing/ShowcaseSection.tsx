const projects = [
  {
    emoji: "🎮",
    title: "Galactic Shooter",
    student: "Rafi, age 12",
    tech: "Roblox · Lua",
    desc: "A full multiplayer space shooter with leaderboards, built in 10 sessions.",
    color: "border-red-700/30",
    tag: "Game",
    tagColor: "bg-red-900/40 text-red-400 border-red-800",
  },
  {
    emoji: "🌐",
    title: "Portfolio Website",
    student: "Priya, age 15",
    tech: "HTML · CSS · JavaScript",
    desc: "A responsive portfolio showcasing her art — deployed live on Vercel.",
    color: "border-blue-700/30",
    tag: "Website",
    tagColor: "bg-blue-900/40 text-blue-400 border-blue-800",
  },
  {
    emoji: "🤖",
    title: "Mood Detector AI",
    student: "Tanvir, age 16",
    tech: "Python · TensorFlow",
    desc: "A computer vision model that detects emotions from webcam in real time.",
    color: "border-purple-700/30",
    tag: "AI Project",
    tagColor: "bg-purple-900/40 text-purple-400 border-purple-800",
  },
  {
    emoji: "📊",
    title: "COVID Data Visualizer",
    student: "Emma, age 17",
    tech: "Python · Pandas · Plotly",
    desc: "An interactive dashboard analyzing global COVID trends — used in her school presentation.",
    color: "border-teal-700/30",
    tag: "Data Science",
    tagColor: "bg-teal-900/40 text-teal-400 border-teal-800",
  },
  {
    emoji: "🦁",
    title: "Safari Adventure",
    student: "Lucas, age 9",
    tech: "Scratch",
    desc: "An animated interactive story about a lion's journey. 40+ sprites, 3 levels.",
    color: "border-orange-700/30",
    tag: "Animation",
    tagColor: "bg-orange-900/40 text-orange-400 border-orange-800",
  },
  {
    emoji: "🛒",
    title: "E-Commerce Store",
    student: "Nadia, age 16",
    tech: "React · Next.js",
    desc: "A fully functional online store with cart, checkout, and product management.",
    color: "border-green-700/30",
    tag: "Full-Stack",
    tagColor: "bg-green-900/40 text-green-400 border-green-800",
  },
];

export default function ShowcaseSection() {
  return (
    <section className="py-20 bg-[#050D1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-2">
            Student Projects
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Real Projects by Real Kids
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Our students don't just learn theory — they ship real software.
            Here's what some of our learners built during their courses.
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
          <p className="text-gray-600 text-sm">
            Every Lumexa student graduates with at least one project in their portfolio.
          </p>
        </div>
      </div>
    </section>
  );
}
