export const CACHE_KEYS = {
  // User
  userProfile: (userId: string) => `cached_user_profile_${userId}_v1`,
  externalProfile: (userId: string) => `cached_external_profile_${userId}_v1`,
  userStats: (userId: string, dateFilter: string) =>
    `cached_user_stats_${userId}_${dateFilter}_v1`,
  userAscents: (userId: string) => `cached_user_ascents_${userId}_v1`,
  adminAreas: (userId: string) => `cached_admin_areas_${userId}_v1`,
  adminIndoorCenters: (userId: string) =>
    `cached_admin_indoor_centers_${userId}_v1`,

  // Likes/Favorites
  likedAreas: (userId: string) => `cached_liked_areas_${userId}_v2`,
  likedCrags: (userId: string) => `cached_liked_crags_${userId}_v2`,
  likedIndoorCenters: (userId: string) =>
    `cached_liked_indoor_centers_${userId}_v1`,
  likedRoutes: (userId: string) => `cached_liked_routes_${userId}_v2`,

  // Areas
  areasList: 'cached_areas_list_v2',
  areasSimple: 'cached_areas_simple_v1',
  areaDetail: (areaId: number) => `cached_area_detail_${areaId}_v1`,
  areaAscents: (areaId: number, page: number) =>
    `cached_area_ascents_${areaId}_${page}_v1`,
  areaAscentsCount: (areaId: number) =>
    `cached_area_ascents_count_${areaId}_v1`,
  areaRoutes: (areaId: number, userId?: string | null) =>
    userId
      ? `cached_area_routes_${areaId}_user_${userId}_v1`
      : `cached_area_routes_${areaId}_v1`,
  areaParkings: (areaId: number) => `cached_area_parkings_${areaId}_v1`,
  areaCenter: (areaId: number) => `cached_area_center_${areaId}_v1`,

  // Crags
  cragsList: (areaSlug: string) => `cached_crags_list_${areaSlug}_v2`,
  cragAscents: (cragId: number, page: number) =>
    `cached_crag_ascents_${cragId}_${page}_v1`,
  cragAscentsCount: (cragId: number) =>
    `cached_crag_ascents_count_${cragId}_v1`,
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
  homeNews: 'cached_home_news_v1',
  followedIds: 'cached_followed_ids_v1',
  activeCrags: 'cached_active_crags_v1',
  activeIndoorCenters: 'cached_active_indoor_centers_v1',
  activeAreas: 'cached_active_areas_v1',

  // Indoor Centers
  indoorCenters: 'cached_indoor_centers_v1',
  centerDetail: (slug: string) => `cached_center_detail_${slug}_v1`,
  centerTopos: (centerId: string | number) =>
    `cached_center_topos_${centerId}_v1`,
  centerRoutes: (centerId: string | number, showLegacy: boolean) =>
    `cached_center_routes_${centerId}_${showLegacy ? 'legacy' : 'active'}_v1`,
  centerAscents: (centerId: string | number) =>
    `cached_center_ascents_${centerId}_v1`,
  centerVouchers: (centerId: string | number) =>
    `cached_center_vouchers_${centerId}_v1`,

  // Translations
  translation: (lang: string) => `cached_translation_${lang}_v1`,
} as const;
