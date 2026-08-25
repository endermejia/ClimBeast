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

## Component Conventions

- Selector prefix: `app-` (kebab-case)
- Standalone components
- OnPush change detection
- Signals for state (`signal()`, `computed()`, `resource()`)
- `inject()` for dependency injection
