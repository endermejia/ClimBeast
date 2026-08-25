# Plan: Nuevo Sistema de Pagos de Areas

## Contexto y problema

El sistema actual usa **Stripe Connect** para enviar el dinero de las compras de topos directamente a la cuenta del admin del area. Esto crea un problema: si un area tiene varios admins, uno puede retirar los fondos unilateralmente y generar disputas.

**Nuevo modelo:** El dinero se queda en la cuenta principal de la plataforma. Los admins del area pueden solicitar **material de equipamiento** (parabolts, chapas, etc.) por el valor acumulado, sujeto a aprobacion de un admin global. Tambien se permiten **donaciones** directas a areas.

---

## Cambios en el modelo de negocio

| Concepto           | Antes                              | Ahora                                                      |
| ------------------ | ---------------------------------- | ---------------------------------------------------------- |
| Pago de topos      | Stripe Connect → cuenta del admin  | Stripe → cuenta principal de la plataforma                 |
| Retirada de fondos | Admin retira a su cuenta Stripe    | Admin solicita material, admin global aprueba              |
| Donaciones         | No existen                         | Usuarios donan a areas, dinero va a cuenta principal       |
| Revenue por area   | No visible                         | Publico: total acumulado, transacciones, material extraido |
| Material           | No existia                         | Catalogo configurable con precios e imagenes               |
| Cuentas Connect    | Obligatorias para areas con precio | Eliminadas completamente                                   |

---

## Fase 1 — Base de datos

### 1.1 Eliminar `stripe_account_id` de `areas`

```sql
-- Eliminar columna
ALTER TABLE areas DROP COLUMN stripe_account_id;
```

**Archivos afectados:**

- `src/models/supabase-generated.ts` — regenerar
- `src/models/area.model.ts` — eliminar campo de interfaces
- `src/models/crag.model.ts` — eliminar campo de interfaces
- `src/utils/crag-mappers.ts` — eliminar mapeo
- `src/services/areas.service.ts` — eliminar `connectStripe()` y referencias
- `src/services/outdoor-data.service.ts` — eliminar select
- `src/components/forms/area-form.ts` — eliminar toda la seccion de Connect
- `src/components/paywall/paywall.ts` — sin cambios (no usaba stripe_account_id directamente)

**Edge Functions a eliminar:**

- `supabase/functions/stripe-onboarding/` — completa
- `supabase/functions/stripe-checkout/` — completa

**Edge Function a modificar:**

- `supabase/functions/stripe-webhook/index.ts` — eliminar el Case 2 (legacy area purchase via metadata area_id), mantener solo el Case 1 (shop orders)

### 1.2 Tabla `material_catalog`

```sql
CREATE TABLE material_catalog (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
, name        TEXT NOT NULL
, description TEXT
, price       NUMERIC(10,2) NOT NULL
, image_url   TEXT
, unit        TEXT NOT NULL DEFAULT 'ud'   -- ud, m, kg, pack...
, active      BOOLEAN NOT NULL DEFAULT true
, created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
, updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE material_catalog ENABLE ROW LEVEL POLICY;

-- Lectura publica (cualquier usuario autenticado puede ver)
CREATE POLICY select_material ON material_catalog
  FOR SELECT TO authenticated
  USING (true);

-- Solo admins globales pueden CRUD
CREATE POLICY admin_manage_material ON material_catalog
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### 1.3 Tabla `area_material_requests`

```sql
CREATE TABLE area_material_requests (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
, area_id         BIGINT NOT NULL REFERENCES areas(id)
, user_id         UUID NOT NULL REFERENCES user_profiles(id)
, status          TEXT NOT NULL DEFAULT 'pending'  -- pending, approved, rejected, disposed
, total_amount    NUMERIC(10,2) NOT NULL
, notes           TEXT
, created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
, updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
, reviewed_by     UUID REFERENCES user_profiles(id)
, reviewed_at     TIMESTAMPTZ
);

ALTER TABLE area_material_requests ENABLE ROW LEVEL POLICY;

-- Admins del area pueden INSERT y SELECT sus propias solicitudes
CREATE POLICY area_admin_insert_request ON area_material_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM area_admins
      WHERE area_admins.area_id = area_material_requests.area_id
        AND area_admins.user_id = auth.uid()
    )
  );

CREATE POLICY area_admin_select_requests ON area_material_requests
  FOR SELECT TO authenticated
  USING (
    -- Admins del area ven sus solicitudes
    EXISTS (
      SELECT 1 FROM area_admins
      WHERE area_admins.area_id = area_material_requests.area_id
        AND area_admins.user_id = auth.uid()
    )
    OR
    -- Admins globales ven todas
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins globales pueden UPDATE (aprobar/rechazar)
CREATE POLICY admin_review_request ON area_material_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### 1.4 Tabla `area_material_request_items`

```sql
CREATE TABLE area_material_request_items (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
, request_id  BIGINT NOT NULL REFERENCES area_material_requests(id) ON DELETE CASCADE
, material_id BIGINT NOT NULL REFERENCES material_catalog(id)
, quantity    INTEGER NOT NULL CHECK (quantity > 0)
, unit_price  NUMERIC(10,2) NOT NULL
, created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE area_material_request_items ENABLE ROW LEVEL POLICY

-- Hereda permisos del request padre (mismo patron)
CREATE POLICY area_admin_manage_items ON area_material_request_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM area_material_requests amr
      WHERE amr.id = area_material_request_items.request_id
        AND (
          EXISTS (
            SELECT 1 FROM area_admins
            WHERE area_admins.area_id = amr.area_id
              AND area_admins.user_id = auth.uid()
          )
          OR
          EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        )
    )
  );
```

### 1.5 Tabla `area_donations`

```sql
CREATE TABLE area_donations (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
, area_id             BIGINT NOT NULL REFERENCES areas(id)
, user_id             UUID REFERENCES user_profiles(id)  -- nullable para donaciones anonimas
, amount              NUMERIC(10,2) NOT NULL CHECK (amount > 0)
, anonymous           BOOLEAN NOT NULL DEFAULT false
, stripe_session_id   TEXT
, created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE area_donations ENABLE ROW LEVEL POLICY;

-- Lectura publica (para mostrar en dashboard de area)
CREATE POLICY select_donations ON area_donations
  FOR SELECT TO authenticated
  USING (true);

-- Cualquier usuario autenticado puede INSERT su propia donacion
CREATE POLICY insert_own_donation ON area_donations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
```

### 1.6 Regenerar tipos

```bash
npx supabase gen types typescript --local > src/models/supabase-generated.ts
```

---

## Fase 2 — Modelos TypeScript

### 2.1 Nuevos tipos en `src/models/area.model.ts`

```typescript
// Material catalog
export interface MaterialCatalogItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  unit: string;
  active: boolean;
  created_at: string;
}

// Withdrawal request
export type MaterialRequestStatus = "pending" | "approved" | "rejected" | "disposed";

export interface AreaMaterialRequest {
  id: number;
  area_id: number;
  user_id: string;
  status: MaterialRequestStatus;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface AreaMaterialRequestItem {
  id: number;
  request_id: number;
  material_id: number;
  quantity: number;
  unit_price: number;
}

export interface AreaMaterialRequestWithDetails extends AreaMaterialRequest {
  items: (AreaMaterialRequestItem & { material: MaterialCatalogItem })[];
  user: { id: string; name: string | null; avatar: string | null };
  reviewer: { id: string; name: string | null } | null;
}

// Donation
export interface AreaDonation {
  id: number;
  area_id: number;
  user_id: string | null;
  amount: number;
  anonymous: boolean;
  stripe_session_id: string | null;
  created_at: string;
}

// Revenue summary (computed, not a table)
export interface AreaRevenue {
  totalPurchases: number; // SUM de area_purchases.amount
  totalDonations: number; // SUM de area_donations.amount
  totalWithdrawn: number; // SUM de area_material_requests.total_amount WHERE status IN ('approved','disposed')
  availableBalance: number; // totalPurchases + totalDonations - totalWithdrawn
}
```

---

## Fase 3 — Services

### 3.1 `src/services/material-catalog.service.ts` (nuevo)

```typescript
@Injectable({ providedIn: "root" })
export class MaterialCatalogService {
  // CRUD para admins globales
  getAll(): Promise<MaterialCatalogItem[]>;
  getById(id: number): Promise<MaterialCatalogItem | null>;
  create(item): Promise<boolean>;
  update(id, patch): Promise<boolean>;
  delete(id): Promise<boolean>;
}
```

### 3.2 `src/services/area-revenue.service.ts` (nuevo)

```typescript
@Injectable({ providedIn: "root" })
export class AreaRevenueService {
  // Calcular revenue de un area
  getAreaRevenue(areaId: number): Promise<AreaRevenue>;

  // Historial de transacciones (compras de acceso)
  getAreaPurchases(areaId: number): Promise<AreaPurchaseTransaction[]>;

  // Historial de donaciones
  getAreaDonations(areaId: number): Promise<AreaDonationTransaction[]>;

  // Historial de extracciones de material
  getAreaWithdrawals(areaId: number): Promise<AreaMaterialRequestWithDetails[]>;
}
```

### 3.3 `src/services/area-material-requests.service.ts` (nuevo)

Siguiendo el patron de `follow-requests.service.ts`:

```typescript
@Injectable({ providedIn: 'root' })
export class AreaMaterialRequestsService {
  readonly requestsChange = signal(0);

  // Admin del area: crear solicitud
  async createRequest(areaId, items, notes): Promise<boolean>
    -- 1. Verificar que el usuario es admin del area
    -- 2. Calcular total_amount
    -- 3. Verificar que total_amount <= availableBalance del area
    -- 4. INSERT INTO area_material_requests
    -- 5. INSERT INTO area_material_request_items (cada item)
    -- 6. Notificar a admins globales

  // Admin del area: cancelar solicitud (solo si pending)
  async cancelRequest(requestId): Promise<boolean>

  // Admin global: aprobar solicitud
  async approveRequest(requestId): Promise<boolean>
    -- UPDATE status = 'approved', reviewed_by, reviewed_at
    -- Notificar al admin del area

  // Admin global: rechazar solicitud
  async rejectRequest(requestId): Promise<boolean>
    -- UPDATE status = 'rejected', reviewed_by, reviewed_at
    -- Notificar al admin del area

  // Admin global: marcar como disposed (material entregado)
  async markDisposed(requestId): Promise<boolean>
    -- UPDATE status = 'disposed'
    -- Notificar al admin del area

  // Consultar solicitudes de un area
  async getRequestsByArea(areaId): Promise<AreaMaterialRequestWithDetails[]>

  // Consultar todas las solicitudes pendientes (admin global)
  async getAllPendingRequests(): Promise<AreaMaterialRequestWithDetails[]>
}
```

### 3.4 `src/services/area-donations.service.ts` (nuevo)

```typescript
@Injectable({ providedIn: 'root' })
export class AreaDonationsService {
  // Crear donacion (redirige a Stripe Checkout)
  async createDonation(areaId, amount, anonymous): Promise<string | null>
    -- Invocar Edge Function 'stripe-donation'
    -- Retornar URL de Checkout

  // Obtener donaciones de un area
  async getAreaDonations(areaId): Promise<AreaDonation[]>
}
```

### 3.5 Modificar `src/services/areas.service.ts`

Cambios:

- Eliminar `connectStripe()` completo
- Eliminar referencia a `stripe_account_id` en `getById()`, `update()`, `create()`
- Mantener `area_purchases` join (sigue siendo necesario para control de acceso)

### 3.6 Eliminar `src/components/forms/area-form.ts` seccion Connect

Cambios:

- Eliminar toda la seccion de Stripe Connect (boton connect, dialog de cuentas multiples, re-connect)
- Mantener la seccion de precio y visibilidad (paywalled mode sigue existiendo)
- Eliminar `stripe_account_id` del model y del payload de submit

---

## Fase 4 — Edge Functions

### 4.1 Eliminar

- `supabase/functions/stripe-onboarding/` — completa
- `supabase/functions/stripe-checkout/` — completa

### 4.2 Crear `supabase/functions/stripe-donation/index.ts`

```typescript
// Crea una sesion de Stripe Checkout para donar a un area
// Accepts: { area_id, amount, anonymous }
// Mode: payment, price_data con monto personalizado
// Success URL: /area/redirect?donation=true&area_id={area_id}
// Metadata: { area_id, user_id, donation: 'true' }
// NO usa Connect (dinero va a cuenta principal)
```

### 4.3 Modificar `supabase/functions/stripe-webhook/index.ts`

Cambios:

- Eliminar Case 2 (legacy area purchase via metadata area_id)
- En Case 1: para items de tipo `area`, registrar la compra en `area_purchases` (igual que ahora)
- Agregar handling para donaciones: si metadata tiene `donation: 'true'`, INSERT en `area_donations`
- Eliminar toda referencia a `stripe_account_id` o Connect transfers

---

## Fase 5 — UI Components

### 5.1 Paywall — agregar boton donar

**Archivo:** `src/components/paywall/paywall.ts` (modificar)

Agregar un boton "Donar" debajo del boton de compra:

- Abre un dialog con input de monto (min 1, max 100, step 1)
- Checkbox "Donacion anonima"
- Confirma → redirige a Stripe Checkout via `stripe-donation`

### 5.2 Dashboard de revenue por area

**Archivo:** `src/components/area/area-revenue-panel.ts` (nuevo)

Panel publico que se muestra en la pagina del area con:

- Total recaudado (compras de acceso)
- Total donado
- Total extraido en material
- Balance disponible
- Boton "Donar"
- Lista de transacciones (compras + donaciones + extracciones)
  - Compras: fecha, usuario (anonimo si aplica), monto
  - Donaciones: fecha, usuario (anonimo si aplica), monto
  - Extracciones: fecha, admin, material extraido, monto

### 5.3 Catalogo de material (admin)

**Archivo:** `src/pages/admin/material-catalog.ts` (nuevo)

CRUD de material para admins globales:

- Tabla con imagen, nombre, descripcion, precio, unidad, activo
- Boton agregar material → dialog con formulario
- Editar / eliminar
- Toggle activo/inactivo

### 5.4 Solicitudes de material (admin del area)

**Archivo:** `src/components/dialogs/material-request-dialog.ts` (nuevo)

Dialog para que admin del area solicite material:

- Lista del catalogo de material disponible (solo activos)
- Cada item: imagen, nombre, precio/unidad, input de cantidad, subtotal
- Total de la solicitud
- Nota/justificacion (opcional)
- Boton "Enviar solicitud"
- Validacion: total <= balance disponible del area

### 5.5 Historial de solicitudes (admin del area + admin global)

**Archivo:** `src/components/dialogs/material-requests-history-dialog.ts` (nuevo)

- Lista de solicitudes del area con estado, fecha, total, items
- Filtro por estado
- Admin global: botones aprobar/rechazar/marcar disposed en solicitudes pendientes
- Admin del area: boton cancelar en solicitudes pendientes

### 5.6 Pagina admin: solicitudes pendientes

**Archivo:** `src/pages/admin/material-requests.ts` (nuevo)

Pagina `/admin/material-requests`:

- Tabla de todas las solicitudes pendientes de todas las areas
- Columnas: area, admin solicitante, fecha, total, acciones (aprobar/rechazar)
- Badge de contador en el panel admin
- Patron identico a `area-requests.ts`

### 5.7 Modificar `src/pages/admin/admin.ts`

- Agregar link a `/admin/material-requests` con badge de contador
- Agregar link a `/admin/material-catalog`

### 5.8 Modificar `src/pages/area/area.ts` o `crag.ts`

- Mostrar panel de revenue si el area tiene precio (paywalled)
- Boton de donar

---

## Fase 6 — Eliminar codigo muerto

### 6.1 Archivos a eliminar completamente

| Archivo                                         | Razon                      |
| ----------------------------------------------- | -------------------------- |
| `supabase/functions/stripe-onboarding/index.ts` | Stripe Connect eliminado   |
| `supabase/functions/stripe-checkout/index.ts`   | Checkout directo eliminado |

### 6.2 Codigo a eliminar de archivos existentes

| Archivo                                | Que eliminar                                            |
| -------------------------------------- | ------------------------------------------------------- |
| `src/services/areas.service.ts`        | `connectStripe()` (lineas 711-744)                      |
| `src/components/forms/area-form.ts`    | Seccion Connect (boton, dialog, modelo, submit payload) |
| `src/pages/area/area-redirect.ts`      | Case de onboarding success/refresh (lineas 33-48)       |
| `src/models/area.model.ts`             | `stripe_account_id` de interfaces                       |
| `src/models/crag.model.ts`             | `stripe_account_id` de interfaces                       |
| `src/utils/crag-mappers.ts`            | Mapeo de `stripe_account_id`                            |
| `src/services/outdoor-data.service.ts` | Select de `stripe_account_id`                           |

---

## Fase 7 — Traducciones

### `public/i18n/es.json`

```json
{
  "areaRevenue": {
    "title": "Ingresos del area",
    "totalPurchases": "Compras de acceso",
    "totalDonations": "Donaciones",
    "totalWithdrawn": "Material extraido",
    "availableBalance": "Balance disponible",
    "donate": "Donar",
    "donateTitle": "Donar a esta area",
    "donateAmount": "Cantidad (EUR)",
    "donateAnonymous": "Donacion anonima",
    "donateConfirm": "Confirmar donacion",
    "transactions": "Transacciones",
    "purchases": "Compras",
    "donations": "Donaciones",
    "withdrawals": "Extracciones de material"
  },
  "materialCatalog": {
    "title": "Catalogo de material",
    "add": "Agregar material",
    "edit": "Editar material",
    "name": "Nombre",
    "description": "Descripcion",
    "price": "Precio por unidad",
    "unit": "Unidad",
    "image": "Imagen",
    "active": "Activo",
    "empty": "No hay material en el catalogo"
  },
  "materialRequest": {
    "title": "Solicitar material",
    "selectItems": "Selecciona el material",
    "quantity": "Cantidad",
    "subtotal": "Subtotal",
    "total": "Total de la solicitud",
    "notes": "Nota (opcional)",
    "availableBalance": "Balance disponible",
    "exceedsBalance": "Excede el balance disponible",
    "submit": "Enviar solicitud",
    "success": "Solicitud enviada",
    "cancel": "Cancelar solicitud",
    "cancelled": "Solicitud cancelada"
  },
  "materialRequests": {
    "title": "Solicitudes de material",
    "pending": "Pendiente",
    "approved": "Aprobada",
    "rejected": "Rechazada",
    "disposed": "Entregada",
    "approve": "Aprobar",
    "reject": "Rechazar",
    "markDisposed": "Marcar entregada",
    "empty": "No hay solicitudes pendientes",
    "by": "Solicitada por",
    "date": "Fecha",
    "material": "Material"
  }
}
```

### `public/i18n/en.json`

```json
{
  "areaRevenue": {
    "title": "Area revenue",
    "totalPurchases": "Access purchases",
    "totalDonations": "Donations",
    "totalWithdrawn": "Material withdrawn",
    "availableBalance": "Available balance",
    "donate": "Donate",
    "donateTitle": "Donate to this area",
    "donateAmount": "Amount (EUR)",
    "donateAnonymous": "Anonymous donation",
    "donateConfirm": "Confirm donation",
    "transactions": "Transactions",
    "purchases": "Purchases",
    "donations": "Donations",
    "withdrawals": "Material withdrawals"
  },
  "materialCatalog": {
    "title": "Material catalog",
    "add": "Add material",
    "edit": "Edit material",
    "name": "Name",
    "description": "Description",
    "price": "Price per unit",
    "unit": "Unit",
    "image": "Image",
    "active": "Active",
    "empty": "No material in catalog"
  },
  "materialRequest": {
    "title": "Request material",
    "selectItems": "Select material",
    "quantity": "Quantity",
    "subtotal": "Subtotal",
    "total": "Request total",
    "notes": "Note (optional)",
    "availableBalance": "Available balance",
    "exceedsBalance": "Exceeds available balance",
    "submit": "Submit request",
    "success": "Request submitted",
    "cancel": "Cancel request",
    "cancelled": "Request cancelled"
  },
  "materialRequests": {
    "title": "Material requests",
    "pending": "Pending",
    "approved": "Approved",
    "rejected": "Rejected",
    "disposed": "Delivered",
    "approve": "Approve",
    "reject": "Reject",
    "markDisposed": "Mark delivered",
    "empty": "No pending requests",
    "by": "Requested by",
    "date": "Date",
    "material": "Material"
  }
}
```

---

## Fase 8 — Verificacion

### Checks obligatorios

```bash
npm run build
npm run lint
npm run check:imports
npm run format
npm test
```

### Verificacion manual

**Flujo de compra de topo (sin Connect):**

1. Admin pone area con precio 5EUR (paywalled)
2. Usuario compra → redirige a Stripe → paga → webhook crea `area_purchases`
3. Dinero queda en cuenta principal de la plataforma
4. Usuario ve topos del area

**Flujo de donacion:**

1. Usuario en pagina del area clica "Donar"
2. Dialog: ingresa 10EUR, marca anonimo
3. Redirige a Stripe Checkout → paga → webhook crea `area_donations`
4. Vuelve al area, ve donacion en historial (sin nombre si es anonima)

**Flujo de solicitud de material:**

1. Admin del area ve balance: "Recaudado: 500EUR | Disponible: 500EUR"
2. Clica "Solicitar material"
3. Selecciona 50 parabolts Fixe a 5EUR = 250EUR
4. Envia solicitud → estado: pending
5. Admin global ve solicitud en `/admin/material-requests`
6. Aprueba → estado: approved, notificacion al admin del area
7. Admin global marca como disposed → estado: disposed
8. Balance del area: "Recaudado: 500EUR | Extraido: 250EUR | Disponible: 250EUR"

**Eliminacion de Connect:**

1. No hay boton de "Conectar con Stripe" en el formulario de area
2. No existen las paginas/funciones de onboarding
3. `stripe_account_id` no existe en la tabla `areas`

---

## Archivos resumen

### Eliminar

| Archivo                                                       | Fase |
| ------------------------------------------------------------- | ---- |
| `supabase/functions/stripe-onboarding/` (directorio completo) | 4.1  |
| `supabase/functions/stripe-checkout/` (directorio completo)   | 4.1  |

### Crear

| Archivo                                                                         | Fase |
| ------------------------------------------------------------------------------- | ---- |
| `supabase/migrations/YYYYMMDDHHMMSS_remove_stripe_connect_and_add_material.sql` | 1    |
| `supabase/functions/stripe-donation/index.ts`                                   | 4.2  |
| `src/services/material-catalog.service.ts`                                      | 3.1  |
| `src/services/area-revenue.service.ts`                                          | 3.2  |
| `src/services/area-material-requests.service.ts`                                | 3.3  |
| `src/services/area-donations.service.ts`                                        | 3.4  |
| `src/components/area/area-revenue-panel.ts`                                     | 5.2  |
| `src/pages/admin/material-catalog.ts`                                           | 5.3  |
| `src/components/dialogs/material-request-dialog.ts`                             | 5.4  |
| `src/components/dialogs/material-requests-history-dialog.ts`                    | 5.5  |
| `src/pages/admin/material-requests.ts`                                          | 5.6  |

### Modificar

| Archivo                                      | Fase                |
| -------------------------------------------- | ------------------- |
| `src/models/supabase-generated.ts`           | 1.6 (regenerar)     |
| `src/models/area.model.ts`                   | 2.1                 |
| `src/models/crag.model.ts`                   | 6.2                 |
| `src/utils/crag-mappers.ts`                  | 6.2                 |
| `src/services/areas.service.ts`              | 3.5                 |
| `src/services/outdoor-data.service.ts`       | 6.2                 |
| `src/components/forms/area-form.ts`          | 3.6                 |
| `src/components/paywall/paywall.ts`          | 5.1                 |
| `src/pages/area/area-redirect.ts`            | 6.2                 |
| `src/pages/area/area.ts`                     | 5.8                 |
| `src/pages/admin/admin.ts`                   | 5.7                 |
| `src/app/app.routes.ts`                      | 5.7 (agregar rutas) |
| `supabase/functions/stripe-webhook/index.ts` | 4.3                 |
| `public/i18n/es.json`                        | 7                   |
| `public/i18n/en.json`                        | 7                   |
