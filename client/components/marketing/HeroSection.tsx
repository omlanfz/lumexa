import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#050D1A]">
      {/* Background: star grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #a855f7 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-purple-700/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-700/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-indigo-600/8 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-700/40 bg-purple-900/20 text-purple-300 text-xs font-medium mb-6 fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 pulse-dot" />
          Live 1-on-1 classes · Expert teachers · Real projects
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6 fade-in">
          Where Kids Learn to{" "}
          <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Code, Build AI,
          </span>
          <br />
          and Create Games
        </h1>

        {/* Sub */}
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed fade-in">
          Personalized coding education for ages 6–18. Live classes with
          certified teachers, AI-powered learning paths, and portfolio-ready
          projects — all from home.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-12 fade-in">
          <Link
            href="/trial"
            className="px-7 py-3.5 text-base font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl shadow-xl shadow-purple-900/40 hover:shadow-purple-700/60 transition-all transform hover:scale-[1.02] active:scale-95"
          >
            Book Free Trial
            <span className="block text-xs font-normal opacity-70">
              First class is on us · No card needed
            </span>
          </Link>
          <Link
            href="/courses"
            className="px-7 py-3.5 text-base font-semibold border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white rounded-xl transition-all"
          >
            Explore Courses →
          </Link>
        </div>

        {/* Social proof */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 fade-in">
          {[
            { value: "1,200+", label: "Students Enrolled" },
            { value: "98%", label: "Satisfaction Rate" },
            { value: "50+", label: "Expert Teachers" },
            { value: "Free", label: "First Lesson" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Floating course tags */}
        <div className="mt-16 flex flex-wrap gap-2 justify-center">
          {[
            { label: "Python", color: "bg-yellow-900/30 border-yellow-700/40 text-yellow-400" },
            { label: "AI & Machine Learning", color: "bg-purple-900/30 border-purple-700/40 text-purple-400" },
            { label: "Roblox Game Dev", color: "bg-red-900/30 border-red-700/40 text-red-400" },
            { label: "Web Development", color: "bg-blue-900/30 border-blue-700/40 text-blue-400" },
            { label: "Scratch", color: "bg-orange-900/30 border-orange-700/40 text-orange-400" },
            { label: "Data Science", color: "bg-teal-900/30 border-teal-700/40 text-teal-400" },
          ].map((tag) => (
            <span
              key={tag.label}
              className={`px-3 py-1 rounded-full border text-xs font-medium ${tag.color}`}
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
