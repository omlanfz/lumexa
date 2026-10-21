/*
  Two ways to receive the teaching. They are alternatives, not stages, and the
  section deliberately makes no price or "more attention" comparisons.
*/

const formats = [
  {
    icon: "👤",
    title: "Private 1:1 Mentorship",
    intro: "One teacher's attention is dedicated to one child, allowing the lesson to adapt to that child's pace and goals.",
    size: "One student with one teacher",
    suits: "Children who like focused attention, need a flexible pace, or have a specific goal in mind.",
    choose: "Your child learns best when a teacher is fully focused on them.",
    ring: "hover:border-purple-300 dark:hover:border-purple-500/50",
    tile: "from-purple-600 to-indigo-600",
    soft: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/40",
  },
  {
    icon: "👥",
    title: "Small Learning Batch",
    intro: "A teacher works with a small group of 2 to 4 students, offering peer interaction while keeping the learning group small.",
    size: "2 to 4 students with one teacher",
    suits: "Children who enjoy learning alongside others, sharing ideas and showing their work to friends.",
    choose: "Your child is happiest working with peers and likes a bit of friendly company.",
    ring: "hover:border-blue-300 dark:hover:border-blue-500/50",
    tile: "from-blue-600 to-cyan-600",
    soft: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/40",
  },
];

export default function FormatsSection() {
  return (
    <section id="formats" className="scroll-mt-20 py-20 bg-white dark:bg-[#07101F] transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-blue-600 dark:text-blue-400 text-sm font-bold uppercase tracking-widest mb-3">
            Learning Formats
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] dark:text-white mb-4">
            Two Ways to Learn With Lumexa
          </h2>
          <p className="text-[#334155] dark:text-gray-400 max-w-xl mx-auto">
            Every program is taught live by an expert teacher. Which option is right for your child? Compare the two
            below and choose the setting that fits them best.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {formats.map((f) => (
            <div
              key={f.title}
              className={`flex flex-col p-6 sm:p-7 rounded-3xl bg-[#F8FAFF] dark:bg-gray-900/50 border border-[#E2E8F0] dark:border-gray-700/60 ${f.ring} card-hover`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 flex-none rounded-xl bg-gradient-to-br ${f.tile} grid place-items-center text-2xl shadow-sm`}>
                  {f.icon}
                </div>
                <h3 className="text-[#0F172A] dark:text-white font-black text-xl leading-tight">{f.title}</h3>
              </div>
              <p className="text-[#334155] dark:text-gray-300 text-sm leading-relaxed mb-5">{f.intro}</p>

              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-gray-500 mb-0.5">Group size</dt>
                  <dd className="font-semibold text-[#0F172A] dark:text-white">{f.size}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-gray-500 mb-0.5">Who it suits</dt>
                  <dd className="text-[#334155] dark:text-gray-300">{f.suits}</dd>
                </div>
              </dl>

              <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${f.soft}`}>
                <span className="font-bold text-[#0F172A] dark:text-white">Choose this if: </span>
                <span className="text-[#334155] dark:text-gray-300">{f.choose}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-[#64748B] dark:text-gray-400">
          Not sure which suits your child? You can share their interests and learning style during the free trial, and
          we&apos;ll help you decide.
        </p>
      </div>
    </section>
  );
}
