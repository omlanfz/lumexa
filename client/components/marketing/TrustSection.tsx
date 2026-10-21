const pillars = [
  {
    icon: "🎓",
    title: "Teaching Quality",
    description:
      "Every teacher is background-checked and properly trained, with the qualifications to teach their program with confidence. Teachers adapt each lesson to your child's learning pace, so your child always feels supported, understood and never rushed.",
  },
  {
    icon: "⚡",
    title: "Visible Progress",
    description:
      "No experience needed: we start where your child is. After each class you get learning materials and access to the related Lumexa projects and assets. After every project milestone, your child presents their work to the class, building public speaking skills.",
  },
  {
    icon: "📹",
    title: "Recordings & Reports",
    description:
      "Every lesson is recorded, so your child can rewatch and revise even after the class ends. You also receive regular progress reports, so you can stay updated on your child's learning journey and see how they are growing.",
  },
  {
    icon: "🔒",
    title: "Safety & Support",
    description:
      "We follow COPPA standards and only collect a child's first name and age, with parental consent. You stay informed, and you can contact your child's dedicated teacher or the Lumexa support team directly with any learning or practical question.",
  },
];

// Sample testimonials: replace with real parent quotes (with permission) when available.
const testimonials = [
  {
    quote:
      "My son used to spend his evenings on YouTube. Now he shows me the little games he builds himself. The teacher is patient and explains everything in a simple way.",
    name: "Farzana A.",
    detail: "Parent of a 10-year-old",
    location: "Dhaka, Bangladesh",
  },
  {
    quote:
      "I like that I can see what my daughter is learning. After every class we get the materials, and the progress report helps me understand where she is.",
    name: "Mahbub H.",
    detail: "Parent of a 13-year-old",
    location: "Chattogram, Bangladesh",
  },
  {
    quote:
      "We tried a couple of other online courses before this one. Lumexa feels different: a teacher who knows my son by name, and he actually finishes his projects.",
    name: "Daniel M.",
    detail: "Parent of a 12-year-old",
    location: "Manchester, UK",
  },
];

export default function TrustSection() {
  return (
    <section id="parents" className="scroll-mt-20 py-20 bg-[#EEF3FF] dark:bg-[#07101F] transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-green-600 dark:text-green-400 text-sm font-bold uppercase tracking-widest mb-3">
            Built for Parents
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] dark:text-white mb-4">
            Everything You Need to{" "}
            <span className="text-green-600 dark:text-green-400">Feel Confident</span>
          </h2>
          <p className="text-[#334155] dark:text-gray-400 max-w-xl mx-auto">
            We know you&apos;re trusting us with your child&apos;s time and learning. Here&apos;s how we make that easy
            to trust.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-12">
          {pillars.map((item) => (
            <div
              key={item.title}
              className="flex flex-col p-5 bg-white dark:bg-gray-900/50 border border-[#E2E8F0] dark:border-gray-700/60 rounded-2xl hover:border-green-200 dark:hover:border-green-700/50 hover:shadow-sm transition-all group"
            >
              <div className="w-11 h-11 mb-3 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700/40 flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-200">
                {item.icon}
              </div>
              <h3 className="text-[#0F172A] dark:text-white font-bold mb-1.5">{item.title}</h3>
              <p className="text-[#64748B] dark:text-gray-400 text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs font-bold uppercase tracking-widest text-[#94A3B8] dark:text-gray-500 mb-4">
          What parents say
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col p-5 bg-white dark:bg-gray-900/50 border border-[#E2E8F0] dark:border-gray-700/60 rounded-2xl hover:shadow-sm transition-all"
            >
              <blockquote className="text-[#334155] dark:text-gray-300 text-sm leading-relaxed mb-4">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-auto">
                <p className="text-[#0F172A] dark:text-white text-xs font-semibold">{t.name}</p>
                <p className="text-[#94A3B8] dark:text-gray-500 text-[11px]">
                  {t.detail} · {t.location}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
