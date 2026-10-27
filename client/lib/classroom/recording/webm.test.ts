import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeWebm } from './webm.ts';

// ─── A tiny independent EBML writer: builds WebM files laid out like Chrome's ──

const bytes = (...parts: (number | number[] | Uint8Array)[]): number[] =>
  parts.flatMap((p) => (typeof p === 'number' ? [p] : Array.from(p)));

function size(n: number): number[] {
  if (n < 0x7f) return [0x80 | n];
  if (n < 0x3fff) return [0x40 | (n >> 8), n & 0xff];
  if (n < 0x1fffff) return [0x20 | (n >> 16), (n >> 8) & 0xff, n & 0xff];
  return [0x10 | (n >>> 24), (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
const el = (id: number[], payload: number[]) => bytes(id, size(payload.length), payload);
const UNKNOWN = [0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];

const EBML_HEADER = el(
  [0x1a, 0x45, 0xdf, 0xa3],
  bytes(
    [0x42, 0x86, 0x81, 0x01],
    [0x42, 0xf7, 0x81, 0x01],
    [0x42, 0xf2, 0x81, 0x04],
    [0x42, 0xf3, 0x81, 0x08],
    [0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d], // "webm"
    [0x42, 0x87, 0x81, 0x04],
    [0x42, 0x85, 0x81, 0x02],
  ),
);

const INFO_ID = [0x15, 0x49, 0xa9, 0x66];
const TRACKS_ID = [0x16, 0x54, 0xae, 0x6b];
const CLUSTER_ID = [0x1f, 0x43, 0xb6, 0x75];
const SEGMENT_ID = [0x18, 0x53, 0x80, 0x67];

function info(extra: number[] = []): number[] {
  return el(
    INFO_ID,
    bytes(
      [0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40], // TimecodeScale 1_000_000
      [0x4d, 0x80, 0x84, 0x74, 0x65, 0x73, 0x74], // MuxingApp "test"
      extra,
    ),
  );
}

/** Track 1 = audio (Opus), track 2 = video (VP8), as Chrome numbers them. */
function tracks(): number[] {
  const entry = (num: number, type: number) =>
    el([0xae], bytes([0xd7, 0x81, num], [0x73, 0xc5, 0x81, num], [0x83, 0x81, type]));
  return el(TRACKS_ID, bytes(entry(1, 2), entry(2, 1)));
}

interface Blk {
  track: number;
  rel: number;
  key: boolean;
  /** Written as a BlockGroup (with a ReferenceBlock when not a keyframe). */
  group?: boolean;
}

function block(b: Blk): number[] {
  const rel = b.rel & 0xffff;
  const head = [0x80 | b.track, rel >> 8, rel & 0xff];
  const data = [1, 2, 3, 4, 5, 6, 7, 8];
  if (b.group) {
    const inner = el([0xa1], bytes(head, 0x00, data));
    return el([0xa0], bytes(inner, b.key ? [] : el([0xfb], [0x81]), el([0x9b], [0x81, 0x14])));
  }
  return el([0xa3], bytes(head, b.key ? 0x80 : 0x00, data));
}

function cluster(timecode: number, blocks: Blk[], opts: { knownSize?: boolean } = {}): number[] {
  const tc = [0xe7, 0x82, timecode >> 8, timecode & 0xff];
  const body = bytes(tc, ...blocks.map(block));
  return opts.knownSize ? el(CLUSTER_ID, body) : bytes(CLUSTER_ID, UNKNOWN, body);
}

/** What Chrome writes: clusters of ~2 s; the video keyframe starts some. */
const CLUSTERS = [
  cluster(0, [{ track: 2, rel: 0, key: true }, { track: 1, rel: 5, key: true }]),
  cluster(2040, [{ track: 1, rel: 0, key: true }, { track: 2, rel: 10, key: false }]), // video, not a keyframe
  cluster(4010, [{ track: 2, rel: 0, key: true, group: true }, { track: 1, rel: 20, key: true }]), // keyframe in a BlockGroup
  cluster(6100, [{ track: 2, rel: 0, key: false, group: true }]), // non-key BlockGroup (has a ReferenceBlock)
  cluster(7000, [{ track: 1, rel: 0, key: true }, { track: 2, rel: 33, key: true }]), // audio first, keyframe at +33
];

function webm(parts: { info?: number[]; tracks?: number[]; clusters?: number[][]; before?: number[]; segment?: number[] } = {}): Uint8Array {
  return new Uint8Array(
    bytes(
      EBML_HEADER,
      SEGMENT_ID,
      parts.segment ?? UNKNOWN,
      parts.before ?? [],
      parts.info ?? info(),
      parts.tracks ?? tracks(),
      ...(parts.clusters ?? CLUSTERS),
    ),
  );
}

const asBlob = (u: Uint8Array) => new Blob([u as Uint8Array<ArrayBuffer>]);
const bytesOf = async (b: Blob) => new Uint8Array(await b.arrayBuffer());

// ─── An independent reader of what comes out ───────────────────────────────────

function readVint(buf: Uint8Array, p: number, keepMarker: boolean): { value: number; len: number; unknown: boolean } {
  let len = 1;
  while (!(buf[p] & (0x80 >> (len - 1)))) len++;
  let v = keepMarker ? buf[p] : buf[p] & (0xff >> len);
  let ones = (buf[p] & (0xff >> len)) === 0xff >> len;
  for (let i = 1; i < len; i++) {
    v = v * 256 + buf[p + i];
    if (buf[p + i] !== 0xff) ones = false;
  }
  return { value: v, len, unknown: ones };
}

interface Parsed {
  duration: number | null;
  cues: { time: number; track: number; position: number }[];
  /** Offsets (from the Segment's data) of every element before the first cluster. */
  order: string[];
  segmentStart: number;
  clusterOffsets: number[];
}

function parse(buf: Uint8Array): Parsed {
  const out: Parsed = { duration: null, cues: [], order: [], segmentStart: 0, clusterOffsets: [] };
  let p = 0;
  const hdr = (at: number) => {
    const id = readVint(buf, at, true);
    const sz = readVint(buf, at + id.len, false);
    return { id: id.value, headerLen: id.len + sz.len, size: sz.value, unknown: sz.unknown };
  };
  const ebml = hdr(p);
  p += ebml.headerLen + ebml.size;
  const seg = hdr(p);
  p += seg.headerLen;
  out.segmentStart = p;
  while (p < buf.length) {
    const h = hdr(p);
    if (h.id === 0x1f43b675) {
      out.order.push('Cluster');
      out.clusterOffsets.push(p);
      // an unknown-size cluster: walk its children to find the next element
      let q = p + h.headerLen;
      for (;;) {
        if (q >= buf.length) break;
        const c = hdr(q);
        if ([0x1f43b675, 0x1c53bb6b, 0x1549a966, 0x1654ae6b].includes(c.id)) break;
        q += c.headerLen + c.size;
      }
      p = q;
      continue;
    }
    if (h.id === 0x1549a966) {
      out.order.push('Info');
      let q = p + h.headerLen;
      const end = q + h.size;
      while (q < end) {
        const c = hdr(q);
        if (c.id === 0x4489) {
          const dv = new DataView(buf.buffer, buf.byteOffset + q + c.headerLen, c.size);
          out.duration = c.size === 8 ? dv.getFloat64(0) : dv.getFloat32(0);
        }
        q += c.headerLen + c.size;
      }
    } else if (h.id === 0x1654ae6b) {
      out.order.push('Tracks');
    } else if (h.id === 0x1c53bb6b) {
      out.order.push('Cues');
      let q = p + h.headerLen;
      const end = q + h.size;
      while (q < end) {
        const cp = hdr(q); // CuePoint
        let r = q + cp.headerLen;
        let time = -1;
        let track = -1;
        let position = -1;
        const cpEnd = r + cp.size;
        while (r < cpEnd) {
          const f = hdr(r);
          const at = r + f.headerLen;
          if (f.id === 0xb3) time = Number(readUintBE(buf, at, f.size));
          if (f.id === 0xb7) {
            let t = at;
            const tEnd = at + f.size;
            while (t < tEnd) {
              const g = hdr(t);
              const ga = t + g.headerLen;
              if (g.id === 0xf7) track = Number(readUintBE(buf, ga, g.size));
              if (g.id === 0xf1) position = Number(readUintBE(buf, ga, g.size));
              t = ga + g.size;
            }
          }
          r = at + f.size;
        }
        out.cues.push({ time, track, position });
        q = cpEnd;
      }
    } else {
      out.order.push(`0x${h.id.toString(16)}`);
    }
    p += h.headerLen + h.size;
  }
  return out;
}
function readUintBE(buf: Uint8Array, at: number, len: number): number {
  let v = 0;
  for (let i = 0; i < len; i++) v = v * 256 + buf[at + i];
  return v;
}

// ─── The tests ─────────────────────────────────────────────────────────────────

test('adds the length and a jump index to a recording laid out like Chrome writes it', async () => {
  const source = webm();
  const result = await finalizeWebm(asBlob(source), 9_000);
  assert.equal(result.skipped, undefined);
  assert.equal(result.durationAdded, true);
  assert.equal(result.blob.type, 'video/webm');

  const out = parse(await bytesOf(result.blob));
  assert.equal(out.duration, 9_000, 'the Duration is in the file’s own ticks (1 tick = 1 ms)');
  assert.deepEqual(out.order, ['Info', 'Tracks', 'Cues', 'Cluster', 'Cluster', 'Cluster', 'Cluster', 'Cluster']);
});

test('indexes only the clusters that START with a video keyframe — never a place a jump would show broken frames', async () => {
  const result = await finalizeWebm(asBlob(webm()), 9_000);
  const out = parse(await bytesOf(result.blob));
  // cluster 0: video keyframe at 0.   cluster 1: its video frame is not a keyframe.
  // cluster 2: keyframe (BlockGroup without a ReferenceBlock).   cluster 3: a BlockGroup
  // that refers to another frame — not a keyframe.   cluster 4: audio first, then the
  // keyframe, 33 ms into the cluster.
  assert.deepEqual(
    out.cues.map((c) => [c.time, c.track]),
    [
      [0, 2],
      [4010, 2],
      [7033, 2],
    ],
  );
  assert.equal(result.cuePoints, 3);
});

test('every cue points exactly at the start of its cluster, counted from the Segment’s data', async () => {
  const result = await finalizeWebm(asBlob(webm()), 9_000);
  const buf = await bytesOf(result.blob);
  const out = parse(buf);
  const starts = out.cues.map((c) => out.segmentStart + c.position);
  // clusters 0, 2 and 4
  assert.deepEqual(starts, [out.clusterOffsets[0], out.clusterOffsets[2], out.clusterOffsets[4]]);
  for (const at of starts) {
    assert.deepEqual(Array.from(buf.subarray(at, at + 4)), CLUSTER_ID);
  }
});

test('the recorded clusters are untouched, byte for byte', async () => {
  const source = webm();
  const result = await finalizeWebm(asBlob(source), 9_000);
  const out = await bytesOf(result.blob);
  const firstCluster = parse(source).clusterOffsets[0];
  const added = out.length - source.length;
  assert.ok(added > 0);
  assert.deepEqual(Array.from(out.subarray(firstCluster + added)), Array.from(source.subarray(firstCluster)));
  // …and so is everything before the Info element
  assert.deepEqual(Array.from(out.subarray(0, 48)), Array.from(source.subarray(0, 48)));
});

test('adds only 11 bytes for the length plus 19 for each place to jump to', async () => {
  const source = webm();
  const result = await finalizeWebm(asBlob(source), 9_000);
  // Cues element: id(4) + size(1) + 3 points * 19; Info grows by 11 (its size field stays one byte)
  assert.equal(result.blob.size - source.length, 11 + (4 + 1 + 3 * 19));
});

test('keeps a Duration that is already there, and still adds the jump index', async () => {
  const existing = new Uint8Array(8);
  new DataView(existing.buffer).setFloat64(0, 9_800);
  const duration = bytes([0x44, 0x89, 0x88], existing);
  const source = webm({ info: info(duration) });
  const result = await finalizeWebm(asBlob(source), 9_000);
  assert.equal(result.durationAdded, false);
  const out = parse(await bytesOf(result.blob));
  assert.equal(out.duration, 9_800);
  assert.equal(out.cues.length, 3);
});

test('uses the file’s own time scale for the length', async () => {
  // A tick is 10 ms: 9 s is 900 ticks.
  const tenMs = el(INFO_ID, bytes([0x2a, 0xd7, 0xb1, 0x83, 0x98, 0x96, 0x80]));
  const result = await finalizeWebm(asBlob(webm({ info: tenMs })), 9_000);
  assert.equal(parse(await bytesOf(result.blob)).duration, 900);
});

test('works for a cluster of known size too', async () => {
  const known = [
    cluster(0, [{ track: 2, rel: 0, key: true }], { knownSize: true }),
    cluster(2000, [{ track: 2, rel: 0, key: true }], { knownSize: true }),
  ];
  const result = await finalizeWebm(asBlob(webm({ clusters: known })), 4_000);
  assert.equal(result.skipped, undefined);
  assert.equal(result.cuePoints, 2);
});

test('a recording with no video keyframe cluster only gets its length', async () => {
  const audioOnly = [cluster(0, [{ track: 1, rel: 0, key: true }]), cluster(2000, [{ track: 1, rel: 0, key: true }])];
  const result = await finalizeWebm(asBlob(webm({ clusters: audioOnly })), 4_000);
  assert.equal(result.durationAdded, true);
  assert.equal(result.cuePoints, 0);
  const out = parse(await bytesOf(result.blob));
  assert.deepEqual(out.order, ['Info', 'Tracks', 'Cluster', 'Cluster']);
  assert.equal(out.duration, 4_000);
});

test('a recording cut off in the middle of its last block still gets finished — without a jump point at the damaged keyframe', async () => {
  const source = webm();
  // The last cluster's keyframe is the last block: cutting into it damages it.
  const cut = source.subarray(0, source.length - 5);
  const result = await finalizeWebm(asBlob(cut), 9_000);
  assert.equal(result.skipped, undefined);
  assert.equal(result.durationAdded, true);
  assert.equal(result.cuePoints, 2);
  assert.equal(result.blob.size - cut.length, 11 + (4 + 1 + 2 * 19));
  const out = parse(await bytesOf(result.blob));
  assert.deepEqual(out.cues.map((c) => c.time), [0, 4010]);
});

test('a long recording: thousands of clusters finish quickly and every cue is right', async () => {
  const many: number[][] = [];
  for (let i = 0; i < 4_000; i++) many.push(cluster(i * 1000, [{ track: 2, rel: 0, key: i % 3 === 0 }, { track: 1, rel: 4, key: true }]));
  const source = webm({ clusters: many });
  const t0 = performance.now();
  const result = await finalizeWebm(asBlob(source), 4_000_000);
  const took = performance.now() - t0;
  assert.equal(result.skipped, undefined);
  assert.equal(result.cuePoints, Math.ceil(4_000 / 3));
  assert.ok(took < 5_000, `took ${Math.round(took)} ms`);
  const buf = await bytesOf(result.blob);
  const out = parse(buf);
  assert.equal(out.cues.length, result.cuePoints);
  for (const c of out.cues) {
    const at = out.segmentStart + c.position;
    assert.deepEqual(Array.from(buf.subarray(at, at + 4)), CLUSTER_ID);
  }
  // cue times ascend
  assert.deepEqual(out.cues.map((c) => c.time), [...out.cues.map((c) => c.time)].sort((a, b) => a - b));
});

// ─── Files it must NOT touch ───────────────────────────────────────────────────

async function assertUntouched(source: Uint8Array | Blob, reasonPattern: RegExp) {
  const blob = source instanceof Blob ? source : asBlob(source);
  const result = await finalizeWebm(blob, 9_000);
  assert.equal(result.blob, blob, 'the very same Blob comes back');
  assert.equal(result.durationAdded, false);
  assert.equal(result.cuePoints, 0);
  assert.match(result.skipped ?? '', reasonPattern);
}

test('leaves alone a file with a SeekHead (its offsets would be wrong after an insertion)', async () => {
  const seekHead = el([0x11, 0x4d, 0x9b, 0x74], bytes(el([0x4d, 0xbb], bytes([0x53, 0xab, 0x84, ...INFO_ID], [0x53, 0xac, 0x81, 0x30]))));
  await assertUntouched(webm({ before: seekHead }), /unexpected element 0x114d9b74/);
});

test('leaves alone a file with a Void element before its clusters', async () => {
  await assertUntouched(webm({ before: el([0xec], [0, 0, 0, 0]) }), /unexpected element 0xec/);
});

test('leaves alone a file that already has Cues, or anything after its clusters', async () => {
  const cuesAtEnd = new Uint8Array([...webm(), ...el([0x1c, 0x53, 0xbb, 0x6b], [])]);
  await assertUntouched(cuesAtEnd, /unexpected element 0x1c53bb6b/);
});

test('leaves alone a Segment whose size is known (it would need rewriting)', async () => {
  await assertUntouched(webm({ segment: [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00] }), /known size/);
});

test('leaves alone anything that is not a WebM, empty, or too short to be one', async () => {
  await assertUntouched(new Uint8Array(0), /not a WebM|nothing/);
  await assertUntouched(new Uint8Array([1, 2, 3]), /not a WebM|bad element|nothing/);
  await assertUntouched(new Uint8Array(200).fill(7), /not a WebM|bad element/);
  await assertUntouched(webm().subarray(0, 60), /no clusters|truncated|no Info/);
});

test('leaves alone a recording with no length to write', async () => {
  const blob = asBlob(webm());
  for (const ms of [0, -5, Number.NaN]) {
    const r = await finalizeWebm(blob, ms);
    assert.equal(r.blob, blob);
    assert.equal(r.durationAdded, false);
  }
});

test('never throws, whatever it is given', async () => {
  const noise = new Uint8Array(5_000);
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 31 + 7) & 0xff;
  const ok = webm();
  // a valid header followed by garbage, and a valid file with a byte flipped at every position of its header
  const candidates: Uint8Array[] = [noise, new Uint8Array([...ok.subarray(0, 120), ...noise])];
  for (let at = 0; at < 130; at++) {
    const copy = ok.slice();
    copy[at] ^= 0xff;
    candidates.push(copy);
  }
  for (const c of candidates) {
    const blob = asBlob(c);
    const r = await finalizeWebm(blob, 9_000);
    // either finished properly, or handed back unchanged — never an exception and never a smaller file
    assert.ok(r.blob.size >= blob.size);
    if (r.skipped) assert.equal(r.blob, blob);
  }
});
