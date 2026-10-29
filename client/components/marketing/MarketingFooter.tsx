"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";
import { SOCIAL_LINKS, type SocialLink } from "@/lib/socialLinks";
import { CONTACT_EMAIL, WHATSAPP_URL, WHATSAPP_DISPLAY } from "@/lib/siteContact";
import PolicyModal from "./PolicyModal";
import type { PolicyDocId } from "./policyDocs";
import { FacebookIcon, InstagramIcon, LinkedInIcon, WhatsAppIcon, YouTubeIcon } from "./SocialIcons";

const SOCIAL_ICONS: Record<SocialLink["id"], { Icon: typeof FacebookIcon; hover: string }> = {
  facebook: { Icon: FacebookIcon, hover: "hover:bg-[#1877F2]" },
  youtube: { Icon: YouTubeIcon, hover: "hover:bg-[#FF0000]" },
  instagram: { Icon: InstagramIcon, hover: "hover:bg-[#E4405F]" },
  linkedin: { Icon: LinkedInIcon, hover: "hover:bg-[#0A66C2]" },
};

export default function MarketingFooter() {
  const [openDoc, setOpenDoc] = useState<PolicyDocId | null>(null);

  return (
    <>
      <footer className="bg-[#030810] border-t border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.4fr] gap-8">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 bg-[#0B1026]">
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
                  <button onClick={() => setOpenDoc("child-safety")} className="text-gray-500 hover:text-gray-300 transition-colors text-left">
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
                    <span>WhatsApp {WHATSAPP_DISPLAY}</span>
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
                onClick={() => setOpenDoc("child-safety")}
                className="hover:text-gray-400 transition-colors underline-offset-2 hover:underline"
              >
                COPPA
              </button>
              <span>·</span>
              <Link href="/refund-policy" className="hover:text-gray-400 transition-colors underline-offset-2 hover:underline">
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <PolicyModal doc={openDoc} onClose={() => setOpenDoc(null)} />
    </>
  );
}
