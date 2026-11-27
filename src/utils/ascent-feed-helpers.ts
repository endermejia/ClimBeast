import { SupabaseClient } from '@supabase/supabase-js';

import { Database, FeedItem, UserProfileBasicDto } from '../models';

export interface RawOutdoorAscentCrag {
  slug?: string | null;
  name?: string | null;
  area?: {
    slug?: string | null;
    name?: string | null;
  } | null;
}

export interface RawOutdoorAscentRoute {
  crag?: RawOutdoorAscentCrag | null;
}

export interface RawOutdoorAscent {
  user_id?: string | null;
  route?: RawOutdoorAscentRoute | null;
}

export async function hydrateOutdoorAscentsFeed<T extends RawOutdoorAscent>(
  client: SupabaseClient<Database>,
  rawAscents: readonly T[] | null | undefined,
): Promise<FeedItem[]> {
  if (!rawAscents || rawAscents.length === 0) return [];

  const userIds = [
    ...new Set(
      rawAscents
        .map((a) => a.user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  let profileMap = new Map<string, UserProfileBasicDto>();
  if (userIds.length > 0) {
    const { data: profiles } = await client
      .from('user_profiles')
      .select('id, name, avatar')
      .in('id', userIds);
    if (profiles) {
      profileMap = new Map(profiles.map((p) => [p.id, p]));
    }
  }

  return rawAscents.map((a) => {
    const { route, user_id, ...ascentRest } = a;
    const cragData = route?.crag;
    const cragArea = cragData?.area;
    const mappedRoute = route
      ? {
          ...route,
          crag_slug: cragData?.slug ?? undefined,
          crag_name: cragData?.name ?? undefined,
          area_slug: cragArea?.slug ?? undefined,
          area_name: cragArea?.name ?? undefined,
        }
      : undefined;

    return {
      ...ascentRest,
      user_id,
      kind: 'ascent' as const,
      user: user_id ? (profileMap.get(user_id) ?? undefined) : undefined,
      route: mappedRoute,
    } as unknown as FeedItem;
  });
}

export function mergePaginatedItems<T extends { id: string | number }>(
  prev: readonly T[],
  incoming: readonly T[],
  page: number,
): T[] {
  if (page === 0) {
    return [...incoming];
  }
  if (incoming.length === 0) {
    return prev as T[];
  }
  const existingIds = new Set(prev.map((item) => String(item.id)));
  const fresh = incoming.filter((item) => !existingIds.has(String(item.id)));
  return fresh.length > 0 ? [...prev, ...fresh] : (prev as T[]);
}

export function addLoadedTab<T>(current: ReadonlySet<T>, tab: T): Set<T> {
  if (current.has(tab)) {
    return current as Set<T>;
  }
  const next = new Set(current);
  next.add(tab);
  return next;
}
