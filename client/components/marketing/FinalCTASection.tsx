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
        <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-6">
          Start with a lesson.{" "}
          <span className="bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
            See what your child can build.
          </span>
        </h2>

        <p className="text-lg text-purple-100/80 mb-10 max-w-xl mx-auto">
          The free trial helps us understand your child&apos;s interests and level, lets your family experience our
          teaching style, and guides our recommendation for the right program.
        </p>

        <Link
          href="/trial"
          className="inline-block px-9 py-4 text-base font-black bg-white hover:bg-purple-50 text-purple-700 rounded-xl shadow-xl transition-all hover:scale-[1.03] active:scale-95"
        >
          Book a Free Trial
        </Link>
      </div>
    </section>
  );
}
