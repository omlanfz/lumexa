// FILE PATH: client/lib/lesson/technical/hash.ts
//
// Hash functions and table insertion for the hash-table visual. The functions are deliberately simple so
// a learner can compute them by hand: the aim is to SEE collisions, not to build a good hash.

export type HashName = 'sum-mod' | 'length-mod' | 'first-letter-mod';

export const HASH_LABELS: Record<HashName, string> = {
  'sum-mod': 'sum of the letter codes, mod the table size',
  'length-mod': 'length of the key, mod the table size',
  'first-letter-mod': 'position of the first letter (a = 0), mod the table size',
};

export function hashKey(key: string, name: HashName, size: number): number {
  if (name === 'length-mod') return key.length % size;
  if (name === 'first-letter-mod') return (((key.toLowerCase().charCodeAt(0) - 97) % size) + size) % size;
  let sum = 0;
  for (const ch of key) sum += ch.charCodeAt(0);
  return sum % size;
}

export function hashExplanation(key: string, name: HashName, size: number): string {
  if (name === 'length-mod') return `${key.length} mod ${size} = ${key.length % size}`;
  if (name === 'first-letter-mod') return `"${key[0]}" is letter ${key.toLowerCase().charCodeAt(0) - 96} → ${key.toLowerCase().charCodeAt(0) - 97} mod ${size} = ${hashKey(key, name, size)}`;
  const codes = [...key].map((c) => c.charCodeAt(0));
  return `${codes.join(' + ')} = ${codes.reduce((a, b) => a + b, 0)}; ${codes.reduce((a, b) => a + b, 0)} mod ${size} = ${hashKey(key, name, size)}`;
}

export interface ChainTable { buckets: string[][]; collisions: number }
export interface ProbeTable { slots: (string | null)[]; collisions: number; failed: string[] }

export function buildChaining(keys: string[], name: HashName, size: number): ChainTable {
  const buckets: string[][] = Array.from({ length: size }, () => []);
  let collisions = 0;
  for (const k of keys) {
    const i = hashKey(k, name, size);
    if (buckets[i].length > 0) collisions++;
    if (!buckets[i].includes(k)) buckets[i].push(k);
  }
  return { buckets, collisions };
}

export function buildProbing(keys: string[], name: HashName, size: number): ProbeTable {
  const slots: (string | null)[] = Array(size).fill(null);
  let collisions = 0;
  const failed: string[] = [];
  for (const k of keys) {
    if (slots.includes(k)) continue;
    let i = hashKey(k, name, size);
    let tried = 0;
    while (slots[i] !== null && tried < size) {
      collisions++;
      i = (i + 1) % size;
      tried++;
    }
    if (tried >= size) failed.push(k);
    else slots[i] = k;
  }
  return { slots, collisions, failed };
}
