import Link from "next/link";

const courses = [
  {
    emoji: "🐍",
    title: "Python Fundamentals",
    desc: "Variables, loops, functions, and projects. The perfect first language for young coders.",
    ages: "Ages 10–18",
    level: "Beginner",
    levelColor: "bg-green-900/40 text-green-400 border-green-800",
    duration: "12 sessions",
    accent: "border-yellow-700/30 hover:border-yellow-600/60",
    glow: "hover:shadow-yellow-900/20",
  },
  {
    emoji: "🤖",
    title: "AI with Python",
    desc: "Build real ML models. Understand ChatGPT, image recognition, and data science basics.",
    ages: "Ages 13–18",
    level: "Intermediate",
    levelColor: "bg-purple-900/40 text-purple-400 border-purple-800",
    duration: "16 sessions",
    accent: "border-purple-700/30 hover:border-purple-600/60",
    glow: "hover:shadow-purple-900/20",
  },
  {
    emoji: "🎮",
    title: "Roblox Game Dev",
    desc: "Design, script, and publish your own Roblox games using Lua and Roblox Studio.",
    ages: "Ages 8–14",
    level: "Beginner",
    levelColor: "bg-green-900/40 text-green-400 border-green-800",
    duration: "10 sessions",
    accent: "border-red-700/30 hover:border-red-600/60",
    glow: "hover:shadow-red-900/20",
  },
  {
    emoji: "🌐",
    title: "Web Development",
    desc: "HTML, CSS, JavaScript, and React. Build real websites you can share with the world.",
    ages: "Ages 12–18",
    level: "Beginner",
    levelColor: "bg-green-900/40 text-green-400 border-green-800",
    duration: "14 sessions",
    accent: "border-blue-700/30 hover:border-blue-600/60",
    glow: "hover:shadow-blue-900/20",
  },
  {
    emoji: "🎨",
    title: "Scratch & Animation",
    desc: "Visual coding for the youngest learners. Stories, animations, and interactive games.",
    ages: "Ages 6–10",
    level: "Starter",
    levelColor: "bg-orange-900/40 text-orange-400 border-orange-800",
    duration: "8 sessions",
    accent: "border-orange-700/30 hover:border-orange-600/60",
    glow: "hover:shadow-orange-900/20",
  },
  {
    emoji: "📊",
    title: "Data Science",
    desc: "Pandas, visualization, and storytelling with data. Perfect for analytically minded teens.",
    ages: "Ages 14–18",
    level: "Intermediate",
    levelColor: "bg-purple-900/40 text-purple-400 border-purple-800",
    duration: "14 sessions",
    accent: "border-teal-700/30 hover:border-teal-600/60",
    glow: "hover:shadow-teal-900/20",
  },
];

export default function CoursesSection() {
  return (
    <section className="py-20 bg-[#050D1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-2">
            Featured Courses
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Learn What the Future Demands
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Every course is taught live, 1-on-1 by a verified teacher — not pre-recorded videos.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c) => (
            <div
              key={c.title}
              className={`group p-5 bg-gray-900/60 rounded-2xl border ${c.accent} transition-all duration-300 shadow-lg ${c.glow} hover:-translate-y-1`}
            >
              <div className="text-3xl mb-3">{c.emoji}</div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${c.levelColor}`}>
                  {c.level}
                </span>
                <span className="text-[10px] text-gray-600">{c.ages}</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{c.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{c.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">{c.duration}</span>
                <Link
                  href="/trial"
                  className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Try for free →
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white rounded-xl text-sm transition-all"
          >
            View all courses
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
