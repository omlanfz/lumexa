import type { ReactNode } from "react";
import Link from "next/link";
import { CONTACT_EMAIL, WHATSAPP_DISPLAY } from "@/lib/siteContact";
import { REFUND_POLICY_SECTIONS, REFUND_POLICY_UPDATED } from "@/lib/refundPolicy";

// The policy and standards documents shown in pop-ups from the footer and the
// About page. Written for a dark pop-up surface (see PolicyModal).

export type PolicyDocId = "privacy" | "terms" | "child-safety" | "refund" | "teaching-standards";

const h3 = "text-white font-semibold mb-1";
const link = "text-purple-400 underline underline-offset-2 hover:text-purple-300";

export const POLICY_DOCS: Record<PolicyDocId, { title: string; body: ReactNode }> = {
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
          <p>We retain your account data for as long as your account is active. Class recordings are retained for 90 days. You may request deletion of your data at any time by contacting {CONTACT_EMAIL}.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">5. Security</h3>
          <p>All data is transmitted over TLS encryption. Payment data is processed exclusively by Stripe and never stored on our servers. We implement industry-standard security practices.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">6. Your Rights</h3>
          <p>You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at {CONTACT_EMAIL}. We will respond within 30 days.</p>
        </section>
        <section>
          <h3 className="text-white font-semibold mb-1">7. Contact</h3>
          <p>Lumexa AI School · {CONTACT_EMAIL} · WhatsApp: {WHATSAPP_DISPLAY}</p>
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
          <p>Lumexa AI School · {CONTACT_EMAIL} · WhatsApp: {WHATSAPP_DISPLAY}</p>
        </section>
      </div>
    ),
  },
  "teaching-standards": {
    title: "Our Teaching Standards",
    body: (
      <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
        <p>
          Knowing how to code and knowing how to teach children are two different skills. Lumexa selects teachers for
          their subject knowledge, teaching ability, and ability to communicate patiently with young learners. Every
          teacher goes through three stages: screening, preparation and ongoing review.
        </p>
        <section>
          <h3 className={h3}>1. Screening: who can teach</h3>
          <p>
            Before teaching a single class, a teacher completes a profile with a photo, a teaching bio and the age
            groups they teach. They verify their identity with a National ID or birth certificate and submit their
            academic or teaching credentials, such as a bachelor&apos;s or master&apos;s degree certificate or a
            teaching certificate. A criminal background check from an approved agency can be added as a further layer
            of verification.
          </p>
          <p className="mt-2">
            Lumexa&apos;s team reviews these documents by hand. A teacher is verified only once the profile is 100%
            complete and has passed that review, and verified documents are locked so they cannot be swapped
            afterwards.
          </p>
        </section>
        <section>
          <h3 className={h3}>2. Preparation: ready for the program they teach</h3>
          <p>
            Teachers are matched to the programs they are assigned and work from the curriculum for that program:
            its course structure, lesson objectives, lesson content, review notes, project checkpoints and homework.
            They also follow Lumexa&apos;s teacher guidelines, which cover joining class on time, treating every
            student with respect and keeping the classroom professional.
          </p>
        </section>
        <section>
          <h3 className={h3}>3. Ongoing review: quality is checked continuously</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Parents&apos; and students&apos; reviews and ratings appear on each teacher&apos;s profile.</li>
            <li>Classes may be recorded for quality and safety review.</li>
            <li>Punctuality and attendance are tracked, and missing a class without notice results in an automatic strike.</li>
            <li>Reports of misconduct are reviewed by the Lumexa team. After repeated strikes a teacher&apos;s account is suspended until it has been reviewed.</li>
          </ul>
        </section>
        <section>
          <h3 className={h3}>Questions about a teacher?</h3>
          <p>
            Parents can contact their child&apos;s assigned teacher and Lumexa&apos;s support team directly at{" "}
            {CONTACT_EMAIL} or on WhatsApp at {WHATSAPP_DISPLAY}.
          </p>
        </section>
      </div>
    ),
  },
  "child-safety": {
    title: "Child Safety Policy",
    body: (
      <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
        <p><strong className="text-white">Last updated: October 2026</strong></p>
        <section>
          <h3 className={h3}>1. Our Commitment</h3>
          <p>Lumexa AI School teaches children aged 6 to 18, and their safety comes first. This policy explains how we protect students in our live classes, how we expect teachers to communicate with children, and how you can raise a concern.</p>
        </section>
        <section>
          <h3 className={h3}>2. Verified Teachers</h3>
          <p>Every teacher verifies their identity and submits academic or teaching credentials, which Lumexa reviews before the profile is verified. Teachers also follow Lumexa&apos;s conduct guidelines. You can read how we select and review teachers under &ldquo;Our Teaching Standards&rdquo; on the About page.</p>
        </section>
        <section>
          <h3 className={h3}>3. Safe Live Classes</h3>
          <p>Lessons take place in Lumexa&apos;s own live classroom, with one teacher and either one student or a small batch of 2 to 4 students. Sessions may be recorded for quality and safety review, and parents have access to their child&apos;s session recordings.</p>
        </section>
        <section>
          <h3 className={h3}>4. Appropriate Communication</h3>
          <p>Teachers are expected to keep every interaction professional, respectful and focused on learning. Parents can contact their child&apos;s assigned teacher and Lumexa&apos;s support team directly about learning, scheduling or technical issues, so you always know who your child is learning with.</p>
        </section>
        <section>
          <h3 className={h3}>5. Reporting a Concern</h3>
          <p>If anything about a class, a teacher&apos;s conduct or a message worries you, please tell us straight away by email or WhatsApp. Every report of misconduct is reviewed by the Lumexa team, and teachers who breach our conduct standards receive warnings and can be suspended.</p>
        </section>
        <section>
          <h3 className={h3}>6. Children&apos;s Privacy (COPPA)</h3>
          <p>We comply with the Children&apos;s Online Privacy Protection Act (COPPA). All child profiles are created and managed by a verified parent or guardian, and we ask for explicit parental consent before any child data is collected. We collect only what is necessary, a child&apos;s first name and age, and we do not share, sell or disclose children&apos;s personal information to third parties except as required by law or to provide our core educational services (for example, the video conferencing platform).</p>
          <p className="mt-2">Parents may ask to review, correct or delete their child&apos;s information at any time. We respond to these requests within 5 business days.</p>
        </section>
        <section>
          <h3 className={h3}>Contact</h3>
          <p>Lumexa AI School · {CONTACT_EMAIL} · WhatsApp: {WHATSAPP_DISPLAY}</p>
        </section>
      </div>
    ),
  },
  refund: {
    title: "Refund Policy",
    body: (
      <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
        <p><strong className="text-white">Last updated: {REFUND_POLICY_UPDATED}</strong></p>
        {REFUND_POLICY_SECTIONS.map((section) => (
          <section key={section.id}>
            <h3 className={h3}>{section.heading}</h3>
            <div className="space-y-2">
              {section.paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>
          </section>
        ))}
        <section>
          <h3 className={h3}>Requesting a Refund</h3>
          <p>To request a cancellation or a refund, contact us at {CONTACT_EMAIL} or on WhatsApp at {WHATSAPP_DISPLAY}, and include your child&apos;s name and the program they are enrolled in. You can also read this policy on its own page: <Link href="/refund-policy" className={link}>Refund Policy</Link>.</p>
        </section>
      </div>
    ),
  },
};
