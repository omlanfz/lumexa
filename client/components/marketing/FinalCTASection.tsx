import Link from "next/link";

export default function FinalCTASection() {
  return (
    <section className="py-24 bg-gradient-to-b from-[#080F20] to-[#050D1A] relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-700/8 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-blue-700/6 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-700/40 bg-purple-900/20 text-purple-300 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Free spots available this week
        </div>

        <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-6">
          Your Child Could Be{" "}
          <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Building AI
          </span>{" "}
          by Next Month.
        </h2>

        <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
          Join 1,200+ families at Lumexa AI School. One free trial class, no commitment, no credit card.
          If it's not the right fit, you owe nothing.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/trial"
            className="px-8 py-4 text-base font-black bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl shadow-2xl shadow-purple-900/50 hover:shadow-purple-700/60 transition-all transform hover:scale-[1.03] active:scale-95"
          >
            Book Your Free Trial Now
            <span className="block text-xs font-normal opacity-70 mt-0.5">
              First class free · No credit card needed
            </span>
          </Link>
          <Link
            href="/courses"
            className="px-6 py-4 text-sm font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-xl transition-all"
          >
            Explore learning paths first →
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-gray-600 text-xs">
          {[
            "✓ COPPA Compliant",
            "✓ Background-Checked Teachers",
            "✓ 7-day refund on unused gems",
            "✓ Cancel anytime",
          ].map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
