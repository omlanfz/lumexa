// FILE PATH: client/app/(marketing)/trial/page.tsx
//
// Free 30-minute trial class booking. No login required.
//
// Flow: the parent picks a real open time (TrialSlotPicker), fills in a short
// form, and submits to POST /trial. The booking exists — and the confirmed
// screen is shown — only after the backend has saved it and replied 201.
// Any failure (slot just taken, validation, network) keeps the form as it is
// and says plainly that nothing was booked.

"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import TrialSlotPicker from "@/components/marketing/TrialSlotPicker";
import { ALL_PROGRAMS, getProgram, resolveProgramId, trialSubjectLabel } from "@/lib/programs";
import { FORMATS, resolveFormat } from "@/lib/pricing";
import { CONTACT_EMAIL, CONTACT_MAILTO, WHATSAPP_DISPLAY, WHATSAPP_URL } from "@/lib/siteContact";
import { normalizePhone } from "@/lib/phone";
import {
  PublicBooking,
  TRIAL_DURATION_MINUTES,
  TRIAL_MAX_AGE,
  TRIAL_MIN_AGE,
  TRIAL_TIMEZONE_LABEL,
  apiErrorMessage,
  formatDhakaLongDate,
  formatDhakaTime,
  formatViewerRange,
} from "@/lib/trial";

const NOT_SURE = "Not sure yet, help me choose";
const subjects = [...ALL_PROGRAMS.map(trialSubjectLabel), NOT_SURE];

// Preferred learning format. Optional: families who have not decided can leave it.
const formatOptions = [
  { value: "private", label: FORMATS.private.label },
  { value: "batch", label: FORMATS.batch.label },
  { value: "unsure", label: "Not sure yet, advise me" },
];

interface FormState {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  childAge: string;
  subject: string;
  format: string;
  message: string;
  consent: boolean;
}

type Errors = Partial<Record<keyof FormState | "slot", string>>;

interface Confirmation {
  booking: PublicBooking;
  email: string;
  whatsapp: boolean;
  alreadyBooked: boolean;
}

const inputClass =
  "w-full bg-[#F7F9FF] dark:bg-black/60 border focus:border-purple-500 outline-none rounded-lg p-3 text-[#0F172A] dark:text-white text-sm placeholder-[#94A3B8] dark:placeholder-gray-600 transition-colors";
const border = (bad?: string) => (bad ? "border-red-400 dark:border-red-500/70" : "border-[#E2E8F0] dark:border-gray-700");
const labelClass = "block text-xs text-[#64748B] dark:text-gray-400 uppercase tracking-wider mb-1";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

function validate(form: FormState, slot: string | null): Errors {
  const e: Errors = {};
  if (!slot) e.slot = "Please choose a day and time for the trial class.";
  if (form.parentName.trim().length < 2) e.parentName = "Please enter your name.";
  if (!/^\S+@\S+\.\S+$/.test(form.parentEmail.trim())) e.parentEmail = "Please enter a valid email address.";
  const phone = normalizePhone(form.parentPhone);
  if (!phone.ok) e.parentPhone = phone.reason;
  if (form.childName.trim().length < 2) e.childName = "Please enter your child's name.";
  const age = Number(form.childAge);
  if (form.childAge.trim() === "" || !Number.isInteger(age) || age < TRIAL_MIN_AGE || age > TRIAL_MAX_AGE) {
    e.childAge = `Trial classes are for ages ${TRIAL_MIN_AGE} to ${TRIAL_MAX_AGE}.`;
  }
  if (!form.subject) e.subject = "Please choose a program (or “Not sure yet”).";
  if (!form.consent) e.consent = "Please tick this box so we can send your confirmation and reminder on WhatsApp.";
  return e;
}

function TrialForm() {
  const searchParams = useSearchParams();
  // /programs and /pricing link here with ?program=ai&format=batch so the
  // family's choice arrives already selected.
  const programId = resolveProgramId(searchParams.get("program"));
  const formatParam = resolveFormat(searchParams.get("format"));

  const [form, setForm] = useState<FormState>(() => ({
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    childName: "",
    childAge: "",
    subject: programId ? trialSubjectLabel(getProgram(programId)) : "",
    format: formatParam ?? "",
    message: "",
    consent: false,
  }));
  const [slot, setSlot] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const set =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const pickSlot = useCallback((iso: string | null) => {
    setSlot(iso);
    if (iso) setErrors((prev) => ({ ...prev, slot: undefined }));
  }, []);

  const formatLabel =
    form.format === "private" || form.format === "batch" ? FORMATS[form.format].label : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setSubmitError("");
    const found = validate(form, slot);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Move the parent to the first thing that needs fixing.
      const first = document.querySelector<HTMLElement>("[data-invalid='true']");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const phone = normalizePhone(form.parentPhone);
    if (!phone.ok || !slot) return;

    setLoading(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/trial`, {
        parentName: form.parentName.trim(),
        parentEmail: form.parentEmail.trim(),
        parentPhone: phone.e164,
        childName: form.childName.trim(),
        childAge: Number(form.childAge),
        // The format preference rides along in `subject`, which the team sees with the booking.
        subject: formatLabel ? `${form.subject} · ${formatLabel}` : form.subject,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
        message: form.message.trim() || undefined,
        startAt: slot,
        whatsappConsent: form.consent,
      });
      // Only a 201 with a booking in the body counts as booked.
      if (!res.data?.success || !res.data?.booking) {
        throw new Error("Unexpected response");
      }
      setConfirmation({
        booking: res.data.booking,
        email: res.data.confirmationEmailTo ?? form.parentEmail.trim(),
        whatsapp: Boolean(res.data.whatsappConfirmation),
        alreadyBooked: Boolean(res.data.alreadyBooked),
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 409) {
        // The chosen time was taken (or availability changed) a moment ago.
        const msg = apiErrorMessage(err, "That time is no longer available.");
        if (/already has a trial/i.test(msg)) {
          setSubmitError(msg);
        } else {
          setSlot(null);
          setRefreshKey((k) => k + 1);
          setSubmitError(`${msg} Nothing has been booked yet. Please choose another time below.`);
        }
      } else if (status && status >= 400 && status < 500) {
        setSubmitError(`${apiErrorMessage(err, "Please check your details and try again.")} Nothing has been booked.`);
      } else {
        setSubmitError(
          "We couldn't reach our server, so your trial class has NOT been booked. Please try again in a moment, or message us on WhatsApp and we'll book it for you.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (confirmation) {
    return <ConfirmedScreen c={confirmation} />;
  }

  const startIso = slot;
  const endIso = slot ? new Date(new Date(slot).getTime() + TRIAL_DURATION_MINUTES * 60_000).toISOString() : null;
  const viewer = startIso && endIso ? formatViewerRange(startIso, endIso) : null;

  return (
    <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
        {/* Left: why a trial */}
        <div className="lg:col-span-2 lg:sticky lg:top-24">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-300 dark:border-purple-700/40 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Free · {TRIAL_DURATION_MINUTES} minutes · Ages {TRIAL_MIN_AGE}–{TRIAL_MAX_AGE}
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-[#0F172A] dark:text-white mb-4 leading-tight">
            Book your child&apos;s free {TRIAL_DURATION_MINUTES}-minute trial class
          </h1>
          <p className="text-[#64748B] dark:text-gray-400 leading-relaxed mb-6">
            Pick a time that suits your family. Your spot is reserved the moment you confirm. There&apos;s nothing to pay and
            no pressure to enrol afterwards.
          </p>

          <div className="space-y-4 mb-8">
            {[
              {
                icon: "🎮",
                title: "Your child tries something real",
                desc: "A short, hands-on learning activity with a Lumexa teacher, not a sales pitch.",
              },
              {
                icon: "👀",
                title: "You see how we teach",
                desc: "Sit in and watch how the teacher explains, encourages and adapts to your child.",
              },
              {
                icon: "🧭",
                title: "We suggest a good next step",
                desc: "Afterwards we recommend what could suit your child, and you decide if and when.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <div className="text-[#0F172A] dark:text-white font-semibold text-sm">{item.title}</div>
                  <div className="text-[#64748B] dark:text-gray-500 text-xs mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-[#64748B] dark:text-gray-400 mb-6">
            Not sure which program fits?{" "}
            <Link href="/programs" className="font-semibold text-purple-600 dark:text-purple-400 hover:underline underline-offset-2">
              Explore our programs
            </Link>
            .
          </p>

          <div className="p-4 bg-white dark:bg-gray-900/40 border border-[#E2E8F0] dark:border-gray-800 rounded-xl">
            <p className="text-[#94A3B8] dark:text-gray-500 text-xs mb-2 font-semibold">Prefer to talk to a person?</p>
            <div className="flex flex-col gap-2">
              <a href={CONTACT_MAILTO} className="flex items-center gap-2 text-xs text-[#64748B] dark:text-gray-400 hover:text-[#0F172A] dark:hover:text-white transition-colors">
                <span aria-hidden>📧</span>
                <span>{CONTACT_EMAIL}</span>
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
              >
                <span aria-hidden>💬</span>
                <span>WhatsApp: {WHATSAPP_DISPLAY}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right: picker + form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-3 bg-white dark:bg-gray-900/70 border border-[#E2E8F0] dark:border-gray-700 rounded-2xl p-5 sm:p-8 shadow-sm dark:shadow-none space-y-6"
        >
          {/* Step 1 */}
          <section aria-labelledby="step-time" data-invalid={errors.slot ? "true" : undefined}>
            <h2 id="step-time" className="text-base font-bold text-[#0F172A] dark:text-white mb-1">
              1. Choose a day and time
            </h2>
            <p className="text-xs text-[#94A3B8] dark:text-gray-500 mb-3">
              Every time shown is open right now. Sessions last {TRIAL_DURATION_MINUTES} minutes.
            </p>
            <TrialSlotPicker value={slot} onChange={pickSlot} refreshKey={refreshKey} invalid={Boolean(errors.slot)} />
            <FieldError id="err-slot" message={errors.slot} />
          </section>

          {/* Step 2 */}
          <section aria-labelledby="step-details" className="space-y-4">
            <h2 id="step-details" className="text-base font-bold text-[#0F172A] dark:text-white">
              2. About you and your child
            </h2>

            <div data-invalid={errors.parentName ? "true" : undefined}>
              <label htmlFor="parentName" className={labelClass}>Your name (parent / guardian)</label>
              <input
                id="parentName"
                type="text"
                autoComplete="name"
                value={form.parentName}
                onChange={set("parentName")}
                maxLength={80}
                placeholder="e.g. Sarah Rahman"
                aria-invalid={Boolean(errors.parentName)}
                aria-describedby={errors.parentName ? "err-parentName" : undefined}
                className={`${inputClass} ${border(errors.parentName)}`}
              />
              <FieldError id="err-parentName" message={errors.parentName} />
            </div>

            <div data-invalid={errors.parentEmail ? "true" : undefined}>
              <label htmlFor="parentEmail" className={labelClass}>Your email</label>
              <input
                id="parentEmail"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.parentEmail}
                onChange={set("parentEmail")}
                placeholder="e.g. sarah@email.com"
                aria-invalid={Boolean(errors.parentEmail)}
                aria-describedby={errors.parentEmail ? "err-parentEmail" : undefined}
                className={`${inputClass} ${border(errors.parentEmail)}`}
              />
              <FieldError id="err-parentEmail" message={errors.parentEmail} />
            </div>

            <div data-invalid={errors.parentPhone ? "true" : undefined}>
              <label htmlFor="parentPhone" className={labelClass}>WhatsApp / phone number</label>
              <input
                id="parentPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.parentPhone}
                onChange={set("parentPhone")}
                placeholder="e.g. 01712 345678 or +44 7700 900123"
                aria-invalid={Boolean(errors.parentPhone)}
                aria-describedby={errors.parentPhone ? "err-parentPhone" : "hint-parentPhone"}
                className={`${inputClass} ${border(errors.parentPhone)}`}
              />
              <p id="hint-parentPhone" className="mt-1 text-[11px] text-[#94A3B8] dark:text-gray-500">
                Bangladeshi numbers work as you normally write them. From abroad, start with + and your country code.
              </p>
              <FieldError id="err-parentPhone" message={errors.parentPhone} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2" data-invalid={errors.childName ? "true" : undefined}>
                <label htmlFor="childName" className={labelClass}>Child&apos;s name</label>
                <input
                  id="childName"
                  type="text"
                  value={form.childName}
                  onChange={set("childName")}
                  maxLength={50}
                  placeholder="e.g. Alex"
                  aria-invalid={Boolean(errors.childName)}
                  aria-describedby={errors.childName ? "err-childName" : undefined}
                  className={`${inputClass} ${border(errors.childName)}`}
                />
                <FieldError id="err-childName" message={errors.childName} />
              </div>
              <div data-invalid={errors.childAge ? "true" : undefined}>
                <label htmlFor="childAge" className={labelClass}>Child&apos;s age</label>
                <input
                  id="childAge"
                  type="number"
                  inputMode="numeric"
                  value={form.childAge}
                  onChange={set("childAge")}
                  min={TRIAL_MIN_AGE}
                  max={TRIAL_MAX_AGE}
                  placeholder={`${TRIAL_MIN_AGE}–${TRIAL_MAX_AGE}`}
                  aria-invalid={Boolean(errors.childAge)}
                  aria-describedby={errors.childAge ? "err-childAge" : undefined}
                  className={`${inputClass} ${border(errors.childAge)}`}
                />
              </div>
              <div className="sm:col-span-3 -mt-2">
                <FieldError id="err-childAge" message={errors.childAge} />
              </div>
            </div>

            <div data-invalid={errors.subject ? "true" : undefined}>
              <label htmlFor="subject" className={labelClass}>Program of interest</label>
              <select
                id="subject"
                value={form.subject}
                onChange={set("subject")}
                aria-invalid={Boolean(errors.subject)}
                aria-describedby={errors.subject ? "err-subject" : undefined}
                className={`${inputClass} ${border(errors.subject)}`}
              >
                <option value="">Select a program…</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <FieldError id="err-subject" message={errors.subject} />
            </div>

            <div>
              <label htmlFor="format" className={labelClass}>Preferred learning format (optional)</label>
              <select id="format" value={form.format} onChange={set("format")} className={`${inputClass} ${border()}`}>
                <option value="">Choose a format…</option>
                {formatOptions.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="message" className={labelClass}>Anything we should know? (optional)</label>
              <textarea
                id="message"
                value={form.message}
                onChange={set("message")}
                rows={3}
                maxLength={500}
                placeholder="e.g. My child has no experience but loves Minecraft…"
                className={`${inputClass} ${border()} resize-none`}
              />
            </div>
          </section>

          {/* Review + consent + submit */}
          <section aria-labelledby="step-confirm" className="space-y-4">
            <h2 id="step-confirm" className="text-base font-bold text-[#0F172A] dark:text-white">
              3. Review and confirm
            </h2>

            <div
              className={`rounded-xl border p-4 text-sm ${
                slot
                  ? "border-purple-200 dark:border-purple-800/50 bg-purple-50/60 dark:bg-purple-900/10"
                  : "border-dashed border-[#CBD5E1] dark:border-gray-700 text-[#94A3B8] dark:text-gray-500"
              }`}
              aria-live="polite"
            >
              {slot && startIso && endIso ? (
                <>
                  <div className="text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300 mb-1">
                    Your trial class
                  </div>
                  <div className="font-bold text-[#0F172A] dark:text-white">{formatDhakaLongDate(startIso)}</div>
                  <div className="text-[#0F172A] dark:text-gray-200">
                    {formatDhakaTime(startIso)} – {formatDhakaTime(endIso)}{" "}
                    <span className="text-[#64748B] dark:text-gray-400">({TRIAL_TIMEZONE_LABEL})</span>
                  </div>
                  {viewer && (
                    <div className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
                      In your time zone ({viewer.zone}): {viewer.text}
                    </div>
                  )}
                  <div className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
                    {TRIAL_DURATION_MINUTES} minutes · free · online
                  </div>
                </>
              ) : (
                "Choose a day and time above to see your appointment here."
              )}
            </div>

            <div data-invalid={errors.consent ? "true" : undefined}>
              <label className="flex items-start gap-3 text-sm text-[#475569] dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, consent: e.target.checked }));
                    setErrors((prev) => ({ ...prev, consent: undefined }));
                  }}
                  aria-invalid={Boolean(errors.consent)}
                  aria-describedby={errors.consent ? "err-consent" : undefined}
                  className="mt-1 h-4 w-4 flex-shrink-0 accent-purple-600"
                />
                <span>
                  I agree that Lumexa AI School may message me on WhatsApp at this number about this trial class only: a
                  booking confirmation and one reminder.
                </span>
              </label>
              <FieldError id="err-consent" message={errors.consent} />
            </div>

            {submitError && (
              <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-xl p-4">
                <p className="text-red-600 dark:text-red-400 text-sm font-semibold">{submitError}</p>
                <p className="text-[#94A3B8] dark:text-gray-500 text-xs mt-2">
                  Need a hand? <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-400 font-semibold">WhatsApp {WHATSAPP_DISPLAY}</a>{" "}
                  or <a href={CONTACT_MAILTO} className="text-blue-600 dark:text-blue-400 font-semibold">{CONTACT_EMAIL}</a>.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-purple-200 dark:shadow-purple-900/40 transition-all active:scale-[0.99]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving your booking…
                </span>
              ) : (
                <>
                  Confirm my free trial class
                  <span className="block text-xs font-normal opacity-80">
                    Your time is reserved as soon as you confirm
                  </span>
                </>
              )}
            </button>

            <p className="text-[#94A3B8] dark:text-gray-600 text-[11px] text-center">
              Free, with no card needed and no obligation to enrol. By confirming you agree to our privacy policy. We never
              share your details.
            </p>
          </section>
        </form>
      </div>
    </div>
  );
}

function ConfirmedScreen({ c }: { c: Confirmation }) {
  const { booking } = c;
  const viewer = formatViewerRange(booking.startAt, booking.endAt);
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full text-center p-6 sm:p-8 bg-white dark:bg-gray-900/60 border border-green-200 dark:border-green-800/50 rounded-2xl shadow-xl">
        <div className="text-5xl mb-4" aria-hidden>🎉</div>
        <h1 className="text-2xl font-black text-[#0F172A] dark:text-white mb-2">
          {c.alreadyBooked ? "This trial class is already booked" : "Your trial class is confirmed"}
        </h1>
        <p className="text-[#64748B] dark:text-gray-400 text-sm leading-relaxed mb-5">
          <span className="text-[#0F172A] dark:text-white font-semibold">{booking.childName}</span>&apos;s free{" "}
          {booking.durationMinutes}-minute trial class is booked. There&apos;s nothing more you need to do to hold this time.
        </p>

        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl mb-5 text-left text-sm">
          <div className="font-bold text-[#0F172A] dark:text-white">{formatDhakaLongDate(booking.startAt)}</div>
          <div className="text-[#0F172A] dark:text-gray-200">
            {formatDhakaTime(booking.startAt)} – {formatDhakaTime(booking.endAt)}{" "}
            <span className="text-[#64748B] dark:text-gray-400">({booking.timezoneLabel})</span>
          </div>
          {viewer && (
            <div className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">
              In your time zone ({viewer.zone}): {viewer.text}
            </div>
          )}
          <div className="text-xs text-[#64748B] dark:text-gray-400 mt-2">
            {booking.program} · Reference <span className="font-mono font-semibold">{booking.reference}</span>
          </div>
        </div>

        <ul className="text-left text-xs text-[#64748B] dark:text-gray-400 space-y-1.5 mb-5">
          <li>
            📧 We&apos;re sending a confirmation to{" "}
            <span className="text-[#0F172A] dark:text-white font-semibold">{c.email}</span>.
          </li>
          {c.whatsapp && <li>💬 We&apos;re also sending it to your WhatsApp, with one reminder before the class.</li>}
          <li>⏰ Please help {booking.childName} join a few minutes early.</li>
          <li>
            🔁 Need to change the time? Message us on{" "}
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-400 font-semibold">
              WhatsApp {WHATSAPP_DISPLAY}
            </a>{" "}
            or at <a href={CONTACT_MAILTO} className="text-blue-600 dark:text-blue-400 font-semibold">{CONTACT_EMAIL}</a>.
          </li>
        </ul>

        <div className="flex flex-col gap-2">
          <Link href="/programs" className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm transition-all text-center">
            Explore our programs
          </Link>
          <Link href="/" className="text-[#94A3B8] hover:text-[#64748B] dark:hover:text-gray-300 text-sm transition-colors">
            Back to Home →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function TrialPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh]" />}>
      <TrialForm />
    </Suspense>
  );
}
