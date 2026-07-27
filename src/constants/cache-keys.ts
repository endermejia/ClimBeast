export const CACHE_KEYS = {
  // User
  userProfile: (userId: string) => `cached_user_profile_${userId}_v1`,

  // Likes/Favorites
  likedAreas: (userId: string) => `cached_liked_areas_${userId}_v2`,
  likedCrags: (userId: string) => `cached_liked_crags_${userId}_v2`,
  likedRoutes: (userId: string) => `cached_liked_routes_${userId}_v2`,

  // Areas
  areasList: 'cached_areas_list_v2',
  areasSimple: 'cached_areas_simple_v1',

  // Crags
  cragsList: (areaSlug: string) => `cached_crags_list_${areaSlug}_v2`,
  cragDetail: (areaSlug: string, cragSlug: string) =>
    `cached_crag_detail_${areaSlug}_${cragSlug}_v2`,
  cragRoutes: (cragSlug: string) => `cached_crag_routes_${cragSlug}_v2`,

  // Topos
  areaTopos: (areaSlug: string) => `cached_area_topos_${areaSlug}_v2`,
  topoDetail: (topoId: string | number) => `cached_topo_detail_${topoId}_v1`,

  // Routes
  routeDetail: (routeSlug: string | null, userId?: string | null) =>
    userId
      ? `cached_route_detail_${routeSlug}_user_${userId}_v2`
      : `cached_route_detail_${routeSlug}_v2`,
  routesSimpleArea: (areaId: number) => `cached_routes_simple_area_${areaId}`,

  // User Projects
  userProjects: (userId: string) => `cached_user_projects_${userId}_v2`,

  // Home Feed
  homeFeed: (filter: string, page: number) =>
    `cached_home_feed_${filter}_${page}_v1`,
  followedIds: 'cached_followed_ids_v1',
  activeCrags: 'cached_active_crags_v1',

  // Indoor Centers
  indoorCenters: 'cached_indoor_centers_v1',

  // Translations
  translation: (lang: string) => `cached_translation_${lang}_v1`,
} as const;
