// FILE PATH: client/lib/littleCoders/scratchRuntime.ts
//
// A small, safe Scratch-style runtime for the live demos of courses 1 and 2: a stage with sprites,
// scripts made of the real block names (the same lines a lesson shows as blocks), a green flag,
// keys, clicks, broadcasts, variables, loops and clones. It exists so a lesson page can RUN the
// demo — nothing here touches the DOM, the network or `eval`.
//
// It simulates the stage at 30 frames a second like Scratch does: a loop gives the screen a turn
// after every pass, "wait" waits real (virtual) time, and "glide" moves a little every frame.
// A block it does not know is skipped and reported in `unknownBlocks` instead of guessed at.

import { buildBlockTree, isHat, segmentsOf, type BlockNode, type Segment } from './blockLines';
import type { LcStageScript, LcStageSprite } from './types';

export const STAGE_WIDTH = 480;
export const STAGE_HEIGHT = 360;
export const FRAME_MS = 1000 / 30;
const MAX_CLONES = 60;
const SPRITE_RADIUS = 20; // stage units at 100% size

export interface StageDefinition {
  sprites: LcStageSprite[];
  scripts: LcStageScript[];
  backdrop?: string;
}

export interface SpriteView {
  uid: string;
  id: string;
  label: string;
  emoji: string;
  x: number;
  y: number;
  /** Scratch direction: 90 = right, 0 = up. */
  direction: number;
  size: number;
  visible: boolean;
  costume: number;
  costumeCount: number;
  say: { text: string; think: boolean } | null;
  /** The "color" graphic effect, 0–200 like Scratch. */
  effect: number;
  isClone: boolean;
  /** A sound that is "playing" right now (shown as a ♪ chip — the demo makes no noise). */
  sound: string | null;
}

export interface StageView {
  sprites: SpriteView[];
  variables: [string, string][];
  backdrop: string;
  timer: number;
  running: boolean;
}

type Value = number | string | boolean;
type Wait = number; // ms to wait before the script's next turn (0 = the next frame)

interface SpriteState {
  uid: string;
  def: LcStageSprite;
  x: number;
  y: number;
  direction: number;
  size: number;
  visible: boolean;
  costume: number;
  say: { text: string; think: boolean } | null;
  effect: number;
  sound: string | null;
  isClone: boolean;
  deleted: boolean;
}

interface Stack {
  hat: BlockNode;
  body: BlockNode[];
}

interface Thread {
  gen: Generator<Wait, void, void>;
  wakeAt: number;
  sprite: SpriteState;
  stackKey: string;
  done: boolean;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const num = (v: Value): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const truthy = (v: Value) => (typeof v === 'boolean' ? v : typeof v === 'number' ? v !== 0 : v !== '' && v.toLowerCase() !== 'false' && v !== '0');
const fmt = (v: Value): string => (typeof v === 'number' ? String(Math.round(v * 1e6) / 1e6) : String(v));

const KEY_ALIASES: Record<string, string> = { ' ': 'space', arrowright: 'right arrow', arrowleft: 'left arrow', arrowup: 'up arrow', arrowdown: 'down arrow' };
export const normalizeKey = (k: string): string => KEY_ALIASES[k.toLowerCase()] ?? k.toLowerCase();

/** The "shape" of a block: its text with every slot replaced by _ (or {} for a true/false slot). */
function templateOf(segs: Segment[]): string {
  return segs
    .map((s) => (s.kind === 'text' ? s.text : s.kind === 'bool' ? '{}' : '_'))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function slotsOf(segs: Segment[]): Segment[] {
  return segs.filter((s) => s.kind !== 'text');
}

export class ScratchStage {
  private readonly stacks = new Map<string, Stack[]>();
  private sprites: SpriteState[] = [];
  private threads: Thread[] = [];
  private vars = new Map<string, Value>();
  private keys = new Set<string>();
  private time = 0;
  private timerStart = 0;
  private backdropName: string;
  private cloneCount = 0;
  private uidSeq = 0;
  private readonly rand: () => number;
  readonly unknownBlocks = new Set<string>();

  constructor(
    private readonly def: StageDefinition,
    opts: { rand?: () => number } = {},
  ) {
    this.rand = opts.rand ?? Math.random;
    this.backdropName = def.backdrop ?? 'plain';
    for (const sprite of def.sprites) this.stacks.set(sprite.id, []);
    for (const script of def.scripts) {
      const list = this.stacks.get(script.sprite);
      if (!list) continue;
      let current: Stack | null = null;
      for (const node of buildBlockTree(script.lines)) {
        if (isHat(node.category, node.text)) {
          current = { hat: node, body: [] };
          list.push(current);
        } else if (current) current.body.push(node);
      }
    }
    this.reset();
  }

  // ── Setting up and controlling ────────────────────────────────────────────

  private reset() {
    this.threads = [];
    this.vars = new Map();
    this.keys = new Set();
    this.time = 0;
    this.timerStart = 0;
    this.cloneCount = 0;
    this.backdropName = this.def.backdrop ?? 'plain';
    this.sprites = this.def.sprites.map((d) => this.newSprite(d, false));
  }

  private newSprite(d: LcStageSprite, isClone: boolean): SpriteState {
    return {
      uid: `${d.id}#${this.uidSeq++}`,
      def: d,
      x: d.x ?? 0,
      y: d.y ?? 0,
      direction: 90,
      size: 100,
      visible: true,
      costume: 0,
      say: null,
      effect: 0,
      sound: null,
      isClone,
      deleted: false,
    };
  }

  /** The green flag: everything starts over, then every "when green flag clicked" script runs. */
  greenFlag() {
    this.reset();
    for (const sp of this.sprites) this.startHats(sp, (h) => h.category === 'events' && h.text === 'when green flag clicked');
  }

  /** The red stop sign: every script stops, the sprites stay where they are. */
  stop() {
    this.threads = [];
    for (const sp of this.sprites) {
      sp.say = null;
      sp.sound = null;
    }
  }

  pressKey(key: string) {
    const k = normalizeKey(key);
    if (this.keys.has(k)) return;
    this.keys.add(k);
    this.fireKey(k);
  }

  releaseKey(key: string) {
    this.keys.delete(normalizeKey(key));
  }

  isKeyDown(key: string) {
    return this.keys.has(normalizeKey(key));
  }

  clickSprite(uid: string) {
    const sp = this.sprites.find((s) => s.uid === uid && !s.deleted);
    if (sp) this.startHats(sp, (h) => h.category === 'events' && h.text === 'when this sprite clicked');
  }

  broadcast(message: string) {
    const want = norm(message);
    for (const sp of [...this.sprites]) {
      if (sp.deleted) continue;
      this.startHats(sp, (h) => {
        const m = /^when I receive \[(.+)\]$/.exec(h.text);
        return !!m && norm(m[1]) === want;
      });
    }
  }

  private fireKey(k: string) {
    for (const sp of [...this.sprites]) {
      if (sp.deleted) continue;
      this.startHats(sp, (h) => {
        const m = /^when \[(.+)\] key pressed$/.exec(h.text);
        return !!m && normalizeKey(m[1]) === k;
      });
    }
  }

  private startHats(sp: SpriteState, match: (hat: BlockNode) => boolean) {
    const list = this.stacks.get(sp.def.id) ?? [];
    list.forEach((stack, i) => {
      if (!match(stack.hat)) return;
      const stackKey = `${sp.uid}/${i}`;
      if (this.threads.some((t) => !t.done && t.stackKey === stackKey)) return; // already running
      this.threads.push({ gen: this.run(stack.body, sp), wakeAt: this.time, sprite: sp, stackKey, done: false });
    });
  }

  // ── Time ──────────────────────────────────────────────────────────────────

  /** Advances the stage by one frame (1/30 s). */
  step() {
    this.time += FRAME_MS;
    // A held key keeps firing its "when key pressed" scripts, like Scratch does every frame.
    for (const k of this.keys) this.fireKey(k);
    for (const t of [...this.threads]) {
      if (t.done || t.wakeAt > this.time + 1e-6) continue;
      if (t.sprite.deleted) {
        t.done = true;
        continue;
      }
      let r: IteratorResult<Wait, void>;
      try {
        r = t.gen.next();
      } catch {
        t.done = true;
        continue;
      }
      if (r.done) t.done = true;
      else t.wakeAt = this.time + Math.max(0, r.value);
    }
    this.threads = this.threads.filter((t) => !t.done);
    this.sprites = this.sprites.filter((s) => !s.deleted);
  }

  /** True while any script is still running. */
  get running() {
    return this.threads.length > 0;
  }

  view(): StageView {
    return {
      sprites: this.sprites.map((s) => ({
        uid: s.uid,
        id: s.def.id,
        label: s.def.label,
        emoji: s.def.costumes?.[s.costume % (s.def.costumes?.length || 1)] ?? s.def.emoji,
        x: s.x,
        y: s.y,
        direction: s.direction,
        size: s.size,
        visible: s.visible,
        costume: s.costume,
        costumeCount: s.def.costumes?.length ?? 1,
        say: s.say,
        effect: s.effect,
        isClone: s.isClone,
        sound: s.sound,
      })),
      variables: [...this.vars.entries()].map(([k, v]) => [k, fmt(v)]),
      backdrop: this.backdropName,
      timer: Math.round(((this.time - this.timerStart) / 1000) * 10) / 10,
      running: this.threads.length > 0,
    };
  }

  // ── Values ────────────────────────────────────────────────────────────────

  private touching(sp: SpriteState, name: string): boolean {
    const want = norm(name);
    if (want === 'edge') return Math.abs(sp.x) > STAGE_WIDTH / 2 - 15 || Math.abs(sp.y) > STAGE_HEIGHT / 2 - 15;
    if (want === 'mousepointer') return false;
    const r = (SPRITE_RADIUS * sp.size) / 100;
    return this.sprites.some((o) => {
      if (o === sp || o.deleted || !o.visible) return false;
      if (norm(o.def.label) !== want && norm(o.def.id) !== want) return false;
      return Math.hypot(o.x - sp.x, o.y - sp.y) < r + (SPRITE_RADIUS * o.size) / 100;
    });
  }

  private seg(s: Segment, sp: SpriteState): Value {
    if (s.kind === 'text') return s.text;
    if (s.kind === 'string') return s.inner;
    return this.inner(s.inner, sp);
  }

  /** The value of what is inside a slot: a number, a variable or reporter, or a small expression. */
  private inner(text: string, sp: SpriteState): Value {
    const t = text.trim();
    if (t === '') return 0;
    if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
    const segs = segmentsOf(t);
    const tpl = templateOf(segs);
    const args = slotsOf(segs);
    switch (tpl) {
      case 'key _ pressed?': return this.keys.has(normalizeKey(String(this.seg(args[0], sp))));
      case 'touching _?': return this.touching(sp, String(this.seg(args[0], sp)));
      case 'pick random _ to _': {
        const a = num(this.seg(args[0], sp));
        const b = num(this.seg(args[1], sp));
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        return Number.isInteger(a) && Number.isInteger(b) ? lo + Math.floor(this.rand() * (hi - lo + 1)) : lo + this.rand() * (hi - lo);
      }
      case 'x position': return sp.x;
      case 'y position': return sp.y;
      case 'direction': return sp.direction;
      case 'size': return sp.size;
      case 'timer': return (this.time - this.timerStart) / 1000;
      case 'costume number': return sp.costume + 1;
      case 'not {}': return !truthy(this.seg(args[0], sp));
      case '{} and {}': return truthy(this.seg(args[0], sp)) && truthy(this.seg(args[1], sp));
      case '{} or {}': return truthy(this.seg(args[0], sp)) || truthy(this.seg(args[1], sp));
      case 'join _ _': return fmt(this.seg(args[0], sp)) + fmt(this.seg(args[1], sp));
    }
    const op = /^_ ([<>=*+/-]) _$/.exec(tpl);
    if (op && args.length === 2) {
      const a = this.seg(args[0], sp);
      const b = this.seg(args[1], sp);
      switch (op[1]) {
        case '<': return num(a) < num(b);
        case '>': return num(a) > num(b);
        case '=': return typeof a === 'string' || typeof b === 'string' ? String(a).toLowerCase() === String(b).toLowerCase() : num(a) === num(b);
        case '*': return num(a) * num(b);
        case '+': return num(a) + num(b);
        case '-': return num(a) - num(b);
        case '/': return num(b) === 0 ? 0 : num(a) / num(b);
      }
    }
    if (segs.length === 1 && segs[0].kind === 'text') {
      if (this.vars.has(t)) return this.vars.get(t) as Value;
      return t; // a word (a message name, a sprite name, a costume name)
    }
    return t;
  }

  private arg(args: Segment[], i: number, sp: SpriteState): Value {
    return args[i] ? this.seg(args[i], sp) : 0;
  }

  // ── Scripts ───────────────────────────────────────────────────────────────

  private costumeIndex(sp: SpriteState, name: string): number {
    const list = sp.def.costumes ?? [];
    const n = norm(name);
    const byLetter = /-([a-z])$/i.exec(name.trim());
    if (byLetter && list.length > 0) return (byLetter[1].toLowerCase().charCodeAt(0) - 97) % list.length;
    const at = list.findIndex((c) => norm(c) === n);
    if (at >= 0) return at;
    const asNumber = Number(name);
    return Number.isInteger(asNumber) && list.length > 0 ? (((asNumber - 1) % list.length) + list.length) % list.length : sp.costume;
  }

  private *run(nodes: BlockNode[], sp: SpriteState): Generator<Wait, void, void> {
    for (const n of nodes) {
      if (sp.deleted) return;
      const segs = segmentsOf(n.text);
      const tpl = templateOf(segs);
      const a = slotsOf(segs);
      switch (tpl) {
        // ── Motion ─────────────────────────────────────────────────────────
        case 'go to x: _ y: _':
          sp.x = num(this.arg(a, 0, sp));
          sp.y = num(this.arg(a, 1, sp));
          break;
        case 'go to _': {
          const where = String(this.arg(a, 0, sp));
          if (norm(where) === 'randomposition') {
            sp.x = Math.round((this.rand() - 0.5) * (STAGE_WIDTH - 80));
            sp.y = Math.round((this.rand() - 0.5) * (STAGE_HEIGHT - 80));
          }
          break;
        }
        case 'move _ steps': {
          const d = num(this.arg(a, 0, sp));
          const r = (sp.direction * Math.PI) / 180;
          sp.x += d * Math.sin(r);
          sp.y += d * Math.cos(r);
          break;
        }
        case 'turn ↻ _ degrees': sp.direction = (sp.direction + num(this.arg(a, 0, sp))) % 360; break;
        case 'turn ↺ _ degrees': sp.direction = (sp.direction - num(this.arg(a, 0, sp))) % 360; break;
        case 'point in direction _': sp.direction = num(this.arg(a, 0, sp)); break;
        case 'change x by _': sp.x += num(this.arg(a, 0, sp)); break;
        case 'change y by _': sp.y += num(this.arg(a, 0, sp)); break;
        case 'set x to _': sp.x = num(this.arg(a, 0, sp)); break;
        case 'set y to _': sp.y = num(this.arg(a, 0, sp)); break;
        case 'if on edge, bounce':
          if (Math.abs(sp.x) > STAGE_WIDTH / 2 - 20) sp.direction = -sp.direction;
          if (Math.abs(sp.y) > STAGE_HEIGHT / 2 - 20) sp.direction = 180 - sp.direction;
          break;
        case 'glide _ secs to x: _ y: _': {
          const ms = Math.max(0, num(this.arg(a, 0, sp))) * 1000;
          const x0 = sp.x;
          const y0 = sp.y;
          const x1 = num(this.arg(a, 1, sp));
          const y1 = num(this.arg(a, 2, sp));
          const began = this.time;
          while (this.time - began < ms - 1e-6 && !sp.deleted) {
            const f = Math.min(1, (this.time - began + FRAME_MS) / ms);
            sp.x = x0 + (x1 - x0) * f;
            sp.y = y0 + (y1 - y0) * f;
            yield 0;
          }
          sp.x = x1;
          sp.y = y1;
          break;
        }

        // ── Looks ──────────────────────────────────────────────────────────
        case 'say _ for _ seconds':
        case 'think _ for _ seconds': {
          const bubble = { text: fmt(this.arg(a, 0, sp)), think: tpl.startsWith('think') };
          sp.say = bubble;
          yield Math.max(0, num(this.arg(a, 1, sp))) * 1000;
          if (sp.say === bubble) sp.say = null;
          break;
        }
        case 'say _': sp.say = fmt(this.arg(a, 0, sp)) ? { text: fmt(this.arg(a, 0, sp)), think: false } : null; break;
        case 'think _': sp.say = fmt(this.arg(a, 0, sp)) ? { text: fmt(this.arg(a, 0, sp)), think: true } : null; break;
        case 'switch costume to _': sp.costume = this.costumeIndex(sp, String(this.arg(a, 0, sp))); break;
        case 'next costume': sp.costume = (sp.costume + 1) % Math.max(1, sp.def.costumes?.length ?? 1); break;
        case 'set size to _ %': sp.size = Math.max(5, num(this.arg(a, 0, sp))); break;
        case 'change size by _': sp.size = Math.max(5, sp.size + num(this.arg(a, 0, sp))); break;
        case 'show': sp.visible = true; break;
        case 'hide': sp.visible = false; break;
        case 'change _ effect by _':
          if (norm(String(this.arg(a, 0, sp))) === 'color') sp.effect = (sp.effect + num(this.arg(a, 1, sp))) % 200;
          break;
        case 'set _ effect to _':
          if (norm(String(this.arg(a, 0, sp))) === 'color') sp.effect = num(this.arg(a, 1, sp)) % 200;
          break;
        case 'clear graphic effects': sp.effect = 0; break;
        case 'switch backdrop to _': this.backdropName = String(this.arg(a, 0, sp)); break;

        // ── Sound (shown, not heard) ───────────────────────────────────────
        case 'start sound _':
        case 'play sound _ until done': {
          const name = String(this.arg(a, 0, sp));
          sp.sound = name;
          this.after(600, () => {
            if (sp.sound === name) sp.sound = null;
          });
          break;
        }
        case 'clear sound effects':
          break;

        // ── Control ────────────────────────────────────────────────────────
        case 'wait _ seconds': yield Math.max(0, num(this.arg(a, 0, sp))) * 1000; break;
        case 'repeat _': {
          const times = Math.max(0, Math.round(num(this.arg(a, 0, sp))));
          for (let i = 0; i < times && !sp.deleted; i++) {
            yield* this.run(n.children, sp);
            yield 0;
          }
          break;
        }
        case 'forever':
          while (!sp.deleted) {
            yield* this.run(n.children, sp);
            yield 0;
          }
          return;
        case 'if {} then':
          if (truthy(this.arg(a, 0, sp))) yield* this.run(n.children, sp);
          else if (n.elseChildren) yield* this.run(n.elseChildren, sp);
          break;
        case 'wait until {}':
          while (!truthy(this.arg(a, 0, sp)) && !sp.deleted) yield 0;
          break;
        case 'repeat until {}':
          while (!truthy(this.arg(a, 0, sp)) && !sp.deleted) {
            yield* this.run(n.children, sp);
            yield 0;
          }
          break;
        case 'stop _': {
          const what = norm(String(this.arg(a, 0, sp)));
          if (what === 'all') {
            this.threads = [];
            return;
          }
          if (what === 'thisscript') return;
          break;
        }
        case 'create clone of _': {
          const target = norm(String(this.arg(a, 0, sp)));
          const base = target === 'myself' ? sp.def : this.def.sprites.find((s) => norm(s.label) === target || norm(s.id) === target);
          if (base && this.cloneCount < MAX_CLONES) {
            this.cloneCount++;
            const source = target === 'myself' ? sp : (this.sprites.find((s) => s.def === base && !s.isClone) ?? sp);
            const clone = this.newSprite(base, true);
            Object.assign(clone, { x: source.x, y: source.y, direction: source.direction, size: source.size, visible: source.visible, costume: source.costume, effect: source.effect });
            this.sprites.push(clone);
            this.startHats(clone, (h) => h.category === 'control' && h.text === 'when I start as a clone');
          }
          break;
        }
        case 'delete this clone':
          if (sp.isClone) {
            sp.deleted = true;
            return;
          }
          break;

        // ── Events ─────────────────────────────────────────────────────────
        case 'broadcast _': this.broadcast(String(this.arg(a, 0, sp))); break;
        case 'broadcast _ and wait': this.broadcast(String(this.arg(a, 0, sp))); yield 0; break;

        // ── Sensing, variables ─────────────────────────────────────────────
        case 'reset timer': this.timerStart = this.time; break;
        case 'set _ to _': this.vars.set(String(this.arg(a, 0, sp)), this.arg(a, 1, sp)); break;
        case 'change _ by _': {
          const name = String(this.arg(a, 0, sp));
          this.vars.set(name, num(this.vars.get(name) ?? 0) + num(this.arg(a, 1, sp)));
          break;
        }
        case 'show variable _':
        case 'hide variable _':
          break;
        default:
          this.unknownBlocks.add(n.text);
      }
    }
  }

  private readonly timeouts: { at: number; fn: () => void }[] = [];
  private after(ms: number, fn: () => void) {
    this.timeouts.push({ at: this.time + ms, fn });
  }

  /** Runs everything due (called once per frame by `tick`). */
  private flushTimeouts() {
    for (let i = this.timeouts.length - 1; i >= 0; i--) {
      if (this.timeouts[i].at <= this.time) {
        const [t] = this.timeouts.splice(i, 1);
        t.fn();
      }
    }
  }

  /** One frame, including the small timed effects (the ♪ chip). */
  tick() {
    this.step();
    this.flushTimeouts();
  }
}
