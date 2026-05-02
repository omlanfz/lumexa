"use client"; 

import Link from "next/link";

const values = [
  {
    icon: "🎯",
    title: "Build, Don't Just Watch",
    desc: "Every Lumexa class ends with something real. Not a quiz. Not a certificate. Something your child actually created and can show their friends.",
  },
  {
    icon: "👩‍🏫",
    title: "Teachers Who Love Teaching Kids",
    desc: "We don't hire anyone who can't explain recursion to a 10-year-old. Our teachers are degree-qualified, background-checked, and trained in child-paced learning.",
  },
  {
    icon: "🌍",
    title: "Accessible Worldwide",
    desc: "From Dhaka to Delhi to London to Los Angeles — local currency, local payment methods, global-standard teaching quality.",
  },
  {
    icon: "🔒",
    title: "Child Safety First",
    desc: "COPPA-compliant. Background-checked teachers. Parents see everything. We store only what we need and nothing more.",
  },
  {
    icon: "🏆",
    title: "Portfolio Over Certificates",
    desc: "When your child finishes a path, they have 3+ real projects deployed on the internet. That's worth more than any badge.",
  },
  {
    icon: "📈",
    title: "Progress You Can See After Lesson 1",
    desc: "We guarantee visible progress after the very first class. If your child doesn't build something in session 1, the class is on us — no questions.",
  },
];

const stats = [
  { value: "1,200+", label: "Students Enrolled" },
  { value: "98%", label: "Parent Satisfaction" },
  { value: "50+", label: "Expert Teachers" },
  { value: "6", label: "Learning Pathways" },
  { value: "17", label: "Courses Available" },
  { value: "3+", label: "Projects Per Path" },
];

const team = [
  {
    name: "Fairooz Omlan",
    role: "Founder & CEO",
    bio: "Former software engineer turned education entrepreneur. Built Lumexa to raise a generation of AI-native creators, equipped to build, innovate, and lead in a rapidly evolving digital world.",
  },
  {
    name: "Our Teacher Network",
    role: "50+ Verified Educators",
    bio: "Degree-qualified teachers from top universities, each trained in Lumexa's child-first pedagogy. Every teacher passes a background check and a live teaching evaluation.",
  },
  {
    name: "Our Philosophy",
    role: "Build → Publish → Improve",
    bio: "We believe the best way to learn is by making something real. Every class is structured around a concrete deliverable — not slides, not theory, not passive watching.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-[#050D1A] text-white">
      {/* Hero */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-700/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-700/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-700/40 bg-purple-900/20 text-purple-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Our Mission
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-6">
            We Teach Kids to Build the{" "}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Future of Technology
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
            Lumexa AI School was built for one reason: the world is being redesigned by people who can code, and we refuse to let your child be left on the sidelines.
          </p>
          <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
            Every class is live — batch, 1-on-1, or group — taught by a verified expert who adapts to your child specifically. Not a YouTube video. Not a pre-recorded course. A real teacher who knows your child's name.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-y border-gray-800/60">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-black text-white mb-1">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-purple-400 text-sm font-bold uppercase tracking-widest mb-3">The Story</p>
              <h2 className="text-3xl font-black text-white mb-6 leading-tight">
                Why Lumexa Exists
              </h2>
              <div className="space-y-4 text-gray-400 leading-relaxed">
                <p>
                  When we looked at online coding education, we saw the same pattern everywhere: pre-recorded videos, passive watching, and certificates that don't reflect real skills.
                </p>
                <p>
                  Kids were finishing "coding courses" who still couldn't build a single real thing. Parents were paying for progress that wasn't there.
                </p>
                <p>
                  Lumexa started with a simple belief: <span className="text-white font-semibold">the best way to learn is by building something real, with a real teacher who knows your name.</span>
                </p>
                <p>
                  Today, every student who finishes a Lumexa pathway has at least 3 projects deployed and working on the internet. Not screenshots. Not demos. Things other people can actually use.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: "The Problem", text: "Generic, passive, pre-recorded content that doesn't adapt to the child.", color: "border-red-700/40 bg-red-900/10" },
                { label: "Our Solution", text: "Live classes with expert teachers (batch, 1-on-1, and group formats). Every lesson adapted to your child's pace, goals, and personality.", color: "border-green-700/40 bg-green-900/10" },
                { label: "The Outcome", text: "A real portfolio of projects. Skills that will matter in 2030 and beyond. A child who builds, not just consumes.", color: "border-purple-700/40 bg-purple-900/10" },
              ].map((item) => (
                <div key={item.label} className={`p-5 rounded-xl border ${item.color}`}>
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{item.label}</div>
                  <p className="text-sm text-gray-300 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#07101F] to-[#050D1A]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-purple-400 text-sm font-bold uppercase tracking-widest mb-3">What We Believe</p>
            <h2 className="text-3xl font-black text-white">Our Principles</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v) => (
              <div key={v.title} className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl">
                <div className="text-3xl mb-4">{v.icon}</div>
                <h3 className="text-white font-bold mb-2">{v.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-purple-400 text-sm font-bold uppercase tracking-widest mb-3">The People</p>
            <h2 className="text-3xl font-black text-white">Who Builds Lumexa</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {team.map((t) => (
              <div key={t.name} className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 mx-auto mb-4 flex items-center justify-center text-2xl">
                  {t.name === "Fairooz Omlan" ? "👨‍💻" : t.name === "Our Teacher Network" ? "👩‍🏫" : "🚀"}
                </div>
                <h3 className="text-white font-bold mb-1">{t.name}</h3>
                <p className="text-purple-400 text-xs font-semibold mb-3">{t.role}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{t.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#07101F] to-[#050D1A]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">
            Ready to See the Difference?
          </h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Book a free trial class. No card required. Your child builds something real in the very first session.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/trial"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black rounded-xl shadow-xl shadow-purple-900/40 transition-all hover:scale-[1.02]"
            >
              Book Free Trial Class
              <span className="block text-xs font-normal opacity-70 mt-0.5">First class free, no card needed</span>
            </Link>
            <Link
              href="/courses"
              className="px-8 py-4 text-sm font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-xl transition-all"
            >
              Explore All Courses →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
