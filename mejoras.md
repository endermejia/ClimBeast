# Mejoras Pendientes — Local Walls

Actualizado: 2026-08-25

---

## 🟠 Alto

### 5. import-8a.ts excesivamente grande (1698 líneas)

- Parsing CSV, matching de rutas, y UI de confirmación en un solo archivo.
- Acción: Extraer `CsvParserService`, `RouteMatcherService`, y dividir en componentes por paso.

### 6. topo-viewer.ts con lógica compleja (786 líneas)

- Zoom, pan, drag, touch events, fullscreen, y rutas SVG en un solo componente.
- Acción: Extraer `ZoomPanController` (zoom/drag) y `TopoRouteRenderer` (SVG routes).

### 7. chat-dialog.ts excesivamente grande (712 líneas)

- UI, lógica de mensajes, y conexión realtime mezclados.
- Acción: Dividir en `ChatMessageListComponent`, `ChatInputComponent`, y `ChatService` dedicado.

---

## 🟡 Medio

### 8. Separación de SupabaseService (527 líneas)

- Maneja auth, storage URLs, profile, admin areas, y config en un solo servicio.
- Acción: Extraer `SupabaseAuthService`, `SupabaseStorageService`, `SupabaseConfigService`.

### 9. OutdoorDataService / TopoDataService (675 líneas)

- Múltiples `resource()` calls y mucha lógica de cache.
- Acción: Dividir en `AreaDataService`, `CragDataService`, `TopoDataService`, `RouteDataService`.

### 10. AscentsService sobredimensionado (1123 líneas)

- CRUD, diálogos, notificaciones, comentarios, y estadísticas mezclados.
- Acción: Extraer `AscentCrudService`, `AscentCommentsService`, `AscentStatsService`.

### 11. RoutesService sobredimensionado (908 líneas)

- Mezcla apertura de diálogos CRUD con queries Supabase y lógica de cache.
- Acción: Separar `RouteCrudService` (diálogos) de `RouteQueryService` (data fetching).

### 12. IndoorService sobredimensionado (872 líneas)

- CRUD de centers, routes, topos, vouchers, ascents, sales e inventory en un solo archivo.
- Acción: Dividir en `IndoorCenterService`, `IndoorRouteService`, `IndoorVoucherService`.

### 13. AreasService sobredimensionado (745 líneas)

- CRUD de áreas, búsquedas 8a.nu, administración de accesos y unificación.
- Acción: Extraer `AreaAdminService` (access management) y `AreaUnifyService`.

### 14. `handleErrorToast()` solo maneja 2 códigos PostgreSQL

- Solo maneja `23503` (foreign key) y `23505` (unique). Faltan `28P01`, `42501`, `42P01`, errores de red, rate limiting (429).
- Acción: Expandir mapeo de códigos de error y agregar handling para errores de red/timeout.

### 15. ESLint sin reglas estrictas TypeScript

- Falta `@typescript-eslint/no-explicit-any` (35 casts `as any` en tests). Falta `prefer-signals`, `prefer-inject`, `@typescript-eslint/strict-type-checked`.
- Acción: Agregar reglas estrictas al `eslint.config.js`.

### 16. Pyramid.ts con lógica compleja (660 líneas)

- Rendering SVG y cálculos matemáticos en un solo componente.
- Acción: Extraer `PyramidCalculatorService` y `PyramidRendererComponent`.

### 17. Manifest PWA hardcodeado en español

- `manifest.webmanifest` tiene `"lang": "es"` y descripción en español sin soporte multilingual.
- Acción: Generar manifest dinámicamente o usar traducciones del usuario.

### 18. Eliminación de Subscriptions en Dialogs

- Migración progresiva de llamadas a `.subscribe()` en apertura de diálogos hacia `firstValueFrom` con `async/await` o `takeUntilDestroyed()`.

---

## 🟢 Bajo

### 19. Effect con dependencia circular implícita

- `outdoor-route.ts:502-511`: Effect escribe a signals del servicio para triggerar resources. Crea cadena implícita difícil de debuggear.
- Acción: Considerar pasar params directamente al resource en vez de usar signals intermedios.

### 20. Hack `_v: r` en resource params

- `outdoor-route.ts:435`: `_v: r` en params para forzar re-evaluación cuando el `id` no cambia. Señal de parametrizado incorrecto.
- Acción: Revisar si el resource debería usar un signal derivado como key en vez de hackear params.

### 21. Edge Functions con console.log de debug

- `notify-push/index.ts` y `stripe-onboarding/index.ts` tienen `console.log` sobrantes de desarrollo.
- Acción: Convertir a `console.info`/`console.debug`.

### 22. Tests de servicios solo cubren path server-side

- `crags.service.spec.ts` y similares solo testean el early-return de `IS_BROWSER=false`. La lógica real del browser no se testea.
- Acción: Agregar tests que mockeem Supabase y testeen CRUD, error handling, y cache.

### 23. Sin retry logic para API calls

- El interceptor HTTP tiene timeout de 5s para APIs externas pero no reintenta. Falloff exponencial ausente.
- Acción: Agregar retry con backoff exponencial para errores transitorios (5xx, network).

---

## 🔵 Mejoras de Arquitectura (Largo Plazo)

### 24. Evaluar migración de toObservable+switchMap a resource()

- `weather-forecast.ts:263` y `navbar.ts:692` usan `toObservable().pipe(switchMap())`. Algunos podrían simplificarse con `resource()`.
- Acción: Revisar cada instancia; los que usan `debounceTime` quedan en RxJS, los directos migran.

### 25. Establecer patrón estándar de loading/error states

- Cada componente maneja loading y error de forma ad-hoc. No hay un `LoadingState` type compartido ni `@loading`/`@error` blocks estandarizados.
- Acción: Definir `LoadingState = { loading: boolean; error: string | null; data: T | null }` y componente wrapper reutilizable.
