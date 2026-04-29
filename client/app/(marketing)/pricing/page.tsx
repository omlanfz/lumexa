import type { Metadata } from "next";
import PricingSection from "../../../components/marketing/PricingSection";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — Lumexa Gem Packs for Live Coding Classes",
  description:
    "Flexible gem-based pricing. Buy packs of 10, 20, or 40 classes. Pay via bKash, card, or bank transfer.",
};

const faq = [
  {
    q: "What is a Gem?",
    a: "A gem is one class credit. When you book a lesson, one gem is deducted from your wallet. Gems never expire.",
  },
  {
    q: "Can I choose my teacher?",
    a: "Yes. Browse teachers in the Marketplace, view their profiles and ratings, and book any available slot.",
  },
  {
    q: "What happens if I'm not satisfied?",
    a: "We offer a 7-day refund policy on unused gems. If you tried a class and weren't happy, contact us and we'll make it right.",
  },
  {
    q: "Is the first class really free?",
    a: "Yes. Book a free trial — no payment required. If you love it, buy a gem pack to continue.",
  },
  {
    q: "How does bKash payment work?",
    a: "For Bangladesh users: you pay via bKash, we verify the transaction automatically, and gems are added to your wallet instantly.",
  },
  {
    q: "Can I use gems for any subject?",
    a: "Yes. Gems work across all subjects and all teacher tiers. Your wallet, your choice.",
  },
  {
    q: "Are teachers verified?",
    a: "All teachers are vetted — we verify their identity, qualifications, and conduct a demo lesson before they can join the platform.",
  },
  {
    q: "What if my child misses a class?",
    a: "You can reschedule up to 2 hours before the class start time. The gem is returned to your wallet.",
  },
];

export default function PricingPage() {
  return (
    <div>
      {/* PricingSection handles the region detection + pack cards */}
      <PricingSection />

      {/* FAQ */}
      <section className="py-16 bg-[#080F20]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faq.map((item) => (
              <div
                key={item.q}
                className="p-5 bg-gray-900/60 border border-gray-800 rounded-xl"
              >
                <h3 className="text-white font-semibold mb-2">{item.q}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center p-6 bg-purple-900/20 border border-purple-800/40 rounded-2xl">
            <p className="text-white font-bold text-lg mb-2">Still have questions?</p>
            <p className="text-gray-400 text-sm mb-4">
              Try a free class first — no commitment, no credit card.
            </p>
            <Link
              href="/trial"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              Book Free Trial →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
