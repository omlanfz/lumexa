import Link from "next/link";

const outcomes = [
  {
    before: "Plays games",
    after: "Builds games",
    emoji: "🎮",
    description: "Your child goes from Minecraft player to Roblox game creator, shipping multiplayer worlds their friends actually play.",
    color: "text-red-400",
    bg: "bg-red-900/10",
    border: "border-red-700/20",
  },
  {
    before: "Uses AI apps",
    after: "Builds AI apps",
    emoji: "🤖",
    description: "Instead of being amazed by ChatGPT, your child builds their own chatbot, emotion detector, or image classifier from scratch.",
    color: "text-purple-400",
    bg: "bg-purple-900/10",
    border: "border-purple-700/20",
    featured: true,
  },
  {
    before: "Browses websites",
    after: "Launches websites",
    emoji: "🌐",
    description: "Your child builds and deploys their own live website: a portfolio, a store, or a web app, visible to the whole world.",
    color: "text-blue-400",
    bg: "bg-blue-900/10",
    border: "border-blue-700/20",
  },
  {
    before: "Reads the news",
    after: "Analyzes data",
    emoji: "📊",
    description: "Your child learns to find patterns in real-world data and presents insights that sound like a college thesis, at age 15.",
    color: "text-teal-400",
    bg: "bg-teal-900/10",
    border: "border-teal-700/20",
  },
  {
    before: "Avoids problems",
    after: "Solves problems",
    emoji: "🧠",
    description: "Coding rewires how kids think. Your child will approach any problem with structured, logical thinking: in school, at home, and in life.",
    color: "text-yellow-400",
    bg: "bg-yellow-900/10",
    border: "border-yellow-700/20",
  },
  {
    before: "Follows instructions",
    after: "Gives instructions to computers",
    emoji: "⚡",
    description: "Your child learns that they can automate, create, and invent, not just consume. That mindset shift changes everything.",
    color: "text-green-400",
    bg: "bg-green-900/10",
    border: "border-green-700/20",
  },
];

export default function OutcomesSection() {
  return (
    <section className="py-20 bg-[#07101F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-orange-400 text-sm font-bold uppercase tracking-widest mb-3">
            What Your Child Will Become
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
            Not Features.{" "}
            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              Transformations.
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Every child who finishes a Lumexa AI School course doesn't just know more. They become someone different.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {outcomes.map((o) => (
            <div
              key={o.after}
              className={`relative p-6 rounded-2xl border ${o.border} ${o.bg} transition-all duration-300 group hover:scale-[1.01] ${
                o.featured ? "ring-1 ring-purple-500/20" : ""
              }`}
            >
              <div className="text-3xl mb-4">{o.emoji}</div>

              {/* Before → After */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-600 text-sm line-through">{o.before}</span>
                <span className="text-gray-600 text-xs">→</span>
                <span className={`text-sm font-black ${o.color}`}>{o.after}</span>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed">{o.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex flex-col sm:flex-row gap-4 items-center">
            <Link
              href="/trial"
              className="px-8 py-4 font-black text-base text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl shadow-xl shadow-purple-900/40 transition-all hover:scale-[1.02]"
            >
              Start the Free Transformation
            </Link>
            <p className="text-gray-600 text-sm">First class 100% free. No card required.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
