'use client';

// FILE PATH: client/components/lesson/visuals/web.tsx
//
// Web-development visuals: the CSS box model, a Flexbox / Grid playground and a
// responsive-width preview. The controls only ever pick from fixed lists of CSS
// values (never free text), so nothing a learner or author types reaches a style
// attribute.

import { useId, useState, type CSSProperties } from 'react';
import { C } from './svg';
import { registerVisuals, type VisualProps } from './registry';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function Slider({ label, value, min, max, onChange, unit = 'px' }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; unit?: string }) {
  const id = useId();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <label htmlFor={id} className="lv-label" style={{ minWidth: 64 }}>{label}</label>
      <input id={id} className="lv-range" type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="lv-label" style={{ minWidth: 44, textAlign: 'right' }}>{value}{unit}</span>
    </div>
  );
}

// ─── CSS box model ──────────────────────────────────────────────────────────

export function BoxModel({ config, onUse }: VisualProps) {
  const init = (k: string, d: number, hi: number) => clamp(Number(config[k]) || d, 0, hi);
  const contentW = clamp(Number(config.contentWidth) || 180, 60, 300);
  const contentH = clamp(Number(config.contentHeight) || 60, 30, 160);
  const [margin, setMargin] = useState(init('margin', 20, 50));
  const [border, setBorder] = useState(init('border', 6, 20));
  const [padding, setPadding] = useState(init('padding', 20, 50));
  const set = (fn: (n: number) => void) => (n: number) => {
    fn(n);
    onUse?.();
  };
  const outerW = contentW + 2 * padding + 2 * border;
  const outerH = contentH + 2 * padding + 2 * border;
  const totalW = outerW + 2 * margin;
  const totalH = outerH + 2 * margin;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 300px', minWidth: 0, overflowX: 'auto' }}>
        <div aria-hidden="true" style={{ display: 'inline-block', maxWidth: '100%' }}>
          <div style={{ background: 'color-mix(in srgb, #f59e0b 35%, transparent)', padding: margin, border: `1px dashed ${C.muted}`, position: 'relative' }}>
            <span style={{ position: 'absolute', top: 2, left: 6, fontSize: 11, fontWeight: 700 }}>margin</span>
            <div style={{ background: 'color-mix(in srgb, #7c3aed 40%, transparent)', border: `${border}px solid ${C.accent}`, position: 'relative' }}>
              <span style={{ position: 'absolute', top: 2, left: 6, fontSize: 11, fontWeight: 700 }}>border</span>
              <div style={{ background: 'color-mix(in srgb, #16a34a 35%, transparent)', padding, position: 'relative' }}>
                <span style={{ position: 'absolute', top: 2, left: 6, fontSize: 11, fontWeight: 700 }}>padding</span>
                <div style={{ width: contentW, height: contentH, maxWidth: '100%', background: 'color-mix(in srgb, #2563eb 40%, transparent)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>content</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ flex: '1 1 250px', minWidth: 0, display: 'grid', gap: 8 }}>
        <Slider label="margin" value={margin} min={0} max={50} onChange={set(setMargin)} />
        <Slider label="border" value={border} min={0} max={20} onChange={set(setBorder)} />
        <Slider label="padding" value={padding} min={0} max={50} onChange={set(setPadding)} />
        <pre style={{ margin: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 12.5, overflowX: 'auto' }}>
          {`.box {\n  width: ${contentW}px;\n  padding: ${padding}px;\n  border: ${border}px solid;\n  margin: ${margin}px;\n}`}
        </pre>
        <p className="lv-note" aria-live="polite" style={{ margin: 0 }}>
          Width on screen = {contentW} content + {2 * padding} padding + {2 * border} border = <strong>{outerW}px</strong>
          <br />
          With the margin around it, the box takes up <strong>{totalW} × {totalH}px</strong> of the page.
        </p>
        <p className="lv-label" style={{ margin: 0 }}>(Height works the same way: {contentH} + {2 * padding} + {2 * border} = {outerH}px.)</p>
      </div>
    </div>
  );
}

// ─── Flexbox / Grid playground ──────────────────────────────────────────────

const FLEX_PROPS = {
  'flex-direction': ['row', 'column'],
  'justify-content': ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'],
  'align-items': ['stretch', 'flex-start', 'center', 'flex-end'],
  'flex-wrap': ['nowrap', 'wrap'],
} as const;
const GRID_COLUMNS = ['1fr 1fr', '1fr 1fr 1fr', '1fr 2fr', '2fr 1fr 1fr', 'repeat(auto-fit, minmax(90px, 1fr))'] as const;

function Choice({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <label htmlFor={id} className="lv-label" style={{ minWidth: 120, fontFamily: 'ui-monospace, monospace' }}>{label}</label>
      <select id={id} className="lv-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

const ITEM_TONES = ['#7c3aed', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#db2777', '#4f46e5'];

export function CssLayout({ config, onUse }: VisualProps) {
  const mode: 'flex' | 'grid' = config.mode === 'grid' ? 'grid' : 'flex';
  const count = clamp(Number(config.items) || 5, 2, 8);
  const labels: string[] = Array.isArray(config.labels) ? config.labels.map(String) : [];
  const [flex, setFlex] = useState<Record<keyof typeof FLEX_PROPS, string>>({ 'flex-direction': 'row', 'justify-content': 'flex-start', 'align-items': 'stretch', 'flex-wrap': 'nowrap' });
  const [cols, setCols] = useState<string>(GRID_COLUMNS[0]);
  const [gap, setGap] = useState(clamp(Number(config.gap) || 10, 0, 40));
  const touch = () => onUse?.();

  // The values come only from the fixed option lists above (a <select>), never free text.
  const style: CSSProperties =
    mode === 'flex'
      ? {
          display: 'flex',
          flexDirection: flex['flex-direction'] as CSSProperties['flexDirection'],
          justifyContent: flex['justify-content'],
          alignItems: flex['align-items'],
          flexWrap: flex['flex-wrap'] as CSSProperties['flexWrap'],
          gap,
        }
      : { display: 'grid', gridTemplateColumns: cols, gap };

  const css =
    mode === 'flex'
      ? `.container {\n  display: flex;\n  flex-direction: ${flex['flex-direction']};\n  justify-content: ${flex['justify-content']};\n  align-items: ${flex['align-items']};\n  flex-wrap: ${flex['flex-wrap']};\n  gap: ${gap}px;\n}`
      : `.container {\n  display: grid;\n  grid-template-columns: ${cols};\n  gap: ${gap}px;\n}`;

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
        <div style={{ flex: '2 1 280px', minWidth: 0 }}>
          <div aria-hidden="true" style={{ ...style, minHeight: 200, padding: 10, border: `2px dashed ${C.border}`, borderRadius: 10, background: C.surface }}>
            {Array.from({ length: count }, (_, i) => (
              <div key={i} style={{ background: ITEM_TONES[i % ITEM_TONES.length], color: '#fff', fontWeight: 700, borderRadius: 8, padding: mode === 'flex' ? `${10 + (i % 3) * 8}px 16px` : '14px', minWidth: 54, textAlign: 'center' }}>
                {labels[i] ?? i + 1}
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: '1 1 250px', minWidth: 0, display: 'grid', gap: 8, alignContent: 'start' }}>
          {mode === 'flex' ? (
            (Object.keys(FLEX_PROPS) as (keyof typeof FLEX_PROPS)[]).map((k) => (
              <Choice key={k} label={k} value={flex[k]} options={FLEX_PROPS[k]} onChange={(v) => { setFlex((f) => ({ ...f, [k]: v })); touch(); }} />
            ))
          ) : (
            <Choice label="grid-template-columns" value={cols} options={GRID_COLUMNS} onChange={(v) => { setCols(v); touch(); }} />
          )}
          <Slider label="gap" value={gap} min={0} max={40} onChange={(n) => { setGap(n); touch(); }} />
          <pre style={{ margin: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 12.5, overflowX: 'auto' }}>{css}</pre>
        </div>
      </div>
      <p className="lv-note">
        {mode === 'flex'
          ? 'Flexbox lays items out along ONE direction (the main axis). justify-content spreads them along it; align-items positions them across it.'
          : 'Grid lays items out in rows AND columns at the same time. Each fr unit is a share of the free space.'}
      </p>
    </div>
  );
}

// ─── Responsive width preview ───────────────────────────────────────────────

interface Breakpoint { min: number; label: string; columns: number }

export function ViewportPreview({ config, onUse }: VisualProps) {
  const defaults: Breakpoint[] = [
    { min: 0, label: 'Phone', columns: 1 },
    { min: 600, label: 'Tablet', columns: 2 },
    { min: 900, label: 'Desktop', columns: 3 },
  ];
  const raw = Array.isArray(config.breakpoints) ? (config.breakpoints as Breakpoint[]) : defaults;
  const bps = raw
    .map((b) => ({ min: clamp(Number(b.min) || 0, 0, 2000), label: String(b.label ?? ''), columns: clamp(Number(b.columns) || 1, 1, 6) }))
    .sort((a, b) => a.min - b.min)
    .slice(0, 5);
  const items: string[] = (Array.isArray(config.items) ? config.items : ['Home', 'Projects', 'About', 'Contact', 'Blog', 'Shop']).slice(0, 12).map(String);
  const maxW = Math.max(1000, (bps[bps.length - 1]?.min ?? 900) + 100);
  const [w, setW] = useState(clamp(Number(config.startWidth) || 420, 280, maxW));
  const active = [...bps].reverse().find((b) => w >= b.min) ?? bps[0];
  const idx = bps.indexOf(active);
  const rule = active.min === 0 ? 'Default (no media query)' : `@media (min-width: ${active.min}px)`;

  return (
    <div>
      <div className="lv-controls" style={{ marginTop: 0, marginBottom: 10 }}>
        <Slider label="Screen width" value={w} min={280} max={maxW} onChange={(n) => { setW(n); onUse?.(); }} />
      </div>
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div aria-hidden="true" style={{ width: w, maxWidth: '100%', margin: '0 auto', border: `3px solid ${C.text}`, borderRadius: 14, padding: 10, background: C.surface, transition: 'width .08s' }}>
          <div style={{ display: 'flex', justifyContent: w < 420 ? 'space-between' : 'flex-start', gap: 12, background: C.accent, color: '#fff', padding: '8px 12px', borderRadius: 8, marginBottom: 10, fontWeight: 700, fontSize: 13 }}>
            <span>My Site</span>
            {w < 420 ? <span>☰</span> : <span style={{ display: 'flex', gap: 14, fontWeight: 500 }}>{items.slice(0, 4).map((x) => <span key={x}>{x}</span>)}</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${active.columns}, 1fr)`, gap: 8 }}>
            {items.slice(0, active.columns * 2).map((x, i) => (
              <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 8px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{x}</div>
            ))}
          </div>
        </div>
      </div>
      <p className="lv-note" aria-live="polite">
        At <strong>{w}px</strong> this is the <strong>{active.label}</strong> layout: <strong>{active.columns}</strong> column{active.columns > 1 ? 's' : ''}
        {w < 420 ? ', and the menu collapses to ☰' : ''}. Rule in use: <code>{rule}</code>
        {idx < bps.length - 1 ? ` — it changes again at ${bps[idx + 1].min}px.` : '.'}
      </p>
      <pre style={{ margin: '8px 0 0', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 12.5, overflowX: 'auto' }}>
        {bps.map((b) => (b.min === 0 ? `.grid { grid-template-columns: repeat(${b.columns}, 1fr); }` : `@media (min-width: ${b.min}px) {\n  .grid { grid-template-columns: repeat(${b.columns}, 1fr); }\n}`)).join('\n')}
      </pre>
    </div>
  );
}

registerVisuals({
  'box-model': { Component: BoxModel, interactive: true },
  'css-layout': { Component: CssLayout, interactive: true },
  viewport: { Component: ViewportPreview, interactive: true },
});
