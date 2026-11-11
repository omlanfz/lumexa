# UI motion

How things move in Lumexa, and the three traps that made most of it not work. No library is
involved — it is CSS, plus one small component (`client/components/Collapse.tsx`).

## The vocabulary (`client/app/globals.css`)

One set of durations and easings, so a hover, a menu, a dialog and a sidebar feel like one product:

| Token | Value | Used for |
|---|---|---|
| `--motion-fast` | 120 ms | hover, press, focus — things under the pointer |
| `--motion-base` | 200 ms | colour and small state changes, menus, popovers, dialogs |
| `--motion-slow` | 320 ms | panels, sidebars, expanding sections |
| `--motion-page` | 420 ms | a page or section arriving |
| `--ease-standard` | `cubic-bezier(.4,0,.2,1)` | things that stay on screen |
| `--ease-out` | `cubic-bezier(.16,1,.3,1)` | entrances: quick, then settles |
| `--ease-in` | `cubic-bezier(.4,0,1,1)` | exits |
| `--ease-drawer` | `cubic-bezier(.45,0,.25,1)` | sidebars and drawers: even pace, no overshoot |

Utilities for anything that **appears**: `.motion-fade` (backdrops), `.motion-pop` (menus,
popovers, dialogs), `.motion-sheet` (slides up from the bottom), `.motion-dialog` (a bottom sheet
on a phone, a centred card from `sm` up), `.motion-rise` (a section or card; `--motion-delay`
staggers siblings). `.fade-in` is the page/tab-panel entrance the dashboards already used;
`.modal-pop` is kept as an alias of `.motion-pop`.

Things that appear/disappear **by a button** (accordions, "show more") use
`<Collapse open={…}>` instead of `{open && …}`: a one-row grid that animates `0fr → 1fr`, so
the height animates in both directions without measuring anything. Closed, it has no height, is
invisible and `inert`.

Inline `role="alert"` / `role="status"` messages animate in automatically (one rule covers every
error and success message in the app).

## Reduced motion

One block in the base layer of `globals.css` makes every transition instant and every animation
jump to its end state under `prefers-reduced-motion: reduce` — for everything, including
animations added later. `.animate-spin` and anything marked
`data-motion-essential` are exempt (motion that carries meaning). Smooth scrolling is turned off
next to the `html` rule.

## The three traps (all were live in the app)

1. **An unlayered rule beats every Tailwind utility.** Tailwind v4 puts utilities in
   `@layer utilities`; an unlayered rule wins over any layered one whatever its specificity. The
   old global default (`* { transition-property: colours; transition-duration: 200ms }`) was
   unlayered, so every `transition-all`, `transition-transform`, `transition-opacity`,
   `duration-*` and `ease-*` class in the app silently did nothing, and the lesson sidebar's own
   transitions never ran. The default now lives in `@layer base`. **Put global defaults in a layer.**
2. **A finished `forwards` animation leaves a transform behind.** In Chromium even a last
   keyframe of `transform: none` is held as an identity matrix, and *any* transform makes the
   element the containing block of its `position: fixed` descendants. The dashboards wrap every
   page in `<div className="fade-in">`, so modals and drawers rendered inside a page were
   positioned against the page instead of the window (`AdminUI`'s modal had to be portalled to
   escape it). Entrance animations use `backwards` fill, so the element is handed back to its normal
   style when it ends. **Never use `forwards`/`both` for an entrance that wraps content.**
3. **`display: none` and discrete layout switches cannot be animated.** See the lesson sidebar.

## The lesson sidebar

`.lesson-layout` is driven by one registered number, `--lesson-sb` (`@property`, `<number>`;
1 = open, 0 = hidden). The sidebar column, the gap, the content cap, the reading measure and the
pictures are all `calc()`s of it, so they move on one clock: nothing snaps at the start or end,
and the text re-wraps gradually as the column grows. The toggle button never moves, and the label
and list fade with the column. Where `@property` is unsupported the layout simply changes at
once. A lesson with nothing to navigate (`data-no-sidebar`) no longer reserves the sidebar track.
