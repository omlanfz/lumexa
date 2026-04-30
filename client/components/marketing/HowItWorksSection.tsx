import Link from "next/link";

const steps = [
  {
    step: "01",
    icon: "🎯",
    title: "Book a Free Trial",
    desc: "Pick a subject and time. We match your child with the perfect teacher. Zero commitment.",
    color: "text-purple-400",
    border: "border-purple-700/40",
    bg: "bg-purple-900/10",
  },
  {
    step: "02",
    icon: "📚",
    title: "Learn Live, 1-on-1",
    desc: "Real-time classes with a dedicated teacher who adapts to your child's pace and learning style.",
    color: "text-blue-400",
    border: "border-blue-700/40",
    bg: "bg-blue-900/10",
  },
  {
    step: "03",
    icon: "🏆",
    title: "Build Real Projects",
    desc: "Students finish each course with a portfolio-ready project: a game, website, or AI model.",
    color: "text-teal-400",
    border: "border-teal-700/40",
    bg: "bg-teal-900/10",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-20 bg-[#080F20]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-teal-400 text-sm font-semibold uppercase tracking-widest mb-2">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            From Zero to Builder in 3 Steps
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            No experience needed. We take care of everything, from matching
            the right teacher to tracking progress.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px bg-gradient-to-r from-purple-700/30 via-blue-700/30 to-teal-700/30" />

          {steps.map((s, i) => (
            <div key={i} className={`relative p-6 rounded-2xl ${s.bg} border ${s.border}`}>
              <div className="flex items-start gap-4 mb-4">
                <div className={`text-4xl font-black ${s.color} opacity-20 select-none`}>
                  {s.step}
                </div>
                <div className="text-3xl">{s.icon}</div>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/trial"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/40 transition-all hover:scale-[1.02] active:scale-95"
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
