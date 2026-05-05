import type { Interest } from "./InterestSelector";

const ALL_PROJECTS = [
  // Games (3)
  {
    emoji: "🎮",
    title: "Galactic Shooter",
    student: "Rafi, age 12",
    tech: "Roblox · Lua",
    desc: "A full multiplayer space shooter with leaderboards, built in 10 sessions. Rafi's friends play it every day.",
    border: "border-red-200",
    bg: "bg-red-50",
    tag: "Game Creator Path",
    tagColor: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
    interest: "games" as Interest,
  },
  {
    emoji: "🎮",
    title: "Python Arcade Game",
    student: "James, age 13",
    tech: "Python · Pygame",
    desc: "A fully functional side-scrolling arcade game with enemies, power-ups, and a high-score system. James made it in 12 sessions.",
    border: "border-red-200",
    bg: "bg-red-50",
    tag: "Game Creator Path",
    tagColor: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
    interest: "games" as Interest,
  },
  {
    emoji: "🗡️",
    title: "RPG Quest World",
    student: "Kevin, age 15",
    tech: "Unity · C#",
    desc: "A top-down RPG with quests, NPCs, and combat. Kevin's third project. He's now applying for a junior game dev internship.",
    border: "border-red-200",
    bg: "bg-red-50",
    tag: "Game Creator Path",
    tagColor: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
    interest: "games" as Interest,
  },
  // AI (3)
  {
    emoji: "🤖",
    title: "Mood Detector AI",
    student: "Tanvir, age 16",
    tech: "Python · TensorFlow",
    desc: "A computer vision model that detects emotions from webcam in real time, built in 24 sessions in the AI Builder Path.",
    border: "border-purple-200",
    bg: "bg-purple-50",
    tag: "AI Builder Path",
    tagColor: "bg-purple-100 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
    interest: "ai" as Interest,
  },
  {
    emoji: "🤖",
    title: "Recipe Chatbot",
    student: "Arjun, age 15",
    tech: "Python · OpenAI API",
    desc: "A conversational AI that suggests recipes based on what's in your fridge, using the OpenAI API and a custom Python backend.",
    border: "border-purple-200",
    bg: "bg-purple-50",
    tag: "AI Builder Path",
    tagColor: "bg-purple-100 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
    interest: "ai" as Interest,
  },
  {
    emoji: "🧠",
    title: "Smart Study Planner",
    student: "Sam, age 15",
    tech: "Python · OpenAI API",
    desc: "An AI that analyses a student's weak topics and auto-generates personalised study schedules. Won best project at Sam's school tech fair.",
    border: "border-purple-200",
    bg: "bg-purple-50",
    tag: "AI Builder Path",
    tagColor: "bg-purple-100 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
    interest: "ai" as Interest,
  },
  // Web (3)
  {
    emoji: "🌐",
    title: "Photography Portfolio",
    student: "Priya, age 15",
    tech: "HTML · CSS · JavaScript",
    desc: "A responsive portfolio site showcasing her photography, deployed live on Vercel and shared at her school exhibition.",
    border: "border-blue-200",
    bg: "bg-blue-50",
    tag: "Web Developer Path",
    tagColor: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    interest: "web" as Interest,
  },
  {
    emoji: "🛒",
    title: "E-Commerce Store",
    student: "Jamie, age 16",
    tech: "React · Node.js",
    desc: "A fully functional online store with cart, checkout, and product pages. Jamie deployed it live and shared it with local businesses.",
    border: "border-blue-200",
    bg: "bg-blue-50",
    tag: "Web Developer Path",
    tagColor: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    interest: "web" as Interest,
  },
  {
    emoji: "📅",
    title: "School Events App",
    student: "Sofia, age 14",
    tech: "React · Next.js",
    desc: "A live web app that lets students browse, register, and get reminders for school events. Used by 300+ students at her school.",
    border: "border-blue-200",
    bg: "bg-blue-50",
    tag: "Web Developer Path",
    tagColor: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    interest: "web" as Interest,
  },
  // Data (3)
  {
    emoji: "📊",
    title: "Climate Data Dashboard",
    student: "Emma, age 17",
    tech: "Python · Pandas · Plotly",
    desc: "An interactive dashboard visualising 30 years of global climate data. Won first place at her school science fair.",
    border: "border-teal-200",
    bg: "bg-teal-50",
    tag: "Data Scientist Path",
    tagColor: "bg-teal-100 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
    interest: "data" as Interest,
  },
  {
    emoji: "⚽",
    title: "Sports Stats Analyser",
    student: "Marcus, age 15",
    tech: "Python · Pandas",
    desc: "Scrapes and visualises live football player stats. Marcus's coach uses it to analyse opponents before matches.",
    border: "border-teal-200",
    bg: "bg-teal-50",
    tag: "Data Scientist Path",
    tagColor: "bg-teal-100 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
    interest: "data" as Interest,
  },
  {
    emoji: "💹",
    title: "Market Trends Predictor",
    student: "Aisha, age 16",
    tech: "Python · Scikit-learn",
    desc: "A machine learning model that predicts stock price trends using historical data. Aisha used it as her university application project.",
    border: "border-teal-200",
    bg: "bg-teal-50",
    tag: "Data Scientist Path",
    tagColor: "bg-teal-100 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
    interest: "data" as Interest,
  },
  // Young (3)
  {
    emoji: "🦁",
    title: "Safari Adventure Game",
    student: "Lucas, age 9",
    tech: "Scratch",
    desc: "An animated interactive story with 40+ sprites and 3 playable levels. Lucas's first ever project, built in Little Coders Path.",
    border: "border-amber-200",
    bg: "bg-amber-50",
    tag: "Little Coders Path",
    tagColor: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    interest: "young" as Interest,
  },
  {
    emoji: "🌙",
    title: "Space Maths Quiz",
    student: "Lily, age 8",
    tech: "Scratch",
    desc: "A fun quiz game that shoots asteroids with correct maths answers. Lily's teacher uses it in class as a revision tool.",
    border: "border-amber-200",
    bg: "bg-amber-50",
    tag: "Little Coders Path",
    tagColor: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    interest: "young" as Interest,
  },
  {
    emoji: "🐍",
    title: "Python Drawing Robot",
    student: "Noah, age 10",
    tech: "Python · Turtle",
    desc: "A Python program that draws geometric patterns and lets Noah control a virtual robot with keyboard commands.",
    border: "border-amber-200",
    bg: "bg-amber-50",
    tag: "Little Coders Path",
    tagColor: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    interest: "young" as Interest,
  },
  // Career (3)
  {
    emoji: "💼",
    title: "Freelance Brand Kit",
    student: "Nadia, age 17",
    tech: "Canva · Fiverr · GitHub",
    desc: "A complete freelancing setup: portfolio site, active Fiverr gig, and LinkedIn profile that landed her first 3 clients within a month.",
    border: "border-green-200",
    bg: "bg-green-50",
    tag: "Digital Independence Path",
    tagColor: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
    interest: "career" as Interest,
  },
  {
    emoji: "🎬",
    title: "Content Creator Portfolio",
    student: "Maya, age 16",
    tech: "LinkedIn · Canva",
    desc: "A professional content strategy and personal brand with 500+ LinkedIn followers before graduation. Maya now consults for two local businesses.",
    border: "border-green-200",
    bg: "bg-green-50",
    tag: "Digital Independence Path",
    tagColor: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
    interest: "career" as Interest,
  },
  {
    emoji: "💡",
    title: "Tech Tutoring Business",
    student: "Tyler, age 17",
    tech: "Fiverr · GitHub · Notion",
    desc: "Tyler built a tutoring service helping classmates with coding. He's earning consistently and has a 5-star Fiverr profile.",
    border: "border-green-200",
    bg: "bg-green-50",
    tag: "Digital Independence Path",
    tagColor: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
    interest: "career" as Interest,
  },
];

interface Props {
  interest: Interest;
}

export default function ShowcaseSection({ interest }: Props) {
  const filtered = ALL_PROJECTS.filter((p) => p.interest === interest);
  const display = filtered.length >= 3 ? filtered.slice(0, 6) : ALL_PROJECTS.slice(0, 6);

  return (
    <section id="showcase" className="py-20 bg-[#F7F9FF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-orange-600 text-sm font-bold uppercase tracking-widest mb-2">
            Real Student Projects
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] mb-4">
            These Kids Built This. Yours Can Too.
          </h2>
          <p className="text-[#334155] max-w-xl mx-auto">
            Every Lumexa student graduates with a real portfolio project. Not a certificate, not a quiz score.
            Something they actually built and can show the world.
          </p>
        </div>

        <div
          key={interest}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 section-fade-up"
        >
          {display.slice(0, 6).map((p) => (
            <div
              key={p.title}
              className={`p-5 bg-white rounded-2xl border ${p.border} card-hover group`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{p.emoji}</div>
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${p.tagColor}`}>
                  {p.tag}
                </span>
              </div>
              <h3 className="text-[#0F172A] font-bold mb-1">{p.title}</h3>
              <p className="text-[#94A3B8] text-xs mb-2">
                by {p.student} · {p.tech}
              </p>
              <p className="text-[#334155] text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-[#64748B] text-sm mb-4">
            Every Lumexa student graduates with at least 3 portfolio projects.
          </p>
          <a
            href="/trial"
            className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-semibold transition-colors"
          >
            Start building with a free class →
          </a>
        </div>
      </div>
    </section>
  );
}
