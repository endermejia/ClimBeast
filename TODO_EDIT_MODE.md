# TODO: Eliminación Progresiva de `editingMode` en ClimBeast

Este documento registra todas las ubicaciones donde se utiliza `editingMode` / `editing_mode` en el proyecto, organizado por fases para su retirada gradual.

---

## Estado Actual

- **Fase 1: Cabeceras de Sección (`app-section-header`)**: ✅ Completada
- **Fase 2: Tablas y Listados**: ✅ Completada
- **Fase 3: Merchandising**: ✅ Completada
- **Fase 4: Preferencias de Usuario y Switches en UI**: ✅ Completada
- **Fase 5: Servicio de Autenticación, Modelos y Base de Datos**: ✅ Completada
- **Fase 6: Dependientes de `canEditAsAdmin`**: ✅ Completada (desvinculado de `editingMode`)

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

- [x] `src/components/route/routes-table.ts` — Eliminación de `admin_actions`, toggle local de edición en cabecera de `actions`, soporte de equippers.
- [x] `src/components/route/outdoor-routes-table.ts` — Visibilidad de columnas de administración y acciones sin depender de `editingMode()`.
- [x] `src/components/route/indoor-routes-table.ts` — Revisar visibilidad de acciones de rutas indoor.
- [x] `src/components/crag/crag-routes.ts` (L383) — Eliminar dependencia de `this.authState.editingMode()` en botones de tabla de rutas.
- [x] `src/components/indoor/indoor-routes.ts` — Revisar acciones en listado de rutas indoor.
- [x] `src/components/indoor/indoor-topos.ts` — Revisar acciones en listado de topos indoor.

---

### Fase 3: Merchandising

- [x] `src/components/merchandise/merchandise-card.ts` — Botones de editar/borrar producto en tarjeta (`isAdmin()`).
- [x] `src/pages/merchandising/merchandising.ts` — Botón de nuevo producto (`isAdmin()`).
- [x] `src/pages/merchandising/merchandising.ts` — Filtro `onlyActive` de productos basado en `isAdmin()`.

---

### Fase 4: Preferencias de Usuario y Switches en UI

- [x] `src/components/ui/menu-options-dropdown.ts` — Switch para alternar `editingMode` en el menú de usuario retirado junto con confirmación y diálogo.
- [x] `src/components/user-profile/profile-preferences.ts` — Switch de `editingMode` en las preferencias de perfil retirado.
- [x] `src/pages/user/user-profile-config.ts` — Formulario de configuración, modelo y llamadas a `editing_mode` retiradas.
- [x] `src/components/forms/indoor-center-form.ts` — Reset `this.authState.editingMode.set(false)` tras crear centro indoor retirado.

---

### Fase 5: Servicio de Autenticación, Modelos y Base de Datos

- [x] `src/services/auth-state.service.ts`:
  - `editingModeStorageKey` retirado.
  - `editingMode: WritableSignal<boolean>` retirado.
  - `canEditAsAdmin = computed(() => this.isAdmin())` simplificado.
  - `canEditAsAreaAdmin = computed(() => this.isAreaAdmin())` simplificado.
  - `areaAdminPermissions` — ya no requiere `editingMode()`.
  - `indoorAdminPermissions` — ya no requiere `editingMode()`.
  - `checkAreaEditPermission` — comprobación directa de permisos sin `editingMode()`.
  - `checkCragEditPermission` — comprobación directa de permisos sin `editingMode()`.
  - `checkRouteEditPermission` — comprobación directa de permisos sin `editingMode()`.
  - `hydrateEditingMode()`, `persistEditingMode()`, `syncFromProfile()` retirados.
- [x] `src/models/user.model.ts` — Retirado `editingMode: boolean;` de `ProfileConfigModel`.
- [x] `src/services/auth-state.service.spec.ts` — Actualizados tests (eliminados tests de `editingMode`, `hydrate`, `persist`, `syncFromProfile`, y actualizados tests de permisos).
- [x] Migración de base de datos Supabase — Creada migración `supabase/migrations/20260917233000_remove_editing_mode_from_user_profiles.sql` para retirar columna `editing_mode`.

---

### Fase 6: Dependientes de `canEditAsAdmin`

Redefinido `canEditAsAdmin = computed(() => this.isAdmin())` y `canEditAsAreaAdmin = computed(() => this.isAreaAdmin())` en `AuthStateService`, desacoplándolos completamente del extinto `editingMode`.

- [x] `src/pages/area/area.ts` — Verificado comportamiento de `canEditAsAdmin` (sección admin, unificar, etc.).
- [x] `src/pages/area/area-list.ts` — Botón "add area".
- [x] `src/pages/area/crag.ts` — `showToposTab`, `showParkingsTab`, `hasAccess`.
- [x] `src/pages/area/outdoor-topo.ts` — `hasAccess`.
- [x] `src/pages/area/explore.ts` — Botón unify, parking edit.
- [x] `src/components/crag/crag-routes.ts` — Template `@if` + sincronización de slugs de 8a.nu sujeta a permisos directos.
- [x] `src/components/crag/crag-topos.ts` — Template `@if` + alias.
- [x] `src/components/crag/crag-parkings.ts` — Template `@if` + alias.
- [x] `src/components/area/area-revenue-panel.ts` — `canManageArea`.
- [x] `src/components/forms/area-form.ts` — `canEditAdminSettings` simplificado.
- [x] `src/services/crag-routes-data.service.ts` — Resource loader access check.
- [x] `src/components/route/outdoor-routes-table.ts` — `mappedData` computed.
