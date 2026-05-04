import Link from "next/link";

const outcomes = [
  {
    before: "Plays games",
    after: "Builds games",
    emoji: "🎮",
    description: "Your child goes from Minecraft player to Roblox game creator, shipping multiplayer worlds their friends actually play.",
    bg: "bg-red-50",
    border: "border-red-200",
    afterColor: "text-red-700",
    featured: false,
  },
  {
    before: "Uses AI apps",
    after: "Builds AI apps",
    emoji: "🤖",
    description: "Instead of being amazed by ChatGPT, your child builds their own chatbot, emotion detector, or image classifier from scratch.",
    bg: "bg-purple-50",
    border: "border-purple-200",
    afterColor: "text-purple-700",
    featured: true,
  },
  {
    before: "Browses websites",
    after: "Launches websites",
    emoji: "🌐",
    description: "Your child builds and deploys their own live website: a portfolio, a store, or a web app — visible to the whole world.",
    bg: "bg-blue-50",
    border: "border-blue-200",
    afterColor: "text-blue-700",
    featured: false,
  },
  {
    before: "Reads the news",
    after: "Analyses data",
    emoji: "📊",
    description: "Your child learns to find patterns in real-world data and presents insights that sound like a college thesis — at age 15.",
    bg: "bg-teal-50",
    border: "border-teal-200",
    afterColor: "text-teal-700",
    featured: false,
  },
  {
    before: "Avoids problems",
    after: "Solves problems",
    emoji: "🧠",
    description: "Coding rewires how kids think. Your child will approach any problem with structured, logical thinking: in school, at home, and in life.",
    bg: "bg-amber-50",
    border: "border-amber-200",
    afterColor: "text-amber-700",
    featured: false,
  },
  {
    before: "Follows instructions",
    after: "Gives instructions to computers",
    emoji: "⚡",
    description: "Your child learns that they can automate, create, and invent — not just consume. That mindset shift changes everything.",
    bg: "bg-green-50",
    border: "border-green-200",
    afterColor: "text-green-700",
    featured: false,
  },
];

export default function OutcomesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-orange-600 text-sm font-bold uppercase tracking-widest mb-3">
            What Your Child Will Become
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] mb-4 leading-tight">
            Not Features.{" "}
            <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              Transformations.
            </span>
          </h2>
          <p className="text-[#334155] max-w-2xl mx-auto text-lg">
            Every child who finishes a Lumexa AI School course doesn&apos;t just know more. They become someone different.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {outcomes.map((o) => (
            <div
              key={o.after}
              className={`relative p-6 rounded-2xl border ${o.border} ${o.bg} transition-all duration-300 hover:shadow-sm hover:scale-[1.01] ${
                o.featured ? "ring-2 ring-purple-200" : ""
              }`}
            >
              <div className="text-3xl mb-4">{o.emoji}</div>

              {/* Before → After */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[#94A3B8] text-sm line-through">{o.before}</span>
                <span className="text-[#CBD5E1] text-xs">→</span>
                <span className={`text-sm font-black ${o.afterColor}`}>{o.after}</span>
              </div>

              <p className="text-[#334155] text-sm leading-relaxed">{o.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex flex-col sm:flex-row gap-4 items-center">
            <Link
              href="/trial"
              className="px-8 py-4 font-black text-base text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl shadow-lg shadow-purple-100 transition-all hover:scale-[1.02]"
            >
              Start the Free Transformation
            </Link>
            <p className="text-[#64748B] text-sm">First class 100% free. No card required.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
