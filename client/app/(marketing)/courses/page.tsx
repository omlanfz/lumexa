import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Courses — Lumexa Live Coding Classes for Kids",
  description:
    "Browse Python, AI, Roblox, Web Development and more. Live 1-on-1 coding classes for ages 6–18 with expert teachers.",
};

const allCourses = [
  {
    emoji: "🎨",
    title: "Scratch & Animation",
    category: "Starter",
    ages: "6–10",
    sessions: 8,
    level: "Starter",
    levelColor: "bg-orange-900/40 text-orange-400 border-orange-800",
    desc: "Visual coding for youngest learners. Stories, animations, and interactive games using Scratch.",
    skills: ["Visual programming", "Logic & sequencing", "Storytelling", "Animation basics"],
    accent: "border-orange-700/30 hover:border-orange-600/50",
  },
  {
    emoji: "🐍",
    title: "Python Fundamentals",
    category: "Beginner",
    ages: "10–18",
    sessions: 12,
    level: "Beginner",
    levelColor: "bg-green-900/40 text-green-400 border-green-800",
    desc: "The world's most popular language. Variables, loops, functions, and real mini-projects.",
    skills: ["Variables & data types", "Loops & conditionals", "Functions", "Mini projects"],
    accent: "border-yellow-700/30 hover:border-yellow-600/50",
  },
  {
    emoji: "🎮",
    title: "Roblox Game Dev",
    category: "Creative",
    ages: "8–14",
    sessions: 10,
    level: "Beginner",
    levelColor: "bg-green-900/40 text-green-400 border-green-800",
    desc: "Design, script, and publish Roblox games. Lua scripting + Roblox Studio workflow.",
    skills: ["Roblox Studio", "Lua scripting", "Game design", "Publishing"],
    accent: "border-red-700/30 hover:border-red-600/50",
  },
  {
    emoji: "🌐",
    title: "Web Development",
    category: "Builder",
    ages: "12–18",
    sessions: 14,
    level: "Beginner",
    levelColor: "bg-green-900/40 text-green-400 border-green-800",
    desc: "HTML, CSS, JavaScript, and React. Build real websites you can deploy and share.",
    skills: ["HTML & CSS", "JavaScript basics", "React intro", "Deployment"],
    accent: "border-blue-700/30 hover:border-blue-600/50",
  },
  {
    emoji: "🤖",
    title: "AI with Python",
    category: "Advanced",
    ages: "13–18",
    sessions: 16,
    level: "Intermediate",
    levelColor: "bg-purple-900/40 text-purple-400 border-purple-800",
    desc: "Build real ML models. Image recognition, NLP, and understanding how ChatGPT works.",
    skills: ["NumPy & Pandas", "Scikit-learn", "Neural networks", "Real ML projects"],
    accent: "border-purple-700/30 hover:border-purple-600/50",
  },
  {
    emoji: "📊",
    title: "Data Science",
    category: "Advanced",
    ages: "14–18",
    sessions: 14,
    level: "Intermediate",
    levelColor: "bg-purple-900/40 text-purple-400 border-purple-800",
    desc: "Pandas, Matplotlib, and storytelling with data. Build dashboards and present insights.",
    skills: ["Data cleaning", "Visualization", "Statistical analysis", "Dashboard projects"],
    accent: "border-teal-700/30 hover:border-teal-600/50",
  },
  {
    emoji: "📱",
    title: "App Development",
    category: "Builder",
    ages: "13–18",
    sessions: 16,
    level: "Intermediate",
    levelColor: "bg-purple-900/40 text-purple-400 border-purple-800",
    desc: "React Native fundamentals. Build cross-platform mobile apps for iOS and Android.",
    skills: ["React Native", "Navigation", "State management", "App Store basics"],
    accent: "border-indigo-700/30 hover:border-indigo-600/50",
  },
  {
    emoji: "🔒",
    title: "Cybersecurity Basics",
    category: "Advanced",
    ages: "14–18",
    sessions: 12,
    level: "Intermediate",
    levelColor: "bg-purple-900/40 text-purple-400 border-purple-800",
    desc: "How the internet works, ethical hacking basics, password security, and cryptography.",
    skills: ["Networking basics", "Ethical hacking intro", "Cryptography", "Safe coding"],
    accent: "border-gray-600/30 hover:border-gray-500/50",
  },
];

const categories = ["All", "Starter", "Beginner", "Intermediate", "Advanced"];

export default function CoursesPage() {
  return (
    <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="text-center mb-14">
        <p className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-2">
          Course Catalog
        </p>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">
          Every Course. Every Level.
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto text-lg">
          All classes are live, 1-on-1 with a verified expert teacher.
          No pre-recorded videos — real learning, real time.
        </p>
        <Link
          href="/trial"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/40 transition-all"
        >
          Try any course free →
        </Link>
      </div>

      {/* Filters (visual only — SSR page) */}
      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {categories.map((cat) => (
          <span
            key={cat}
            className={`px-4 py-1.5 rounded-full text-sm border cursor-pointer transition-colors ${
              cat === "All"
                ? "bg-purple-700 text-white border-purple-600"
                : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
            }`}
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Course grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {allCourses.map((c) => (
          <div
            key={c.title}
            className={`flex flex-col p-5 bg-gray-900/60 rounded-2xl border ${c.accent} transition-all duration-200 hover:-translate-y-0.5`}
          >
            <div className="text-3xl mb-3">{c.emoji}</div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${c.levelColor}`}>
                {c.level}
              </span>
              <span className="text-[10px] text-gray-600">Ages {c.ages}</span>
            </div>
            <h3 className="text-white font-bold text-base mb-2">{c.title}</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-4 flex-1">{c.desc}</p>

            <div className="space-y-1 mb-4">
              {c.skills.map((s) => (
                <div key={s} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="text-purple-600">▸</span>
                  {s}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-800">
              <span className="text-xs text-gray-600">{c.sessions} sessions</span>
              <Link
                href="/trial"
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
              >
                Try free →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
