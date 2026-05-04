import Link from "next/link";

export default function FinalCTASection() {
  return (
    <section className="py-24 bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#1E3A5F] relative overflow-hidden">
      {/* Subtle dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(circle, #a855f7 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/12 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-blue-600/10 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Live badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/40 bg-purple-800/30 text-purple-200 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Free spots available this week
        </div>

        <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-6">
          Your Child Could Be{" "}
          <span className="bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
            Building AI
          </span>{" "}
          by Next Month.
        </h2>

        <p className="text-lg text-purple-100/80 mb-10 max-w-xl mx-auto">
          Join 1,200+ families at Lumexa AI School. One free trial class, no commitment, no credit card.
          If it&apos;s not the right fit, you owe nothing.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/trial"
            className="px-8 py-4 text-base font-black bg-white hover:bg-purple-50 text-purple-700 rounded-xl shadow-xl transition-all hover:scale-[1.03] active:scale-95"
          >
            Book Your Free Trial Now
            <span className="block text-xs font-normal text-purple-500 mt-0.5">
              First class free · No credit card needed
            </span>
          </Link>
          <Link
            href="/courses"
            className="px-6 py-4 text-sm font-semibold text-purple-200 hover:text-white border border-purple-500/40 hover:border-purple-400 rounded-xl transition-all"
          >
            Explore learning paths first →
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-purple-300/70 text-xs">
          {[
            "✓ COPPA Compliant",
            "✓ Background-Checked Teachers",
            "✓ 7-day refund on unused classes",
            "✓ Cancel anytime",
          ].map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
