const steps = [
  {
    step: "01",
    icon: "🎯",
    title: "Book a Free Trial",
    desc: "Pick a time that suits you and tell us about your child. You get an instant confirmation. Zero commitment, no card required.",
    accentBg: "bg-purple-50 dark:bg-purple-900/20",
    accentBorder: "border-purple-200 dark:border-purple-700/40",
    numColor: "text-purple-200 dark:text-purple-700",
  },
  {
    step: "02",
    icon: "📚",
    title: "Learn Live with Expert Teachers",
    desc: "Real-time classes in the format that suits your child: one-to-one or in a small batch. Your teacher adapts to your child's exact pace and goals.",
    accentBg: "bg-blue-50 dark:bg-blue-900/20",
    accentBorder: "border-blue-200 dark:border-blue-700/40",
    numColor: "text-blue-200 dark:text-blue-700",
  },
  {
    step: "03",
    icon: "🏆",
    title: "Build Real Projects",
    desc: "Students create a portfolio of practical projects they can show anyone: games, websites, AI apps and more, each one built step by step with their teacher.",
    accentBg: "bg-teal-50 dark:bg-teal-900/20",
    accentBorder: "border-teal-200 dark:border-teal-700/40",
    numColor: "text-teal-200 dark:text-teal-700",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 bg-white dark:bg-[#07101F] transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-teal-600 dark:text-teal-400 text-sm font-semibold uppercase tracking-widest mb-2">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] dark:text-white mb-4">
            From Zero to Builder in 3 Steps
          </h2>
          <p className="text-[#334155] dark:text-gray-400 max-w-lg mx-auto">
            No experience needed. We take care of everything: matching the
            right teacher and tracking progress every session.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px bg-gradient-to-r from-purple-200 via-blue-200 to-teal-200 dark:from-purple-700/40 dark:via-blue-700/40 dark:to-teal-700/40" />

          {steps.map((s) => (
            <div
              key={s.step}
              className={`relative p-6 rounded-2xl ${s.accentBg} border ${s.accentBorder} card-hover group`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`text-4xl font-black ${s.numColor} select-none`}>{s.step}</div>
                <div className="text-3xl group-hover:scale-110 transition-transform duration-200">{s.icon}</div>
              </div>
              <h3 className="text-[#0F172A] dark:text-white font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-[#334155] dark:text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
