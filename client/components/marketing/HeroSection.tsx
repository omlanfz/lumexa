import Link from "next/link";

/* Glassmorphism code preview — the ONE allowed glass element per spec */
function GlassCodePreview() {
  const codeLines = [
    { color: "text-slate-500", text: "# Build a mood detector AI" },
    { color: "text-blue-600",  text: "import cv2, tensorflow as tf" },
    { color: "text-slate-700", text: "" },
    { color: "text-purple-600", text: "model = load_model(" },
    { color: "text-green-600",  text: '  "emotion_detector.h5"' },
    { color: "text-purple-600", text: ")" },
    { color: "text-slate-700", text: "" },
    { color: "text-blue-600",  text: "cap = cv2.VideoCapture(0)" },
    { color: "text-slate-500", text: "# Real-time face detection" },
  ];

  return (
    <div className="relative">
      {/* Colourful gradient blob behind the glass card */}
      <div className="absolute -inset-6 bg-gradient-to-br from-purple-300/60 via-blue-300/40 to-cyan-300/50 rounded-3xl blur-2xl" />

      {/* Glass card */}
      <div
        className="relative rounded-2xl p-5 border border-white/70 shadow-2xl shadow-purple-200/60"
        style={{
          backdropFilter: "blur(14px)",
          background: "rgba(255,255,255,0.62)",
        }}
      >
        {/* Titlebar */}
        <div className="flex items-center gap-1.5 mb-4">
          <div className="w-3 h-3 rounded-full bg-red-400/80" />
          <div className="w-3 h-3 rounded-full bg-amber-400/80" />
          <div className="w-3 h-3 rounded-full bg-green-400/80" />
          <span className="ml-2 text-[#64748B] text-[11px] font-mono">emotion_ai.py</span>
        </div>

        {/* Code */}
        <div className="font-mono text-[12px] space-y-0.5">
          {codeLines.map((l, i) => (
            <div key={i} className={`${l.color} leading-5`}>
              {l.text || " "}
            </div>
          ))}
        </div>

        {/* Output strip */}
        <div className="mt-4 pt-3 border-t border-white/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] font-mono text-[#334155]">
              Detected: <span className="text-purple-700 font-bold">Happy 😄  94%</span>
            </span>
          </div>
        </div>

        {/* Student badge */}
        <div className="mt-3 inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-full px-3 py-1">
          <span className="text-xs">👤</span>
          <span className="text-[11px] font-semibold text-purple-700">Tanvir, age 16 · AI Builder Path</span>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden bg-[#F7F9FF]"
    >
      {/* Subtle dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle, #2563EB 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Light gradient blobs */}
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: copy */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 text-xs font-semibold mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live classes · Expert teachers · Real AI projects
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-black text-[#0F172A] leading-[1.06] tracking-tight mb-5">
              Turn Your Child Into an{" "}
              <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Builder
              </span>
            </h1>

            {/* Sub-headline — outcome specific */}
            <p className="text-lg text-[#334155] max-w-lg mb-3 leading-relaxed">
              While other kids scroll through AI tools,{" "}
              <span className="font-bold text-[#0F172A]">yours will build them.</span>{" "}
              Live coding classes for ages 6–18 — from Scratch to real AI apps.
            </p>

            <p className="text-sm text-[#94A3B8] mb-9">
              No prior experience needed · Progress visible after lesson 1 · Cancel anytime
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <Link
                href="/trial"
                className="px-8 py-4 text-base font-black bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all hover:scale-[1.02] active:scale-95"
              >
                Book Free Trial Class
                <span className="block text-xs font-normal opacity-75 mt-0.5">
                  First class on us · No card needed
                </span>
              </Link>
              <Link
                href="/courses"
                className="px-8 py-4 text-base font-semibold border-2 border-[#E2E8F0] hover:border-purple-200 text-[#334155] hover:text-purple-700 rounded-xl transition-all hover:bg-purple-50"
              >
                Explore Learning Paths →
              </Link>
            </div>

            {/* Social proof stats */}
            <div className="flex flex-wrap gap-8">
              {[
                { value: "1,200+", label: "AI Builders Enrolled" },
                { value: "98%",    label: "Parent Satisfaction" },
                { value: "50+",    label: "Expert Teachers" },
                { value: "3+",     label: "Projects Per Course" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-black text-[#0F172A]">{s.value}</div>
                  <div className="text-xs text-[#64748B] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: glass code preview */}
          <div className="hidden lg:block">
            <GlassCodePreview />
          </div>
        </div>

        {/* Pathway tags strip */}
        <div className="mt-14 flex flex-wrap gap-2 justify-center lg:justify-start">
          {[
            { label: "🎮 Game Creator",       color: "bg-red-50   border-red-200   text-red-700"    },
            { label: "🤖 AI Builder",          color: "bg-purple-50 border-purple-200 text-purple-700" },
            { label: "🌐 Web Developer",       color: "bg-blue-50  border-blue-200  text-blue-700"   },
            { label: "🌟 Little Coders",       color: "bg-amber-50  border-amber-200  text-amber-700"  },
            { label: "📊 Data Scientist",      color: "bg-teal-50  border-teal-200  text-teal-700"   },
            { label: "💼 Digital Independence",color: "bg-green-50 border-green-200 text-green-700"  },
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

      {/* Bottom soft fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
}
