const testimonials = [
  {
    name: "Fatima Rahman",
    role: "Parent · Dhaka",
    avatar: "FR",
    avatarColor: "bg-purple-700",
    quote:
      "My daughter built her first website after just 8 sessions. The teacher was incredibly patient and made the classes so engaging. 100% recommend Lumexa!",
    rating: 5,
    subject: "Web Development",
  },
  {
    name: "Alex Chen",
    role: "Parent · Singapore",
    avatar: "AC",
    avatarColor: "bg-blue-700",
    quote:
      "My son was gaming all day. Now he's actually building Roblox games himself and selling them. Lumexa completely changed his relationship with technology.",
    rating: 5,
    subject: "Roblox Game Dev",
  },
  {
    name: "Sarah M.",
    role: "Parent · London",
    avatar: "SM",
    avatarColor: "bg-teal-700",
    quote:
      "The AI course for teens is incredible. My daughter is 16 and already understands how machine learning works. The teachers are university-level experts.",
    rating: 5,
    subject: "AI with Python",
  },
  {
    name: "Arjun Patel",
    role: "Student · Age 14",
    avatar: "AP",
    avatarColor: "bg-green-700",
    quote:
      "I learned more in 3 months with Lumexa than in 2 years of watching YouTube tutorials. Having a real teacher who answers my questions instantly is amazing.",
    rating: 5,
    subject: "Python",
  },
  {
    name: "Maria Costa",
    role: "Parent · Brazil",
    avatar: "MC",
    avatarColor: "bg-orange-700",
    quote:
      "Flexible scheduling is a game changer for us. We book classes around school and activities. The bKash-like payment options for our region made it accessible.",
    rating: 5,
    subject: "Scratch",
  },
  {
    name: "James Kim",
    role: "Parent · Seoul",
    avatar: "JK",
    avatarColor: "bg-indigo-700",
    quote:
      "The progress reports after each class are detailed and helpful. I always know exactly what my son is working on and what's coming next.",
    rating: 5,
    subject: "Data Science",
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-[#080F20]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-yellow-400 text-sm font-semibold uppercase tracking-widest mb-2">
            Testimonials
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Loved by Families Worldwide
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            Over 1,200 students have built real projects, grown in confidence,
            and discovered a passion for technology.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="p-5 bg-gray-900/60 border border-gray-800 rounded-2xl hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start gap-3 mb-4">
                <div
                  className={`w-9 h-9 rounded-full ${t.avatarColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                >
                  {t.avatar}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{t.name}</div>
                  <div className="text-gray-600 text-xs">{t.role}</div>
                </div>
                <div className="ml-auto">
                  <Stars count={t.rating} />
                </div>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed mb-3">"{t.quote}"</p>

              <span className="inline-block text-[10px] px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-500">
                {t.subject}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
