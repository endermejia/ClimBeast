# Plan Arquitectónico: Sistema de Pagos de Áreas, Donaciones y Catálogo de Material

**Proyecto:** ClimBeast (Angular 22 Zoneless + Supabase + Stripe)  
**Versión del Plan:** 2.0 (Refinado con arquitectura integral, deducción de comisiones Stripe y eliminación de Area Packs)

---

## 1. Resumen Ejecutivo y Modelo de Negocio

El modelo anterior dependía de **Stripe Connect Custom/Express** por área, lo que generaba problemas de gobernanza con múltiples administradores y bloqueaba la monetización si el equipador no completaba el onboarding bancario.

### Nuevo Modelo Unificado:

1. **Cuenta Centralizada:** Todos los cobros (compras de topos, donaciones y merchandising) se procesan directamente en la cuenta Stripe principal de la plataforma.
2. **Bote Transparente del Área (Net Revenue):**
   - Cada compra de acceso a un área y cada donación incrementa el bote del área.
   - **Deducción de comisiones de Stripe:** Se descuenta la comisión exacta de Stripe (`stripe_fee`) calculada en el webhook mediante `balance_transaction`, garantizando que solo el importe neto (`net_amount`) se compute en el balance para evitar balances negativos en la plataforma.
3. **Extracción en Material de Equipamiento:** Los administradores del área no retiran dinero en efectivo; en su lugar, canjean el balance disponible por material de equipamiento (parabolts, chapas, químicos, reuniones, etc.) del catálogo oficial de la plataforma, previa aprobación de un administrador global.
4. **Transparencia Comunitaria:** Panel público en la ficha del área que muestra métricas acumuladas y un historial de donaciones y material extraído (anonimizando compradores de topos por privacidad).
5. **Eliminación Total de `area_packs`:** Se elimina por completo el concepto de packs de áreas en base de datos, servicios, carrito y vistas, simplificando el catálogo a **Merchandising físico** y **Áreas individuales digitales**.

---

## 2. Matriz de Cambios de Dominio

| Dominio                    | Antes                                                         | Ahora (v2.0)                                                        |
| :------------------------- | :------------------------------------------------------------ | :------------------------------------------------------------------ |
| **Cuenta Stripe**          | Cuentas Connect por área (`stripe_account_id`)                | Cuenta principal de la plataforma                                   |
| **Comisiones Stripe**      | Absorción no calculada                                        | Deducción exacta (`gross - stripe_fee = net`) por transacción       |
| **Compra de Topos**        | Flujo Connect directo vía `stripe-checkout`                   | 1-Click Checkout directo vía `create-checkout-session`              |
| **Donaciones**             | No existían                                                   | Donaciones 1-Click con opción anónima vía `create-checkout-session` |
| **Packs de Zonas**         | Tablas `area_packs`, `area_pack_items`, `area_pack_purchases` | **Eliminados por completo** del sistema                             |
| **Carrito Tienda**         | Mezcla de Merchandising + Packs + Áreas                       | Exclusivo para Merchandising físico con envío                       |
| **Retirada de Fondos**     | Transferencias Stripe automáticas/manuales                    | Solicitudes de material físico aprobadas por Admin Global           |
| **Catálogo Material**      | No existía                                                    | Catálogo configurable (precios, stock/unidad, imágenes)             |
| **Concurrencia / Balance** | Cálculo en frontend                                           | Validación atómica y bloqueo de saldo en PostgreSQL RPC             |

---

## 3. Fase 1 — Base de Datos y Supabase (SQL & RLS)

### 3.1 Migración DDL y Limpieza

```sql
-- 1. Eliminar soporte legado de Stripe Connect en 'areas'
ALTER TABLE areas DROP COLUMN IF EXISTS stripe_account_id;

-- 2. Eliminar sistema de Area Packs
DROP TABLE IF EXISTS area_pack_purchases CASCADE;
DROP TABLE IF EXISTS area_pack_items CASCADE;
DROP TABLE IF EXISTS area_packs CASCADE;

-- 3. Refactorizar 'area_purchases' para registrar importes brutos, comisiones y netos
ALTER TABLE area_purchases
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS stripe_fee   NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS net_amount   NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- Migrar registros históricos
UPDATE area_purchases
SET gross_amount = amount,
    stripe_fee = 0.00,
    net_amount = amount
WHERE gross_amount = 0.00 AND amount > 0;

-- 4. Crear tabla de Donaciones a Áreas
CREATE TABLE area_donations (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  area_id           BIGINT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  gross_amount      NUMERIC(10,2) NOT NULL CHECK (gross_amount > 0),
  stripe_fee        NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (stripe_fee >= 0),
  net_amount        NUMERIC(10,2) NOT NULL CHECK (net_amount > 0),
  anonymous         BOOLEAN NOT NULL DEFAULT false,
  donor_message     TEXT,
  stripe_session_id TEXT UNIQUE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Crear Catálogo de Material Oficial
CREATE TABLE material_catalog (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url   TEXT,
  unit        TEXT NOT NULL DEFAULT 'ud', -- 'ud', 'pack', 'm', 'caja'
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Crear Solicitudes de Material de Áreas
CREATE TYPE material_request_status AS ENUM ('pending', 'approved', 'rejected', 'disposed', 'cancelled');

CREATE TABLE area_material_requests (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  area_id          BIGINT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES user_profiles(id),
  status           material_request_status NOT NULL DEFAULT 'pending',
  total_amount     NUMERIC(10,2) NOT NULL CHECK (total_amount > 0),
  notes            TEXT,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by      UUID REFERENCES user_profiles(id),
  reviewed_at      TIMESTAMPTZ
);

-- 7. Crear Ítems de Solicitudes de Material
CREATE TABLE area_material_request_items (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id  BIGINT NOT NULL REFERENCES area_material_requests(id) ON DELETE CASCADE,
  material_id BIGINT NOT NULL REFERENCES material_catalog(id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.2 Políticas de Seguridad (RLS)

Siguiendo el estándar del proyecto (`is_user_admin(auth.uid())` y tabla `area_admins`):

```sql
-- RLS: material_catalog
ALTER TABLE material_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_active_material" ON material_catalog
  FOR SELECT TO authenticated
  USING (active = true OR is_user_admin(auth.uid()));

CREATE POLICY "admin_manage_material" ON material_catalog
  FOR ALL TO authenticated
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

-- RLS: area_donations
ALTER TABLE area_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_donations" ON area_donations
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "service_role_insert_donations" ON area_donations
  FOR INSERT TO authenticated
  WITH CHECK (is_user_admin(auth.uid()) OR auth.uid() = user_id OR user_id IS NULL);

-- RLS: area_material_requests
ALTER TABLE area_material_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_material_requests" ON area_material_requests
  FOR SELECT TO authenticated
  USING (
    is_user_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM area_admins
      WHERE area_admins.area_id = area_material_requests.area_id
        AND area_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "area_admin_insert_material_requests" ON area_material_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM area_admins
      WHERE area_admins.area_id = area_material_requests.area_id
        AND area_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_update_material_requests" ON area_material_requests
  FOR UPDATE TO authenticated
  USING (
    is_user_admin(auth.uid()) OR
    (
      -- Area admin solo puede cancelar si está pendiente
      status = 'pending' AND
      EXISTS (
        SELECT 1 FROM area_admins
        WHERE area_admins.area_id = area_material_requests.area_id
          AND area_admins.user_id = auth.uid()
      )
    )
  );

-- RLS: area_material_request_items
ALTER TABLE area_material_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_request_items" ON area_material_request_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM area_material_requests amr
      WHERE amr.id = area_material_request_items.request_id
        AND (
          is_user_admin(auth.uid()) OR
          EXISTS (
            SELECT 1 FROM area_admins
            WHERE area_admins.area_id = amr.area_id
              AND area_admins.user_id = auth.uid()
          )
        )
    )
  );
```

### 3.3 Funciones SQL / RPC Atómicas (Gobernanza y Concurrencia)

```sql
-- 1. Calcular balance actual de un área
CREATE OR REPLACE FUNCTION get_area_balance(p_area_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_purchases_net NUMERIC(10,2) := 0;
  v_donations_net NUMERIC(10,2) := 0;
  v_withdrawn     NUMERIC(10,2) := 0;
  v_reserved      NUMERIC(10,2) := 0;
  v_available     NUMERIC(10,2) := 0;
BEGIN
  -- Total compras (neto)
  SELECT COALESCE(SUM(net_amount), 0) INTO v_purchases_net
  FROM area_purchases WHERE area_id = p_area_id;

  -- Total donaciones (neto)
  SELECT COALESCE(SUM(net_amount), 0) INTO v_donations_net
  FROM area_donations WHERE area_id = p_area_id;

  -- Total retirado consolidado (approved o disposed)
  SELECT COALESCE(SUM(total_amount), 0) INTO v_withdrawn
  FROM area_material_requests
  WHERE area_id = p_area_id AND status IN ('approved', 'disposed');

  -- Total reservado en solicitudes pendientes
  SELECT COALESCE(SUM(total_amount), 0) INTO v_reserved
  FROM area_material_requests
  WHERE area_id = p_area_id AND status = 'pending';

  v_available := (v_purchases_net + v_donations_net) - (v_withdrawn + v_reserved);

  RETURN jsonb_build_object(
    'totalPurchasesNet', v_purchases_net,
    'totalDonationsNet', v_donations_net,
    'totalWithdrawn',    v_withdrawn,
    'totalReserved',     v_reserved,
    'availableBalance',  GREATEST(v_available, 0.00)
  );
END;
$$;

-- 2. Crear solicitud de material atómica con validación de saldo y rol
CREATE OR REPLACE FUNCTION create_area_material_request(
  p_area_id BIGINT,
  p_items   JSONB, -- Array de [{ material_id, quantity }]
  p_notes   TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_is_area_admin BOOLEAN;
  v_balance       JSONB;
  v_available     NUMERIC(10,2);
  v_total_calc    NUMERIC(10,2) := 0;
  v_req_id        BIGINT;
  v_item          RECORD;
  v_mat_price     NUMERIC(10,2);
  v_mat_active    BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Validar permisos de administrador de área o admin global
  SELECT EXISTS (
    SELECT 1 FROM area_admins WHERE area_id = p_area_id AND user_id = v_user_id
  ) OR is_user_admin(v_user_id) INTO v_is_area_admin;

  IF NOT v_is_area_admin THEN
    RAISE EXCEPTION 'User is not an admin of this area';
  END IF;

  -- Obtener balance disponible actual
  v_balance := get_area_balance(p_area_id);
  v_available := (v_balance->>'availableBalance')::NUMERIC;

  -- Crear la solicitud inicial
  INSERT INTO area_material_requests (area_id, user_id, status, total_amount, notes)
  VALUES (p_area_id, v_user_id, 'pending', 0, p_notes)
  RETURNING id INTO v_req_id;

  -- Iterar ítems, validar catálogo e insertar
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(material_id BIGINT, quantity INT)
  LOOP
    SELECT price, active INTO v_mat_price, v_mat_active
    FROM material_catalog WHERE id = v_item.material_id;

    IF v_mat_price IS NULL OR NOT v_mat_active THEN
      RAISE EXCEPTION 'Invalid or inactive material item: %', v_item.material_id;
    END IF;

    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Quantity must be positive';
    END IF;

    INSERT INTO area_material_request_items (request_id, material_id, quantity, unit_price)
    VALUES (v_req_id, v_item.material_id, v_item.quantity, v_mat_price);

    v_total_calc := v_total_calc + (v_mat_price * v_item.quantity);
  END LOOP;

  IF v_total_calc > v_available THEN
    RAISE EXCEPTION 'Request total (%) exceeds available balance (%)', v_total_calc, v_available;
  END IF;

  UPDATE area_material_requests
  SET total_amount = v_total_calc
  WHERE id = v_req_id;

  RETURN v_req_id;
END;
$$;

-- 3. Timeline público de transparencia para el área (sin exponer datos privados de compradores)
CREATE OR REPLACE FUNCTION get_area_public_timeline(p_area_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'summary', get_area_balance(p_area_id),
    'donations', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'amount', d.net_amount,
          'anonymous', d.anonymous,
          'userName', CASE WHEN d.anonymous THEN 'Anónimo' ELSE p.full_name END,
          'userAvatar', CASE WHEN d.anonymous THEN NULL ELSE p.avatar_url END,
          'message', d.donor_message,
          'createdAt', d.created_at
        ) ORDER BY d.created_at DESC
      ), '[]'::jsonb)
      FROM area_donations d
      LEFT JOIN user_profiles p ON p.id = d.user_id
      WHERE d.area_id = p_area_id
    ),
    'withdrawals', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'totalAmount', r.total_amount,
          'status', r.status,
          'createdAt', r.created_at,
          'reviewedAt', r.reviewed_at,
          'items', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'materialName', m.name,
                'quantity', ri.quantity,
                'unit', m.unit,
                'unitPrice', ri.unit_price,
                'imageUrl', m.image_url
              )
            )
            FROM area_material_request_items ri
            JOIN material_catalog m ON m.id = ri.material_id
            WHERE ri.request_id = r.id
          )
        ) ORDER BY r.created_at DESC
      ), '[]'::jsonb)
      FROM area_material_requests r
      WHERE r.area_id = p_area_id AND r.status IN ('approved', 'disposed')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
```

---

## 4. Fase 2 — Edge Functions de Stripe

### 4.1 Unificación de `create-checkout-session`

Modificar `supabase/functions/create-checkout-session/index.ts`:

1. **Eliminar soporte para `area_pack`**.
2. **Soportar compras 1-Click de Área:**
   - Ítem `{ type: 'area', id: areaId }`.
   - Consulta el precio de la tabla `areas`.
   - Genera `line_items` y `metadata: { item_type: 'area', area_id: areaId, user_id: user.id }`.
3. **Soportar Donaciones 1-Click:**
   - Ítem `{ type: 'area_donation', areaId, amount, anonymous, message }`.
   - Valida `amount >= 1.00`.
   - Genera `line_items` y `metadata: { item_type: 'area_donation', area_id: areaId, user_id: user.id, anonymous: anonymous ? 'true' : 'false', message: message || '' }`.
4. **Hacer `shipping_info` opcional:** Requerido únicamente cuando existen ítems de tipo `merchandise` físico en la solicitud.
5. **Configurar URLs de retorno claras:**
   - Éxito área: `/area/{slug}?purchase=success`
   - Éxito donación: `/area/{slug}?donation=success`
   - Éxito tienda: `/order-success?session_id={CHECKOUT_SESSION_ID}`

### 4.2 Actualización de `stripe-webhook`

Modificar `supabase/functions/stripe-webhook/index.ts`:

1. **Eliminar Case 2** (legacy Connect transfers).
2. **Cálculo exacto de comisiones Stripe:**
   ```typescript
   // Obtener desglose exacto de comisiones
   let stripeFee = 0;
   let netAmount = (session.amount_total || 0) / 100;

   if (session.payment_intent) {
     const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string, {
       expand: ["latest_charge.balance_transaction"],
     });
     const charge = pi.latest_charge as Stripe.Charge;
     const bt = charge?.balance_transaction as Stripe.BalanceTransaction;
     if (bt && typeof bt.fee === "number") {
       stripeFee = bt.fee / 100;
       netAmount = (bt.net || session.amount_total! - bt.fee) / 100;
     }
   }
   ```
3. **Registro de Donaciones (`area_donations`):**
   - Si `session.metadata?.item_type === 'area_donation'`:
     - Inserta en `area_donations` (`area_id`, `user_id`, `gross_amount`, `stripe_fee`, `net_amount`, `anonymous`, `donor_message`, `stripe_session_id`).
4. **Registro de Compra de Área (`area_purchases`):**
   - Si `session.metadata?.item_type === 'area'` o viene en `orderItems`:
     - Inserta en `area_purchases` (`area_id`, `user_id`, `gross_amount`, `stripe_fee`, `net_amount`, `stripe_session_id`).
5. **Registro de Pedido de Merchandising (`orders` / `order_items`):**
   - Solo se inserta si la sesión contiene productos físicos.

### 4.3 Eliminación de Edge Functions Obsoletas

- Eliminar completamente la carpeta `supabase/functions/stripe-onboarding/`
- Eliminar completamente la carpeta `supabase/functions/stripe-checkout/`

---

## 5. Fase 3 — Modelos y Tipos TypeScript

### 5.1 Actualizar `src/models/area.model.ts`

- Eliminar `stripe_account_id` de `AreaDTO`, `CragDTO`, etc.
- Agregar interfaces:
  - `MaterialCatalogItem`
  - `MaterialRequestStatus = 'pending' | 'approved' | 'rejected' | 'disposed' | 'cancelled'`
  - `AreaMaterialRequest`
  - `AreaMaterialRequestItem`
  - `AreaMaterialRequestWithDetails`
  - `AreaDonation`
  - `AreaBalanceSummary`
  - `AreaPublicTimeline`

### 5.2 Limpieza de `src/models/merchandise.model.ts`

- Eliminar `AreaPack`, `AreaPackItem`, `AreaPackPurchase`.
- Eliminar `'area_pack'` del tipo de unión de productos.

---

## 6. Fase 4 — Servicios de Negocio (Angular 22 Reactivo)

### 6.1 `MaterialCatalogService` (`src/services/material-catalog.service.ts`)

- `readonly catalogResource = resource(...)` para lectura reactiva.
- Métodos CRUD para administradores globales:
  - `createMaterialItem(item)`
  - `updateMaterialItem(id, patch)`
  - `toggleActive(id, active)`
  - `deleteMaterialItem(id)`

### 6.2 `AreaRevenueService` (`src/services/area-revenue.service.ts`)

- `getAreaBalance(areaId: number): Promise<AreaBalanceSummary>` (vía RPC).
- `getAreaPublicTimeline(areaId: number): Promise<AreaPublicTimeline>` (vía RPC).
- Historial administrativo para administradores del área.

### 6.3 `AreaMaterialRequestsService` (`src/services/area-material-requests.service.ts`)

- `readonly pendingRequestsCount = signal(0)` (para badge en panel de admin global).
- `createRequest(areaId, items, notes)` -> invoca RPC `create_area_material_request`.
- `cancelRequest(requestId)` -> admin del área cancela solicitud en estado pendiente.
- `approveRequest(requestId)` -> admin global aprueba.
- `rejectRequest(requestId, reason)` -> admin global rechaza con motivo.
- `markDisposed(requestId)` -> admin global marca como material entregado/enviado.
- `getRequestsByArea(areaId)`
- `getAllPendingRequests()`

### 6.4 `AreaDonationsService` (`src/services/area-donations.service.ts`)

- `donateToArea(areaId, amount, anonymous, message)`:
  - Invoca `create-checkout-session` con `{ items: [{ type: 'area_donation', ... }] }`.
  - Redirige al checkout de Stripe.

### 6.5 Refactorización de Servicios Existentes

- **`AreasService` (`src/services/areas.service.ts`):**
  - Eliminar método `connectStripe()`.
  - Eliminar referencias a `stripe_account_id`.
- **`CartService` (`src/services/cart.service.ts`):**
  - Eliminar todo manejo de `area_pack`.
  - El carrito queda exclusivo para `merchandise`.
- **`MerchandiseService` (`src/services/merchandise.service.ts`):**
  - Eliminar consultas y mutaciones de `area_packs` y `area_pack_items`.

---

## 7. Fase 5 — Componentes de Usuario y UI (Taiga UI 5 + Tailwind 4)

### 7.1 Paywall (`src/components/paywall/paywall.ts`)

- Actualizar `contributeNow()`: ya no invoca la función eliminada `stripe-checkout`, sino `create-checkout-session` con `{ items: [{ type: 'area', id: areaId() }] }`.
- Añadir botón secundario con diseño accesible: "Donar al equipamiento del área".

### 7.2 Diálogo de Donación (`src/components/dialogs/area-donation-dialog.ts`)

- Diálogo interactivo con Taiga UI (`TuiDialogService`).
- Selector de importe predefinido (5€, 10€, 20€, 50€) + input personalizado.
- Checkbox "Donación anónima".
- Campo opcional "Mensaje para los equipadores".
- Indicador de comisión estimada transparente ("El 100% del importe neto irá al bote del área").

### 7.3 Panel de Transparencia y Bote (`src/components/area/area-revenue-panel.ts`)

- Componente `OnPush` para la página del área (`src/pages/area/area.ts`):
  - **Métricas:** Bote disponible, Total aportado por la comunidad, Material instalado.
  - **Timeline:** Tarjetas con donaciones recientes y material entregado/solicitado.
  - **Acciones:**
    - Botón "Donar" (para cualquier escalador).
    - Botón "Solicitar material" (visible únicamente para equipadores / `area_admins` si hay saldo disponible).
    - Botón "Ver mis solicitudes" (para equipadores).

### 7.4 Diálogo de Solicitud de Material (`src/components/dialogs/material-request-dialog.ts`)

- Selector de ítems del catálogo activo (`material_catalog`).
- Controles de cantidad con cálculo de subtotal en tiempo real.
- Barra de progreso que indica el porcentaje de saldo disponible consumido.
- Validación reactiva: deshabilita el envío si `total > availableBalance`.

### 7.5 Administración Global: Catálogo y Solicitudes

1. **`/admin/material-catalog` (`src/pages/admin/material-catalog.ts`):**
   - Tabla administrativa para gestionar precios, fotos y unidades del material oficial.
2. **`/admin/material-requests` (`src/pages/admin/material-requests.ts`):**
   - Lista de solicitudes pendientes de todas las escuelas de escalada.
   - Acciones: Aprobar, Rechazar (con modal para motivo), Marcar como entregado.
3. **`AdminComponent` (`src/pages/admin/admin.ts`):**
   - Enlaces en el menú lateral con badge reactivo para solicitudes pendientes.

### 7.6 Limpieza de Formularios

- **`AreaFormComponent` (`src/components/forms/area-form.ts`):**
  - Eliminar por completo el botón de "Conectar con Stripe", modal de cuentas Connect y mapeos de `stripe_account_id`.
  - Mantener campos de configuración de precio de topos.
- **`AreaRedirectComponent` (`src/pages/area/area-redirect.ts`):**
  - Eliminar handlers de retorno de Stripe Connect onboarding.

---

## 8. Fase 6 — Depuración Integral de Código Muerto

### 8.1 Archivos a Eliminar Físicamente

1. `supabase/functions/stripe-onboarding/` (directorio completo)
2. `supabase/functions/stripe-checkout/` (directorio completo)
3. `src/supabase-context/stripe-onboarding.ts`
4. `src/supabase-context/stripe-checkout.ts`
5. `src/components/dialogs/merchandise-pack-dialog.ts` (si era exclusivo de area packs)

### 8.2 Archivos a Modificar / Limpiar

1. `src/components/forms/area-form.ts`
2. `src/components/paywall/paywall.ts`
3. `src/components/cart-overlay/cart-overlay.ts` (eliminar branches de `area_pack`)
4. `src/components/dialogs/order-details-dialog.ts` (eliminar branches de `area_pack`)
5. `src/components/dialogs/purchase-history-dialog.ts` (eliminar consulta de `area_pack_purchases`)
6. `src/pages/merchandising/merchandising.ts` (eliminar filtro y pestaña de packs)
7. `src/services/cart.service.ts`
8. `src/services/merchandise.service.ts`
9. `src/services/areas.service.ts`
10. `src/services/outdoor-data.service.ts`
11. `src/utils/crag-mappers.ts`
12. `src/models/area.model.ts`
13. `src/models/crag.model.ts`
14. `src/models/merchandise.model.ts`
15. `src/app/app.routes.ts`

---

## 9. Fase 7 — Internacionalización (i18n)

Sincronizar claves en todos los ficheros (`es.json`, `en.json`, `de.json`, `fr.json`, `it.json`, `eu.json`, `va.json`):

- `areaRevenue.*`: Métricas, Bote disponible, Donaciones, Material instalado.
- `materialCatalog.*`: CRUD de material, unidades, precio, stock.
- `materialRequest.*`: Formulario de solicitud, validaciones de saldo, confirmaciones.
- `materialRequests.*`: Estados (`pending`, `approved`, `rejected`, `disposed`, `cancelled`), acciones de aprobación y entrega.
- `donations.*`: Flujo de donación, anónimo, mensajes.

---

## 10. Plan de Verificación y Calidad

### 10.1 Verificaciones Automatizadas

```bash
bun run build           # Compilación estricta SSR y prerender
bun run lint            # ESLint (sin advertencias ni 'any')
bun run check:imports   # Orden de imports estricto según AGENTS.md
bun run check:i18n      # Paridad de traducciones
bun run test            # Suite de pruebas unitarias Vitest
bun run format          # Formateo Prettier
```

### 10.2 Pruebas de Flujos E2E / Manuales

1. **Flujo de Compra de Área 1-Click:**
   - Un usuario no propietario accede a un área de pago -> Pulsa "Comprar croquis" en Paywall -> Redirección directa a Stripe Checkout -> Pago completado -> Webhook procesa comisiones Stripe y añade `gross`, `fee`, `net` a `area_purchases` -> Usuario redirigido con acceso inmediato a los topos.
2. **Flujo de Donación:**
   - Usuario pulsa "Donar" en el panel del área -> Selecciona 15€ y marca donación anónima -> Pago Stripe -> Webhook registra `area_donations` con `anonymous: true` -> El panel público actualiza el balance neto sin exponer el nombre del donante.
3. **Flujo de Solicitud de Material:**
   - Admin de área entra al panel con 200€ disponibles -> Selecciona 30 parabolts (150€) -> Envío de solicitud -> PostgreSQL RPC valida atómicamente el saldo y descuenta 150€ de `availableBalance` (estado `pending`).
   - Admin global accede a `/admin/material-requests` -> Aprueba la solicitud -> Estado pasa a `approved`.
   - Admin global entrega el material y marca `disposed`.
4. **Flujo de Rechazo / Cancelación:**
   - Si una solicitud de 100€ se rechaza o cancela, el RPC libera inmediatamente los 100€ reservados volviendo a incrementar el saldo disponible.
5. **Verificación de Eliminación de Connect y Packs:**
   - Comprobar que en el formulario de edición de área no existe ninguna referencia a Stripe Connect.
   - Comprobar que en la tienda de merchandising no hay rastro de packs de áreas.
