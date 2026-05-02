import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#050D1A]">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "radial-gradient(circle, #a855f7 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-700/12 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-indigo-600/8 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-700/40 bg-purple-900/20 text-purple-300 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live 1-on-1 classes · Expert teachers · Real AI projects
        </div>

        {/* Headline — parent-focused emotional hook */}
        <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-black text-white leading-[1.08] tracking-tight mb-6">
          Turn Your Child Into an
          <br />
          <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            AI Builder
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed">
          While other kids scroll through AI tools,{" "}
          <span className="text-white font-semibold">yours will build them.</span>
          {" "}Live 1-on-1 coding classes from Scratch to real AI apps, designed for ages 6–18.
        </p>

        <p className="text-sm text-gray-600 mb-10">
          No prior experience needed · Progress guaranteed after lesson 1 · Cancel anytime
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-14">
          <Link
            href="/trial"
            className="px-8 py-4 text-base font-black bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl shadow-2xl shadow-purple-900/50 hover:shadow-purple-700/60 transition-all transform hover:scale-[1.02] active:scale-95"
          >
            Book Free Trial Class
            <span className="block text-xs font-normal opacity-70 mt-0.5">
              First class is on us · No card needed
            </span>
          </Link>
          <Link
            href="/courses"
            className="px-8 py-4 text-base font-semibold border border-gray-700 hover:border-purple-600/60 text-gray-300 hover:text-white rounded-xl transition-all hover:bg-purple-900/10"
          >
            Explore Learning Paths →
          </Link>
        </div>

        {/* Social proof strip */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 mb-14">
          {[
            { value: "1,200+", label: "AI Builders Enrolled" },
            { value: "98%", label: "Parent Satisfaction" },
            { value: "50+", label: "Expert Teachers" },
            { value: "3+", label: "Projects Per Course" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-black text-white">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Pathway tags */}
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { label: "🎮 Game Creator", color: "bg-red-900/30 border-red-700/40 text-red-400" },
            { label: "🤖 AI Builder", color: "bg-purple-900/30 border-purple-700/40 text-purple-400" },
            { label: "🌐 Web Developer", color: "bg-blue-900/30 border-blue-700/40 text-blue-400" },
            { label: "🌟 Little Coders", color: "bg-yellow-900/30 border-yellow-700/40 text-yellow-400" },
            { label: "📊 Data Scientist", color: "bg-teal-900/30 border-teal-700/40 text-teal-400" },
            { label: "💼 Digital Independence", color: "bg-green-900/30 border-green-700/40 text-green-400" },
          ].map((tag) => (
            <span
              key={tag.label}
              className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold ${tag.color}`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050D1A] to-transparent pointer-events-none" />
    </section>
  );
}
