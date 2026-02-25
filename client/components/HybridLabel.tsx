/**
 * HybridLabel — Renders the hybrid real-world + space-themed label pair.
 *
 * USAGE:
 *   <HybridLabel id="PARENT" />
 *   // renders: "Parent" (large) + "Commander" (small gray)
 *
 *   <HybridLabel id="LOGOUT" as="button-text" />
 *   // renders inline: "Logout" with subtitle below
 *
 *   <HybridLabel id="DASHBOARD" primaryClass="text-3xl font-bold text-blue-500" />
 *   // renders with custom primary class
 */

import { LABELS, LabelKey } from "@/lib/labels";

interface HybridLabelProps {
  id: LabelKey;
  /** Custom classes for the primary (real-world) label */
  primaryClass?: string;
  /** Custom classes for the theme (space) label */
  themeClass?: string;
  /** If true, only show the primary label (no subtitle) */
  primaryOnly?: boolean;
  /** If true, only show the theme label (no primary) */
  themeOnly?: boolean;
}

export function HybridLabel({
  id,
  primaryClass = "",
  themeClass = "",
  primaryOnly = false,
  themeOnly = false,
}: HybridLabelProps) {
  const label = LABELS[id];

  if (themeOnly) {
    return (
      <span className={`text-sm text-gray-400 ${themeClass}`}>
        {label.theme}
      </span>
    );
  }

  if (primaryOnly) {
    return (
      <span className={primaryClass}>{label.primary}</span>
    );
  }

  return (
    <span className="flex flex-col">
      <span className={primaryClass}>{label.primary}</span>
      <span className={`text-sm text-gray-400 ${themeClass}`}>
        {label.theme}
      </span>
    </span>
  );
}

/**
 * HybridHeading — Used for page titles with large primary + small subtitle.
 *
 * USAGE:
 *   <HybridHeading id="DASHBOARD" primaryClass="text-3xl font-bold text-blue-500" />
 */
export function HybridHeading({
  id,
  primaryClass = "text-3xl font-bold tracking-widest uppercase",
}: {
  id: LabelKey;
  primaryClass?: string;
}) {
  const label = LABELS[id];
  return (
    <div>
      <h1 className={primaryClass}>{label.primary}</h1>
      <p className="text-sm text-gray-400 mt-1">{label.theme}</p>
    </div>
  );
}

/**
 * HybridButton — Used for action buttons with real-world label + space subtitle.
 *
 * USAGE:
 *   <HybridButton id="LOGOUT" onClick={handleLogout} className="..." />
 */
export function HybridButton({
  id,
  onClick,
  className = "",
  disabled = false,
  type = "button",
}: {
  id: LabelKey;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}) {
  const label = LABELS[id];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {label.primary}
      <span className="block text-xs font-normal opacity-60">{label.theme}</span>
    </button>
  );
}
