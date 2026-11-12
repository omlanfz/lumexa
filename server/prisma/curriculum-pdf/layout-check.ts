// Geometry checks run inside the browser on the finished HTML of a curriculum PDF, before it is printed.
// A page that fails any of them is not written: nothing may touch the page margins, spill out of its box, sit
// too tight against the edge of its card, overlap other text or the artwork, or leave two blocks touching.
//
// `layoutProblems` is serialised and run in the page, so it must stay self-contained (no imports, no outer
// variables). Sizes are CSS px on the 816 × 1056 US Letter page of design.ts.

export interface LayoutLimits {
  pageW: number;
  pageH: number;
  /** Side margin, and the margin under the footer. */
  marginX: number;
  marginBottom: number;
  /** Least space between text and the edge of the card around it. */
  innerPadding: number;
  /** Least space between two blocks that sit one above the other. */
  blockGap: number;
  /** A gap bigger than this between two blocks looks like a hole in the page. */
  maxBlockGap: number;
}

export const LAYOUT_LIMITS: LayoutLimits = {
  pageW: 816,
  pageH: 1056,
  marginX: 38,
  marginBottom: 22,
  innerPadding: 4,
  blockGap: 10,
  maxBlockGap: 96,
};

export function layoutProblems(L: LayoutLimits): string[] {
  const found: string[] = [];
  const add = (page: number, msg: string) => found.push(`page ${page}: ${msg}`);

  const boxes =
    '.hero,.banner,.apanel,.stagehead,.testbox,.card,.quest,.perk,.node,.tk,.qc,.jrow,.lane,.af,.out,.snap,.stat,.tile,.finalbar,.cta,.sc,.stagecol,.who>div,.hud,.opt,.part,.track,.tf span,.qh,.qt,.qs';
  const decorative = (el: Element): boolean =>
    !!el.closest('svg, .stars, .art, .trophy') || el.tagName === 'IMG';
  const textOf = (el: Element): string => (el.textContent ?? '').trim();
  const isLeafWithText = (el: HTMLElement): boolean =>
    el.childElementCount === 0 && !decorative(el) && textOf(el) !== '';
  const label = (el: HTMLElement): string =>
    `"${textOf(el).replace(/\s+/g, ' ').slice(0, 38)}"`;
  const visible = (r: DOMRect): boolean => r.width > 0 && r.height > 0;
  /** The box around the words of an element (its own box includes padding and the empty rest of a row). */
  const textRect = (el: Element): DOMRect => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect();
  };

  document.querySelectorAll<HTMLElement>('.page').forEach((pg, index) => {
    const page = index + 1;
    const pr = pg.getBoundingClientRect();

    // 1 · the page itself does not grow, and the text keeps to the margins
    if (pg.scrollHeight > pg.clientHeight + 1)
      add(page, `is ${pg.scrollHeight - pg.clientHeight}px too tall`);
    const leaves = [...pg.querySelectorAll<HTMLElement>('*')].filter(
      isLeafWithText,
    );
    for (const el of leaves) {
      const r = el.getBoundingClientRect();
      if (!visible(r)) continue;
      if (
        r.left < pr.left + L.marginX - 1 ||
        r.right > pr.right - L.marginX + 1
      )
        add(page, `${label(el)} is outside the side margins`);
      if (r.bottom > pr.bottom - L.marginBottom + 1)
        add(page, `${label(el)} is inside the bottom margin`);
      if (r.top < pr.top + 20)
        add(page, `${label(el)} is too close to the top edge`);
    }

    // 2 · text is not cut off by, and does not hug, the card it sits in
    pg.querySelectorAll<HTMLElement>(boxes).forEach((box) => {
      const b = box.getBoundingClientRect();
      if (!visible(b)) return;
      const name =
        box.className.toString().split(' ')[0] || box.tagName.toLowerCase();
      for (const el of box.querySelectorAll<HTMLElement>('*')) {
        if (!isLeafWithText(el)) continue;
        const r = textRect(el);
        if (!visible(r)) continue;
        if (
          r.bottom > b.bottom + 1 ||
          r.right > b.right + 1 ||
          r.top < b.top - 1 ||
          r.left < b.left - 1
        ) {
          add(page, `${label(el)} is cut off by its ${name}`);
        } else if (
          // The nearest card wins: a leaf inside a pill inside a card is judged against the pill.
          el.closest(boxes) === box &&
          (r.left - b.left < L.innerPadding ||
            b.right - r.right < L.innerPadding ||
            r.top - b.top < L.innerPadding ||
            b.bottom - r.bottom < L.innerPadding)
        ) {
          const d = [
            r.left - b.left,
            b.right - r.right,
            r.top - b.top,
            b.bottom - r.bottom,
          ].map((n) => Math.round(n * 10) / 10);
          add(
            page,
            `${label(el)} is too tight against the edge of its ${name} (left/right/top/bottom ${d.join('/')}px)`,
          );
        }
      }
    });

    // 3 · no two pieces of text overlap
    for (let i = 0; i < leaves.length; i++) {
      const a = textRect(leaves[i]);
      if (!visible(a)) continue;
      for (let j = i + 1; j < leaves.length; j++) {
        const b = textRect(leaves[j]);
        if (!visible(b)) continue;
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > 1.5 && h > 2.5)
          add(page, `${label(leaves[i])} overlaps ${label(leaves[j])}`);
      }
    }

    // 4 · text does not run over the artwork it sits next to (only shapes that are really painted count)
    pg.querySelectorAll<SVGElement>('.art, .trophy').forEach((art) => {
      const shapes = [
        ...art.querySelectorAll<SVGElement>(
          'path,circle,ellipse,rect,text,polygon,line',
        ),
      ].filter((s) => {
        if (s.closest('defs')) return false;
        const cs = getComputedStyle(s);
        const fill = s.getAttribute('fill') ?? '';
        const opacity =
          Number(s.getAttribute('opacity') ?? cs.opacity ?? 1) *
          Number(s.getAttribute('fill-opacity') ?? 1);
        const stroked = (s.getAttribute('stroke') ?? 'none') !== 'none';
        const painted = fill !== 'none' || stroked;
        return painted && opacity >= 0.5 && !/glow/i.test(fill);
      });
      for (const el of leaves) {
        if (el.closest('.art, .trophy')) continue;
        const r = textRect(el);
        if (!visible(r)) continue;
        for (const s of shapes) {
          const b = s.getBoundingClientRect();
          if (!visible(b)) continue;
          // the words keep a clear 8px from the painted shapes
          const w =
            Math.min(r.right + 8, b.right) - Math.max(r.left - 8, b.left);
          const h =
            Math.min(r.bottom + 4, b.bottom) - Math.max(r.top - 4, b.top);
          if (w > 2 && h > 2) {
            add(page, `${label(el)} runs over the artwork`);
            break;
          }
        }
      }
    });

    // 5 · blocks that sit one above the other do not touch, and no hole opens between them
    const blocks = [...pg.children].filter(
      (c): c is HTMLElement =>
        c instanceof HTMLElement && !c.classList.contains('stars'),
    );
    for (let i = 0; i + 1 < blocks.length; i++) {
      const a = blocks[i].getBoundingClientRect();
      const b = blocks[i + 1].getBoundingClientRect();
      const gap = b.top - a.bottom;
      const names = `${blocks[i].className.toString().split(' ')[0] || blocks[i].tagName.toLowerCase()} → ${blocks[i + 1].className.toString().split(' ')[0] || blocks[i + 1].tagName.toLowerCase()}`;
      if (gap < L.blockGap)
        add(page, `blocks nearly touch (${names}, ${Math.round(gap)}px)`);
      if (gap > L.maxBlockGap)
        add(page, `a ${Math.round(gap)}px hole between blocks (${names})`);
    }
  });
  return [...new Set(found)];
}
