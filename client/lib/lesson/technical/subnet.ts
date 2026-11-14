// FILE PATH: client/lib/lesson/technical/subnet.ts
//
// IPv4 subnet arithmetic for the subnet calculator. Pure functions on 32-bit numbers (no bit tricks that
// overflow into negative numbers: everything is kept unsigned with >>> 0).

export class SubnetError extends Error {}

export function parseIp(text: string): number {
  const parts = text.trim().split('.');
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) throw new SubnetError('Enter an address like 192.168.10.0 (four numbers from 0 to 255).');
  return parts.reduce((acc, p) => ((acc << 8) | Number(p)) >>> 0, 0) >>> 0;
}

export function formatIp(n: number): string {
  return [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');
}

export const maskOf = (prefix: number): number => (prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0);

export function binaryIp(n: number): string {
  return [24, 16, 8, 0].map((s) => (((n >>> s) & 255).toString(2).padStart(8, '0'))).join('.');
}

export interface SubnetInfo {
  address: string;
  prefix: number;
  mask: string;
  wildcard: string;
  network: string;
  broadcast: string;
  firstHost: string | null;
  lastHost: string | null;
  /** Usable host addresses (2^(32-p) - 2; 2 for /31 point-to-point links; 1 for /32). */
  hosts: number;
  /** All addresses in the block. */
  total: number;
  ipClass: 'A' | 'B' | 'C' | 'D' | 'E';
  isPrivate: boolean;
  /** The address, mask and network in binary, for the network/host split picture. */
  binary: { address: string; mask: string; network: string };
}

export function classOf(ip: number): SubnetInfo['ipClass'] {
  const first = ip >>> 24;
  if (first < 128) return 'A';
  if (first < 192) return 'B';
  if (first < 224) return 'C';
  if (first < 240) return 'D';
  return 'E';
}

export function isPrivate(ip: number): boolean {
  const a = ip >>> 24;
  const b = (ip >>> 16) & 255;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export function describeSubnet(addressText: string, prefix: number): SubnetInfo {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new SubnetError('The prefix length must be a whole number from 0 to 32.');
  const address = parseIp(addressText);
  const mask = maskOf(prefix);
  const network = (address & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = 2 ** (32 - prefix);
  let hosts = Math.max(total - 2, 0);
  let first: number | null = network + 1;
  let last: number | null = broadcast - 1;
  if (prefix === 32) {
    hosts = 1;
    first = network;
    last = network;
  } else if (prefix === 31) {
    hosts = 2;
    first = network;
    last = broadcast;
  }
  return {
    address: formatIp(address),
    prefix,
    mask: formatIp(mask),
    wildcard: formatIp(~mask >>> 0),
    network: formatIp(network),
    broadcast: formatIp(broadcast),
    firstHost: first === null ? null : formatIp(first >>> 0),
    lastHost: last === null ? null : formatIp(last >>> 0),
    hosts,
    total,
    ipClass: classOf(address),
    isPrivate: isPrivate(address),
    binary: { address: binaryIp(address), mask: binaryIp(mask), network: binaryIp(network) },
  };
}

/** The smallest prefix that gives at least `hosts` usable addresses (VLSM planning). */
export function prefixForHosts(hosts: number): number {
  let p = 30;
  while (p > 0 && 2 ** (32 - p) - 2 < hosts) p--;
  return p;
}
