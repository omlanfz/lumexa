// FILE PATH: client/lib/classroom/badgesApi.ts
//
// Thin wrappers over the Classroom Badge System API
// (server/src/classroom/badges/classroom-badges.controller.ts).

import api from '@/lib/axios';
import type { AwardResponse, ClassroomBadge } from './badgeAward.ts';

let catalogPromise: Promise<ClassroomBadge[]> | null = null;

/** The 16 badges. Fetched once per page load; a failure is not remembered, so
 * opening the panel again retries. */
export function fetchBadgeCatalog(): Promise<ClassroomBadge[]> {
  if (!catalogPromise) {
    catalogPromise = api
      .get<{ badges: ClassroomBadge[] }>('/classroom-badges/catalog')
      .then((res) => res.data.badges)
      .catch((err) => {
        catalogPromise = null;
        throw err;
      });
  }
  return catalogPromise;
}

export async function awardBadges(
  room: string,
  body: { badgeId: string; studentUserIds: string[]; requestId: string },
): Promise<AwardResponse> {
  const res = await api.post<AwardResponse>(`/classroom-badges/${encodeURIComponent(room)}/award`, body);
  return res.data;
}

export async function undoBadgeAward(room: string, requestId: string): Promise<void> {
  await api.post(`/classroom-badges/${encodeURIComponent(room)}/undo`, { requestId });
}

export interface MyBadge {
  id: string;
  badgeId: string;
  emoji: string;
  name: string;
  criteria: string;
  awardedAt: string;
  awardedBy: string;
}

export interface MyBadgesResponse {
  total: number;
  badges: MyBadge[];
  summary: { badgeId: string; emoji: string; name: string; count: number; lastAwardedAt: string }[];
}

export async function fetchMyBadges(): Promise<MyBadgesResponse> {
  const res = await api.get<MyBadgesResponse>('/classroom-badges/mine');
  return res.data;
}
