"use client";

// The programs shown across the public site, derived from the live catalog.
// Instant from the bundled snapshot, then upgraded to live data (see catalog.ts).

import { useMemo } from "react";
import { useCatalog } from "./catalog";
import { buildPrograms, type Programs } from "./programs";

export function usePrograms(): Programs {
  const { catalog } = useCatalog();
  return useMemo(() => buildPrograms(catalog), [catalog]);
}
