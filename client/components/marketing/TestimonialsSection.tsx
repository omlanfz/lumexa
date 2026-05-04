const testimonials = [
  {
    name: "Fatima Rahman",
    role: "Parent · Dhaka",
    avatar: "FR",
    avatarColor: "bg-purple-600",
    quote:
      "My daughter (age 13) built her first website after just 8 sessions. The teacher was incredibly patient and made the classes so engaging. She now shows it to everyone at school.",
    rating: 5,
    subject: "Web Development",
    child: "Daughter, age 13",
  },
  {
    name: "Alex Chen",
    role: "Parent · Singapore",
    avatar: "AC",
    avatarColor: "bg-blue-600",
    quote:
      "My 11-year-old was gaming all day. Now he's building Roblox games himself — and his friends actually play them. Lumexa completely changed his relationship with technology.",
    rating: 5,
    subject: "Game Creator Path",
    child: "Son, age 11",
  },
  {
    name: "Sarah M.",
    role: "Parent · London",
    avatar: "SM",
    avatarColor: "bg-teal-600",
    quote:
      "The AI course for teens is incredible. My 16-year-old now understands how machine learning works and built her own emotion detector. The teachers are university-level experts.",
    rating: 5,
    subject: "AI Builder Path",
    child: "Daughter, age 16",
  },
  {
    name: "Arjun Patel",
    role: "Student · Age 14 · India",
    avatar: "AP",
    avatarColor: "bg-green-600",
    quote:
      "I learned more in 3 months with Lumexa than in 2 years of YouTube tutorials. Having a real teacher who answers my questions instantly is a completely different experience.",
    rating: 5,
    subject: "Python",
    child: "Student, age 14",
  },
  {
    name: "Maria Costa",
    role: "Parent · Brazil",
    avatar: "MC",
    avatarColor: "bg-orange-600",
    quote:
      "Flexible scheduling is a game changer for us. My 9-year-old books around her activities. After 6 weeks she built an animated Scratch story and presented it to the whole family.",
    rating: 5,
    subject: "Little Coders Path",
    child: "Daughter, age 9",
  },
  {
    name: "James Kim",
    role: "Parent · Seoul",
    avatar: "JK",
    avatarColor: "bg-indigo-600",
    quote:
      "The progress reports after each class are detailed and helpful. I always know exactly what my son is working on. He finished his data dashboard in 5 months and won a science fair.",
    rating: 5,
    subject: "Data Science",
    child: "Son, age 15",
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-amber-600 text-sm font-semibold uppercase tracking-widest mb-2">
            Testimonials
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] mb-4">
            Loved by Families Worldwide
          </h2>
          <p className="text-[#334155] max-w-lg mx-auto">
            Over 1,200 students have built real projects, grown in confidence,
            and discovered a passion for technology.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="p-5 bg-[#F7F9FF] border border-[#E2E8F0] rounded-2xl hover:border-purple-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-full ${t.avatarColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                >
                  {t.avatar}
                </div>
                <div>
                  <div className="text-[#0F172A] font-semibold text-sm">{t.name}</div>
                  <div className="text-[#64748B] text-xs">{t.role}</div>
                </div>
                <div className="ml-auto flex-shrink-0">
                  <Stars count={t.rating} />
                </div>
              </div>

              <p className="text-[#334155] text-sm leading-relaxed mb-3">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="flex items-center justify-between">
                <span className="inline-block text-[10px] px-2.5 py-0.5 bg-white border border-[#E2E8F0] rounded-full text-[#64748B] font-medium">
                  {t.subject}
                </span>
                <span className="text-[10px] text-[#94A3B8]">{t.child}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
