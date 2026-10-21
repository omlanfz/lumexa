"use client";

import { useState } from "react";
import type { DemoProps } from "../types";
import { Chip, toLocal } from "../ui";

/* ───────────────────────── Climate Data Dashboard (Python · Pandas · Plotly) ───────────────────────── */

export const CLIMATE_CODE = [
  "import pandas as pd",
  "import plotly.express as px",
  "",
  'df = pd.read_csv("temperature.csv")',
  'df = df[df["year"] <= end_year]',
  "",
  'fig = px.line(df, x="year", y="anomaly",',
  '              color="region")',
  "fig.show()",
];

const FIRST = 1994;
const LAST = 2024;
const REGIONS = [
  { id: "Global", color: "#0D9488", base: 0.28, slope: 0.031, k: 0.4 },
  { id: "Asia", color: "#EF4444", base: 0.3, slope: 0.036, k: 1.9 },
  { id: "Europe", color: "#6366F1", base: 0.42, slope: 0.034, k: 3.1 },
];
// Sample data: a gentle upward trend with a little wobble, no randomness so it never changes between renders.
const val = (r: (typeof REGIONS)[number], i: number) =>
  r.base + r.slope * i + Math.sin(i * 1.7 + r.k) * 0.06 + Math.sin(i * 0.63 + r.k * 2) * 0.05;

export function ClimateOutput({ flash }: DemoProps) {
  const [on, setOn] = useState<string[]>(["Global", "Asia"]);
  const [end, setEnd] = useState(LAST);
  const [hover, setHover] = useState<number | null>(null);

  const W = 320, H = 170, L = 30, B = 20, T = 8, R = 8;
  const n = LAST - FIRST;
  const X = (i: number) => L + (i / n) * (W - L - R);
  const Y = (v: number) => T + (1 - v / 1.7) * (H - T - B);
  const endIdx = end - FIRST;

  const active = REGIONS.filter((r) => on.includes(r.id));
  const toggle = (id: string) => {
    setOn((s) => (s.includes(id) ? (s.length > 1 ? s.filter((x) => x !== id) : s) : [...s, id]));
    flash(7);
  };
  const hi = hover === null ? endIdx : Math.min(hover, endIdx);

  return (
    <div className="select-none">
      <div className="grid grid-cols-3 gap-2 mb-3">
        {active.slice(0, 3).map((r) => (
          <div key={r.id} className="rounded-xl p-2 bg-slate-50 dark:bg-white/5 border-l-4" style={{ borderColor: r.color }}>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{r.id}</div>
            <div className="text-base font-black text-slate-900 dark:text-white tabular-nums">+{(val(r, endIdx) - val(r, 0)).toFixed(2)}°C</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-pan-y"
          onPointerMove={(e) => setHover(Math.max(0, Math.min(n, Math.round(((toLocal(e, W, H).x - L) / (W - L - R)) * n))))}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label="Temperature anomaly line chart"
        >
          {[0, 0.5, 1, 1.5].map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="currentColor" className="text-slate-200 dark:text-white/10" />
              <text x={L - 5} y={Y(v) + 3} fontSize="8" textAnchor="end" fill="#94A3B8">{v.toFixed(1)}</text>
            </g>
          ))}
          {[0, 10, 20, 30].map((i) => (
            <text key={i} x={X(i)} y={H - 6} fontSize="8" textAnchor="middle" fill="#94A3B8">{FIRST + i}</text>
          ))}
          {active.map((r) => {
            const pts = Array.from({ length: endIdx + 1 }, (_, i) => `${X(i).toFixed(1)},${Y(val(r, i)).toFixed(1)}`);
            return (
              <polyline
                key={r.id}
                points={pts.join(" ")}
                pathLength={1}
                fill="none"
                stroke={r.color}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="demo-draw"
              />
            );
          })}
          <line x1={X(hi)} x2={X(hi)} y1={T} y2={H - B} stroke="#94A3B8" strokeDasharray="3 3" />
          {active.map((r) => (
            <circle key={r.id} cx={X(hi)} cy={Y(val(r, hi))} r="3.6" fill={r.color} stroke="#fff" strokeWidth="1.5" />
          ))}
          <g transform={`translate(${Math.min(W - 88, Math.max(L + 2, X(hi) - 40))}, ${T + 2})`}>
            <rect width="84" height={12 + active.length * 11} rx="5" fill="#0F172A" opacity=".92" />
            <text x="6" y="10" fontSize="8" fontWeight="700" fill="#94A3B8">{FIRST + hi}</text>
            {active.map((r, j) => (
              <text key={r.id} x="6" y={21 + j * 11} fontSize="8.5" fontWeight="800" fill="#fff">
                <tspan fill={r.color}>● </tspan>{r.id} +{val(r, hi).toFixed(2)}
              </text>
            ))}
          </g>
        </svg>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
        <span>Up to year</span>
        <input
          type="range"
          min={1999}
          max={LAST}
          value={end}
          onChange={(e) => { setEnd(Number(e.target.value)); flash(4); }}
          className="flex-1 accent-teal-600 h-6"
          aria-label="Choose the last year to show"
        />
        <span className="w-10 tabular-nums text-teal-700 dark:text-teal-300">{end}</span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {REGIONS.map((r) => (
          <Chip key={r.id} active={on.includes(r.id)} onClick={() => toggle(r.id)}>
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: r.color }} />
            {r.id}
          </Chip>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-slate-400">Sample data · drag the slider, tap a region, or touch the chart.</p>
    </div>
  );
}

/* ───────────────────────── Sports Stats Analyser (Python · Pandas · Matplotlib) ───────────────────────── */

export const SPORTS_CODE = [
  'df = pd.read_csv("players.csv")',
  "",
  'a = df[df["player"] == pick_a]',
  'b = df[df["player"] == pick_b]',
  "",
  "compare = pd.concat([a, b]).set_index(\"player\")",
  "compare[metrics].plot.barh()",
];

const PLAYERS = [
  { id: "R. Silva", role: "Forward", e: "🧑🏽", stats: { Goals: 18, Assists: 6, Passes: 1120, Shots: 74, Tackles: 21 } },
  { id: "K. Mensah", role: "Midfielder", e: "🧑🏿", stats: { Goals: 10, Assists: 12, Passes: 1810, Shots: 43, Tackles: 62 } },
  { id: "A. Hasan", role: "Winger", e: "🧑🏻", stats: { Goals: 14, Assists: 9, Passes: 1340, Shots: 66, Tackles: 28 } },
  { id: "L. Moreau", role: "Defender", e: "🧑🏼", stats: { Goals: 3, Assists: 4, Passes: 1560, Shots: 12, Tackles: 96 } },
];
const METRICS = ["Goals", "Assists", "Passes", "Shots", "Tackles"] as const;

export function SportsOutput({ flash }: DemoProps) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(1);
  const [metrics, setMetrics] = useState<string[]>(["Goals", "Assists", "Passes"]);

  const pickA = (i: number) => {
    if (i === b) setB(a);
    setA(i);
    flash(2);
  };
  const pickB = (i: number) => {
    if (i === a) setA(b);
    setB(i);
    flash(3);
  };
  const toggle = (m: string) => {
    setMetrics((s) => (s.includes(m) ? (s.length > 1 ? s.filter((x) => x !== m) : s) : [...s, m]));
    flash(6);
  };

  const pa = PLAYERS[a];
  const pb = PLAYERS[b];
  const shown = METRICS.filter((m) => metrics.includes(m));
  const winsA = shown.filter((m) => pa.stats[m] > pb.stats[m]).length;
  const winsB = shown.filter((m) => pb.stats[m] > pa.stats[m]).length;

  return (
    <div className="select-none">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
        {[{ p: pa, c: "from-blue-600 to-blue-700" }, null, { p: pb, c: "from-rose-500 to-rose-700" }].map((x, i) =>
          x ? (
            <div key={x.p.id} className={`rounded-2xl p-2.5 bg-gradient-to-br ${x.c} text-white flex items-center gap-2 demo-pop`}>
              <span className="text-2xl w-9 h-9 rounded-full bg-white/20 grid place-items-center flex-none">{x.p.e}</span>
              <div className="min-w-0">
                <div className="text-sm font-black truncate">{x.p.id}</div>
                <div className="text-[10px] opacity-90">{x.p.role}</div>
              </div>
            </div>
          ) : (
            <div key={i} className="self-center text-xs font-black text-slate-400">VS</div>
          )
        )}
      </div>

      <div className="mt-3 space-y-2.5 min-h-[170px]">
        {shown.map((m) => {
          const va = pa.stats[m];
          const vb = pb.stats[m];
          const max = Math.max(va, vb);
          return (
            <div key={m}>
              <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                <span className={va > vb ? "text-blue-600 dark:text-blue-300" : ""}>{va > vb ? "🏆 " : ""}{va.toLocaleString()}</span>
                <span className="uppercase tracking-wider">{m}</span>
                <span className={vb > va ? "text-rose-600 dark:text-rose-300" : ""}>{vb.toLocaleString()}{vb > va ? " 🏆" : ""}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 h-2.5">
                <div className="flex justify-end rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out" style={{ width: `${(va / max) * 100}%` }} />
                </div>
                <div className="rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-rose-500 transition-all duration-700 ease-out" style={{ width: `${(vb / max) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p key={`${a}-${b}-${metrics.join()}`} className="mt-2 text-center text-xs font-black text-slate-700 dark:text-slate-200 demo-rise">
        {winsA === winsB ? "Too close to call! 🤝" : `${winsA > winsB ? pa.id : pb.id} leads in ${Math.max(winsA, winsB)} of ${shown.length} metrics`}
      </p>

      <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Player A</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {PLAYERS.map((p, i) => <Chip key={p.id} active={a === i} onClick={() => pickA(i)}>{p.e} {p.id}</Chip>)}
      </div>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Player B</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {PLAYERS.map((p, i) => <Chip key={p.id} active={b === i} onClick={() => pickB(i)}>{p.e} {p.id}</Chip>)}
      </div>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Metrics</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {METRICS.map((m) => <Chip key={m} active={metrics.includes(m)} onClick={() => toggle(m)}>{m}</Chip>)}
      </div>
      <p className="mt-2 text-[10px] text-slate-400">Sample data for fictional players.</p>
    </div>
  );
}

/* ───────────────────────── Market Trends Predictor (Python · scikit-learn) ───────────────────────── */

export const MARKET_CODE = [
  "from sklearn.linear_model import LinearRegression",
  "",
  "X = days.reshape(-1, 1)",
  "model = LinearRegression().fit(X, prices)",
  "",
  "future = np.arange(40, 40 + n_days).reshape(-1, 1)",
  "forecast = model.predict(future)",
  "",
  "change = forecast[-1] / prices[-1] - 1",
];

const STOCKS = [
  { id: "STAR", e: "🌟", slope: 0.45, k: 0.5 },
  { id: "WAVE", e: "🌊", slope: 0.03, k: 2.2 },
  { id: "BOLT", e: "⚡", slope: -0.32, k: 4 },
];
const N = 40;

function fit(prices: number[]) {
  const n = prices.length;
  const mx = (n - 1) / 2;
  const my = prices.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  prices.forEach((p, i) => { num += (i - mx) * (p - my); den += (i - mx) ** 2; });
  const slope = num / den;
  const icpt = my - slope * mx;
  const sigma = Math.sqrt(prices.reduce((a, p, i) => a + (p - (icpt + slope * i)) ** 2, 0) / n);
  return { slope, icpt, sigma };
}

export function MarketOutput({ flash }: DemoProps) {
  const [si, setSi] = useState(0);
  const [days, setDays] = useState(15);

  const s = STOCKS[si];
  const prices = Array.from({ length: N }, (_, i) => 100 + s.slope * i + Math.sin(i * 0.9 + s.k) * 1.6 + Math.sin(i * 0.37 + s.k * 2) * 1.2);
  const { slope, icpt, sigma } = fit(prices);
  const line = (i: number) => icpt + slope * i;
  const last = prices[N - 1];
  const end = line(N - 1 + days);
  const change = (end / last - 1) * 100;

  const W = 320, H = 160, L = 8, R = 8, T = 10, B = 10;
  const lo = Math.min(...prices, line(N - 1 + days) - sigma * 2) - 2;
  const hi = Math.max(...prices, line(N - 1 + days) + sigma * 2) + 2;
  const X = (i: number) => L + (i / (N + 30 - 1)) * (W - L - R);
  const Y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const up: string[] = [];
  const dn: string[] = [];
  for (let k = 0; k <= days; k++) {
    const w = sigma * (1 + (k / days) * 1.2);
    up.push(`${X(N - 1 + k).toFixed(1)},${Y(line(N - 1 + k) + w).toFixed(1)}`);
    dn.unshift(`${X(N - 1 + k).toFixed(1)},${Y(line(N - 1 + k) - w).toFixed(1)}`);
  }

  return (
    <div className="select-none">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl p-2.5 bg-slate-50 dark:bg-white/5">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Predicted change · {days} days</div>
          <div key={`${si}-${days}`} className={`text-xl font-black demo-pop inline-block ${change >= 0 ? "text-green-600 dark:text-green-400" : "text-rose-600 dark:text-rose-400"}`}>
            {change >= 0 ? "▲ +" : "▼ "}{change.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-xl p-2.5 bg-slate-50 dark:bg-white/5">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Trend learned</div>
          <div className="text-sm font-black text-slate-900 dark:text-white">
            {Math.abs(slope) < 0.08 ? "Sideways ↔" : slope > 0 ? "Upward ↗" : "Downward ↘"}
          </div>
          <div className="text-[10px] text-slate-400">{slope >= 0 ? "+" : ""}{slope.toFixed(2)} per day</div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Price history and forecast chart">
          <polygon points={`${up.join(" ")} ${dn.join(" ")}`} fill="#7C3AED" opacity=".16" />
          <line x1={X(N - 1)} x2={X(N - 1)} y1={T} y2={H - B} stroke="#94A3B8" strokeDasharray="3 3" />
          <text x={X(N - 1) + 4} y={T + 8} fontSize="8" fill="#94A3B8">today</text>
          <polyline fill="none" stroke="#2563EB" strokeWidth="2.4" strokeLinejoin="round" points={prices.map((p, i) => `${X(i).toFixed(1)},${Y(p).toFixed(1)}`).join(" ")} />
          <line x1={X(0)} y1={Y(line(0))} x2={X(N - 1)} y2={Y(line(N - 1))} stroke="#F59E0B" strokeWidth="1.6" strokeDasharray="2 4" strokeLinecap="round" />
          <line key={`${si}-${days}`} x1={X(N - 1)} y1={Y(line(N - 1))} x2={X(N - 1 + days)} y2={Y(end)} stroke="#7C3AED" strokeWidth="2.8" strokeDasharray="6 4" strokeLinecap="round" className="demo-rise" />
          <circle cx={X(N - 1 + days)} cy={Y(end)} r="4" fill="#7C3AED" stroke="#fff" strokeWidth="1.5" />
        </svg>
        <div className="flex gap-3 px-1 pb-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
          <span><span className="text-blue-600">━</span> Price</span>
          <span><span className="text-amber-500">┅</span> Trend</span>
          <span><span className="text-purple-600">╍</span> Forecast</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
        <span>Predict next</span>
        <input
          type="range"
          min={5}
          max={30}
          value={days}
          onChange={(e) => {
            setDays(Number(e.target.value));
            flash(5);
            setTimeout(() => flash(6), 200);
            setTimeout(() => flash(8), 400);
          }}
          className="flex-1 accent-purple-600 h-6"
          aria-label="Days to forecast"
        />
        <span className="w-14 tabular-nums text-purple-700 dark:text-purple-300">{days} days</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {STOCKS.map((x, i) => (
          <Chip key={x.id} active={si === i} onClick={() => { setSi(i); flash(2); setTimeout(() => flash(3), 200); }}>
            {x.e} {x.id}
          </Chip>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-slate-400">Practice data for a school project. Not financial advice.</p>
    </div>
  );
}
