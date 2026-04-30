const trustItems = [
  {
    icon: "🎓",
    title: "No Prior Experience Needed",
    description: "We've taught complete beginners from age 6. Your child doesn't need any coding background. We start exactly where they are.",
  },
  {
    icon: "⚡",
    title: "Progress Visible After Lesson 1",
    description: "Your child writes and runs real code in the very first session. You'll see something working, not just theory.",
  },
  {
    icon: "🛡️",
    title: "Background-Checked Teachers",
    description: "Every teacher goes through identity verification, reference checks, and a structured child-safety training before teaching.",
  },
  {
    icon: "📹",
    title: "Class Recordings Available",
    description: "Every live session is recorded. Your child can rewatch any lesson, and you can review what was taught.",
  },
  {
    icon: "🔒",
    title: "COPPA Compliant",
    description: "We store minimal data on children (first name + age only). Full parental consent is required before any child data is collected.",
  },
  {
    icon: "↩️",
    title: "Cancel Anytime",
    description: "No annual contracts. No cancellation fees. Stop whenever you want. Unused gems are refunded within 7 days.",
  },
];

export default function TrustSection() {
  return (
    <section className="py-20 bg-[#050D1A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-green-400 text-sm font-bold uppercase tracking-widest mb-3">
            Built for Parents
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Everything You Need to{" "}
            <span className="text-green-400">Feel Confident</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            We know you're trusting us with your child's time and your family's money. Here's how we protect both.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="flex gap-4 p-5 bg-gray-900/40 border border-gray-800 rounded-2xl hover:border-green-900/40 transition-all"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-green-900/20 border border-green-800/30 flex items-center justify-center text-lg">
                {item.icon}
              </div>
              <div>
                <h3 className="text-white font-bold text-sm mb-1">{item.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Parent testimonials strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              quote: "My son went from watching YouTube all day to building his own games. I didn't think it was possible at 10.",
              name: "Fatima R.",
              location: "Dhaka, Bangladesh",
              child: "Son, age 10",
            },
            {
              quote: "The teacher matched my daughter's exact learning pace. After 3 months she built a website that's actually live.",
              name: "Priya K.",
              location: "Mumbai, India",
              child: "Daughter, age 14",
            },
            {
              quote: "We tried 2 other platforms before Lumexa. The 1-on-1 format is simply better. You can see the progress every single week.",
              name: "James M.",
              location: "London, UK",
              child: "Son, age 13",
            },
          ].map((t) => (
            <div key={t.name} className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
              <div className="flex gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xs">★</span>
                ))}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-4 italic">"{t.quote}"</p>
              <div>
                <p className="text-white text-xs font-semibold">{t.name}</p>
                <p className="text-gray-600 text-[10px]">{t.child} · {t.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
