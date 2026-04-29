import Link from "next/link";

const tracks = [
  {
    id: "kids",
    emoji: "⭐",
    name: "Little Coders",
    tagline: "Star Cadets",
    ages: "Ages 6–10",
    description:
      "Visual coding, Scratch animations, and logic games. Build a love of technology through play.",
    color: "from-blue-600/20 to-blue-900/10",
    border: "border-blue-700/30 hover:border-blue-500/50",
    badge: "bg-blue-900/50 text-blue-300 border-blue-700",
    accent: "text-blue-400",
    courses: ["Scratch Basics", "Animation World", "Code Stories", "Math Games"],
  },
  {
    id: "explorers",
    emoji: "🚀",
    name: "Explorers",
    tagline: "Junior Pilots",
    ages: "Ages 11–14",
    description:
      "Python, web development, and game creation. Turn ideas into real software that actually works.",
    color: "from-purple-600/20 to-purple-900/10",
    border: "border-purple-700/30 hover:border-purple-500/60",
    badge: "bg-purple-900/50 text-purple-300 border-purple-700",
    accent: "text-purple-400",
    courses: ["Python Fundamentals", "Roblox Dev", "Web Design", "App Builder"],
    featured: true,
  },
  {
    id: "ai-pro",
    emoji: "🧠",
    name: "AI Innovators",
    tagline: "Ace Pilots",
    ages: "Ages 15–18",
    description:
      "Machine learning, data science, and AI engineering. Build the future — literally.",
    color: "from-teal-600/20 to-teal-900/10",
    border: "border-teal-700/30 hover:border-teal-500/50",
    badge: "bg-teal-900/50 text-teal-300 border-teal-700",
    accent: "text-teal-400",
    courses: ["AI with Python", "Data Science", "ML Projects", "Neural Networks"],
  },
];

export default function TracksSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-[#050D1A] to-[#080F20]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-2">
            Learning Tracks
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            A Path for Every Learner
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            No matter the age or skill level, we have a structured track designed to take your child from zero to builder.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tracks.map((track) => (
            <div
              key={track.id}
              className={`relative p-6 rounded-2xl bg-gradient-to-br ${track.color} border ${track.border} transition-all duration-300 ${track.featured ? "ring-1 ring-purple-500/30 shadow-xl shadow-purple-900/20" : ""}`}
            >
              {track.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 rounded-full text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
                  Most Popular
                </div>
              )}

              <div className="text-3xl mb-3">{track.emoji}</div>
              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border mb-3 ${track.badge}`}>
                {track.ages} · {track.tagline}
              </span>
              <h3 className={`text-xl font-black mb-2 ${track.accent}`}>{track.name}</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">{track.description}</p>

              <div className="space-y-1.5 mb-6">
                {track.courses.map((c) => (
                  <div key={c} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className={`text-xs ${track.accent}`}>▸</span>
                    {c}
                  </div>
                ))}
              </div>

              <Link
                href="/trial"
                className={`block w-full py-2.5 text-center text-sm font-semibold rounded-lg border ${track.badge} hover:opacity-90 transition-opacity`}
              >
                Start This Track
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
