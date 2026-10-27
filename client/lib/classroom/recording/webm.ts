// FILE PATH: client/lib/classroom/recording/webm.ts
//
// Finishing a recording so a student can SCRUB through it.
//
// The browser's MediaRecorder writes a WebM "live": no Duration in the header and
// no Cues (the index a player uses to jump). Played as it is, a recording shows
// no length and no usable timeline, and every jump makes the player read the
// file from the start to find its place — measured in Chrome on a 230 MB / 25
// minute recording, four jumps cost the server 562 MB; with a Duration and Cues
// the same four jumps cost 20 MB. A class recording is long and students rewind
// it, so the browser finishes the file before uploading it:
//
//   1. a Duration is added to the Info element, and
//   2. a Cues index is added, pointing at every cluster that STARTS with a video
//      keyframe (a jump must land on one: a cue at any other cluster would show
//      broken frames until the next keyframe).
//
// Everything else is left byte for byte as recorded: the new file is the old one
// with two small pieces inserted, put together from slices of the original Blob,
// so nothing big is copied however long the recording is. The scan reads the
// Blob once, as a stream, looking only at element headers.
//
// This understands exactly the layout Chrome and Edge write —
//   EBML header | Segment (unknown size) | Info | Tracks | Cluster… (unknown size)
// — and NOTHING else. Any other layout (a SeekHead, a Void, Cues already there, a
// Segment of known size — what another browser or a later version may write) is
// left alone: finalizeWebm hands the recording back unchanged, because patching
// a file whose offsets it does not fully understand could corrupt it. The result
// is always checked before it is used, and a failed check also returns the
// original. So finalizing can make a recording better, never worse.

const ID = {
  EBML: 0x1a45dfa3,
  Segment: 0x18538067,
  SeekHead: 0x114d9b74,
  Info: 0x1549a966,
  Tracks: 0x1654ae6b,
  Cluster: 0x1f43b675,
  Cues: 0x1c53bb6b,
  Tags: 0x1254c367,
  Chapters: 0x1043a770,
  Attachments: 0x1941a469,
  TimecodeScale: 0x2ad7b1,
  Duration: 0x4489,
  TrackEntry: 0xae,
  TrackNumber: 0xd7,
  TrackType: 0x83,
  Timecode: 0xe7,
  SimpleBlock: 0xa3,
  BlockGroup: 0xa0,
  Block: 0xa1,
  ReferenceBlock: 0xfb,
} as const;

/** Elements that sit directly in the Segment: an unknown-size Cluster ends where
 * one of these begins. */
const LEVEL1 = new Set<number>([
  ID.SeekHead,
  ID.Info,
  ID.Tracks,
  ID.Cluster,
  ID.Cues,
  ID.Tags,
  ID.Chapters,
  ID.Attachments,
]);

const TRACK_TYPE_VIDEO = 1;
/** A Cue stores times and positions in 4 bytes. */
const UINT32_LIMIT = 2 ** 32;
const MAX_CUES = 50_000;
/** The small elements read whole (Info, Tracks) are never larger than this. */
const MAX_SMALL_ELEMENT = 64 * 1024;

/** Not a layout this file knows how to extend safely. */
export class UnsupportedWebm extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'UnsupportedWebm';
  }
}

// ─── EBML primitives ──────────────────────────────────────────────────────────

/** Length in bytes of the variable-length integer starting with `first` (0 if the
 * byte is not a valid start). */
function vintLength(first: number): number {
  for (let n = 1; n <= 8; n++) if (first & (0x100 >> n)) return n;
  return 0;
}

interface Header {
  id: number;
  size: number;
  /** The size was "unknown" (all ones): the element runs until its parent does. */
  unknown: boolean;
  headerLen: number;
}

/** The element header at `pos`, or null when there are not enough bytes for one. */
function parseHeader(buf: Uint8Array, pos: number): Header | null {
  if (pos >= buf.length) return null;
  const idLen = vintLength(buf[pos]);
  if (idLen === 0 || idLen > 4) throw new UnsupportedWebm('bad element id');
  if (pos + idLen >= buf.length) return null;
  let id = 0;
  for (let i = 0; i < idLen; i++) id = id * 256 + buf[pos + i];

  const sizeAt = pos + idLen;
  const sizeLen = vintLength(buf[sizeAt]);
  if (sizeLen === 0) throw new UnsupportedWebm('bad element size');
  if (sizeAt + sizeLen > buf.length) return null;
  let size = buf[sizeAt] & (0xff >> sizeLen);
  let allOnes = size === 0xff >> sizeLen;
  for (let i = 1; i < sizeLen; i++) {
    size = size * 256 + buf[sizeAt + i];
    if (buf[sizeAt + i] !== 0xff) allOnes = false;
  }
  return {
    id,
    size: allOnes ? 0 : size,
    unknown: allOnes,
    headerLen: idLen + sizeLen,
  };
}

function readUint(buf: Uint8Array, from: number, len: number): number {
  let v = 0;
  for (let i = 0; i < len; i++) v = v * 256 + buf[from + i];
  return v;
}

function idBytes(id: number): number[] {
  const out: number[] = [];
  for (let v = id; v > 0; v = Math.floor(v / 256)) out.unshift(v % 256);
  return out;
}

/** The smallest EBML size field for `value`. */
function sizeBytes(value: number): number[] {
  for (let len = 1; len <= 8; len++) {
    if (value < 2 ** (7 * len) - 1) {
      const out: number[] = [];
      let v = value;
      for (let i = 0; i < len; i++) {
        out.unshift(v % 256);
        v = Math.floor(v / 256);
      }
      out[0] |= 0x80 >> (len - 1);
      return out;
    }
  }
  throw new UnsupportedWebm('size too large');
}

function uintBytes(value: number, len: number): number[] {
  const out: number[] = [];
  let v = value;
  for (let i = 0; i < len; i++) {
    out.unshift(v % 256);
    v = Math.floor(v / 256);
  }
  return out;
}

// ─── Reading a Blob as a stream ───────────────────────────────────────────────

/** Walks a Blob front to back without holding it in memory: `ensure` makes the
 * next few bytes visible, `skip` drops a (possibly huge) stretch of them. */
class BlobWalker {
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  private buf: Uint8Array = new Uint8Array(0);
  private at = 0;
  private done = false;
  /** Offset, in the Blob, of the next byte not yet consumed. */
  offset = 0;

  constructor(blob: Blob) {
    this.reader = blob.stream().getReader();
  }

  private get available(): number {
    return this.buf.length - this.at;
  }

  private async pull(): Promise<boolean> {
    const { done, value } = await this.reader.read();
    if (done || !value) {
      this.done = true;
      return false;
    }
    if (this.available === 0) {
      this.buf = value;
    } else {
      const merged = new Uint8Array(this.available + value.length);
      merged.set(this.buf.subarray(this.at));
      merged.set(value, this.available);
      this.buf = merged;
    }
    this.at = 0;
    return true;
  }

  /** At least `n` bytes are visible from `view()` (fewer only at the end). */
  async ensure(n: number): Promise<void> {
    while (this.available < n && !this.done) await this.pull();
  }

  /** The bytes buffered from the current position. */
  view(): Uint8Array {
    return this.buf.subarray(this.at);
  }

  /** Consumes `n` bytes; false if the Blob ended first. */
  async skip(n: number): Promise<boolean> {
    let left = n;
    while (left > 0) {
      if (this.available === 0 && !(await this.pull())) return false;
      const take = Math.min(left, this.available);
      this.at += take;
      this.offset += take;
      left -= take;
    }
    return true;
  }

  /** Consumes and returns `n` bytes (a copy), or null if the Blob ended first. */
  async read(n: number): Promise<Uint8Array | null> {
    await this.ensure(n);
    if (this.available < n) return null;
    const out = this.buf.slice(this.at, this.at + n);
    this.at += n;
    this.offset += n;
    return out;
  }

  async peekHeader(): Promise<Header | null> {
    await this.ensure(12);
    return parseHeader(this.view(), 0);
  }

  cancel(): void {
    void this.reader.cancel().catch(() => undefined);
  }
}

// ─── Scanning a recording ─────────────────────────────────────────────────────

interface ScannedCluster {
  /** Where the Cluster element starts, in the Blob. */
  offset: number;
  /** The cluster's own timecode (in TimecodeScale ticks). */
  timecode: number;
  /** When its first video frame is, if that frame is a keyframe; else null. */
  keyframeTime: number | null;
}

interface Scanned {
  /** Where the Segment's data starts: Cue positions count from here. */
  segmentDataStart: number;
  info: { offset: number; headerLen: number; size: number; payload: Uint8Array };
  videoTrack: number | null;
  firstClusterOffset: number;
  clusters: ScannedCluster[];
}

/** The track number, time offset and keyframe flag at the start of a Block. */
function readBlockHead(
  head: Uint8Array,
): { track: number; rel: number; flags: number } | null {
  if (head.length < 4 || vintLength(head[0]) !== 1) return null;
  const rel = (head[1] << 8) | head[2];
  return {
    track: head[0] & 0x7f,
    rel: rel >= 0x8000 ? rel - 0x10000 : rel,
    flags: head[3],
  };
}

function findVideoTrack(tracks: Uint8Array): number | null {
  let video: number | null = null;
  let pos = 0;
  while (pos < tracks.length) {
    const h = parseHeader(tracks, pos);
    if (!h || h.unknown) break;
    const end = pos + h.headerLen + h.size;
    if (h.id === ID.TrackEntry) {
      let number: number | null = null;
      let type: number | null = null;
      let p = pos + h.headerLen;
      while (p < end) {
        const c = parseHeader(tracks, p);
        if (!c || c.unknown) break;
        const at = p + c.headerLen;
        if (c.id === ID.TrackNumber) number = readUint(tracks, at, c.size);
        if (c.id === ID.TrackType) type = readUint(tracks, at, c.size);
        p = at + c.size;
      }
      if (type === TRACK_TYPE_VIDEO && number !== null && video === null) {
        video = number;
      }
    }
    pos = end;
  }
  return video;
}

/** Reads the first block of a Block/BlockGroup/SimpleBlock child of a cluster,
 * consuming exactly its payload. */
async function readFirstVideoBlock(
  w: BlobWalker,
  h: Header,
): Promise<{ track: number; rel: number; keyframe: boolean } | null> {
  if (h.id === ID.SimpleBlock) {
    await w.ensure(4);
    const head = readBlockHead(w.view().subarray(0, 4));
    if (!(await w.skip(h.size))) return null;
    return head
      ? { track: head.track, rel: head.rel, keyframe: (head.flags & 0x80) !== 0 }
      : null;
  }
  // A BlockGroup: a keyframe is a block that refers to no other.
  const end = w.offset + h.size;
  let block: { track: number; rel: number } | null = null;
  let references = false;
  while (w.offset < end) {
    const c = await w.peekHeader();
    if (!c) return null;
    if (c.unknown) throw new UnsupportedWebm('a block of unknown size');
    await w.skip(c.headerLen);
    if (c.id === ID.Block) {
      await w.ensure(4);
      const head = readBlockHead(w.view().subarray(0, 4));
      if (head) block = { track: head.track, rel: head.rel };
      if (!(await w.skip(c.size))) return null;
    } else {
      if (c.id === ID.ReferenceBlock) references = true;
      if (!(await w.skip(c.size))) return null;
    }
  }
  return block ? { ...block, keyframe: !references } : null;
}

async function scan(blob: Blob): Promise<Scanned> {
  const w = new BlobWalker(blob);
  try {
    // The EBML header, then the Segment.
    const ebml = await w.peekHeader();
    if (!ebml || ebml.id !== ID.EBML || ebml.unknown) {
      throw new UnsupportedWebm('not a WebM file');
    }
    await w.skip(ebml.headerLen + ebml.size);
    const segment = await w.peekHeader();
    if (!segment || segment.id !== ID.Segment) {
      throw new UnsupportedWebm('no Segment');
    }
    if (!segment.unknown) {
      throw new UnsupportedWebm('the Segment has a known size');
    }
    await w.skip(segment.headerLen);
    const segmentDataStart = w.offset;

    // Info and Tracks, in either order, and nothing else before the clusters.
    let info: Scanned['info'] | null = null;
    let videoTrack: number | null = null;
    let sawTracks = false;
    let firstClusterOffset = -1;
    while (firstClusterOffset < 0) {
      const h = await w.peekHeader();
      if (!h) throw new UnsupportedWebm('no clusters');
      if (h.id === ID.Cluster) {
        firstClusterOffset = w.offset;
      } else if (h.id === ID.Info || h.id === ID.Tracks) {
        if (h.unknown || h.size > MAX_SMALL_ELEMENT) {
          throw new UnsupportedWebm('unusual header element');
        }
        const offset = w.offset;
        await w.skip(h.headerLen);
        const payload = await w.read(h.size);
        if (!payload) throw new UnsupportedWebm('truncated header');
        if (h.id === ID.Info) {
          if (info) throw new UnsupportedWebm('two Info elements');
          info = { offset, headerLen: h.headerLen, size: h.size, payload };
        } else {
          sawTracks = true;
          videoTrack = findVideoTrack(payload);
        }
      } else {
        // SeekHead, Void, Cues, Tags…: offsets we would have to keep right.
        throw new UnsupportedWebm(`unexpected element 0x${h.id.toString(16)}`);
      }
    }
    if (!info || !sawTracks) throw new UnsupportedWebm('no Info or Tracks');

    // The clusters, to the end.
    const clusters: ScannedCluster[] = [];
    for (;;) {
      const h = await w.peekHeader();
      if (!h) break;
      if (h.id !== ID.Cluster) {
        throw new UnsupportedWebm(`unexpected element 0x${h.id.toString(16)}`);
      }
      const offset = w.offset;
      await w.skip(h.headerLen);
      const end = h.unknown ? Infinity : offset + h.headerLen + h.size;
      let timecode: number | null = null;
      let seenVideo = false;
      let keyframeTime: number | null = null;

      while (w.offset < end) {
        const c = await w.peekHeader();
        if (!c) break; // the recording stops mid-cluster: keep what there is
        if (h.unknown && LEVEL1.has(c.id)) break;
        if (c.unknown) throw new UnsupportedWebm('a block of unknown size');

        if (c.id === ID.Timecode && timecode === null) {
          await w.skip(c.headerLen);
          const v = await w.read(c.size);
          if (!v) break;
          timecode = readUint(v, 0, v.length);
          continue;
        }
        if (
          !seenVideo &&
          videoTrack !== null &&
          timecode !== null &&
          (c.id === ID.SimpleBlock || c.id === ID.BlockGroup)
        ) {
          await w.skip(c.headerLen);
          const block = await readFirstVideoBlock(w, c);
          if (block && block.track === videoTrack) {
            seenVideo = true;
            keyframeTime = block.keyframe ? timecode + block.rel : null;
          }
          continue;
        }
        if (!(await w.skip(c.headerLen + c.size))) break;
      }
      if (timecode === null) throw new UnsupportedWebm('a cluster without a time');
      clusters.push({ offset, timecode, keyframeTime });
    }
    return { segmentDataStart, info, videoTrack, firstClusterOffset, clusters };
  } finally {
    w.cancel();
  }
}

// ─── Building the two new pieces ──────────────────────────────────────────────

/** The Info element with a Duration added (ticks of the file's own time scale),
 * or null if it already has one. */
function infoWithDuration(
  info: Scanned['info'],
  durationMs: number,
): Uint8Array<ArrayBuffer> | null {
  let scale = 1_000_000; // the Matroska default: a tick is one millisecond
  let pos = 0;
  while (pos < info.payload.length) {
    const h = parseHeader(info.payload, pos);
    if (!h || h.unknown) throw new UnsupportedWebm('unreadable Info');
    const at = pos + h.headerLen;
    if (h.id === ID.Duration) return null;
    if (h.id === ID.TimecodeScale) scale = readUint(info.payload, at, h.size);
    pos = at + h.size;
  }
  if (scale <= 0) throw new UnsupportedWebm('bad timecode scale');

  const duration = new Uint8Array(11); // 44 89 | 88 | float64
  duration.set([0x44, 0x89, 0x88]);
  new DataView(duration.buffer).setFloat64(3, (durationMs * 1_000_000) / scale);

  const payload = new Uint8Array(info.payload.length + duration.length);
  payload.set(info.payload);
  payload.set(duration, info.payload.length);
  return new Uint8Array([
    ...idBytes(ID.Info),
    ...sizeBytes(payload.length),
    ...payload,
  ]);
}

const CUE_POINT_BYTES = 19; // BB 91 | B3 84 time(4) | B7 89 | F7 81 track | F1 84 position(4)

function cuesLength(count: number): number {
  const body = count * CUE_POINT_BYTES;
  return idBytes(ID.Cues).length + sizeBytes(body).length + body;
}

function buildCues(
  points: { time: number; position: number }[],
  track: number,
): Uint8Array<ArrayBuffer> {
  const out: number[] = [
    ...idBytes(ID.Cues),
    ...sizeBytes(points.length * CUE_POINT_BYTES),
  ];
  for (const p of points) {
    out.push(
      0xbb, 0x91, // CuePoint
      0xb3, 0x84, ...uintBytes(p.time, 4), // CueTime
      0xb7, 0x89, // CueTrackPositions
      0xf7, 0x81, track, // CueTrack
      0xf1, 0x84, ...uintBytes(p.position, 4), // CueClusterPosition
    );
  }
  return new Uint8Array(out);
}

// ─── Putting it together ──────────────────────────────────────────────────────

export interface FinalizedWebm {
  blob: Blob;
  /** A Duration was written into the header. */
  durationAdded: boolean;
  /** How many places a player can jump to directly. */
  cuePoints: number;
  /** Why the recording was handed back unchanged, if it was. */
  skipped?: string;
}

const CLUSTER_ID = idBytes(ID.Cluster);

/** Makes a recording seekable. Never throws and never returns anything worse than
 * what it was given: for a file it cannot safely extend, or if its own check of
 * the result fails, the recording comes back unchanged with the reason. */
export async function finalizeWebm(
  blob: Blob,
  durationMs: number,
): Promise<FinalizedWebm> {
  const unchanged = (skipped: string): FinalizedWebm => ({
    blob,
    durationAdded: false,
    cuePoints: 0,
    skipped,
  });
  try {
    if (!(durationMs > 0) || blob.size >= UINT32_LIMIT) {
      return unchanged('nothing to do');
    }
    const scanned = await scan(blob);
    const newInfo = infoWithDuration(scanned.info, durationMs);

    // Only clusters that start with a video keyframe are worth jumping to.
    const points =
      scanned.videoTrack === null
        ? []
        : scanned.clusters
            .flatMap((c) =>
              c.keyframeTime !== null &&
              c.keyframeTime >= 0 &&
              c.keyframeTime < UINT32_LIMIT
                ? [{ cluster: c, time: c.keyframeTime }]
                : [],
            )
            .sort((a, b) => a.time - b.time);
    if (points.length > MAX_CUES) return unchanged('too many clusters');
    if (!newInfo && points.length === 0) return unchanged('already complete');

    const oldInfoLength = scanned.info.headerLen + scanned.info.size;
    const added = (newInfo ? newInfo.length - oldInfoLength : 0) +
      (points.length > 0 ? cuesLength(points.length) : 0);

    const cuePoints = points.map((p) => ({
      time: p.time,
      position: p.cluster.offset + added - scanned.segmentDataStart,
    }));

    const infoEnd = scanned.info.offset + oldInfoLength;
    const parts: BlobPart[] = [
      blob.slice(0, scanned.info.offset),
      newInfo ?? blob.slice(scanned.info.offset, infoEnd),
      blob.slice(infoEnd, scanned.firstClusterOffset),
    ];
    if (points.length > 0) {
      parts.push(buildCues(cuePoints, scanned.videoTrack as number));
    }
    parts.push(blob.slice(scanned.firstClusterOffset));
    const out = new Blob(parts, { type: 'video/webm' });

    if (!(await looksRight(out, blob, scanned, cuePoints, added))) {
      return unchanged('the finished file did not check out');
    }
    return {
      blob: out,
      durationAdded: !!newInfo,
      cuePoints: points.length,
    };
  } catch (err) {
    return unchanged(
      err instanceof UnsupportedWebm ? err.message : `unexpected: ${String(err)}`,
    );
  }
}

/** The result must be exactly the original plus what was added, with every cue
 * pointing at a cluster. (Checked before it is ever used.) */
async function looksRight(
  out: Blob,
  original: Blob,
  scanned: Scanned,
  cues: { time: number; position: number }[],
  added: number,
): Promise<boolean> {
  if (out.size !== original.size + added) return false;
  // The recorded clusters are untouched.
  const tail = scanned.firstClusterOffset;
  const a = new Uint8Array(await original.slice(tail, tail + 64).arrayBuffer());
  const b = new Uint8Array(
    await out.slice(tail + added, tail + added + 64).arrayBuffer(),
  );
  if (a.length !== b.length || a.some((v, i) => v !== b[i])) return false;
  // Every cue points at the start of a cluster (the first, last and a middle one
  // are enough to catch a mistake in the arithmetic).
  const sample = [0, Math.floor(cues.length / 2), cues.length - 1].filter(
    (i) => i >= 0 && i < cues.length,
  );
  for (const i of sample) {
    const at = scanned.segmentDataStart + cues[i].position;
    const id = new Uint8Array(await out.slice(at, at + 4).arrayBuffer());
    if (id.length !== 4 || id.some((v, j) => v !== CLUSTER_ID[j])) return false;
  }
  return true;
}
