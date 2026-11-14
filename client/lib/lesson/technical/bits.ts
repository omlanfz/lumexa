// FILE PATH: client/lib/lesson/technical/bits.ts
//
// Number-system helpers for the bit explorer: unsigned and two's-complement values of a bit pattern,
// and conversion to binary, octal and hexadecimal text.

export type BitWidth = 4 | 8 | 16;

export const maxUnsigned = (width: number): number => 2 ** width - 1;

/** The bits of `value`, most significant first. */
export function toBits(value: number, width: number): number[] {
  const v = ((Math.trunc(value) % 2 ** width) + 2 ** width) % 2 ** width;
  return Array.from({ length: width }, (_, i) => (v >> (width - 1 - i)) & 1);
}

export function fromBits(bits: number[]): number {
  return bits.reduce((acc, b) => acc * 2 + (b ? 1 : 0), 0);
}

/** Two's-complement reading of an unsigned pattern: the top bit weighs -2^(width-1). */
export function signedValue(unsigned: number, width: number): number {
  return unsigned >= 2 ** (width - 1) ? unsigned - 2 ** width : unsigned;
}

export function toBase(value: number, base: 2 | 8 | 10 | 16, pad = 0): string {
  return value.toString(base).toUpperCase().padStart(pad, '0');
}

/** "1011 0101": groups of four, so long patterns stay readable. */
export function grouped(bits: number[]): string {
  return bits
    .join('')
    .replace(/(.{4})(?=.)/g, '$1 ');
}

/** Two's complement of a pattern: invert every bit, then add one (staying inside the width). */
export function negate(unsigned: number, width: number): number {
  return ((~unsigned & maxUnsigned(width)) + 1) & maxUnsigned(width);
}

/** The place values of a pattern, e.g. [128, 64, 32, 16, 8, 4, 2, 1] (the top one is negative for two's complement). */
export function placeValues(width: number, twos = false): number[] {
  return Array.from({ length: width }, (_, i) => {
    const w = 2 ** (width - 1 - i);
    return twos && i === 0 ? -w : w;
  });
}
