## 🟡 Mejoras Pendientes

1. Separación de SupabaseService (527 líneas)

- Maneja auth, storage URLs, profile, admin areas, y config todo en un solo servicio.
- Acción: Extraer SupabaseAuthService, SupabaseStorageService, SupabaseConfigService.

2. TopoDataService / OutdoorDataService (675 líneas)

- Contiene múltiples resource() calls y mucha lógica de cache.
- Acción: Dividir en AreaDataService, CragDataService, TopoDataService, RouteDataService.

3. Falta de error boundaries en templates

- No hay patrón consistente de fallback UI para errores en resource() loading.
- Acción: Crear un @defer con @error block o un wrapper ErrorBoundaryComponent.

4. Cache de Supabase storage URLs potencialmente stale

- SignedUrlCache usa CacheService con keys versionadas, pero no hay invalidación forzada.
- Acción: Agregar mecanismo de invalidación cuando el archivo cambia.

5. AscentsService sobredimensionado (1123 líneas)

- Contiene lógica de CRUD, diálogos, notificaciones, comentarios, y estadísticas todas mezcladas.
- Acción: Extraer AscentCrudService, AscentCommentsService, AscentStatsService.

6. RoutesService sobredimensionado (908 líneas)

- Mezcla apertura de diálogos CRUD con queries Supabase y lógica de cache.
- Acción: Separar RouteCrudService (diálogos) de RouteQueryService (data fetching).

7. IndoorService sobredimensionado (872 líneas)

- Contiene CRUD de centers, routes, topos, vouchers, ascents, sales e inventory en un solo archivo.
- Acción: Dividir en IndoorCenterService, IndoorRouteService, IndoorVoucherService.

8. AreasService sobredimensionado (745 líneas)

- Acumula CRUD de áreas, búsquedas 8a.nu, administración de accesos y unificación.
- Acción: Extraer AreaAdminService (access management) y AreaUnifyService.

9. user-profile-config.ts excesivamente grande (1939 líneas)

- Componente de página con toda la lógica de perfil, preferencias, tour y 8a.nu en un solo archivo.
- Acción: Dividir en sub-componentes: ProfileGeneralSectionComponent, ProfilePreferencesComponent, Profile8aSectionComponent, ProfileDangerZoneComponent.

10. import-8a.ts excesivamente grande (1698 líneas)

- Componente de importación con parsing CSV, matching de rutas, y UI de confirmación todo junto.
- Acción: Extraer CsvParserService, RouteMatcherService, y dividir en componentes de cada paso.

11. Falta de tests en servicios críticos

- 46 servicios sin .spec.ts, incluyendo supabase.service.ts, outdoor-data.service.ts, indoor.service.ts, routes.service.ts, areas.service.ts, ascents.service.ts.
- Acción: Crear tests unitarios para al menos los servicios de datos y auth (prioridad alta).

12. Falta de tests en componentes principales

- 105+ componentes sin .spec.ts, incluyendo navbar.ts (811 líneas), topo-viewer.ts, ascent-card.ts, todos los forms y dialogs.
- Acción: Crear tests para componentes de alto uso: navbar, topo-viewer, ascent-card, y todos los forms.

14. innerHTML sin sanitización consistente

- 6 usos de innerHTML, incluyendo mention-link.pipe.ts que usa bypassSecurityTrustHtml.
- Acción: Auditar cada uso; preferir interpolación de texto sobre innerHTML. Donde sea necesario, asegurar sanitización robusta.

15. Uso excesivo de bypassSecurityTrust

- 4 llamadas a bypassSecurityTrustHtml/Url/ResourceUrl en pipes y componentes.
- Acción: Revisar cada caso; para mention-link.pipe.ts considerar una alternativa basada en componentes.

16. Manifest PWA hardcodeado en español

- manifest.webmanifest tiene "lang": "es" y descripción en español sin soporte multilingual.
- Acción: Hacer que el manifest se genere dinámicamente o use las traducciones del usuario.

20. Duplicación de patrón resource() + cache fallback

- outdoor-data.service.ts e indoor-data.service.ts repiten el patrón: resource → cache.fetchOrCache → cache.get fallback, ~10 veces cada uno.
- Acción: Crear un helper `cachedResource()` o `createCachedResource()` que encapsule este patrón.

21. `await this.supabase.whenReady()` repetido 100+ veces

- Prácticamente cada método de servicio repite esta línea antes de cada query Supabase.
- Acción: Crear un wrapper `getClient()` que haga await internamente, o usar un proxy sobre `client`.

23. Faltan ARIA roles en componentes interactivos

- Solo 13 `role=` explícitos en todo el proyecto; componentes como cards clickeables, botones de menú, y diálogos no siempre tienen roles.
- Acción: Auditar componentes interactivos y agregar roles ARIA apropiados (button, dialog, navigation, etc.).

24. Faltan aria-label en botones de icono

- Varios botones de solo icono (favoritos, likes, comentarios) no tienen aria-label para lectores de pantalla.
- Acción: Agregar `[attr.aria-label]` a todos los botones de solo icono.

25. Navbar con 811 líneas y muchas dependencias

- navbar.ts inyecta 11 servicios y maneja búsqueda, notificaciones, tour, carrito, y navegación.
- Acción: Extraer SearchDropdownComponent, NotificationBadgeComponent, y TourTriggerComponent.

26. topo-viewer.ts con lógica de interacción compleja (786 líneas)

- Maneja zoom, pan, drag, touch events, fullscreen, y rutas SVG en un solo componente.
- Acción: Extraer ZoomPanController (zoom/drag logic) y TopoRouteRenderer (SVG route rendering).

27. chat-dialog.ts excesivamente grande (712 líneas)

- Dialog de chat que probablemente mezcla UI, lógica de mensajes y conexión realtime.
- Acción: Dividir en ChatMessageListComponent, ChatInputComponent, y ChatService dedicado.

28. pyramid.ts con lógica de gráficos compleja (660 líneas)

- Componente de pirámide de proyectos con rendering SVG y cálculos matemáticos.
- Acción: Extraer PyramidCalculatorService y PyramidRendererComponent.

---

## 🟢 Mejoras Completadas

- [x] **13. @defer con @error en templates**: Agregados bloques `@error` con fallback UI traducida en bloques `@defer`.
- [x] **17. Sitemap.xml**: Actualizado con las rutas públicas exactas (`/`, `/info`, `/login`) y enlaces `hreflang` multilingües.
- [x] **18. robots.txt**: Alineado exactamente con la estructura de `app.routes.ts` y guards de autenticación.
- [x] **19. Textos de landing page demo internacionalizados**: Cadenas del demo card y `mockCrag` movidas a archivos i18n (`public/i18n/*.json`) y gestionadas mediante `computed()`.
- [x] **22. CacheService con expiración TTL**: Agregado soporte TTL opcional en `get()` y `fetchOrCache()`, con desalojo automático de claves expiradas y pruebas unitarias.
- [x] **29. Estrategia de Preloading**: Corregida coincidencia de rutas (`home`, `area`, `explore`, `admin`, `my-areas`) en `SelectivePreloadingStrategy` y agregadas pruebas unitarias.
- [x] **30. SEO Service hreflang dinámico**: Implementada la actualización de etiquetas `<link rel="alternate" hreflang="...">` por URL canónica.
