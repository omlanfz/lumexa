import Link from "next/link";

const steps = [
  {
    step: "01",
    icon: "🎯",
    title: "Book a Free Trial",
    desc: "Pick a subject and a time. We match your child with the perfect teacher. Zero commitment, no card required.",
    accentBg: "bg-purple-50",
    accentBorder: "border-purple-200",
    accentText: "text-purple-600",
    numColor: "text-purple-200",
  },
  {
    step: "02",
    icon: "📚",
    title: "Learn Live with Expert Teachers",
    desc: "Real-time classes in your preferred format: batch, small-group, or 1-on-1. Your teacher adapts to your child's exact pace and goals.",
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-200",
    accentText: "text-blue-600",
    numColor: "text-blue-200",
  },
  {
    step: "03",
    icon: "🏆",
    title: "Build Real Projects",
    desc: "Students finish each course with a portfolio-ready project: a game, website, or AI model they can show anyone.",
    accentBg: "bg-teal-50",
    accentBorder: "border-teal-200",
    accentText: "text-teal-600",
    numColor: "text-teal-200",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-teal-600 text-sm font-semibold uppercase tracking-widest mb-2">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] mb-4">
            From Zero to Builder in 3 Steps
          </h2>
          <p className="text-[#334155] max-w-lg mx-auto">
            No experience needed. We take care of everything — from matching the
            right teacher to tracking progress every session.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px bg-gradient-to-r from-purple-200 via-blue-200 to-teal-200" />

          {steps.map((s, i) => (
            <div
              key={i}
              className={`relative p-6 rounded-2xl ${s.accentBg} border ${s.accentBorder}`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`text-4xl font-black ${s.numColor} select-none`}>{s.step}</div>
                <div className="text-3xl">{s.icon}</div>
              </div>
              <h3 className="text-[#0F172A] font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-[#334155] text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/trial"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-purple-100 transition-all hover:scale-[1.02] active:scale-95"
          >
            Start with a Free Trial
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
