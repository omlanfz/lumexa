"use client";

import { useState, type ReactNode } from "react";
import type { DemoProps } from "../types";
import { Burst, Chip } from "../ui";

/* ───────────────────────── Photography Portfolio (HTML · CSS · JavaScript) ───────────────────────── */

export const PHOTO_CODE = [
  'const photos = document.querySelectorAll(".photo");',
  "",
  'filterBtn.addEventListener("click", () => {',
  "  photos.forEach((p) => {",
  '    p.hidden = tag !== "all" && p.dataset.tag !== tag;',
  "  });",
  "});",
  "",
  "photo.onclick = () => lightbox.open(photo);",
  "likeBtn.onclick = () => likes++;",
];

interface Photo { id: string; tag: "Nature" | "City" | "Water"; title: string; scene: ReactNode; likes: number }

const PHOTOS: Photo[] = [
  {
    id: "sunset", tag: "Nature", title: "Golden hour · Sylhet", likes: 128,
    scene: (
      <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs><linearGradient id="p1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#312e81" /><stop offset=".5" stopColor="#db2777" /><stop offset=".8" stopColor="#fb923c" /><stop offset="1" stopColor="#fde68a" /></linearGradient></defs>
        <rect width="160" height="120" fill="url(#p1)" /><circle cx="84" cy="74" r="20" fill="#fff7d6" />
        <path d="M0 90 L26 70 L48 84 L84 62 L116 86 L142 72 L160 84 L160 120 L0 120Z" fill="#1e1b4b" /><path d="M0 104 L40 92 L74 100 L110 90 L160 104 L160 120 L0 120Z" fill="#0f0c29" />
      </svg>
    ),
  },
  {
    id: "hills", tag: "Nature", title: "Misty hills", likes: 94,
    scene: (
      <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <rect width="160" height="120" fill="#bae6fd" /><path d="M0 80 L30 40 L58 66 L92 24 L126 66 L160 46 L160 120 L0 120Z" fill="#475569" /><path d="M92 24 L82 38 L90 35 L96 41 L102 34 L110 39Z" fill="#fff" />
        <path d="M0 96 Q40 84 80 96 T160 92 L160 120 L0 120Z" fill="#16a34a" /><path d="M0 108 Q50 98 100 108 T160 104 L160 120 L0 120Z" fill="#15803d" />
      </svg>
    ),
  },
  {
    id: "city", tag: "City", title: "City lights · Dhaka", likes: 76,
    scene: (
      <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <rect width="160" height="120" fill="#0f172a" />
        {[[6, 44, 20, 76], [30, 24, 26, 96], [60, 52, 20, 68], [84, 16, 28, 104], [116, 38, 22, 82], [142, 54, 18, 66]].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} fill="#1e293b" />)}
        {[[36, 34], [44, 50], [92, 26], [100, 46], [92, 72], [122, 50], [128, 70], [10, 60], [66, 66], [146, 70]].map(([x, y], i) => <rect key={i} x={x} y={y} width="3.5" height="5" fill="#fde047" />)}
        <rect y="108" width="160" height="12" fill="#334155" />
      </svg>
    ),
  },
  {
    id: "boat", tag: "Water", title: "Boat at dusk · Cox's Bazar", likes: 152,
    scene: (
      <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs><linearGradient id="p4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fed7aa" /><stop offset="1" stopColor="#fb7185" /></linearGradient></defs>
        <rect width="160" height="120" fill="url(#p4)" /><circle cx="108" cy="60" r="18" fill="#fff7ed" /><rect y="66" width="160" height="54" fill="#0e7490" />
        <rect x="88" y="70" width="40" height="3" rx="1.5" fill="#fff" opacity=".5" /><path d="M24 66 L42 66 L38 56 L30 56Z" fill="#7c2d12" /><path d="M33 56 L33 32 L48 56Z" fill="#fff" />
      </svg>
    ),
  },
  {
    id: "flowers", tag: "Nature", title: "Flower garden", likes: 88,
    scene: (
      <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <rect width="160" height="120" fill="#dcfce7" />
        {[[34, 40, 18, "#f472b6"], [80, 70, 22, "#fb923c"], [128, 36, 16, "#a78bfa"], [132, 92, 14, "#f472b6"], [26, 96, 14, "#fde047"]].map(([x, y, r, c], i) => (
          <g key={i}><line x1={x as number} y1={(y as number) + (r as number)} x2={x as number} y2="120" stroke="#16a34a" strokeWidth="3" /><circle cx={x as number} cy={y as number} r={r as number} fill={c as string} /><circle cx={x as number} cy={y as number} r={(r as number) / 3} fill="#fde047" /></g>
        ))}
      </svg>
    ),
  },
  {
    id: "rain", tag: "Water", title: "After the rain", likes: 63,
    scene: (
      <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs><linearGradient id="p6" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1e3a8a" /><stop offset="1" stopColor="#60a5fa" /></linearGradient></defs>
        <rect width="160" height="120" fill="url(#p6)" /><g fill="#fff" opacity=".9"><ellipse cx="38" cy="30" rx="26" ry="7" /><ellipse cx="54" cy="25" rx="16" ry="7" /><ellipse cx="120" cy="44" rx="28" ry="6" /></g>
        <path d="M0 92 Q32 78 64 92 T128 90 L160 86 L160 120 L0 120Z" fill="#0c4a6e" /><path d="M14 120 L14 84 L22 120Z M26 120 L26 76 L36 120Z M130 120 L130 82 L140 120Z" fill="#166534" />
      </svg>
    ),
  },
];

export function PhotoOutput({ flash }: DemoProps) {
  const [tag, setTag] = useState<"All" | "Nature" | "City" | "Water">("All");
  const [open, setOpen] = useState<string | null>(null);
  const [liked, setLiked] = useState<string[]>([]);
  const [burst, setBurst] = useState(0);

  const shown = PHOTOS.filter((p) => tag === "All" || p.tag === tag);
  const current = PHOTOS.find((p) => p.id === open);

  const like = (id: string) => {
    flash(9);
    setLiked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
    if (!liked.includes(id)) setBurst((b) => b + 1);
  };

  return (
    <div className="relative select-none">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-sm font-black text-slate-800 dark:text-slate-100" style={{ fontFamily: "Georgia, serif" }}>
          Tasnia<span className="text-orange-600">.</span>Lens
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{shown.length} photos</span>
      </div>
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {(["All", "Nature", "City", "Water"] as const).map((t) => (
          <Chip key={t} active={tag === t} onClick={() => { setTag(t); flash(4); }}>{t}</Chip>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {shown.map((p, i) => (
          <button
            type="button"
            key={p.id}
            onClick={() => { setOpen(p.id); flash(8); }}
            className="group relative aspect-[4/3] rounded-xl overflow-hidden demo-pop text-left"
            style={{ animationDelay: `${i * 50}ms` }}
            aria-label={`Open ${p.title}`}
          >
            <div className="w-full h-full transition-transform duration-500 group-hover:scale-110">{p.scene}</div>
            <span className="absolute left-1.5 bottom-1.5 text-[10px] font-bold text-white bg-black/40 rounded-full px-2 py-0.5">{p.title.split(" · ")[0]}</span>
            <span className="absolute right-1.5 top-1.5 text-[10px] font-bold bg-white/90 rounded-full px-1.5 py-0.5">
              {liked.includes(p.id) ? "❤️" : "🤍"} {p.likes + (liked.includes(p.id) ? 1 : 0)}
            </span>
          </button>
        ))}
      </div>

      {current && (
        <div className="absolute inset-0 z-30 bg-slate-950/90 rounded-2xl p-3 flex flex-col demo-pop">
          <div className="flex-1 rounded-xl overflow-hidden min-h-0">{current.scene}</div>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-black truncate">{current.title}</div>
              <div className="text-slate-400 text-[11px]">{current.tag}</div>
            </div>
            <button
              type="button"
              onClick={() => like(current.id)}
              className={`px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-90 ${liked.includes(current.id) ? "bg-rose-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
              aria-pressed={liked.includes(current.id)}
            >
              {liked.includes(current.id) ? "❤️" : "🤍"} {current.likes + (liked.includes(current.id) ? 1 : 0)}
            </button>
            <button type="button" onClick={() => setOpen(null)} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold" aria-label="Close photo">
              ✕
            </button>
          </div>
        </div>
      )}
      <Burst n={burst} emojis={["❤️", "✨", "📸"]} count={8} />
    </div>
  );
}

/* ───────────────────────── E-Commerce Store (React · Node.js) ───────────────────────── */

export const STORE_CODE = [
  "const [cart, setCart] = useState([]);",
  "",
  "function addToCart(item) {",
  "  setCart([...cart, item]);",
  "}",
  "",
  "const total = cart.reduce(",
  "  (sum, item) => sum + item.price, 0",
  ");",
  "",
  "function checkout() {",
  "  setCart([]);",
  "}",
];

const PRODUCTS = [
  { id: "shoes", e: "👟", name: "Cloud Sneakers", price: 59, bg: "bg-blue-100 dark:bg-blue-500/20" },
  { id: "phones", e: "🎧", name: "Headphones", price: 45, bg: "bg-pink-100 dark:bg-pink-500/20" },
  { id: "watch", e: "⌚", name: "Smart Watch", price: 79, bg: "bg-amber-100 dark:bg-amber-500/20" },
  { id: "bag", e: "🎒", name: "City Backpack", price: 38, bg: "bg-emerald-100 dark:bg-emerald-500/20" },
];

export function StoreOutput({ flash }: DemoProps) {
  const [cart, setCart] = useState<string[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [bump, setBump] = useState(0);
  const [placed, setPlaced] = useState(0);

  const price = (id: string) => PRODUCTS.find((p) => p.id === id)!.price;
  const total = cart.reduce((s, id) => s + price(id), 0);
  const counts = PRODUCTS.map((p) => ({ ...p, qty: cart.filter((c) => c === p.id).length })).filter((p) => p.qty);

  const add = (id: string) => {
    setCart((c) => [...c, id]);
    setBump((b) => b + 1);
    flash(3);
    setTimeout(() => flash(6), 280);
  };
  const remove = (id: string) => {
    setCart((c) => {
      const i = c.lastIndexOf(id);
      return i < 0 ? c : [...c.slice(0, i), ...c.slice(i + 1)];
    });
    flash(6);
  };
  const checkout = () => {
    if (!cart.length) return;
    setCart([]);
    setShowCart(false);
    setPlaced((n) => n + 1);
    flash(11);
  };

  return (
    <div className="relative select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="font-black text-blue-600 dark:text-blue-400 text-base">🛍️ Shopwave</span>
        <button
          type="button"
          onClick={() => setShowCart((s) => !s)}
          className="relative px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-sm font-bold text-slate-700 dark:text-slate-100 active:scale-95 transition-transform"
          aria-label={`Cart with ${cart.length} items`}
          aria-expanded={showCart}
        >
          🛒
          {cart.length > 0 && (
            <span key={bump} className="demo-pop absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-black grid place-items-center">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {showCart ? (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3 min-h-[222px] demo-rise">
          <div className="text-sm font-black text-slate-800 dark:text-slate-100 mb-2">Your cart</div>
          {counts.length ? (
            counts.map((p) => (
              <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-slate-100 dark:border-white/10 text-xs">
                <span className={`w-9 h-9 rounded-lg grid place-items-center text-lg ${p.bg}`}>{p.e}</span>
                <span className="flex-1 font-bold text-slate-700 dark:text-slate-200">{p.name}</span>
                <button type="button" onClick={() => remove(p.id)} className="w-6 h-6 rounded-md bg-slate-100 dark:bg-white/10 font-black" aria-label={`Remove one ${p.name}`}>−</button>
                <span className="w-4 text-center font-black">{p.qty}</span>
                <button type="button" onClick={() => add(p.id)} className="w-6 h-6 rounded-md bg-slate-100 dark:bg-white/10 font-black" aria-label={`Add one ${p.name}`}>+</button>
                <span className="w-10 text-right font-black">${p.price * p.qty}</span>
              </div>
            ))
          ) : (
            <div className="text-center text-xs text-slate-400 pt-12">Your cart is empty. Add something! 🛍️</div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 min-h-[222px]">
          {PRODUCTS.map((p, i) => {
            const inCart = cart.filter((c) => c === p.id).length;
            return (
              <div key={p.id} className="rounded-2xl border border-slate-200 dark:border-white/10 p-2.5 demo-pop" style={{ animationDelay: `${i * 60}ms` }}>
                <div className={`h-[64px] rounded-xl grid place-items-center text-4xl ${p.bg}`}>{p.e}</div>
                <div className="mt-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">{p.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-black text-slate-900 dark:text-white">${p.price}</span>
                  <button
                    type="button"
                    onClick={() => add(p.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all active:scale-90 ${inCart ? "bg-green-100 text-green-700" : "bg-blue-600 text-white hover:bg-blue-500"}`}
                  >
                    {inCart ? `✓ ${inCart} in cart` : "Add"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-slate-900 dark:bg-white/10 text-white p-3">
        <div className="flex-1">
          <div className="text-[11px] text-slate-300">Total ({cart.length} item{cart.length === 1 ? "" : "s"})</div>
          <div key={total} className="text-xl font-black demo-pop inline-block">${total}</div>
        </div>
        <button
          type="button"
          onClick={checkout}
          disabled={!cart.length}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-sm font-black disabled:opacity-40 active:scale-95 transition-transform"
        >
          Checkout 🔒
        </button>
      </div>
      {placed > 0 && cart.length === 0 && (
        <p key={placed} className="mt-2 text-center text-xs font-bold text-green-600 dark:text-green-400 demo-rise">✅ Order placed! Thanks for shopping.</p>
      )}
      <Burst n={placed} emojis={["🎉", "📦", "✨"]} />
    </div>
  );
}

/* ───────────────────────── School Events App (React · Next.js) ───────────────────────── */

export const EVENTS_CODE = [
  "const [registered, setRegistered] = useState([]);",
  "",
  "function toggle(id) {",
  "  setRegistered((list) =>",
  "    list.includes(id)",
  "      ? list.filter((x) => x !== id)",
  "      : [...list, id]",
  "  );",
  "}",
];

const EVENTS = [
  { id: 1, e: "⚽", name: "Football Cup", when: "Jul 22 · 3:00 pm", where: "Main ground", going: 86, c: "from-orange-500 to-red-500" },
  { id: 2, e: "🔬", name: "Science Fair", when: "Jul 25 · 10:00 am", where: "Hall B", going: 142, c: "from-violet-500 to-indigo-500" },
  { id: 3, e: "🎭", name: "Art Exhibition", when: "Jul 28 · 11:30 am", where: "Art room", going: 58, c: "from-pink-500 to-rose-600" },
  { id: 4, e: "💻", name: "Coding Demo Day", when: "Aug 05 · 4:00 pm", where: "Computer lab", going: 64, c: "from-emerald-500 to-teal-600" },
];

export function EventsOutput({ flash }: DemoProps) {
  const [reg, setReg] = useState<number[]>([]);
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const toggle = (id: number, name: string) => {
    const has = reg.includes(id);
    setReg(has ? reg.filter((x) => x !== id) : [...reg, id]);
    flash(has ? 5 : 6);
    if (!has) {
      setBurst((b) => b + 1);
      setToast(`You're in for ${name}! Reminder set 🔔`);
    } else {
      setToast(null);
    }
  };

  return (
    <div className="relative select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="font-black text-indigo-700 dark:text-indigo-300 text-base">📅 EventHub</span>
        <span key={reg.length} className="demo-pop text-xs font-black px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200">
          {reg.length} registered
        </span>
      </div>
      <div className="space-y-2.5">
        {EVENTS.map((ev, i) => {
          const on = reg.includes(ev.id);
          return (
            <div key={ev.id} className="flex gap-3 items-center rounded-2xl border border-slate-200 dark:border-white/10 p-2.5 demo-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ev.c} grid place-items-center text-2xl flex-none`}>{ev.e}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">{ev.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">⏰ {ev.when} · 📍 {ev.where}</div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">👥 {ev.going + (on ? 1 : 0)} going</div>
              </div>
              <button
                type="button"
                onClick={() => toggle(ev.id, ev.name)}
                aria-pressed={on}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-90 flex-none ${on ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" : "bg-indigo-600 text-white hover:bg-indigo-500"}`}
              >
                {on ? "✓ Registered" : "Register"}
              </button>
            </div>
          );
        })}
      </div>
      <p key={toast ?? "none"} className="mt-3 min-h-[1.25rem] text-center text-xs font-bold text-indigo-600 dark:text-indigo-300 demo-rise">{toast ?? ""}</p>
      <Burst n={burst} emojis={["🎉", "✨", "🔔"]} count={8} />
    </div>
  );
}
