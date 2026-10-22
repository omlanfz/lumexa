"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";
import { SOCIAL_LINKS, type SocialLink } from "@/lib/socialLinks";
import { CONTACT_EMAIL, WHATSAPP_URL } from "@/lib/siteContact";
import { FacebookIcon, InstagramIcon, LinkedInIcon, WhatsAppIcon, YouTubeIcon } from "./SocialIcons";

type LegalDoc = "privacy" | "terms" | "coppa" | null;

const SOCIAL_ICONS: Record<SocialLink["id"], { Icon: typeof FacebookIcon; hover: string }> = {
  facebook: { Icon: FacebookIcon, hover: "hover:bg-[#1877F2]" },
  youtube: { Icon: YouTubeIcon, hover: "hover:bg-[#FF0000]" },
  instagram: { Icon: InstagramIcon, hover: "hover:bg-[#E4405F]" },
  linkedin: { Icon: LinkedInIcon, hover: "hover:bg-[#0A66C2]" },
};

const LEGAL_CONTENT: Record<NonNullable<LegalDoc>, { title: string; body: React.ReactNode }> = {
  privacy: {
    title: "Privacy Policy",
    body: (
      <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
        <p><strong className="text-white">Last updated: January 2026</strong></p>
        <section>
          <h3 className="text-white font-semibold mb-1">1. Information We Collect</h3>
          <p>We collect information you provide directly, including your name, email address, and payment details when you register or enrol in a program. For child profiles, we collect only a first name and age in compliance with COPPA.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">2. How We Use Your Information</h3>
          <p>We use your information to provide and improve our tutoring services, match students with qualified teachers, process payments, send class confirmations and progress reports, and comply with legal obligations.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">3. Data Sharing</h3>
          <p>We do not sell your personal data. We share data only with trusted service providers (payment processors, video conferencing platforms) under strict data protection agreements.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">4. Data Retention</h3>
          <p>We retain your account data for as long as your account is active. Class recordings are retained for 90 days. You may request deletion of your data at any time by contacting fz.omlan@gmail.com.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">5. Security</h3>
          <p>All data is transmitted over TLS encryption. Payment data is processed exclusively by Stripe and never stored on our servers. We implement industry-standard security practices.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">6. Your Rights</h3>
          <p>You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at fz.omlan@gmail.com. We will respond within 30 days.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">7. Contact</h3>
          <p>Lumexa AI School · fz.omlan@gmail.com · WhatsApp: +880 1774 878252</p>
        </section>
      </div>
    ),
  },
  terms: {
    title: "Terms of Service",
    body: (
      <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
        <p><strong className="text-white">Last updated: January 2026</strong></p>
        <section>
          <h3 className="text-white font-semibold mb-1">1. Acceptance of Terms</h3>
          <p>By accessing or using Lumexa AI School, you agree to be bound by these Terms of Service. If you do not agree, please do not use our platform.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">2. Lessons and Payments</h3>
          <p>Lessons are paid for in blocks of 8, or for a full program upfront at a discount. Each lesson is one live teaching session. Refunds are governed by our <Link href="/refund-policy" className="text-purple-400 underline underline-offset-2 hover:text-purple-300">Refund Policy</Link>.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">3. Platform Rules</h3>
          <p>Users must not share account credentials, disrupt live sessions, harass teachers or students, or use the platform for any unlawful purpose. Violations may result in immediate account termination without refund.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">4. Teacher Standards</h3>
          <p>All teachers are background-checked and degree-qualified. If a teacher fails to meet our quality standards, we will replace them at no cost to you.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">5. Intellectual Property</h3>
          <p>All course materials, recordings, and platform content are the intellectual property of Lumexa AI School. Students may use recordings for personal learning only.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">6. Limitation of Liability</h3>
          <p>Lumexa AI School is not liable for any indirect or consequential damages arising from the use of our platform. Our liability is limited to the amount paid for lessons in the preceding 30 days.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">7. Changes to Terms</h3>
          <p>We may update these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">8. Contact</h3>
          <p>Lumexa AI School · fz.omlan@gmail.com · WhatsApp: +880 1774 878252</p>
        </section>
      </div>
    ),
  },
  coppa: {
    title: "COPPA Compliance",
    body: (
      <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
        <p><strong className="text-white">Children's Online Privacy Protection Act (COPPA) Compliance Statement</strong></p>
        <section>
          <h3 className="text-white font-semibold mb-1">Our Commitment</h3>
          <p>Lumexa AI School is committed to protecting the privacy of children under 13. We comply fully with COPPA and treat child data with the highest standards of care.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">Parental Consent</h3>
          <p>All child profiles are created and managed by a verified parent or guardian. We require explicit parental consent before any child data is collected or processed. Parents can review, modify, or delete their child's information at any time.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">Data Minimization</h3>
          <p>We collect only what is necessary: a child's first name and age. We do not collect last names, photographs, or any other personally identifiable information from children under 13 without explicit parental consent.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">Child Safety in Live Sessions</h3>
          <p>All live class sessions are conducted by background-checked, verified teachers. Sessions may be recorded for quality and safety review. Parents have full access to all session recordings.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">No Third-Party Sharing</h3>
          <p>We do not share, sell, or disclose children's personal information to third parties except as required by law or to provide our core educational services (e.g., video conferencing platform).</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">Parental Rights</h3>
          <p>Parents may request to review, correct, or delete their child's personal information at any time. To exercise these rights, contact us at fz.omlan@gmail.com. We will respond within 5 business days.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">Contact</h3>
          <p>For COPPA-related inquiries: fz.omlan@gmail.com · WhatsApp: +880 1774 878252</p>
        </section>
      </div>
    ),
  },
};

export default function MarketingFooter() {
  const [openDoc, setOpenDoc] = useState<LegalDoc>(null);
  const doc = openDoc ? LEGAL_CONTENT[openDoc] : null;

  return (
    <>
      <footer className="bg-[#030810] border-t border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.4fr] gap-8">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    src="/logo-mark.png"
                    alt="Lumexa AI School"
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                </div>
                <span className="text-white font-black text-lg tracking-tight">
                  Lumexa{" "}
                  <span className="text-purple-400 font-bold">AI School</span>
                </span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                Live coding and AI classes for kids ages 6 to 18. Expert teachers, real projects, and hands-on learning.
              </p>
            </div>

            {/* Explore */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-3">Explore</h4>
              <ul className="space-y-2">
                {[
                  { label: "Programs", href: "/programs" },
                  { label: "How It Works", href: "/#how-it-works" },
                  { label: "Pricing", href: "/pricing" },
                  { label: "Free Trial", href: "/trial" },
                  { label: "About Us", href: "/about" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* For parents */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-3">For Parents</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300 transition-colors">
                    Parent Support
                  </a>
                </li>
                <li>
                  <button onClick={() => setOpenDoc("coppa")} className="text-gray-500 hover:text-gray-300 transition-colors text-left">
                    Child Safety &amp; COPPA
                  </button>
                </li>
                <li>
                  <button onClick={() => setOpenDoc("privacy")} className="text-gray-500 hover:text-gray-300 transition-colors text-left">
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button onClick={() => setOpenDoc("terms")} className="text-gray-500 hover:text-gray-300 transition-colors text-left">
                    Terms of Service
                  </button>
                </li>
                <li>
                  <Link href="/refund-policy" className="text-gray-500 hover:text-gray-300 transition-colors">
                    Refund Policy
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-gray-500 hover:text-gray-300 transition-colors">
                    Parent Sign In
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-3">Contact Us</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="group flex items-center gap-2.5 text-gray-500 hover:text-gray-300 transition-colors break-all">
                    <Mail className="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-white transition-colors" aria-hidden="true" />
                    <span>{CONTACT_EMAIL}</span>
                  </a>
                </li>
                <li>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2.5 text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap">
                    <WhatsAppIcon className="w-4 h-4 flex-shrink-0 text-[#25D366]" />
                    <span>WhatsApp +880 1774 878252</span>
                  </a>
                </li>
              </ul>
              <p className="mt-3 text-gray-600 text-xs leading-relaxed">
                Questions about a program, a lesson or your child&apos;s details? Message us any time.
              </p>

              {/* Follow us */}
              <h4 className="text-white text-sm font-semibold mt-6 mb-3">Follow Us</h4>
              <ul className="flex flex-wrap gap-2">
                {SOCIAL_LINKS.map((link) => {
                  const { Icon, hover } = SOCIAL_ICONS[link.id];
                  return (
                    <li key={link.id}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Lumexa on ${link.label}`}
                        title={link.label}
                        className={`flex w-9 h-9 items-center justify-center rounded-lg border border-gray-800 text-gray-500 hover:text-white hover:border-transparent transition-colors ${hover}`}
                      >
                        <Icon className="w-4 h-4" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-800/40 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-700 text-xs">
              © {new Date().getFullYear()} Lumexa AI School. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs text-gray-600">
              <button
                onClick={() => setOpenDoc("privacy")}
                className="hover:text-gray-400 transition-colors underline-offset-2 hover:underline"
              >
                Privacy
              </button>
              <span>·</span>
              <button
                onClick={() => setOpenDoc("terms")}
                className="hover:text-gray-400 transition-colors underline-offset-2 hover:underline"
              >
                Terms
              </button>
              <span>·</span>
              <button
                onClick={() => setOpenDoc("coppa")}
                className="hover:text-gray-400 transition-colors underline-offset-2 hover:underline"
              >
                COPPA
              </button>
              <span>·</span>
              <Link href="/refund-policy" className="hover:text-gray-400 transition-colors underline-offset-2 hover:underline">
                Refund Policy
              </Link>
              <span>·</span>
              <Link href="/teacher-dashboard" className="hover:text-gray-400 transition-colors underline-offset-2 hover:underline">
                Teacher Hub
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Legal modal */}
      {openDoc && doc && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setOpenDoc(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] bg-[#0D1B2E] border border-gray-700 rounded-2xl shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
              <h2 className="text-white font-black text-lg">{doc.title}</h2>
              <button
                onClick={() => setOpenDoc(null)}
                className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-all text-sm"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            {/* Body */}
            {/* The footer outlives page navigation, so a link inside a policy must close the modal. */}
            <div
              className="overflow-y-auto flex-1 px-6 py-5"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) setOpenDoc(null);
              }}
            >
              {doc.body}
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-800 flex-shrink-0">
              <button
                onClick={() => setOpenDoc(null)}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
