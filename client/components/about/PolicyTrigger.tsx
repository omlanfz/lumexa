"use client";

import { useState, type ReactNode } from "react";
import PolicyModal from "@/components/marketing/PolicyModal";
import type { PolicyDocId } from "@/components/marketing/policyDocs";

/** Any element that opens one of the site's policy pop-ups. Server pages pass
 *  in the card or button content as children. */
export default function PolicyTrigger({
  doc,
  className,
  children,
}: {
  doc: PolicyDocId;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {children}
      </button>
      <PolicyModal doc={open ? doc : null} onClose={() => setOpen(false)} />
    </>
  );
}
