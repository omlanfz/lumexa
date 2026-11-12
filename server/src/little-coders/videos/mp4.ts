// A minimal reader of an MP4's own header, so the server can trust what a video really is
// (how long, how big) instead of what an upload form claims. It reads box headers only.

export interface Mp4Info {
  /** Seconds. */
  duration: number;
  width: number;
  height: number;
}

/** True when the bytes begin like an MP4 / QuickTime file ("ftyp" box). */
export function looksLikeMp4(buf: Buffer): boolean {
  return buf.length > 12 && buf.toString('ascii', 4, 8) === 'ftyp';
}

interface Box {
  type: string;
  start: number;
  end: number;
  body: number;
}

function boxes(buf: Buffer, from: number, to: number): Box[] {
  const out: Box[] = [];
  let pos = from;
  while (pos + 8 <= to) {
    let size = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    let body = pos + 8;
    if (size === 1) {
      if (pos + 16 > to) break;
      size = Number(buf.readBigUInt64BE(pos + 8));
      body = pos + 16;
    } else if (size === 0) size = to - pos;
    if (size < 8 || pos + size > to) break;
    out.push({ type, start: pos, end: pos + size, body });
    pos += size;
  }
  return out;
}

/** Duration and picture size of an MP4, or null when it cannot be read. */
export function probeMp4(buf: Buffer): Mp4Info | null {
  if (!looksLikeMp4(buf)) return null;
  const moov = boxes(buf, 0, buf.length).find((b) => b.type === 'moov');
  if (!moov) return null;
  const inside = boxes(buf, moov.body, moov.end);
  const mvhd = inside.find((b) => b.type === 'mvhd');
  if (!mvhd) return null;
  const version = buf.readUInt8(mvhd.body);
  let timescale: number;
  let duration: number;
  if (version === 1) {
    timescale = buf.readUInt32BE(mvhd.body + 20);
    duration = Number(buf.readBigUInt64BE(mvhd.body + 24));
  } else {
    timescale = buf.readUInt32BE(mvhd.body + 12);
    duration = buf.readUInt32BE(mvhd.body + 16);
  }
  if (!timescale) return null;
  let width = 0;
  let height = 0;
  for (const trak of inside.filter((b) => b.type === 'trak')) {
    const tkhd = boxes(buf, trak.body, trak.end).find((b) => b.type === 'tkhd');
    if (!tkhd) continue;
    const v = buf.readUInt8(tkhd.body);
    const at = tkhd.body + (v === 1 ? 88 : 76);
    if (at + 8 > tkhd.end) continue;
    const w = buf.readUInt32BE(at) / 65536;
    const h = buf.readUInt32BE(at + 4) / 65536;
    if (w > 0 && h > 0) {
      width = Math.round(w);
      height = Math.round(h);
      break;
    }
  }
  return { duration: duration / timescale, width, height };
}

/** True when the bytes look like a baseline JPEG / JFIF image. */
export function looksLikeJpeg(buf: Buffer): boolean {
  return (
    buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  );
}

/** True when the text is a WebVTT subtitle file. */
export function looksLikeWebVtt(buf: Buffer): boolean {
  return buf.toString('utf8', 0, 16).replace(/^﻿/, '').startsWith('WEBVTT');
}
