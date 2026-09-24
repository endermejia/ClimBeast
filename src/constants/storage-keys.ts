/**
 * Claves de localStorage/sessionStorage de la aplicación.
 *
 * Todas las claves de persistencia viven aquí: ningún componente o servicio
 * debe declarar claves hardcodeadas. `CACHE_KEYS` (cache-keys.ts) cubre las
 * claves de la capa de caché; `STORAGE_KEYS`, el resto de preferencias y
 * estado persistido.
 */
export const STORAGE_KEYS = {
  // App
  gdprAccepted: 'lw_gdpr_accepted',
  updateApplied: 'lw_update_applied',
  chunkReloadTs: 'lw_chunk_reload_ts',
  unrecoverableReloadTs: 'lw_unrecoverable_reload_ts',
  userLocation: 'lw_user_location',
  exploreLastTab: 'lw_explore_last_tab',

  // Preferencias de UI
  theme: 'app_theme',
  homeFeedFilter: 'home_feed_filter',
  messageSound: 'message_sound_enabled_v1',
  notificationSound: 'notification_sound_enabled_v1',

  // Carrito / tienda
  cart: 'climbeast_cart',
  checkoutShippingInfo: 'checkout_shipping_info',

  // Indoor
  showLegacyTopos: 'show_legacy_topos',
  showLegacyRoutes: 'show_legacy_routes',

  // Mapa
  mapBounds: 'map_bounds_v1',

  // Zonas visitadas
  visitedAreas: 'visited_areas',
  visitedCrags: 'visited_crags',
  visitedIndoorCenters: 'visited_indoor_centers',

  // Errores
  errorLogs: 'app_error_logs_v3',

  // Filtros (FilterStateService)
  areaListGradeRange: 'area_list_grade_range_v1',
  areaListCategories: 'area_list_categories_v1',
  areaListShade: 'area_list_shade_v1',
  areaListShowIndoor: 'area_list_show_indoor_v1',
  areaListShowOutdoor: 'area_list_show_outdoor_v1',
  areaListToposOnly: 'area_list_topos_only_v1',
  feedGradeRange: 'feed_grade_range_v1',
  feedCategories: 'feed_categories_v1',
  feedShowIndoor: 'feed_show_indoor_v1',
  feedShowIndoorLegacy: 'feed_show_indoor_ascents_v1',
  feedShowOutdoor: 'feed_show_outdoor_v1',
  feedShowIndoorAscents: 'feed_show_indoor_ascents_v2',
  profileAscentsGradeRange: 'profile_ascents_grade_range_v1',
  profileAscentsCategories: 'profile_ascents_categories_v1',
  profileAscentsShowIndoor: 'profile_ascents_show_indoor_v1',
  profileAscentsShowOutdoor: 'profile_ascents_show_outdoor_v1',
  indoorListGradeRange: 'indoor_list_grade_range_v1',
  indoorListToposOnly: 'indoor_list_topos_only_v1',
  indoorRoutesGradeRange: 'indoor_routes_grade_range_v1',
  indoorRoutesCategories: 'indoor_routes_categories_v1',
  indoorRoutesToposOnly: 'indoor_routes_topos_only_v1',
  indoorTopoGradeRange: 'indoor_topo_grade_range_v1',
  indoorTopoMovesRange: 'indoor_topo_moves_range_v1',
} as const;
