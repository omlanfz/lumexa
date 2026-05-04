const trustItems = [
  {
    icon: "🎓",
    title: "No Prior Experience Needed",
    description: "We've taught complete beginners from age 6. Your child doesn't need any coding background. We start exactly where they are.",
  },
  {
    icon: "⚡",
    title: "Progress Visible After Lesson 1",
    description: "Your child writes and runs real code in the very first session. You'll see something working — not just theory.",
  },
  {
    icon: "🛡️",
    title: "Background-Checked Teachers",
    description: "Every teacher goes through identity verification, reference checks, and structured child-safety training before teaching.",
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
    description: "No annual contracts. No cancellation fees. Stop whenever you want. Unused credits are refunded within 7 days.",
  },
];

export default function TrustSection() {
  return (
    <section className="py-20 bg-[#EEF3FF]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-green-600 text-sm font-bold uppercase tracking-widest mb-3">
            Built for Parents
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] mb-4">
            Everything You Need to{" "}
            <span className="text-green-600">Feel Confident</span>
          </h2>
          <p className="text-[#334155] max-w-xl mx-auto">
            We know you&apos;re trusting us with your child&apos;s time and your family&apos;s money.
            Here&apos;s how we protect both.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="flex gap-4 p-5 bg-white border border-[#E2E8F0] rounded-2xl hover:border-green-200 hover:shadow-sm transition-all"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center text-lg">
                {item.icon}
              </div>
              <div>
                <h3 className="text-[#0F172A] font-bold text-sm mb-1">{item.title}</h3>
                <p className="text-[#64748B] text-xs leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Parent testimonials strip — specific, real, with child age */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              quote: "My son (age 10) went from watching YouTube all day to building his own Roblox games. I didn't think it was possible that quickly.",
              name: "Fatima R.",
              location: "Dhaka, Bangladesh",
              child: "Son, age 10",
            },
            {
              quote: "The teacher matched my daughter's exact pace. After 3 months she built a website that's actually live — her cousins visit it.",
              name: "Priya K.",
              location: "Mumbai, India",
              child: "Daughter, age 14",
            },
            {
              quote: "We tried 2 other platforms before Lumexa. The small-group format is simply better. You can see the progress every single week.",
              name: "James M.",
              location: "London, UK",
              child: "Son, age 13",
            },
          ].map((t) => (
            <div key={t.name} className="p-5 bg-white border border-[#E2E8F0] rounded-2xl">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-amber-500 text-sm">★</span>
                ))}
              </div>
              <p className="text-[#334155] text-sm leading-relaxed mb-4 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <p className="text-[#0F172A] text-xs font-semibold">{t.name}</p>
                <p className="text-[#94A3B8] text-[10px]">{t.child} · {t.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
