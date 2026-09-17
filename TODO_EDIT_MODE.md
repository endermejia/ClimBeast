# TODO: Eliminación Progresiva de `editingMode` en ClimBeast

Este documento registra todas las ubicaciones donde se utiliza `editingMode` / `editing_mode` en el proyecto, organizado por fases para su retirada gradual.

---

## Estado Actual

- **Fase 1: Cabeceras de Sección (`app-section-header`)**: ✅ Completada
- **Fase 2: Tablas y Listados**: ⏳ Pendiente
- **Fase 3: Merchandising**: ⏳ Pendiente
- **Fase 4: Preferencias de Usuario y Switches en UI**: ⏳ Pendiente
- **Fase 5: Servicio de Autenticación, Modelos y Base de Datos**: ⏳ Pendiente

---

## Inventario de Ocurrencias por Fases

### Fase 1: Cabeceras de Sección (`app-section-header`)

Sustituir botones sueltos de acciones de cabecera por un menú de 3 puntos (`@tui.ellipsis-vertical`) a la derecha del botón de favorito/like, mostrando las opciones disponibles según los permisos reales del usuario sin requerir tener activado `editingMode`.

- [x] `src/components/ui/section-header.ts` — Soporte de `actions` estandarizadas con botón ellipsis vertical y menú dropdown (`tui-data-list`).
- [x] `src/pages/area/area.ts` — Reemplazo de botones `actionButtons` (editar, borrar, gestionar acceso, solicitar admin) por `actions`.
- [x] `src/pages/area/crag.ts` — Reemplazo de botones `actionButtons` (editar, borrar) por `actions`.
- [x] `src/pages/area/outdoor-route.ts` — Reemplazo de botones `actionButtons` (editar, borrar) por `actions`.
- [x] `src/pages/area/outdoor-topo.ts` — Reemplazo de botones `actionButtons` (dibujar, editar, borrar) por `actions`.
- [x] `src/pages/indoor/indoor-center.ts` — Reemplazo de botones `actionButtons` (editar, borrar, solicitar admin, solicitar routesetter) por `actions`.
- [x] `src/pages/indoor/indoor-route.ts` — Reemplazo de botones `actionButtons` (editar, borrar) por `actions`.
- [x] `src/pages/indoor/indoor-topo.ts` — Reemplazo de botones `actionButtons` (dibujar, editar, borrar) por `actions`.

---

### Fase 2: Tablas y Listados

- [ ] `src/components/crag/crag-routes.ts` (L383) — Eliminar dependencia de `this.authState.editingMode()` en botones de tabla de rutas.
- [ ] `src/components/route/outdoor-routes-table.ts` (L150) — Visibilidad de columnas de administración y acciones sin depender de `editingMode()`.
- [ ] `src/components/route/indoor-routes-table.ts` — Revisar visibilidad de acciones de rutas indoor.
- [ ] `src/components/indoor/indoor-routes.ts` — Revisar acciones en listado de rutas indoor.
- [ ] `src/components/indoor/indoor-topos.ts` — Revisar acciones en listado de topos indoor.

---

### Fase 3: Merchandising

- [ ] `src/components/merchandise/merchandise-card.ts` (L81) — Botones de editar/borrar producto en tarjeta (`isAdmin() && authState.editingMode()`).
- [ ] `src/pages/merchandising/merchandising.ts` (L155) — Botón de nuevo producto (`isAdmin() && authState.editingMode()`).
- [ ] `src/pages/merchandising/merchandising.ts` (L245) — Filtro `onlyActive` de productos basado en `editingMode`.

---

### Fase 4: Preferencias de Usuario y Switches en UI

- [ ] `src/components/ui/menu-options-dropdown.ts` (L169-175, L289-333) — Switch para alternar `editingMode` en el menú de usuario.
- [ ] `src/components/user-profile/profile-preferences.ts` (L168-175, L247) — Switch de `editingMode` en las preferencias de perfil.
- [ ] `src/pages/user/user-profile-config.ts` (L182, L324, L557, L964-978, L1008-1039) — Formulario de configuración, modelo y llamada a guardar `editing_mode`.
- [ ] `src/components/forms/indoor-center-form.ts` (L1794) — Reset `this.authState.editingMode.set(false)`.

---

### Fase 5: Servicio de Autenticación, Modelos y Base de Datos

- [ ] `src/services/auth-state.service.ts`:
  - `editingModeStorageKey = 'editing_mode_v2'`
  - `editingMode: WritableSignal<boolean>`
  - `canEditAsAdmin = computed(() => this.editingMode() && this.isAdmin())`
  - `canEditAsAreaAdmin = computed(() => this.editingMode() && this.isAreaAdmin())`
  - `areaAdminPermissions` (desvincular de `editingMode`)
  - `indoorAdminPermissions` (desvincular de `editingMode`)
  - `hydrateEditingMode()` y `persistEditingMode()`
- [ ] `src/models/user.model.ts` (L28) — Retirar `editingMode: boolean;` de la interfaz de usuario.
- [ ] `src/services/auth-state.service.spec.ts` — Actualizar tests para eliminar referencias a `editingMode`.
- [ ] Migración de base de datos Supabase — Retirar columna `editing_mode` de la tabla `user_profiles` y regenerar tipos (`bun run gen:supabase-types`).
