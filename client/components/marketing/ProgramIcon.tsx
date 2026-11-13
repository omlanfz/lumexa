import type { ProgramMeta } from "@/lib/programs";

/*
  A program's icon on the marketing pages.

  Most programs are shown as their emoji on the program's own gradient. A program with a brand
  mark (Python Foundations has the Python logo) shows the mark instead, on a white tile, so the
  logo keeps its own colours in light and dark mode alike. `className` sets the size of the tile
  (and anything else the card wants, such as a hover animation).
*/

type IconProgram = Pick<ProgramMeta, "emoji" | "logo" | "color" | "title">;

export default function ProgramIcon({
  program,
  className = "w-12 h-12 text-2xl",
  bare = false,
  logoClassName = "w-10 h-10 sm:w-12 sm:h-12",
}: {
  program: IconProgram;
  /** Size, text size and any animation of the tile (or, when `bare`, of the emoji). */
  className?: string;
  /** No tile: just the emoji or the mark (used in large headings). */
  bare?: boolean;
  /** Size of the mark when `bare` (the emoji is sized by `className`). */
  logoClassName?: string;
}) {
  if (bare) {
    return program.logo ? (
      // eslint-disable-next-line @next/next/no-img-element -- a small fixed local SVG, next/image adds nothing here
      <img src={program.logo} alt="" aria-hidden className={`flex-none object-contain ${logoClassName}`} />
    ) : (
      <span aria-hidden className={className}>
        {program.emoji}
      </span>
    );
  }

  if (program.logo) {
    return (
      <div
        className={`flex-none grid place-items-center rounded-xl bg-white ring-1 ring-sky-200 dark:ring-sky-700/60 shadow-sm ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a small fixed local SVG, next/image adds nothing here */}
        <img src={program.logo} alt="" aria-hidden className="w-[62%] h-[62%] object-contain" />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={`flex-none grid place-items-center rounded-xl bg-gradient-to-br ${program.color} shadow-sm ${className}`}
    >
      {program.emoji}
    </div>
  );
}
