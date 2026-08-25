# Plan: Solicitudes de Equipador

## Contexto

La tabla `equippers` tiene un campo `user_id` (FK 1:1 nullable a `user_profiles`) que indica el dueño de un equipador. Actualmente solo un admin puede asignar este `user_id` desde `admin/equippers` usando un ComboBox.

**Objetivo:** Permitir que cualquier usuario envíe una solicitud para ser equipador desde la página pública `/equipper/:id`, y que un admin apruebe o rechace la solicitud.

**Condición:** El botón de solicitud solo aparece cuando el equipador **no tiene dueño** (`user_id === null`).

---

## Flujo

```
/Equipper/:id (user logueado, sin dueño)
  → Clic en "Solicitar ser equipador"
  → INSERT INTO equipper_requests (user_id, equipper_id)
  → Botón cambia a "Solicitud pendiente" + opción cancelar
  → Admin ve solicitud en /admin/equipper-requests
  → Aprobar → UPDATE equippers SET user_id = :userId + DELETE solicitud
  → Rechazar → DELETE solicitud
```

---

## Fase 1 — Base de datos

### 1.1 Crear tabla `equipper_requests`

```sql
CREATE TABLE equipper_requests (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
, user_id     UUID NOT NULL REFERENCES user_profiles(id)
, equipper_id BIGINT NOT NULL REFERENCES equippers(id)
, status      TEXT NOT NULL DEFAULT 'pending'
, created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
, UNIQUE(user_id, equipper_id)
);

ALTER TABLE equipper_requests ENABLE ROW LEVEL POLICY;

-- Cualquier usuario autenticado puede INSERT su propia solicitud
CREATE POLICY insert_own_request ON equipper_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Cualquier usuario autenticado puede SELECT (para que admins vean todas)
CREATE POLICY select_requests ON equipper_requests
  FOR SELECT TO authenticated
  USING (true);

-- Solo admins pueden UPDATE/DELETE
CREATE POLICY admin_manage_requests ON equipper_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### 1.2 Regenerar tipos

```bash
npx supabase gen types typestypes --local > src/models/supabase-generated.ts
```

### Archivos

| Archivo                                                           | Accion    |
| ----------------------------------------------------------------- | --------- |
| `supabase/migrations/YYYYMMDDHHMMSS_create_equipper_requests.sql` | Crear     |
| `src/models/supabase-generated.ts`                                | Regenerar |

---

## Fase 2 — Service layer

### 2.1 Crear `EquipperRequestsService`

**Archivo:** `src/services/equipper-requests.service.ts` (nuevo)

```typescript
@Injectable({ providedIn: "root" })
export class EquipperRequestsService {
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);

  // Signal para notificar cambios a la UI
  readonly requestsChange = signal(0);

  private get client() {
    return this.supabase.client;
  }

  // --- Usuario envia solicitud ---
  async requestEquipper(equipperId: number): Promise<boolean> {
    const userId = this.supabase.authUserId();
    if (!userId) return false;

    const { error } = await this.client.from("equipper_requests").insert({ user_id: userId, equipper_id: equipperId });

    if (error) {
      if (error.code === "23505") {
        // unique violation
        this.toast.error("equipperRequest.alreadyRequested");
      } else {
        this.toast.error("errors.unexpected");
      }
      return false;
    }

    this.toast.success("equipperRequest.success");
    this.requestsChange.update((n) => n + 1);
    return true;
  }

  // --- Usuario cancela su solicitud ---
  async cancelRequest(equipperId: number): Promise<boolean> {
    const userId = this.supabase.authUserId();
    if (!userId) return false;

    const { error } = await this.client.from("equipper_requests").delete().eq("user_id", userId).eq("equipper_id", equipperId);

    if (error) return false;

    this.toast.success("equipperRequest.cancelled");
    this.requestsChange.update((n) => n + 1);
    return true;
  }

  // --- Consulta solicitud del usuario actual para un equipador ---
  async getMyRequestForEquipper(equipperId: number): Promise<EquipperRequestDto | null> {
    const userId = this.supabase.authUserId();
    if (!userId) return null;

    const { data } = await this.client.from("equipper_requests").select("*").eq("user_id", userId).eq("equipper_id", equipperId).eq("status", "pending").maybeSingle();

    return data;
  }

  // --- Admin: listar todas las solicitudes pendientes ---
  async getAllPendingRequests(): Promise<EquipperRequestWithDetails[]> {
    await this.supabase.whenReady();

    const { data, error } = await this.client
      .from("equipper_requests")
      .select(
        `
        id,
        created_at,
        user:user_profiles(id, name, avatar, city),
        equipper:equippers(id, name, description)
      `,
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) return [];
    return data as EquipperRequestWithDetails[];
  }

  // --- Admin: aprobar solicitud ---
  async approveRequest(requestId: number, equipperId: number, userId: string): Promise<boolean> {
    await this.supabase.whenReady();

    // 1. Asignar user_id al equipper
    const { error: updateError } = await this.client.from("equippers").update({ user_id: userId }).eq("id", equipperId);

    if (updateError) {
      this.toast.error("errors.unexpected");
      return false;
    }

    // 2. Eliminar la solicitud
    const { error: deleteError } = await this.client.from("equipper_requests").delete().eq("id", requestId);

    if (deleteError) {
      this.toast.error("errors.unexpected");
      return false;
    }

    this.requestsChange.update((n) => n + 1);
    return true;
  }

  // --- Admin: rechazar solicitud ---
  async rejectRequest(requestId: number): Promise<boolean> {
    await this.supabase.whenReady();

    const { error } = await this.client.from("equipper_requests").delete().eq("id", requestId);

    if (error) return false;

    this.requestsChange.update((n) => n + 1);
    return true;
  }
}
```

### 2.2 Interfaces

**Archivo:** `src/models/equipper.model.ts` (o agregar al existente)

```typescript
export interface EquipperRequestDto {
  id: number;
  user_id: string;
  equipper_id: number;
  status: string;
  created_at: string;
}

export interface EquipperRequestWithDetails extends EquipperRequestDto {
  user: { id: string; name: string | null; avatar: string | null; city: string | null };
  equipper: { id: number; name: string; description: string | null };
}
```

### Archivos

| Archivo                                     | Accion                         |
| ------------------------------------------- | ------------------------------ |
| `src/services/equipper-requests.service.ts` | Crear                          |
| `src/models/equipper.model.ts`              | Modificar (agregar interfaces) |

---

## Fase 3 — Equipper page (solicitud del usuario)

### 3.1 Modificar `src/pages/area/equipper.ts`

Cambios:

1. **Inyectar servicios:**

   ```typescript
   private readonly equipperRequests = inject(EquipperRequestsService);
   private readonly authState = inject(AuthStateService);
   ```

2. **Agregar signals:**

   ```typescript
   protected readonly myRequest = signal<EquipperRequestDto | null>(null);
   protected readonly requesting = signal(false);
   ```

3. **Effect para cargar solicitud pendiente:**

   ```typescript
   effect(async () => {
     const equipper = equipperService.equipperDetailResource.value();
     if (equipper && !equipper.user_id && this.authState.isAuthenticated()) {
       const req = await this.equipperRequests.getMyRequestForEquipper(equipper.id);
       this.myRequest.set(req);
     } else {
       this.myRequest.set(null);
     }
   });
   ```

4. **Methods:**

   ```typescript
   protected async requestEquipper(): Promise<void> {
     const equipper = this.equipperService.equipperDetailResource.value();
     if (!equipper) return;
     this.requesting.set(true);
     try {
       await this.equipperRequests.requestEquipper(equipper.id);
       // Recargar solicitud
       const req = await this.equipperRequests
         .getMyRequestForEquipper(equipper.id);
       this.myRequest.set(req);
     } finally {
       this.requesting.set(false);
     }
   }

   protected async cancelRequest(): Promise<void> {
     const equipper = this.equipperService.equipperDetailResource.value();
     if (!equipper) return;
     this.requesting.set(true);
     try {
       await this.equipperRequests.cancelRequest(equipper.id);
       this.myRequest.set(null);
     } finally {
       this.requesting.set(false);
     }
   }
   ```

5. **Template — agregar seccion de solicitud:**
   ```html
   <!-- Despues de la info del equipper, antes de las rutas -->
   @if (equipper?.user_id === null && authState.isAuthenticated()) {
   <div
     class="flex items-center gap-3 p-4 rounded-xl
                 bg-(--tui-background-neutral-1)"
   >
     @if (myRequest()) {
     <span class="text-sm opacity-70"> {{ 'equipperRequest.pending' | translate }} </span>
     <button tuiButton size="s" appearance="secondary-destructive" [disabled]="requesting()" (click)="cancelRequest()">{{ 'equipperRequest.cancel' | translate }}</button>
     } @else {
     <button tuiButton size="s" appearance="primary" [disabled]="requesting()" (click)="requestEquipper()">{{ 'equipperRequest.requestButton' | translate }}</button>
     }
   </div>
   }
   ```

### Archivos

| Archivo                      | Accion    |
| ---------------------------- | --------- |
| `src/pages/area/equipper.ts` | Modificar |

---

## Fase 4 — Admin UI

### 4.1 Crear pagina de solicitudes

**Archivo:** `src/pages/admin/equipper-requests.ts` (nuevo)

Patron identico a `area-requests.ts`:

```typescript
@Component({
  selector: "app-admin-equipper-requests",
  imports: [/* Taiga UI + TranslatePipe + EmptyStateComponent */],
  template: `
    <section class="flex flex-col w-full max-w-5xl mx-auto p-4">
      <header class="mb-4 flex items-center justify-between">
        <h1 class="text-2xl font-bold">
          {{ "adminEquipperRequests.title" | translate }}
        </h1>
      </header>

      <p class="mb-6 text-tui-text-secondary opacity-60">
        {{ "adminEquipperRequests.description" | translate }}
      </p>

      <tui-scrollbar class="flex grow">
        @if (requests().length > 0) {
          <table tuiTable [columns]="columns()">
            <thead tuiThead>
              <tr tuiThGroup>
                <th *tuiHead="'user'" tuiTh>{{ "adminEquipperRequests.user" | translate }}</th>
                <th *tuiHead="'equipper'" tuiTh>{{ "adminEquipperRequests.equipper" | translate }}</th>
                <th *tuiHead="'actions'" tuiTh>{{ "actions" | translate }}</th>
              </tr>
            </thead>
            <tbody tuiTbody [data]="requests()">
              @for (req of requests(); track req.id) {
                <tr tuiTr>
                  <td *tuiCell="'user'" tuiTd>
                    <a tuiLink [routerLink]="['/profile', req.user.id]">
                      {{ req.user.name }}
                    </a>
                  </td>
                  <td *tuiCell="'equipper'" tuiTd>
                    <a tuiLink [routerLink]="['/equipper', req.equipper.id]">
                      {{ req.equipper.name }}
                    </a>
                  </td>
                  <td *tuiCell="'actions'" tuiTd>
                    <div class="flex gap-2">
                      <button tuiButton appearance="primary" size="m" class="rounded-full!" (click)="approve(req)">
                        {{ "adminEquipperRequests.approve" | translate }}
                      </button>
                      <button tuiButton appearance="negative" size="m" class="rounded-full!" (click)="reject(req)">
                        {{ "adminEquipperRequests.reject" | translate }}
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <app-empty-state icon="@tui.users" [message]="'adminEquipperRequests.empty' | translate" />
        }
      </tui-scrollbar>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEquipperRequestsComponent {
  protected readonly equipperRequests = inject(EquipperRequestsService);
  protected readonly supabase = inject(SupabaseService);
  private readonly isBrowser = inject(IS_BROWSER);

  protected readonly columns = signal(["user", "equipper", "actions"]);
  protected readonly requests: WritableSignal<EquipperRequestWithDetails[]> = signal([]);
  protected readonly loading = signal(true);

  constructor() {
    if (this.isBrowser) {
      void this.loadRequests();
    }
  }

  private async loadRequests(): Promise<void> {
    this.loading.set(true);
    try {
      const reqs = await this.equipperRequests.getAllPendingRequests();
      this.requests.set(reqs);
    } finally {
      this.loading.set(false);
    }
  }

  protected async approve(req: EquipperRequestWithDetails): Promise<void> {
    const success = await this.equipperRequests.approveRequest(req.id, req.equipper.id, req.user.id);
    if (success) {
      this.requests.update((list) => list.filter((r) => r.id !== req.id));
    }
  }

  protected async reject(req: EquipperRequestWithDetails): Promise<void> {
    const success = await this.equipperRequests.rejectRequest(req.id);
    if (success) {
      this.requests.update((list) => list.filter((r) => r.id !== req.id));
    }
  }
}
```

### 4.2 Agregar ruta

**Archivo:** `src/app/app.routes.ts`

Dentro del bloque de rutas admin, agregar:

```typescript
{
  path: 'equipper-requests',
  loadComponent: () =>
    import('./pages/admin/equipper-requests'),
},
```

### 4.3 Agregar link en panel admin

**Archivo:** `src/pages/admin/admin.ts`

Agregar entrada de menu/navegacion a la nueva pagina con link a `/admin/equipper-requests` y un badge de contador si hay solicitudes pendientes.

### Archivos

| Archivo                                | Accion    |
| -------------------------------------- | --------- |
| `src/pages/admin/equipper-requests.ts` | Crear     |
| `src/app/app.routes.ts`                | Modificar |
| `src/pages/admin/admin.ts`             | Modificar |

---

## Fase 5 — Traducciones

### `public/i18n/es.json`

```json
{
  "equipperRequest": {
    "requestButton": "Solicitar ser equipador",
    "pending": "Solicitud pendiente",
    "cancel": "Cancelar solicitud",
    "success": "Solicitud enviada correctamente",
    "cancelled": "Solicitud cancelada",
    "alreadyRequested": "Ya has enviado una solicitud para este equipador"
  },
  "adminEquipperRequests": {
    "title": "Solicitudes de equipador",
    "description": "Gestiona las solicitudes de usuarios para ser equipadores",
    "user": "Usuario",
    "equipper": "Equipper",
    "approve": "Aprobar",
    "reject": "Rechazar",
    "empty": "No hay solicitudes pendientes"
  }
}
```

### `public/i18n/en.json`

```json
{
  "equipperRequest": {
    "requestButton": "Request to be equipper",
    "pending": "Pending request",
    "cancel": "Cancel request",
    "success": "Request sent successfully",
    "cancelled": "Request cancelled",
    "alreadyRequested": "You have already sent a request for this equipper"
  },
  "adminEquipperRequests": {
    "title": "Equipper requests",
    "description": "Manage user requests to become equippers",
    "user": "User",
    "equipper": "Equipper",
    "approve": "Approve",
    "reject": "Reject",
    "empty": "No pending requests"
  }
}
```

### Archivos

| Archivo               | Accion    |
| --------------------- | --------- |
| `public/i18n/es.json` | Modificar |
| `public/i18n/en.json` | Modificar |

---

## Fase 6 — Verificacion

### Checks obligatorios

```bash
npm run build            # Compilar sin errores
npm run lint             # ESLint pasa
npm run check:imports    # Orden de imports correcto
npm run format           # Prettier
npm test                 # Tests pasan
```

### Verificacion manual

1. **Equipper sin dueño + usuario logueado** → boton "Solicitar ser equipador" visible
2. **Equipper con dueño** → boton NO visible
3. **Usuario no logueado** → boton NO visible
4. **Clic en "Solicitar"** → toast de exito → boton cambia a "Solicitud pendiente"
5. **Clic en "Cancelar solicitud"** → toast → boton vuelve a "Solicitar"
6. **Admin en /admin/equipper-requests** → ve la solicitud pendiente
7. **Aprobar** → `equippers.user_id` se asigna, solicitud eliminada
8. **Rechazar** → solicitud eliminada, equipper intacto
9. **Intentar enviar solicitud duplicada** → toast "Ya has enviado una solicitud"

---

## Archivos resumen

| Archivo                                                           | Accion    | Fase |
| ----------------------------------------------------------------- | --------- | ---- |
| `supabase/migrations/YYYYMMDDHHMMSS_create_equipper_requests.sql` | Crear     | 1    |
| `src/models/supabase-generated.ts`                                | Regenerar | 1    |
| `src/models/equipper.model.ts`                                    | Modificar | 2    |
| `src/services/equipper-requests.service.ts`                       | Crear     | 2    |
| `src/pages/area/equipper.ts`                                      | Modificar | 3    |
| `src/pages/admin/equipper-requests.ts`                            | Crear     | 4    |
| `src/app/app.routes.ts`                                           | Modificar | 4    |
| `src/pages/admin/admin.ts`                                        | Modificar | 4    |
| `public/i18n/es.json`                                             | Modificar | 5    |
| `public/i18n/en.json`                                             | Modificar | 5    |
