# Coding Conventions

## Import Ordering (enforced by `scripts/check-imports.mjs`)

Imports must be grouped in this exact order, separated by blank lines:

1. **Angular framework** — `@angular/*`
2. **Taiga UI** — `@taiga-ui/*`
3. **Third-party** — `@ngx-translate`, `@supabase`, `rxjs`, `@ng-web-apis`, etc.
4. **Local services** — `../../services/*`
5. **Local components** — `../../components/*`
6. **Local models** — `../../models`
7. **Local pipes, utils, constants** — `../../pipes`, `../../utils`, `../../constants`

Within each group: alphabetically by import path.

## Barrel Files

- `models/`, `utils/`, `pipes/`, `constants/`: use barrel imports (`from '../../models'`)
- `components/`, `services/`: use **direct file imports** (no barrel files)

## Pre-commit Requirements

Before committing, ensure ALL of the following pass:

1. `npm run build` — Compiles without errors (always run this before finishing any change)
2. `npm run lint` — ESLint passes
3. `npm run check:imports` — Import ordering correct
4. `npm test` — Tests pass
5. `npm run format` — Prettier formatting

## Component & Reactivity Conventions

- Selector prefix: `app-` (kebab-case)
- Standalone components
- OnPush change detection is default (no need to specify `changeDetection: ChangeDetectionStrategy.OnPush`)
- **100% Zoneless (No `NgZone`)** — The application runs with zoneless change detection (`provideZonelessChangeDetection()`) and `zone.js` is not loaded in browser polyfills. **Do NOT inject `NgZone` or use `ngZone.runOutsideAngular()` / `ngZone.run()`**. Native asynchronous browser APIs (`requestAnimationFrame`, `setTimeout`, DOM event listeners) are unpatched and do not trigger change detection. Reactivity and view updates must be driven exclusively via Angular Signals.
- **No `subscribe()` in the app** — code must be reactive. Use Angular signals (`signal()`, `computed()`, `resource()`), `toSignal()`, `effect()`, async pipes, or `firstValueFrom()` for single promise conversions. Never use manual `.subscribe()` subscriptions.
- `inject()` for dependency injection

## Supabase & Domain Conventions

- **Cuentas y Balances de Áreas Públicos por Diseño** — Todas las cuentas, balances y recaudaciones de las áreas (bote de equipamiento, compras de croquis, donaciones y función `get_area_balance`) son públicos por diseño de la plataforma para garantizar la transparencia comunitaria.
- **Cabecera de `user_profiles` Pública por Diseño** — Los datos de presentación del perfil (`user_profiles`) son visibles para usuarios autenticados como tarjeta de presentación incluso cuando `private = true`. La privacidad del perfil restringe en capa de datos (`is_profile_public`) el historial de ascensiones (`route_ascents`, `indoor_ascents`), estadísticas (`get_user_statistics`), proyectos (`route_projects`), pirámide (`user_pyramid_slots`) y el inicio de nuevas conversaciones de chat (`create_chat_room`).
