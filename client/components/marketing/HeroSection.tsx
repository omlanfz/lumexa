import Link from "next/link";
import HeroGame from "./HeroGame";

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden bg-[#F7F9FF] dark:bg-[#050D1A] transition-colors duration-200"
    >
      {/* Subtle dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(circle, #2563EB 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Gradient blobs */}
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-purple-200/40 dark:bg-purple-700/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-blue-200/30 dark:bg-blue-700/12 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: copy */}
          <div>
            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-black text-[#0F172A] dark:text-white leading-[1.06] tracking-tight mb-5">
              Your Child Can{" "}
              <span className="whitespace-nowrap bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 dark:from-purple-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                Do More
              </span>{" "}
              Than Just Use Technology.
            </h1>

            {/* Supporting line */}
            <p className="text-lg text-[#334155] dark:text-gray-400 max-w-xl mb-4 leading-relaxed">
              Live coding classes for ages 6–18, where kids learn to code, build games and websites, and create real AI
              projects through hands-on learning. Turn your child&apos;s screen time into skills that last.
            </p>

            <p className="text-sm text-[#64748B] dark:text-gray-500 mb-9">
              No prior experience needed · Learn by building real projects · Cancel anytime
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/trial"
                className="px-8 py-4 text-base text-center font-black bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-purple-200 dark:shadow-purple-900/40 hover:shadow-purple-300 dark:hover:shadow-purple-800/50 transition-all hover:scale-[1.02] active:scale-95 glow-pulse"
              >
                Try a Free Lesson
              </Link>
              <Link
                href="/programs"
                className="px-8 py-4 text-base text-center font-semibold border-2 border-[#E2E8F0] dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-700/50 text-[#334155] dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-300 rounded-xl transition-all hover:bg-purple-50 dark:hover:bg-purple-900/10"
              >
                Explore Programs
              </Link>
            </div>
          </div>

          {/* Right: playable mini-game — stays visible on mobile (stacks under the copy) */}
          <HeroGame />
        </div>
      </div>

      {/* Bottom soft fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white dark:from-[#07101F] to-transparent pointer-events-none" />
    </section>
  );
}
