// FILE PATH: server/src/little-coders/lc.platforms.ts
//
// The coding platforms "Start Coding" opens (MIT Scratch, Stretch3, Generation AI
// Teachable Machine, EduBlocks). They live in the CodingPlatform table so an admin can
// change a start address — or switch a platform off — without a deploy; the client never
// hard-codes them. Seeding only ever INSERTS: an admin's edit is never overwritten.

import type { PrismaClient } from '@prisma/client';
import {
  DEFAULT_PLATFORMS,
  LC_PLATFORM_KEYS,
  type LcPlatformKey,
} from './lc.constants';
import { isHttpsUrl } from './lc.validate';

export interface PlatformView {
  key: LcPlatformKey;
  name: string;
  startUrl: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** Inserts the platforms that are missing. Returns how many were created. */
export async function seedCodingPlatforms(
  prisma: PrismaClient,
): Promise<number> {
  const result = await prisma.codingPlatform.createMany({
    data: DEFAULT_PLATFORMS.map((p) => ({
      key: p.key,
      name: p.name,
      startUrl: p.startUrl,
      description: p.description,
      sortOrder: p.sortOrder,
      isActive: true,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

/** Every platform, in display order. A platform missing from the table falls back to its
 *  built-in default, so a "Start Coding" button can never lose its destination. */
export async function listPlatforms(
  prisma: PrismaClient,
): Promise<PlatformView[]> {
  const rows = await prisma.codingPlatform.findMany({
    orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
  });
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return DEFAULT_PLATFORMS.map((d) => {
    const row = byKey.get(d.key);
    return {
      key: d.key,
      name: row?.name ?? d.name,
      startUrl: row?.startUrl ?? d.startUrl,
      description: row?.description ?? d.description,
      sortOrder: row?.sortOrder ?? d.sortOrder,
      isActive: row?.isActive ?? true,
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function isPlatformKey(v: unknown): v is LcPlatformKey {
  return (
    typeof v === 'string' && (LC_PLATFORM_KEYS as readonly string[]).includes(v)
  );
}

export interface PlatformUpdate {
  name?: string;
  startUrl?: string;
  description?: string | null;
  isActive?: boolean;
}

/** Validates an admin edit of a platform; returns the problems (empty = fine). */
export function platformUpdateProblems(u: PlatformUpdate): string[] {
  const problems: string[] = [];
  if (
    u.name !== undefined &&
    (typeof u.name !== 'string' || !u.name.trim() || u.name.length > 80)
  )
    problems.push('The name must be 1–80 characters.');
  if (
    u.startUrl !== undefined &&
    (typeof u.startUrl !== 'string' || !isHttpsUrl(u.startUrl.trim()))
  )
    problems.push('The start address must be a full https:// address.');
  if (
    u.description !== undefined &&
    u.description !== null &&
    (typeof u.description !== 'string' || u.description.length > 200)
  )
    problems.push('The description can be at most 200 characters.');
  return problems;
}
