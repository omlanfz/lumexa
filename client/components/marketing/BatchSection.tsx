import Link from "next/link";

const batches = [
  {
    id: "clubs",
    emoji: "🏫",
    name: "AI Creator Clubs",
    subtitle: "Group Learning",
    groupSize: "8–15 students",
    duration: "60 min / class",
    tag: "Best Entry Point",
    tagColor: "bg-blue-900/40 text-blue-300 border border-blue-800/40",
    cardBorder: "border-blue-700/30 hover:border-blue-500/40",
    accent: "from-blue-600 to-cyan-600",
    accentText: "text-blue-400",
    glow: "bg-blue-700/5",
    tagline: "Discover What Your Child Loves",
    positioning:
      "The perfect low-pressure start. Your child explores real coding in a fun, social environment with peers — building confidence and discovering their passion before committing to deeper learning.",
    parentBenefit:
      "Low risk, maximum exposure. See if they love it before investing more. 70% of Creator Club students upgrade within 2 months.",
    priceLabel: "Most Affordable",
    funnelStep: "STEP 1",
    funnelColor: "text-blue-500",
    cta: "Try a Club Class Free",
  },
  {
    id: "pods",
    emoji: "🎯",
    name: "Pro Builder Pods",
    subtitle: "Small Group Learning",
    groupSize: "3–5 students",
    duration: "60 min / class",
    tag: "Best Value",
    tagColor: "bg-purple-900/40 text-purple-300 border border-purple-700/40",
    cardBorder: "border-purple-600/50 hover:border-purple-400/60",
    accent: "from-purple-600 to-blue-600",
    accentText: "text-purple-400",
    glow: "bg-purple-700/8",
    tagline: "Build Real Skills With Peer Energy",
    positioning:
      "The sweet spot between personal attention and collaborative learning. Small enough that your teacher knows exactly where your child is. Large enough for pair-programming, peer review, and team challenges.",
    parentBenefit:
      "3× more teacher attention than group classes. ~40% less cost than 1-on-1. Your child learns to collaborate — the skill every employer looks for first.",
    priceLabel: "Mid-Range",
    funnelStep: "STEP 2",
    funnelColor: "text-purple-500",
    cta: "Try a Pod Class Free",
    featured: true,
  },
  {
    id: "mentorship",
    emoji: "🚀",
    name: "Private AI Mentorship",
    subtitle: "1-on-1 Learning",
    groupSize: "1 student",
    duration: "45 min / class",
    tag: "Fastest Progress",
    tagColor: "bg-green-900/40 text-green-300 border border-green-800/40",
    cardBorder: "border-green-700/30 hover:border-green-500/40",
    accent: "from-green-600 to-emerald-600",
    accentText: "text-green-400",
    glow: "bg-green-700/5",
    tagline: "Maximum Depth, Maximum Speed",
    positioning:
      "100% of the teacher's focus is on your child. Every session is customised to their exact pace, learning style, and goals. No adapting to others. No waiting. Just focused, measurable progress.",
    parentBenefit:
      "Personalised curriculum. Fastest path from beginner to builder. Parents who choose this see portfolio-ready projects in half the time of group formats.",
    priceLabel: "Premium",
    funnelStep: "STEP 3",
    funnelColor: "text-green-500",
    cta: "Try a Private Class Free",
  },
];

export default function BatchSection() {
  return (
    <section className="py-20 bg-[#07101F]" id="formats">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-purple-400 text-sm font-bold uppercase tracking-widest mb-3">
            3 Learning Formats
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
            Every Child Learns Differently.{" "}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              We Meet Them Where They Are.
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Choose the format that fits your child&apos;s learning style and your
            budget. Switch formats anytime — your class credits always carry over.
          </p>
        </div>

        {/* Funnel path indicator */}
        <div className="hidden lg:flex items-center justify-center gap-3 mb-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Explore</span>
          </div>
          <div className="flex-1 max-w-16 h-px bg-gradient-to-r from-blue-600 to-purple-600 opacity-40" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Build Skills</span>
          </div>
          <div className="flex-1 max-w-16 h-px bg-gradient-to-r from-purple-600 to-green-600 opacity-40" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Accelerate</span>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {batches.map((b) => (
            <div
              key={b.id}
              className={`relative flex flex-col p-6 rounded-2xl bg-gray-900/60 border ${b.cardBorder} transition-all duration-300 group ${
                b.featured
                  ? "ring-1 ring-purple-500/30 shadow-2xl shadow-purple-900/20 md:scale-[1.03]"
                  : ""
              }`}
            >
              {/* Glow */}
              <div className={`absolute inset-0 rounded-2xl ${b.glow} opacity-0 group-hover:opacity-100 transition-opacity`} />

              {b.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-lg">
                  ⭐ Most Recommended
                </div>
              )}

              {/* Tag + funnel step */}
              <div className="relative flex items-center justify-between mb-5">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${b.tagColor}`}>
                  {b.tag}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${b.funnelColor}`}>
                  {b.funnelStep}
                </span>
              </div>

              {/* Header */}
              <div className="relative mb-4">
                <div className="text-4xl mb-2">{b.emoji}</div>
                <h3 className="text-white font-black text-xl mb-0.5">{b.name}</h3>
                <p className="text-gray-500 text-xs">{b.subtitle}</p>
              </div>

              {/* Stats */}
              <div className="relative flex gap-3 mb-4">
                <div className="flex-1 px-3 py-2.5 bg-gray-800/70 rounded-xl text-center">
                  <p className={`text-xs font-black ${b.accentText}`}>{b.groupSize}</p>
                  <p className="text-gray-600 text-[10px] mt-0.5">group size</p>
                </div>
                <div className="flex-1 px-3 py-2.5 bg-gray-800/70 rounded-xl text-center">
                  <p className={`text-xs font-black ${b.accentText}`}>{b.duration}</p>
                  <p className="text-gray-600 text-[10px] mt-0.5">per session</p>
                </div>
              </div>

              {/* Tagline */}
              <div
                className={`relative text-sm font-bold bg-gradient-to-r ${b.accent} bg-clip-text text-transparent mb-3`}
              >
                {b.tagline}
              </div>

              {/* Description */}
              <p className="relative text-gray-400 text-sm leading-relaxed mb-4 flex-1">
                {b.positioning}
              </p>

              {/* Parent insight */}
              <div className="relative p-3 rounded-xl bg-gray-800/50 border border-gray-700/50 mb-5">
                <p className="text-gray-300 text-xs leading-relaxed">
                  <span className="font-bold text-white">For parents: </span>
                  {b.parentBenefit}
                </p>
              </div>

              {/* Price tier */}
              <div className="relative flex items-center justify-between mb-5">
                <span className="text-gray-600 text-xs">Price tier</span>
                <span className={`text-xs font-bold ${b.accentText}`}>{b.priceLabel}</span>
              </div>

              {/* CTA */}
              <Link
                href="/trial"
                className={`relative w-full py-3 text-center text-sm font-bold text-white rounded-xl bg-gradient-to-r ${b.accent} hover:opacity-90 transition-all shadow-lg`}
              >
                {b.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div className="max-w-3xl mx-auto p-5 bg-gray-900/40 border border-gray-800 rounded-2xl text-center">
          <p className="text-gray-400 text-sm leading-relaxed">
            <span className="text-white font-semibold">No lock-in, ever. </span>
            Start with Creator Clubs to explore. Graduate to Builder Pods when ready to build real skills.
            Unlock Private Mentorship to accelerate. Your class credits work across{" "}
            <span className="text-purple-400 font-semibold">all formats and all pathways</span>.
          </p>
        </div>
      </div>
    </section>
  );
}
