// The look shared by the eight curriculum PDFs. One stylesheet; the colours come from the program's
// theme (CSS variables set on <body>), so every document has its own colours, gradients and
// illustrations while the pages are laid out the same way.
//
// US Letter, 816 × 1056 CSS px per page. Text is Inter (bundled with the server for the
// certificates), so the PDFs look the same on every machine.

import * as fs from 'fs';
import * as path from 'path';
import { GOLD, NAVY, type Theme } from './theme';

export const PAGE_W = 816;
export const PAGE_H = 1056;

const FONT_DIR = path.join(__dirname, '../../assets/certificate/fonts');

/** @font-face rules with the font files inlined, so the PDF never depends on installed fonts. */
export function fontCss(): string {
  return [400, 500, 600, 700]
    .map((w) => {
      const file = path.join(FONT_DIR, `inter-latin-${w}-normal.woff2`);
      const data = fs.readFileSync(file).toString('base64');
      return `@font-face{font-family:'Inter';font-weight:${w};font-style:normal;src:url(data:font/woff2;base64,${data}) format('woff2');}`;
    })
    .join('\n');
}

export function themeVars(t: Theme): string {
  return `--deep:${t.deep};--main:${t.main};--light:${t.light};--soft:${t.soft};--ink:${t.ink};--glow:${t.glow};`;
}

export function css(t: Theme): string {
  return `
${fontCss()}
@page{size:${PAGE_W}px ${PAGE_H}px;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${PAGE_W}px}
body{${themeVars(t)}--navy:${NAVY};--gold:${GOLD};--text:#1c1a3b;--muted:#5d5b7c;--faint:#8a88a6;--line:#e8e6f4;
  font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:var(--text);font-size:11px;line-height:1.45;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;background:#fff}
.page{position:relative;width:${PAGE_W}px;height:${PAGE_H}px;overflow:hidden;page-break-after:always;break-after:page;
  padding:30px 38px 22px;display:flex;flex-direction:column;background:#fff}
.page:last-child{page-break-after:auto;break-after:auto}
.page.cover,.page.assess,.page.journey{justify-content:space-between}
.page.cover>.top,.page.assess>.top,.page.journey>.top{margin-bottom:0}
.page::before{content:'';position:absolute;left:0;right:0;top:0;height:330px;z-index:0;
  background:radial-gradient(ellipse at 15% -10%,var(--glow) 0,rgba(255,255,255,0) 62%),radial-gradient(ellipse at 100% 0,var(--soft) 0,rgba(255,255,255,0) 55%)}
.page>*{position:relative;z-index:1}
b,strong{font-weight:700}
.ico{display:inline-block;vertical-align:-3px;flex:none}
.stars{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:.6}
.hero .stars,.banner .stars,.stagehead .stars,.apanel .stars{-webkit-mask-image:linear-gradient(90deg,rgba(0,0,0,.12) 0%,rgba(0,0,0,.12) 52%,#000 78%);mask-image:linear-gradient(90deg,rgba(0,0,0,.12) 0%,rgba(0,0,0,.12) 52%,#000 78%)}
.art{position:absolute;right:0;bottom:0;width:330px;height:230px;z-index:1}

/* ── Top bar ── */
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.brand{display:flex;align-items:center;gap:9px}
.logo{width:40px;height:40px;object-fit:contain;}
.brand b{display:block;font-size:15px;letter-spacing:.06em;line-height:1.1;color:var(--navy)}
.brand small{display:block;font-size:8.5px;color:var(--faint);margin-top:1px}
.top.slim{margin-bottom:12px}
.top.slim .logo{width:30px;height:30px}
.top.slim .brand b{font-size:11px;letter-spacing:.04em}
.pageno{font-size:10px;font-weight:700;color:var(--faint)}
.chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}
.chip{display:inline-flex;align-items:center;gap:4px;border-radius:99px;padding:3px 10px;font-size:9px;font-weight:700;letter-spacing:.05em;
  border:1px solid transparent;white-space:nowrap}
.chip.age{background:var(--soft);color:var(--ink);border-color:var(--glow)}
.chip.starter{background:#d1fae5;color:#065f46;border-color:#a7f3d0}
.chip.beginner{background:#dcfce7;color:#166534;border-color:#bbf7d0}
.chip.popular{background:#fef3c7;color:#92400e;border-color:#fde68a}
.chip.prerequisite{background:#e0f2fe;color:#075985;border-color:#bae6fd}
.chip.info{background:#f1f5f9;color:#334155;border-color:#e2e8f0}

/* ── Cover hero ── */
.hero{position:relative;border-radius:26px;overflow:hidden;height:268px;padding:24px 34px;color:#fff;
  background:linear-gradient(125deg,var(--deep) 0%,var(--main) 58%,var(--light) 130%);
  box-shadow:0 14px 34px -14px var(--main)}
.hero::after{content:'';position:absolute;left:-60px;bottom:-90px;width:300px;height:300px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,255,.2),rgba(255,255,255,0) 68%)}
.hero-copy{position:relative;z-index:2;max-width:378px}
.eyebrow{font-size:9px;letter-spacing:.2em;font-weight:700;opacity:.82}
.hero h1{font-size:38px;line-height:1.04;font-weight:700;margin:6px 0 5px;letter-spacing:-.01em}
.hero .sub{font-size:15px;font-weight:700;color:var(--gold);margin-bottom:8px}
.hero p{font-size:11px;line-height:1.5;opacity:.94}

/* ── HUD strip ── */
.hud{display:flex;align-items:center;gap:0;border-radius:20px;padding:11px 24px;color:#fff;
  background:linear-gradient(120deg,var(--navy),#242062);border:2px solid var(--gold);
  box-shadow:0 10px 26px -12px rgba(21,19,63,.7),inset 0 0 0 1px rgba(255,255,255,.07)}
.hud-cell{display:flex;align-items:center;gap:14px;flex:1}
.hud-cell b{font-size:38px;line-height:1;font-weight:700;color:var(--gold);letter-spacing:-.02em}
.hud-cell span{font-size:11px;font-weight:700;letter-spacing:.07em;line-height:1.25;text-transform:uppercase}
.hud-cell small{display:block;font-size:9px;font-weight:500;letter-spacing:0;text-transform:none;opacity:.78;margin-top:2px}
.hud-sep{width:1px;align-self:stretch;margin:0 22px;background:linear-gradient(transparent,rgba(255,255,255,.35),transparent)}

/* ── Stats ── */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.stat{border-radius:16px;padding:9px 8px;text-align:center;background:#fff;border:1px solid var(--line)}
.stat b{display:block;font-size:20px;line-height:1.05;font-weight:700;color:var(--ink)}
.stat span{display:block;font-size:9px;color:var(--muted);margin-top:2px;font-weight:500}

.who{display:flex;gap:10px}
.who>div{flex:1;border-radius:14px;padding:7px 12px;display:flex;align-items:flex-start;gap:9px;font-size:10px;line-height:1.4}
.who .a{background:var(--soft);border:1px solid var(--glow);color:var(--ink)}
.who .b{background:#e0f2fe;border:1px solid #bae6fd;color:#075985}
.who b{display:block;font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:1px;opacity:.85}

.section{margin:0 0 8px;font-size:9px;letter-spacing:.2em;font-weight:700;color:var(--muted);display:flex;align-items:center;gap:8px}
.section::after{content:'';flex:1;height:1px;background:var(--line)}

/* ── Learning progression ── */
.path{display:flex;align-items:stretch;gap:0}
.node{flex:1;min-width:0;border-radius:16px;padding:8px 9px 9px;background:#fff;border:1px solid var(--line);position:relative}
.node .lvl{display:block;margin:-22px 0 4px -2px}
.node h5{font-size:10.5px;line-height:1.2;font-weight:700;color:var(--text);min-height:26px}
.node p{font-size:8.6px;line-height:1.35;color:var(--muted);margin-top:3px}
.node .xp{margin-top:6px}
.arrow{align-self:center;width:14px;text-align:center;color:var(--faint);font-size:13px;font-weight:700;flex:none}
.xp{display:flex;gap:2px}
.xp i{display:block;flex:1;height:5px;border-radius:3px}
.stagecol{flex:1;min-width:0;border-radius:18px;padding:11px;background:#fff;border:1px solid var(--line)}
.stagecol h5{font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:#fff;border-radius:9px;padding:4px 8px;margin-bottom:8px;font-weight:700}
.stagecol li{list-style:none;display:flex;align-items:center;gap:6px;font-size:9.5px;font-weight:600;padding:4px 0;border-bottom:1px solid var(--line)}
.stagecol li:last-child{border-bottom:0}
.stagecol li .n{flex:none;width:19px;height:19px;border-radius:7px;color:#fff;font-weight:700;font-size:10px;display:grid;place-items:center}

.trio{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.perk{border-radius:16px;padding:9px 12px;background:#fff;border:1px solid var(--line);position:relative;overflow:hidden}
.perk::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(var(--main),var(--light))}
.perk b{display:block;font-size:10.5px;margin-bottom:3px;color:var(--ink)}
.perk p{font-size:9.2px;color:var(--muted);line-height:1.4}

/* ── Course page ── */
.banner{position:relative;border-radius:22px;overflow:hidden;padding:18px 22px 16px 90px;color:#fff;min-height:132px;
  background:linear-gradient(120deg,var(--c1),var(--c2));box-shadow:0 12px 26px -14px var(--c1)}
.banner::after{content:'';position:absolute;right:-50px;top:-70px;width:230px;height:230px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.25),rgba(255,255,255,0) 68%)}
.banner .lvl{position:absolute;left:20px;top:22px}
.banner .eyebrow{font-size:8.5px}
.banner h2{font-size:25px;line-height:1.1;font-weight:700;margin:4px 0 3px;letter-spacing:-.01em;max-width:430px}
.banner .sub{font-size:11px;opacity:.95;max-width:430px}
.tools{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px;max-width:470px}
.tools span{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);border-radius:99px;padding:2px 9px;font-size:9px;font-weight:600}
.bpills{position:absolute;right:18px;top:16px;display:flex;flex-direction:column;gap:6px;align-items:flex-end;z-index:2}
.pill{border-radius:99px;padding:4px 11px;font-size:8.5px;font-weight:700;letter-spacing:.07em;background:#fff;color:var(--c1);white-space:nowrap}
.pill.gold{background:var(--gold);color:#4a2f00}
.cols{display:grid;grid-template-columns:232px 1fr;gap:12px;margin-top:12px;flex:1;min-height:0}
.side{display:flex;flex-direction:column;gap:10px}
.side>.card{flex:1 1 auto}
.card ul.two{display:grid;grid-template-columns:1fr 1fr;column-gap:10px}
.minihud{flex:none;display:grid;grid-template-columns:repeat(3,1fr);border-radius:18px;padding:10px 6px;color:#fff;background:linear-gradient(120deg,var(--c1),var(--c2));box-shadow:0 8px 18px -10px var(--c1)}
.minihud div{text-align:center;border-left:1px solid rgba(255,255,255,.35)}
.minihud div:first-child{border-left:0}
.minihud b{display:block;font-size:22px;line-height:1.05;font-weight:700}
.minihud span{display:block;font-size:8px;letter-spacing:.1em;font-weight:700;text-transform:uppercase;opacity:.95;margin-top:2px}
.card{border-radius:18px;padding:12px 14px;background:#fff;border:1px solid var(--line);box-shadow:0 4px 12px -8px rgba(40,30,120,.35)}
.card.tint{background:var(--soft);border-color:var(--glow)}
.card h4{font-size:8.8px;letter-spacing:.16em;font-weight:700;color:var(--faint);margin-bottom:6px;text-transform:uppercase;display:flex;align-items:center;gap:6px}
.card p{font-size:10.4px;line-height:1.52;color:#3b3960}
.card ul{list-style:none}
.card li.proj{display:flex;align-items:flex-start;gap:7px;font-size:10.6px;font-weight:600;padding:3px 0;color:var(--text)}
.card li.proj i{flex:none;width:7px;height:7px;margin-top:5px;border-radius:2px;background:var(--c1);transform:rotate(45deg)}
.lessons{display:flex;flex-direction:column}
.lessons h4{margin-bottom:8px}
.lesson{display:flex;align-items:center;gap:10px;flex:1;border-bottom:1px solid var(--line);padding:3px 0}
.lesson:last-of-type{border-bottom:0}
.lesson .n{flex:none;width:28px;height:28px;border-radius:10px;color:#fff;font-weight:700;font-size:13px;display:grid;place-items:center;
  background:linear-gradient(135deg,var(--c1),var(--c2));box-shadow:0 3px 6px -3px var(--c1)}
.lesson b{font-size:11.8px;line-height:1.3;color:var(--text);font-weight:600}
.lessons .xpwrap{margin-top:8px;display:flex;align-items:center;gap:8px;font-size:8.5px;font-weight:700;letter-spacing:.1em;color:var(--faint)}
.lessons .xpwrap .xp{flex:1}
.lessons .xpwrap .xp i{height:6px}
.bottom{display:grid;grid-template-columns:1fr 240px;gap:12px;margin-top:12px;height:196px}
.bottom>*{min-height:0}
.snap{display:flex;gap:12px;padding:10px;align-items:stretch}
.snap{overflow:hidden;min-height:0}
.snap .shot{flex:none;width:264px;height:165px;align-self:center;border-radius:11px;overflow:hidden;border:1px solid var(--line);background:#f4f3fb;position:relative;min-height:0}
.bottom.tall{height:252px}
.bottom.tall .snap .shot{height:100%;align-self:stretch}
.snap .shot img{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;object-position:left top}
.snap .shot .half{position:relative;height:50%}
.snap .shot .half+.half{border-top:2px solid #fff}
.snap .shot .tag{position:absolute;left:7px;top:7px;background:var(--navy);color:var(--gold);border-radius:99px;padding:2px 8px;font-size:7.5px;font-weight:700;letter-spacing:.12em}
.snap .cap{display:flex;flex-direction:column;justify-content:center;min-width:0}
.snap .cap .k{font-size:8px;letter-spacing:.16em;font-weight:700;color:var(--c1);text-transform:uppercase}
.snap .cap b{display:block;font-size:12.5px;line-height:1.25;margin:3px 0 2px;color:var(--text)}
.snap .cap small{display:block;font-size:9.4px;color:var(--faint);font-weight:600;margin-bottom:5px}
.snap .cap p{font-size:9.8px;color:var(--muted);line-height:1.45}
.testbox{border-radius:20px;padding:14px 15px;color:#fff;position:relative;overflow:hidden;display:flex;flex-direction:column;
  background:linear-gradient(135deg,var(--navy),#2a2670);border:2px solid var(--gold);box-shadow:0 10px 22px -12px rgba(21,19,63,.8)}
.testbox .k{font-size:8px;letter-spacing:.2em;font-weight:700;color:var(--gold);display:flex;align-items:center;gap:6px}
.testbox b{display:block;font-size:13px;line-height:1.25;margin:5px 0 4px}
.testbox p{font-size:9.6px;line-height:1.45;opacity:.9}
.testbox .tags{margin-top:auto;display:flex;flex-wrap:wrap;gap:5px}
.testbox .tags span{background:rgba(255,200,61,.16);border:1px solid rgba(255,200,61,.55);color:#ffe29a;border-radius:99px;padding:2px 8px;font-size:8px;font-weight:700;letter-spacing:.04em}

/* ── Odyssey stage page ── */
.stagehead{border-radius:22px;padding:16px 22px;color:#fff;position:relative;overflow:hidden;background:linear-gradient(120deg,var(--c1),var(--c2));min-height:112px}
.stagehead h2{font-size:26px;line-height:1.1;margin:4px 0 4px}
.stagehead p{font-size:10.5px;max-width:520px;opacity:.95}
.stagehead .bpills{top:14px}
.quests{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px;flex:1;min-height:0}
.quest{border-radius:18px;background:#fff;border:1px solid var(--line);box-shadow:0 4px 12px -8px rgba(40,30,120,.4);display:flex;flex-direction:column;overflow:hidden}
.quest .qh{padding:12px 12px 10px;color:#fff;background:linear-gradient(135deg,var(--c1),var(--c2));position:relative}
.quest .qh .lvl{position:absolute;right:8px;top:8px;opacity:.95}
.quest .qh .k{font-size:7.5px;letter-spacing:.16em;font-weight:700;opacity:.9}
.quest .qh h3{font-size:13px;line-height:1.2;margin:3px 0 0;padding-right:40px}
.quest .qb{padding:9px 12px 8px;flex:1;display:flex;flex-direction:column;min-height:0}
.quest .qb p{font-size:9.6px;color:var(--muted);line-height:1.45}
.quest .qtools{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0 5px}
.quest .qtools span{font-size:8.4px;font-weight:700;border-radius:99px;padding:1.5px 7px;background:var(--soft);color:var(--ink);border:1px solid var(--glow)}
.quest ol{list-style:none;margin-top:3px;flex:1;display:flex;flex-direction:column;justify-content:space-around}
.quest li{display:flex;gap:6px;font-size:9.6px;line-height:1.3;padding:2.2px 0;border-bottom:1px dashed var(--line);color:#34325a;font-weight:500}
.quest li:last-child{border-bottom:0}
.quest li i{flex:none;font-style:normal;font-weight:700;color:var(--c1);width:10px;text-align:right}
.quest .qs{flex:none;aspect-ratio:16/10;border-top:1px solid var(--line);position:relative;background:#f4f3fb}
.quest .qs img{display:block;width:100%;height:100%;object-fit:cover;object-position:left top}
.quest .qs .tag{position:absolute;left:6px;top:6px;background:var(--navy);color:var(--gold);border-radius:99px;padding:2px 7px;font-size:7px;font-weight:700;letter-spacing:.1em}
.quest .qs .cap{position:absolute;left:0;right:0;bottom:0;padding:16px 10px 8px;background:linear-gradient(transparent,rgba(21,19,63,.82));color:#fff;font-size:8.2px;font-weight:700}
.quest .qt{padding:7px 10px;font-size:8.2px;font-weight:700;color:#4a2f00;background:#fff3cf;border-top:1px solid #f5dc8e;display:flex;gap:6px;align-items:center}

/* ── Assessment spotlight ── */
.apanel{position:relative;border-radius:26px;overflow:hidden;padding:24px 28px;color:#fff;min-height:176px;
  background:radial-gradient(ellipse at 90% 0,rgba(255,200,61,.22),rgba(255,200,61,0) 55%),linear-gradient(130deg,var(--navy),#2b2775 70%,var(--deep));
  border:2.5px solid var(--gold);box-shadow:0 16px 34px -16px rgba(21,19,63,.85)}
.apanel .eyebrow{color:var(--gold);opacity:1}
.apanel h2{font-size:31px;line-height:1.08;font-weight:700;margin:6px 0 8px;letter-spacing:-.01em;max-width:440px}
.apanel p{font-size:11px;line-height:1.55;max-width:430px;opacity:.92}
.trophy{position:absolute;right:26px;top:14px;width:230px;height:150px}
.track{margin-top:14px;border-radius:20px;padding:14px 14px 12px;background:#fff;border:1px solid var(--line);box-shadow:0 4px 12px -8px rgba(40,30,120,.4)}
.track h4{font-size:8.5px;letter-spacing:.16em;font-weight:700;color:var(--faint);margin-bottom:10px}
.tr{display:flex;align-items:stretch;gap:0}
.tr .leg{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative}
.tr .leg .bar{width:100%;display:flex;gap:2px}
.tr .leg .bar i{flex:1;height:7px;border-radius:3px}
.tr .leg .lab{font-size:8px;font-weight:700;color:var(--muted);text-align:center;line-height:1.2;padding:0 2px}
.tr .flag{flex:none;width:44px;display:flex;flex-direction:column;align-items:center;gap:3px;margin:0 3px}
.tr .flag .dot{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--navy);border:2.5px solid var(--gold);color:var(--gold);box-shadow:0 4px 8px -3px rgba(21,19,63,.7)}
.tr .flag small{font-size:7.2px;font-weight:700;color:var(--ink);letter-spacing:.06em;text-align:center;line-height:1.15}
.tr .flag.final .dot{width:40px;height:40px;background:linear-gradient(135deg,var(--gold),#ff9d2e);border-color:#fff;color:#5a3300}
.tr .flag.stage .dot{background:#fff;color:var(--navy);border-color:var(--gold)}
.tests{display:grid;gap:10px;margin-top:12px}
.tests.n2{grid-template-columns:1fr 1fr}
.tests.n3{grid-template-columns:repeat(3,1fr)}
.tk{border-radius:20px;padding:13px 14px 12px;background:#fff;border:1px solid var(--line);box-shadow:0 5px 14px -9px rgba(40,30,120,.45);position:relative;overflow:hidden;display:flex;flex-direction:column}
.tk.gold{border:2px solid var(--gold);background:linear-gradient(160deg,#fffaf0,#fff)}
.tk .hd{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.tk .hd .bd{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--navy),#3a3590);flex:none}
.tk.gold .hd .bd{background:linear-gradient(135deg,var(--gold),#ff9d2e);color:#5a3300}
.tk .hd small{display:block;font-size:7.5px;letter-spacing:.18em;font-weight:700;color:var(--faint)}
.tk .hd b{display:block;font-size:12px;line-height:1.15;color:var(--navy)}
.tk p.b{font-size:9.2px;color:var(--muted);line-height:1.45;margin-bottom:8px}
.parts{display:flex;flex-direction:column;gap:5px;margin-top:auto}
.part{display:flex;align-items:center;gap:8px;border-radius:11px;padding:6px 9px;background:var(--soft);border:1px solid var(--glow)}
.part .v{flex:none;min-width:34px;text-align:center;font-size:17px;font-weight:700;color:var(--ink);line-height:1}
.part span{font-size:9px;font-weight:600;color:#34325a;line-height:1.25}
.tk.gold .part{background:#fff4d6;border-color:#f6dc8d}
.tk.gold .part .v{color:#7a4a00}
.after{margin-top:12px}
.after .row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.af{border-radius:16px;padding:10px 12px;background:var(--soft);border:1px solid var(--glow);display:flex;gap:9px}
.af .ic{flex:none;width:26px;height:26px;border-radius:9px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--main),var(--light))}
.af b{display:block;font-size:10px;color:var(--ink);margin-bottom:1px}
.af p{font-size:8.8px;color:#4a4870;line-height:1.4}

/* ── Journey ── */
.jh{font-size:25px;line-height:1.1;font-weight:700;color:var(--navy);margin:2px 0 4px}
.jp{font-size:10.5px;color:var(--muted);max-width:660px;line-height:1.5}
.jlist{display:flex;flex-direction:column;gap:7px;margin-top:6px}
.jrow{display:flex;align-items:center;gap:11px;border-radius:15px;padding:9px 12px 9px 9px;background:#fff;border:1px solid var(--line)}
.jrow .lvl{flex:none}
.jrow .t{flex:1;min-width:0}
.jrow .t b{display:block;font-size:11px;color:var(--text)}

.jrow .chips2{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.jrow .chips2 span{font-size:8.4px;font-weight:600;border-radius:99px;padding:2px 8px;background:var(--soft);color:var(--ink);border:1px solid var(--glow)}
.jrow .tail{flex:none;display:flex;gap:5px}
.jrow .tail span{font-size:8px;font-weight:700;border-radius:99px;padding:3px 9px;white-space:nowrap}
.jrow .tail .a{background:var(--soft);color:var(--ink);border:1px solid var(--glow)}
.jrow .tail .b{background:#fff3cf;color:#6b4300;border:1px solid #f1d27b}
.lanes{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.lane{border-radius:18px;padding:10px;background:#fff;border:1px solid var(--line)}
.lane h5{font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:#fff;border-radius:9px;padding:5px 8px;margin-bottom:6px;font-weight:700}
.lane .li{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)}
.lane .li b{display:block;font-size:9.8px;line-height:1.2}
.lane .li small{display:block;font-size:8.2px;color:var(--muted);margin-top:1px}
.lane .lt{margin-top:7px;font-size:8px;font-weight:700;color:#6b4300;background:#fff3cf;border:1px solid #f1d27b;border-radius:99px;padding:3px 8px;text-align:center}
.tiles{display:grid;gap:6px;margin-top:6px}
.tile{border-radius:12px;padding:8px 9px;color:#fff;background:linear-gradient(135deg,var(--c1),var(--c2));min-height:52px}
.tile.stg{background:#fff;color:var(--navy);border:2px solid var(--gold)}
.tile.stg small{color:#a86b00}
.tile small{display:block;font-size:6.8px;letter-spacing:.14em;font-weight:700;opacity:.92}
.tile b{display:block;font-size:9px;line-height:1.2;margin-top:2px}
.finalbar{margin-top:8px;border-radius:16px;padding:11px 16px;color:#fff;display:flex;align-items:center;gap:13px;
  background:linear-gradient(120deg,var(--navy),#2b2775);border:2px solid var(--gold);box-shadow:0 8px 20px -12px rgba(21,19,63,.85)}
.finalbar .ft{flex:none;background:var(--gold);color:#4a2f00;font-weight:700;font-size:9px;letter-spacing:.1em;border-radius:99px;padding:5px 12px}
.finalbar b{display:block;font-size:12px}
.finalbar small{display:block;font-size:9px;opacity:.85;margin-top:1px}
.outs{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:6px}
.out{border-radius:15px;padding:10px 12px;background:var(--soft);border:1px solid var(--glow);display:flex;gap:8px;font-size:9.3px;line-height:1.45;color:#2f2d57;font-weight:500}
.out .ck{flex:none;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--main),var(--light));color:#fff;margin-top:1px}
.next{display:flex;flex-wrap:wrap;gap:7px;margin-top:6px}
.next span{border-radius:99px;padding:5px 12px;font-size:9.5px;font-weight:700;background:#fff;border:1px solid var(--glow);color:var(--ink);box-shadow:0 2px 6px -4px rgba(40,30,120,.4)}
.cta{display:flex;align-items:center;justify-content:space-between;gap:12px;border-radius:16px;padding:12px 16px;color:#fff;background:linear-gradient(120deg,var(--deep),var(--main))}
.cta b{font-size:13px}
.cta small{display:block;font-size:9px;opacity:.9;margin-top:1px}
.cta span{font-size:9.5px;font-weight:700;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4);border-radius:99px;padding:5px 12px;white-space:nowrap}

/* ── Cover showcase ── */
.showcase{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:10px}
.sc{border-radius:15px;overflow:hidden;background:#fff;border:1px solid var(--line)}
.sc .im{height:88px;position:relative;background:#f4f3fb}
.sc .im img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top}
.sc .no{display:inline-grid;place-items:center;vertical-align:1px;margin-right:6px;min-width:20px;height:16px;border-radius:6px;font-size:8.5px;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--c1),var(--c2));padding:0 4px}
.sc .tx{padding:6px 9px 7px}
.sc b{display:block;font-size:9.4px;line-height:1.2;color:var(--text)}
.sc small{display:block;font-size:8px;color:var(--faint);font-weight:600;margin-top:1px}

/* ── Sample questions ── */
.qcards{display:grid;grid-template-columns:1.3fr 1fr;gap:10px}
.qc{border-radius:18px;padding:12px 14px;background:#fff;border:1px solid var(--line);box-shadow:0 4px 12px -8px rgba(40,30,120,.4);display:flex;flex-direction:column}
.qtag{align-self:flex-start;background:var(--navy);color:var(--gold);border-radius:99px;padding:2px 9px;font-size:7.5px;font-weight:700;letter-spacing:.14em}
.qc h5{font-size:11.5px;line-height:1.35;margin:7px 0 8px;color:var(--navy)}
.opt{display:flex;align-items:center;gap:8px;border-radius:10px;padding:5px 9px;margin-bottom:4px;background:#f6f5fc;border:1px solid var(--line);font-size:9.6px;font-weight:600;color:#34325a}
.opt i{flex:none;width:18px;height:18px;border-radius:6px;font-style:normal;font-weight:700;font-size:9px;display:grid;place-items:center;background:#fff;border:1px solid var(--line);color:var(--ink)}
.opt.ok{background:#dcfce7;border-color:#86efac;color:#14532d}
.opt.ok i{background:#16a34a;border-color:#16a34a;color:#fff}
.opt .tick{margin-left:auto;font-size:8px;font-weight:700;letter-spacing:.08em;color:#15803d}
.tf{display:flex;gap:8px;margin:auto 0;min-height:64px;max-height:96px;flex:1}
.tf span{flex:1;display:flex;align-items:center;justify-content:center;border-radius:12px;font-size:13px;font-weight:700;background:#f6f5fc;border:1px solid var(--line);color:#34325a}
.tf span.ok{background:#dcfce7;border-color:#86efac;color:#14532d}
.qnote{margin-top:auto;padding-top:8px;font-size:8px;color:var(--faint);line-height:1.4}

/* ── Footer ── */
.foot{margin-top:auto;padding-top:9px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;font-size:8.5px;color:var(--faint);font-weight:500}
.foot b{color:var(--muted);font-weight:700}
.cta+.foot,.bottom+.foot,.trio+.foot{margin-top:10px}
.page.cover .foot,.page.assess .foot,.page.journey .foot{margin-top:0}
`;
}
