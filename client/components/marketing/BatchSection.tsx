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
    tagBg: "bg-blue-50 text-blue-700 border border-blue-200",
    cardBg: "bg-white",
    cardBorder: "border-blue-200 hover:border-blue-300",
    accent: "from-blue-600 to-cyan-600",
    accentText: "text-blue-600",
    statBg: "bg-[#F0F4FF]",
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
    tagBg: "bg-purple-50 text-purple-700 border border-purple-200",
    cardBg: "bg-white",
    cardBorder: "border-purple-300 hover:border-purple-400",
    accent: "from-purple-600 to-blue-600",
    accentText: "text-purple-600",
    statBg: "bg-purple-50",
    tagline: "Build Real Skills With Peer Energy",
    positioning:
      "The sweet spot between personal attention and collaborative learning. Small enough that your teacher knows exactly where your child is. Large enough for pair-programming and team challenges.",
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
    tagBg: "bg-green-50 text-green-700 border border-green-200",
    cardBg: "bg-white",
    cardBorder: "border-green-200 hover:border-green-300",
    accent: "from-green-600 to-emerald-600",
    accentText: "text-green-600",
    statBg: "bg-green-50",
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
    <section className="py-20 bg-[#EEF3FF]" id="formats">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-purple-600 text-sm font-bold uppercase tracking-widest mb-3">
            3 Learning Formats
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] mb-4 leading-tight">
            Every Child Learns Differently.{" "}
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              We Meet Them Where They Are.
            </span>
          </h2>
          <p className="text-[#334155] max-w-2xl mx-auto text-lg">
            Choose the format that fits your child&apos;s learning style and your
            budget. Switch formats anytime — your class credits always carry over.
          </p>
        </div>

        {/* Funnel path indicator */}
        <div className="hidden lg:flex items-center justify-center gap-3 mb-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Explore</span>
          </div>
          <div className="flex-1 max-w-16 h-px bg-gradient-to-r from-blue-300 to-purple-300" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Build Skills</span>
          </div>
          <div className="flex-1 max-w-16 h-px bg-gradient-to-r from-purple-300 to-green-300" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Accelerate</span>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {batches.map((b) => (
            <div
              key={b.id}
              className={`relative flex flex-col p-6 rounded-2xl ${b.cardBg} border ${b.cardBorder} transition-all duration-300 hover:shadow-md hover:shadow-slate-100 ${
                b.featured
                  ? "ring-2 ring-purple-200 shadow-md shadow-purple-50 md:scale-[1.03]"
                  : ""
              }`}
            >
              {b.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-md">
                  ⭐ Most Recommended
                </div>
              )}

              {/* Tag + funnel step */}
              <div className="flex items-center justify-between mb-5">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${b.tagBg}`}>
                  {b.tag}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${b.funnelColor}`}>
                  {b.funnelStep}
                </span>
              </div>

              {/* Header */}
              <div className="mb-4">
                <div className="text-4xl mb-2">{b.emoji}</div>
                <h3 className="text-[#0F172A] font-black text-xl mb-0.5">{b.name}</h3>
                <p className="text-[#64748B] text-xs">{b.subtitle}</p>
              </div>

              {/* Stats */}
              <div className="flex gap-3 mb-4">
                <div className={`flex-1 px-3 py-2.5 ${b.statBg} rounded-xl text-center border border-[#E2E8F0]`}>
                  <p className={`text-xs font-black ${b.accentText}`}>{b.groupSize}</p>
                  <p className="text-[#94A3B8] text-[10px] mt-0.5">group size</p>
                </div>
                <div className={`flex-1 px-3 py-2.5 ${b.statBg} rounded-xl text-center border border-[#E2E8F0]`}>
                  <p className={`text-xs font-black ${b.accentText}`}>{b.duration}</p>
                  <p className="text-[#94A3B8] text-[10px] mt-0.5">per session</p>
                </div>
              </div>

              {/* Tagline */}
              <div className={`text-sm font-bold bg-gradient-to-r ${b.accent} bg-clip-text text-transparent mb-3`}>
                {b.tagline}
              </div>

              {/* Description */}
              <p className="text-[#334155] text-sm leading-relaxed mb-4 flex-1">
                {b.positioning}
              </p>

              {/* Parent insight */}
              <div className="p-3 rounded-xl bg-[#F7F9FF] border border-[#E2E8F0] mb-5">
                <p className="text-[#334155] text-xs leading-relaxed">
                  <span className="font-bold text-[#0F172A]">For parents: </span>
                  {b.parentBenefit}
                </p>
              </div>

              {/* Price tier */}
              <div className="flex items-center justify-between mb-5">
                <span className="text-[#94A3B8] text-xs">Price tier</span>
                <span className={`text-xs font-bold ${b.accentText}`}>{b.priceLabel}</span>
              </div>

              {/* CTA */}
              <Link
                href="/trial"
                className={`w-full py-3 text-center text-sm font-bold text-white rounded-xl bg-gradient-to-r ${b.accent} hover:opacity-90 transition-all shadow-sm`}
              >
                {b.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div className="max-w-3xl mx-auto p-5 bg-white border border-[#E2E8F0] rounded-2xl text-center">
          <p className="text-[#334155] text-sm leading-relaxed">
            <span className="text-[#0F172A] font-semibold">No lock-in, ever. </span>
            Start with Creator Clubs to explore. Graduate to Builder Pods when ready to build real skills.
            Unlock Private Mentorship to accelerate. Your class credits work across{" "}
            <span className="text-purple-600 font-semibold">all formats and all pathways</span>.
          </p>
        </div>
      </div>
    </section>
  );
}
