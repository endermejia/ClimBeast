# TODO: Eliminación Progresiva de `editingMode` en ClimBeast

Este documento registra todas las ubicaciones donde se utiliza `editingMode` / `editing_mode` en el proyecto, organizado por fases para su retirada gradual.

---

## Estado Actual

- **Fase 1: Cabeceras de Sección (`app-section-header`)**: ✅ Completada
- **Fase 2: Tablas y Listados**: ✅ Completada
- **Fase 3: Merchandising**: ✅ Completada
- **Fase 4: Preferencias de Usuario y Switches en UI**: ⏳ Pendiente
- **Fase 5: Servicio de Autenticación, Modelos y Base de Datos**: ⏳ Pendiente
- **Fase 6: Dependientes de `canEditAsAdmin`**: ⏳ Pendiente (desvincular de `editingMode`)

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

- [ ] `src/components/ui/menu-options-dropdown.ts` (L169, L174, L290, L314, L319, L321, L330, L333) — Switch para alternar `editingMode` en el menú de usuario. Incluye toggle, persistencia a DB y rollback.
- [ ] `src/components/user-profile/profile-preferences.ts` (L168, L174, L175, L247) — Switch de `editingMode` en las preferencias de perfil. Emite `editingModeChange`.
- [ ] `src/pages/user/user-profile-config.ts` (L182, L324, L557, L968-981, L1009-1039) — Formulario de configuración, modelo, llamada a guardar `editing_mode`, y `toggleEditingMode` con rollback.
- [ ] `src/components/forms/indoor-center-form.ts` (L2014) — Reset `this.authState.editingMode.set(false)` tras crear centro indoor.

---

### Fase 5: Servicio de Autenticación, Modelos y Base de Datos

- [ ] `src/services/auth-state.service.ts`:
  - `editingModeStorageKey = 'editing_mode_v2'` (L37)
  - `editingMode: WritableSignal<boolean>` (L45)
  - `canEditAsAdmin = computed(() => this.editingMode() && this.isAdmin())` (L74-76)
  - `canEditAsAreaAdmin = computed(() => this.editingMode() && this.isAreaAdmin())` (L158-159)
  - `areaAdminPermissions` — lee `canEditAsAdmin()` y `editingMode()` (L163-164)
  - `indoorAdminPermissions` — lee `canEditAsAdmin()` y `editingMode()` (L176-177)
  - `checkAreaEditPermission` — guard con `canEditAsAdmin()` y `editingMode()` (L380-383)
  - `checkCragEditPermission` — guard con `canEditAsAdmin()` y `editingMode()` (L425-430)
  - `checkRouteEditPermission` — guard con `canEditAsAdmin()` y `editingMode()` (L471-476)
  - `hydrateEditingMode()` (L506-508)
  - `persistEditingMode()` (L517-518)
  - `syncFromProfile()` — lee `profile.editing_mode` (L526-527)
- [ ] `src/models/user.model.ts` (L28) — Retirar `editingMode: boolean;` de la interfaz `ProfileConfigModel`.
- [ ] `src/models/supabase-generated.ts` (L3679, L3702, L3725) — Columna `editing_mode` en tipos generados `Row`, `Insert`, `Update`.
- [ ] `src/services/auth-state.service.spec.ts` — Actualizar tests (~22 referencias a `editingMode`).
- [ ] Migración de base de datos Supabase — Retirar columna `editing_mode` de la tabla `user_profiles` y regenerar tipos (`bun run gen:supabase-types`).

---

### Fase 6: Dependientes de `canEditAsAdmin`

Estos archivos usan `canEditAsAdmin` (computed que depende de `editingMode() && isAdmin()`). Una vez eliminado `editingMode`, hay que redefinir `canEditAsAdmin` para que solo dependa de `isAdmin()` o revisar la lógica de cada uso.

**Definición:**

- `src/services/auth-state.service.ts` (L74-76) — `canEditAsAdmin = computed(() => this.editingMode() && this.isAdmin())`
- `src/services/auth-state.service.ts` (L158-159) — `canEditAsAreaAdmin = computed(() => this.editingMode() && this.isAreaAdmin())`

**Usos en páginas:**

- [ ] `src/pages/area/area.ts` (L122, L155, L225, L264, L279, L336, L538-539) — Alias `canEditAsAdmin` + usos en template (admin section, unify, remove-admin).
- [ ] `src/pages/area/area-list.ts` (L84) — Botón "add area".
- [ ] `src/pages/area/crag.ts` (L318, L324, L331, L335, L340) — `showToposTab`, `showParkingsTab`, `hasAccess`.
- [ ] `src/pages/area/outdoor-topo.ts` (L57, L124, L222, L228) — `hasAccess`.
- [ ] `src/pages/area/explore.ts` (L128, L291) — Botón unify, parking edit.

**Usos en componentes:**

- [ ] `src/components/crag/crag-routes.ts` (L93, L257) — Template `@if` + alias.
- [ ] `src/components/crag/crag-topos.ts` (L74, L126) — Template `@if` + alias.
- [ ] `src/components/crag/crag-parkings.ts` (L87, L173) — Template `@if` + alias.
- [ ] `src/components/area/area-revenue-panel.ts` (L547) — `canManageArea`.
- [ ] `src/components/forms/area-form.ts` (L390) — `canEditAdminSettings`.

**Usos en servicios:**

- [ ] `src/services/crag-routes-data.service.ts` (L40) — Resource loader access check.
- [ ] `src/components/route/outdoor-routes-table.ts` (L121) — `mappedData` computed.
