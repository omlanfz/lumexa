"use client";

// "Preview template": the FINISHED certificate design, for an admin to check before
// any student has one (and any time the design or a programme's category changes).
//
// It is the same template and the same renderer as a real certificate — only
// watermarked "PREVIEW — NOT ISSUED" and carrying a placeholder ID that never exists.
// Nothing is issued, stored, recorded or emailed, so it can be used freely in
// production. Pick a theme to see its colours (and which programmes get it), type any
// name to try long or unusual text, and open the sample as a PDF to check it as it
// prints.

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, todayDhakaDateStr } from "@/components/admin/AdminUI";
import { adminCertificates } from "@/lib/certificates/api";
import { openInNewTab } from "@/lib/certificates/files";
import { apiErrorMessage } from "@/lib/certificates/format";
import type { CertificateDetailsInput, ThemesResponse } from "@/lib/certificates/types";
import { ImageFrame } from "./AdminCertificateImage";
import { BTN_GHOST, BTN_PRIMARY, Field, INPUT, detailsProblem } from "./shared";

/** Realistic sample text so the typography can be judged; the admin can type anything. */
const SAMPLE_NAME = "Alex Rahman";
const SAMPLE_PROGRAM = "AI Builder";

const sampleDefaults = (): CertificateDetailsInput => ({
  recipientName: SAMPLE_NAME,
  programName: SAMPLE_PROGRAM,
  completionDate: todayDhakaDateStr(),
  withDistinction: false,
});

export default function TemplatePreviewModal({ onClose }: { onClose: () => void }) {
  const [themes, setThemes] = useState<ThemesResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [theme, setTheme] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState(SAMPLE_NAME);
  const [programName, setProgramName] = useState(SAMPLE_PROGRAM);
  const [completionDate, setCompletionDate] = useState(todayDhakaDateStr());
  const [withDistinction, setWithDistinction] = useState(false);

  const [image, setImage] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [openingPdf, setOpeningPdf] = useState(false);
  // Only the newest request may change what is on screen (renders can finish out of order).
  const latest = useRef(0);

  const fields: CertificateDetailsInput = { recipientName, programName, completionDate, withDistinction };
  const problem = detailsProblem(fields);

  /** Renders the sample PNG for a theme and shows it. Takes everything it needs as
   * arguments (only stable setters inside), so the first render and later ones are
   * one code path. */
  const generate = useCallback(async (themeKey: string, sample: CertificateDetailsInput) => {
    const bad = detailsProblem(sample);
    if (bad) {
      setRenderError(bad);
      return;
    }
    const mine = ++latest.current;
    setRendering(true);
    setRenderError(null);
    try {
      const blob = await adminCertificates.templatePreview({
        theme: themeKey,
        recipientName: sample.recipientName.trim(),
        programName: sample.programName.trim(),
        completionDate: sample.completionDate,
        withDistinction: sample.withDistinction,
        format: "png",
      });
      if (mine !== latest.current) return;
      setImage(URL.createObjectURL(blob));
    } catch (err) {
      if (mine === latest.current) setRenderError(apiErrorMessage(err, "The preview could not be generated."));
    } finally {
      if (mine === latest.current) setRendering(false);
    }
  }, []);

  // Load the themes, then show the first one straight away.
  useEffect(() => {
    let alive = true;
    adminCertificates
      .themes()
      .then((t) => {
        if (!alive) return;
        setThemes(t);
        const first = t.themes[0]?.key ?? null;
        setTheme(first);
        if (first) void generate(first, sampleDefaults());
      })
      .catch((err) => alive && setLoadError(apiErrorMessage(err, "Couldn't load the certificate themes.")));
    return () => {
      alive = false;
    };
  }, [generate]);

  // Release each picture's object URL when it is replaced or the dialog closes.
  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image);
    };
  }, [image]);

  const chooseTheme = (key: string) => {
    setTheme(key);
    void generate(key, fields);
  };

  const openPdf = async () => {
    if (!theme) return;
    if (problem) {
      setRenderError(problem);
      return;
    }
    setOpeningPdf(true);
    setRenderError(null);
    try {
      await openInNewTab(() =>
        adminCertificates.templatePreview({
          theme,
          recipientName: recipientName.trim(),
          programName: programName.trim(),
          completionDate,
          withDistinction,
          format: "pdf",
        }),
      );
    } catch (err) {
      setRenderError(apiErrorMessage(err, "The sample PDF could not be generated."));
    } finally {
      setOpeningPdf(false);
    }
  };

  return (
    <Modal title="Preview the certificate design" onClose={onClose} wide>
      <div className="space-y-5" data-testid="template-preview">
        <p className="rounded-lg bg-[var(--a-info-bg)] px-3 py-2.5 text-sm text-[var(--a-info)]">
          This is the finished design, exactly as it is issued — the same template and renderer — but watermarked and with
          a placeholder ID. <strong>Nothing is issued, stored or emailed</strong>, so it is safe to use any time.
          {themes && (
            <>
              {" "}
              Certificates issued today use design <strong data-testid="template-version">{themes.templateVersion}</strong>.
            </>
          )}
        </p>

        {loadError && <p className="text-sm text-[var(--a-danger)]">{loadError}</p>}
        {!themes && !loadError && <p className="text-sm text-[var(--a-text-faint)]">Loading…</p>}

        {themes && (
          <>
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                Theme (colours follow the programme&apos;s category)
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Theme">
                {themes.themes.map((t) => {
                  const selected = theme === t.key;
                  const names = t.programs.map((p) => p.title);
                  return (
                    <button
                      key={t.key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => chooseTheme(t.key)}
                      data-testid={`theme-${t.key}`}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        selected
                          ? "border-[var(--a-accent)] bg-[var(--a-nav-active)]"
                          : "border-[var(--a-border)] hover:bg-[var(--a-nav-hover)]"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-[var(--a-text)]">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full border border-black/10"
                          style={{ background: t.color }}
                          aria-hidden
                        />
                        {t.label}
                        <span className="text-xs font-normal text-[var(--a-text-faint)]">· {t.accent}</span>
                      </span>
                      <span className="mt-1 block text-xs text-[var(--a-text-muted)]">
                        {names.length === 0
                          ? "No programme uses this theme yet."
                          : `Used by ${names.length} programme${names.length === 1 ? "" : "s"}: ${names.slice(0, 3).join(", ")}${names.length > 3 ? ` and ${names.length - 3} more` : ""}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                Sample text (try a long or unusual name)
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Name on the certificate">
                  <input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    maxLength={60}
                    className={INPUT}
                    data-testid="template-name"
                  />
                </Field>
                <Field label="Program name">
                  <input
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    maxLength={80}
                    className={INPUT}
                    data-testid="template-program"
                  />
                </Field>
                <Field label="Completion date">
                  <input
                    type="date"
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className={INPUT}
                  />
                </Field>
                <label className="flex items-start gap-2.5 self-end rounded-lg border border-[var(--a-border)] px-3 py-2.5 text-sm text-[var(--a-text)]">
                  <input
                    type="checkbox"
                    checked={withDistinction}
                    onChange={(e) => setWithDistinction(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Show the <strong>With Distinction</strong> line
                  </span>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className={BTN_PRIMARY}
                  onClick={() => theme && void generate(theme, fields)}
                  disabled={rendering || !theme || !!problem}
                  data-testid="template-refresh"
                >
                  {rendering ? "Generating…" : "Update preview"}
                </button>
                <button
                  className={BTN_GHOST}
                  onClick={() => void openPdf()}
                  disabled={openingPdf || !theme || !!problem}
                  data-testid="template-open-pdf"
                >
                  {openingPdf ? "Preparing PDF…" : "Open sample PDF ↗"}
                </button>
              </div>
              {(problem || renderError) && (
                <p className="text-sm text-[var(--a-danger)]" data-testid="template-error">
                  {renderError ?? problem}
                </p>
              )}
            </section>

            <ImageFrame
              url={image}
              loading={rendering && !image}
              failed={!!renderError && !image}
              alt="Watermarked sample of the finished certificate"
              emptyLabel="Preview"
            />
            {rendering && image && (
              <p className="text-xs text-[var(--a-text-faint)]">Updating the preview…</p>
            )}
            <p className="text-xs text-[var(--a-text-faint)]">
              The PNG is what is shared on social media; the PDF is what is printed and emailed. Both are produced by the same
              renderer when a certificate is approved.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
