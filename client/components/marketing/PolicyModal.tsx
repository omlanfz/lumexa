"use client";

import { useEffect, useId, useRef } from "react";
import { POLICY_DOCS, type PolicyDocId } from "./policyDocs";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * A readable pop-up for the site's policies. Opened from the footer and the
 * About page. Closes with the button, the backdrop, Escape, or by following a
 * link inside it, keeps keyboard focus inside while open, and returns focus
 * to whatever opened it.
 */
export default function PolicyModal({ doc, onClose }: { doc: PolicyDocId | null; onClose: () => void }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!doc) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [doc]);

  if (!doc) return null;
  const content = POLICY_DOCS[doc];

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-2xl max-h-[85vh] bg-[#0D1B2E] border border-gray-700 rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <h2 id={titleId} className="text-white font-black text-lg">
            {content.title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-all text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {/* The footer outlives page navigation, so a link inside a policy must close the pop-up. */}
        <div
          className="overflow-y-auto flex-1 px-6 py-5"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) onClose();
          }}
        >
          {content.body}
        </div>
        <div className="px-6 py-4 border-t border-gray-800 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-sm transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
