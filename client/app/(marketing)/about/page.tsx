import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — Lumexa Live Coding for Kids",
  description:
    "Our mission: make high-quality live coding education accessible to every child worldwide.",
};

const team = [
  { name: "Mariam Chowdhury", role: "Founder & CEO", avatar: "MC", color: "bg-purple-700" },
  { name: "David Park", role: "Head of Curriculum", avatar: "DP", color: "bg-blue-700" },
  { name: "Sadia Islam", role: "Head of Teachers", avatar: "SI", color: "bg-teal-700" },
  { name: "Lucas Ferreira", role: "Lead Engineer", avatar: "LF", color: "bg-green-700" },
];

const values = [
  {
    icon: "🎯",
    title: "Learning That Sticks",
    desc: "We believe live, 1-on-1 instruction is the most effective form of education. No passive watching — active doing.",
  },
  {
    icon: "🌍",
    title: "Globally Accessible",
    desc: "Quality coding education shouldn't be limited by geography. We serve families in 40+ countries with local payment methods.",
  },
  {
    icon: "🔒",
    title: "Child Safety First",
    desc: "COPPA compliant. All teachers are background-checked. Every class is monitored. Parents can view recordings anytime.",
  },
  {
    icon: "🚀",
    title: "Real Results",
    desc: "Students build real projects that go in their portfolio. Not certificates of participation — actual code that runs.",
  },
];

export default function AboutPage() {
  return (
    <div className="py-16">
      {/* Hero */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-20">
        <p className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">Our Mission</p>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
          Every Child Deserves a{" "}
          <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            World-Class
          </span>{" "}
          Coding Education
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          Lumexa was founded on a simple belief: the best way to teach a child to
          code is through a real human connection — a skilled teacher who knows
          their name, adapts to their pace, and celebrates their wins.
        </p>
      </div>

      {/* Values */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <h2 className="text-2xl font-black text-white text-center mb-10">What We Stand For</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {values.map((v) => (
            <div key={v.title} className="p-5 bg-gray-900/60 border border-gray-800 rounded-2xl">
              <div className="text-2xl mb-3">{v.icon}</div>
              <h3 className="text-white font-bold mb-2">{v.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gray-900/40 border-y border-gray-800/60 py-12 mb-20">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "1,200+", label: "Students Taught" },
            { value: "50+", label: "Expert Teachers" },
            { value: "40+", label: "Countries Reached" },
            { value: "98%", label: "Satisfaction Rate" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-black text-white mb-1">{s.value}</div>
              <div className="text-gray-500 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <h2 className="text-2xl font-black text-white text-center mb-10">The Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {team.map((member) => (
            <div key={member.name} className="text-center p-4 bg-gray-900/50 border border-gray-800 rounded-2xl">
              <div className={`w-12 h-12 rounded-full ${member.color} flex items-center justify-center text-white font-bold mx-auto mb-3`}>
                {member.avatar}
              </div>
              <div className="text-white font-semibold text-sm">{member.name}</div>
              <div className="text-gray-600 text-xs mt-0.5">{member.role}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-2xl mx-auto px-4 text-center">
        <div className="p-8 bg-purple-900/20 border border-purple-800/40 rounded-2xl">
          <h3 className="text-white font-black text-2xl mb-3">Ready to Join Us?</h3>
          <p className="text-gray-400 text-sm mb-6">
            Start with a free class. No risk, no commitment.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/trial" className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all text-sm">
              Book Free Trial
            </Link>
            <Link href="/register?role=TEACHER" className="px-6 py-3 border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white rounded-xl transition-all text-sm">
              Become a Teacher →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
