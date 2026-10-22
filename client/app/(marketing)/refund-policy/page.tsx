import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, WHATSAPP_DISPLAY, WHATSAPP_URL } from "@/lib/siteContact";
import { REFUND_POLICY_SECTIONS, REFUND_POLICY_UPDATED } from "@/lib/refundPolicy";

export const metadata: Metadata = {
  title: "Refund Policy · Lumexa AI School",
  description:
    "When a Lumexa refund is available, how it is calculated and how long it takes to be processed.",
};


const highlights = [
  { icon: "⏰", title: "Before the first class", text: "Full refund when you cancel at least 24 hours ahead." },
  { icon: "📚", title: "After classes begin", text: "Unused prepaid lessons, less the regular price of completed lessons." },
  { icon: "💳", title: "Processing", text: "Initiated within 7 business days to your original payment method." },
];

const sectionHeading = "text-xl font-black text-[#0F172A] dark:text-white mb-3";
const bodyText = "text-[#334155] dark:text-gray-300 leading-relaxed";

export default function RefundPolicyPage() {
  return (
    <div className="bg-[#F7F9FF] dark:bg-[#050D1A] text-[#0F172A] dark:text-white transition-colors duration-200">
      <section className="relative pt-20 pb-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-purple-300/20 dark:bg-purple-700/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="text-purple-600 dark:text-purple-400 text-sm font-bold uppercase tracking-widest mb-3">
            Lumexa AI School
          </p>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">Lumexa Refund Policy</h1>
          <p className="text-lg text-[#64748B] dark:text-gray-400 max-w-xl mx-auto">
            We want every family to feel confident learning with us. This policy explains when a refund is
            available and how it is processed.
          </p>
          <p className="text-xs text-[#94A3B8] dark:text-gray-500 mt-4">Last updated: {REFUND_POLICY_UPDATED}</p>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-10">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {highlights.map((h) => (
            <div
              key={h.title}
              className="p-5 rounded-2xl bg-white dark:bg-gray-900/50 border border-[#E2E8F0] dark:border-gray-700/60"
            >
              <div className="text-2xl mb-2" aria-hidden>{h.icon}</div>
              <h2 className="font-bold text-sm mb-1">{h.title}</h2>
              <p className="text-xs text-[#64748B] dark:text-gray-400 leading-relaxed">{h.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <article className="max-w-3xl mx-auto p-6 sm:p-10 rounded-3xl bg-white dark:bg-gray-900/50 border border-[#E2E8F0] dark:border-gray-700/60 space-y-8">
          {REFUND_POLICY_SECTIONS.map((section) => (
            <section key={section.id} aria-labelledby={section.id}>
              <h2 id={section.id} className={sectionHeading}>{section.heading}</h2>
              <div className={`${bodyText} space-y-3`}>
                {section.paragraphs.map((text) => (
                  <p key={text}>{text}</p>
                ))}
              </div>
            </section>
          ))}

          <section aria-labelledby="request-refund" className="pt-6 border-t border-[#E2E8F0] dark:border-gray-800">
            <h2 id="request-refund" className={sectionHeading}>Requesting a Refund</h2>
            <p className={bodyText}>
              To request a cancellation or a refund, contact us by email at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-purple-600 dark:text-purple-400 hover:underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>{" "}
              or on WhatsApp at{" "}
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-purple-600 dark:text-purple-400 hover:underline underline-offset-2">
                {WHATSAPP_DISPLAY}
              </a>
              . Please include your child&apos;s name and the program they are enrolled in.
            </p>
          </section>
        </article>

        <p className="max-w-3xl mx-auto text-center text-sm text-[#64748B] dark:text-gray-400 mt-8">
          Questions about pricing?{" "}
          <Link href="/pricing" className="font-semibold text-purple-600 dark:text-purple-400 hover:underline underline-offset-2">
            See our pricing
          </Link>{" "}
          or{" "}
          <Link href="/trial" className="font-semibold text-purple-600 dark:text-purple-400 hover:underline underline-offset-2">
            book a free trial class
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
