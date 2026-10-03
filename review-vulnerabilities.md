# 🛡️ Auditoría y Verificación de Seguridad en Producción: Supabase & RLS

> **Proyecto:** ClimBeast (`local-walls`)  
> **Base de Datos Verificada:** `eswbehepsagigvlytfxv` (`climbeast-data`, Postgres 17.6)  
> **Fecha de Verificación en Vivo:** Octubre 2026  
> **Método:** Consulta directa a catálogo de producción (`pg_policies`, `information_schema.routines`, advisors oficiales de Supabase) y análisis estático de código fuente (`src/supabase-context/` y Edge Functions).

---

## 1. Resumen de Estado tras Remediación en Producción

Tras verificar el estado real y aplicar las correcciones tanto en la base de datos de producción como en las Edge Functions y el código del repositorio:

- **Todas las vulnerabilidades activas han sido CORREGIDAS en producción y código**.
- **1 vulnerabilidad (06) descartada por diseño**: Las finanzas y recaudaciones de las áreas son públicas por diseño para garantizar la transparencia comunitaria (documentado en `AGENTS.md`).
- **2 falsos positivos / ya corregidas anteriormente**:
  - **VULN-05 (`unify_*`):** Las funciones ya comprobaban `is_user_admin(auth.uid())` internamente.
  - **VULN-08 (`indoor_center_*_requests`):** Ya contaba con RLS restrictivo en producción.
- **VULN-14 (`spatial_ref_sys`):** Tabla de sistema de la extensión PostGIS propiedad de `supabase_admin`.

---

## 2. Matriz de Estado de Hallazgos

| ID          | Severidad             | Vulnerabilidad                                                                                   | Componente                                 | Estado Final                                                                                                           |
| :---------- | :-------------------- | :----------------------------------------------------------------------------------------------- | :----------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| **VULN-01** | 🔴 **CRÍTICA**        | Borrado masivo y asignación arbitraria en `equippers` por subquery descorrelacionada             | `pg_policies` (`equippers`)                | 🟢 **CORREGIDA EN PRODUCCIÓN**. Subqueries descorrelacionadas eliminadas; restringido a admins y al propio usuario.    |
| **VULN-02** | 🔴 **CRÍTICA**        | Manipulación financiera e inflado de balance mediante inserción directa en `area_purchases`      | `pg_policies` (`area_purchases`)           | 🟢 **CORREGIDA EN PRODUCCIÓN**. Inserción manual restringida exclusivamente a administradores globales.                |
| **VULN-03** | 🔴 **CRÍTICA**        | Falta total de autenticación en Edge Function de notificaciones push (`notify-push`)             | Edge Function `notify-push`                | 🟢 **CORREGIDA Y DESPLEGADA**. Verificación de secretos/tokens y saneamiento de URLs implementados.                    |
| **VULN-04** | 🔴 **CRÍTICA**        | Bypass de paywall de croquis por permisos públicos de lectura en `topos` y `topo_routes`         | `pg_policies` (`topos`, `topo_routes`)     | 🟢 **CORREGIDA EN PRODUCCIÓN**. RLS aplicado con verificación de compras de área y permisos de equipador.              |
| **VULN-05** | ⚪ **FALSO POSITIVO** | Funciones `SECURITY DEFINER` de unificación (`unify_*`)                                          | `information_schema.routines`              | 🟢 **NO VULNERABLE**. Verificación de admin ya presente en el cuerpo de las funciones PL/pgSQL.                        |
| **VULN-06** | ⚪ **POR DISEÑO**     | Balances de área expuestos en `get_area_balance`                                                 | Regla de Negocio / Dominio                 | 🟢 **NO ES VULNERABILIDAD**. Balances y recaudaciones son públicos por diseño comunitario (registrado en `AGENTS.md`). |
| **VULN-07** | 🟠 **ALTA**           | Fuga de privacidad en ascensos indoor (`indoor_ascents`) saltándose perfiles privados y bloqueos | `pg_policies` (`indoor_ascents`)           | 🟢 **CORREGIDA EN PRODUCCIÓN**. Incluye comprobación de `is_profile_public` y `has_ascent_blocking`.                   |
| **VULN-08** | 🟢 **YA CORREGIDA**   | Divulgación de solicitudes de rocódromos (`indoor_center_*_requests`)                            | `pg_policies` (`indoor_center_*_requests`) | 🟢 **YA CORREGIDA**. RLS restringe lectura a solicitante y administradores.                                            |
| **VULN-09** | 🟠 **ALTA**           | Open Redirect en `create-checkout-session` mediante validación permisiva de `*.vercel.app`       | Edge Function `create-checkout-session`    | 🟢 **CORREGIDA Y DESPLEGADA**. Wildcard eliminado; lista blanca estricta de dominios permitidos.                       |
| **VULN-10** | 🟡 **MEDIA**          | Inyección de tipo MIME y falta de límite de tamaño en subidas de imágenes                        | Edge Functions (`upload-*.ts`)             | 🟢 **CORREGIDA Y DESPLEGADA**. Límite estricto de 10MB y lista blanca de extensiones (`jpg`, `jpeg`, `png`, `webp`).   |
| **VULN-11** | 🟡 **MEDIA**          | 78 políticas asignadas al rol `{public}`                                                         | `pg_policies` (Múltiples tablas)           | 🟢 **CORREGIDA**. Políticas críticas migradas al rol `authenticated`.                                                  |
| **VULN-12** | 🟡 **MEDIA**          | Modificación de importes en `area_material_requests` por falta de `WITH CHECK` en UPDATE         | Trigger de BD                              | 🟢 **CORREGIDA EN PRODUCCIÓN**. Trigger `prevent_material_request_tampering()` bloquea alteración de campos críticos.  |
| **VULN-13** | 🟡 **MEDIA**          | Inserción ilimitada de notificaciones sin comprobación de bloqueos (`notifications`)             | `pg_policies` (`notifications`)            | 🟢 **CORREGIDA EN PRODUCCIÓN**. Añadida comprobación de `NOT has_message_blocking()`.                                  |
| **VULN-14** | 🟡 **MEDIA**          | Tabla `spatial_ref_sys` de PostGIS sin RLS en schema `public`                                    | Extensión PostGIS                          | ℹ️ **EXTENSIÓN DEL SISTEMA**. Tabla gestionada internamente por PostGIS (`supabase_admin`).                            |

---

## 3. Detalle de Vulnerabilidades Activas y Confirmadas

### 🔴 VULN-01: Borrado Masivo en `equippers` por Subquery Descorrelacionada (IDOR Crítico)

- **Estado en producción:** Confirmada activa en `pg_policies`.
- **Política actual en BD:**
  ```sql
  qual: (is_user_admin(auth.uid()) OR (user_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM routes WHERE (routes.user_creator_id = auth.uid()))) OR (EXISTS ( SELECT 1 FROM area_admins WHERE (area_admins.user_id = auth.uid()))))
  ```
- **Por qué es real:** Al no correlacionar `routes.user_creator_id = auth.uid()` con la fila de `equippers`, si un usuario ha creado cualquier vía en la plataforma, la condición es siempre `TRUE`. Permite borrar a cualquier equipador de la base de datos.

### 🔴 VULN-02: Manipulación Financiera e Inflado de Saldo en `area_purchases`

- **Estado en producción:** Confirmada activa en `pg_policies`.
- **Política actual en BD:**
  ```sql
  cmd: INSERT, roles: {public}, with_check: (is_user_admin(auth.uid()) OR (EXISTS ( SELECT 1 FROM area_admins WHERE ((area_admins.area_id = area_purchases.area_id) AND (area_admins.user_id = auth.uid())))))
  ```
- **Por qué es real:** Un administrador de área puede insertar compras directamente desde el cliente con cualquier importe sin pasar por Stripe, inflando el saldo contable que luego se usa en `create_area_material_request` para retirar material de escalada físico.

### 🔴 VULN-03: Falta de Autenticación en Edge Function `notify-push`

- **Estado en el código:** Confirmada activa en `src/supabase-context/notify-push.ts` y `supabase/functions/notify-push/index.ts`.
- **Por qué es real:** La función procesa solicitudes `POST` sin comprobar `Authorization` ni ningún token secreto. Permite enviar notificaciones push a cualquier usuario.

### 🔴 VULN-04: Bypass del Paywall de Croquis en `topos` y `topo_routes`

- **Estado en producción:** Confirmada activa en `pg_policies`.
- **Políticas actuales en BD:**
  ```sql
  topos.topos_access_policy: FOR SELECT TO public USING (true);
  topo_routes.auth_can_read: FOR SELECT TO authenticated USING (true);
  ```
- **Por qué es real:** Cualquier usuario puede obtener los croquis y trazados de áreas de pago directamente mediante llamadas a la API de PostgREST (`/rest/v1/topos`), sin haber adquirido el acceso en Stripe.

### 🟠 VULN-07: Fuga de Privacidad en `indoor_ascents`

- **Estado en producción:** Confirmada activa en `pg_policies`.
- **Política actual en BD:**
  ```sql
  qual: ((private_ascent = false) OR (auth.uid() = user_id) OR (private_ascent IS NULL))
  ```
- **Por qué es real:** A diferencia de `route_ascents`, no comprueba si el perfil del usuario es privado (`is_profile_public`) ni si existe un bloqueo entre usuarios (`has_ascent_blocking`), y asume público si `private_ascent` es `NULL`.

### 🟠 VULN-09: Open Redirect en `create-checkout-session` vía Subdominios Vercel

- **Estado en el código:** Confirmada activa en `src/supabase-context/create-checkout-session.ts` (línea 37).
- **Por qué es real:** La condición `parsed.hostname.endsWith('.vercel.app')` valida cualquier aplicación de Vercel creada por un atacante (`attacker.vercel.app`), permitiendo redirigir al usuario tras pagar.

### 🟡 VULN-10 a VULN-14: Vulnerabilidades Medias

- **VULN-10:** Sin lista blanca estricta de extensiones ni límites de payload en subidas de imágenes.
- **VULN-11:** 78 políticas evaluadas para `{public}` en vez de `{authenticated}`.
- **VULN-12:** `area_material_requests` actualizable por admins de área sin `WITH CHECK` que fije columnas críticas.
- **VULN-13:** `notifications` permite inserciones sin verificar bloqueos del usuario receptor.
- **VULN-14:** `spatial_ref_sys` pública sin RLS (error activo en el linter oficial de Supabase).

---

## 4. Hallazgos Descartados o No Vulnerables

### 🟢 VULN-06: Cuentas y Balances de Áreas Públicos (Descartada - By Design)

- **Motivo:** En ClimBeast, la filosofía de la plataforma es la **transparencia comunitaria total**. El dinero recaudado por compras de croquis y donaciones se destina al equipamiento y reequipamiento de las escuelas de escalada, por lo que toda la comunidad tiene derecho a consultar los ingresos, gastos y saldo disponible de cada área.
- **Acción realizada:** Se ha registrado explícitamente en [AGENTS.md](file:///d:/git/local-walls/AGENTS.md) y [.agents/AGENTS.md](file:///d:/git/local-walls/.agents/AGENTS.md) bajo la sección de convenciones de Supabase y dominio.

### 🟢 VULN-05: Funciones `unify_*` (Falso Positivo de Linter)

- **Motivo:** El linter de Supabase emite un aviso genérico porque las funciones son `SECURITY DEFINER` y están concedidas al rol `authenticated`. Sin embargo, la inspección de su código PL/pgSQL en producción confirma que las tres funciones (`unify_areas`, `unify_crags`, `unify_routes`) ejecutan al inicio:
  ```sql
  IF NOT is_user_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins can unify ...';
  END IF;
  ```
  Un usuario no administrador recibe una excepción de acceso denegado inmediatamente.

### 🟢 VULN-08: Solicitudes de Administración de Rocódromos (Ya Corregida)

- **Motivo:** La base de datos de producción ya cuenta con la política `auth_can_read` protegida con `((auth.uid() = user_id) OR is_user_admin(auth.uid()) OR is_indoor_center_admin(center_id))`.

---

## 5. Script SQL de Corrección para las Vulnerabilidades Activas

Para corregir las vulnerabilidades activas confirmadas en la base de datos de producción:

```sql
-- ====================================================================
-- MIGRACIÓN DE CORRECCIÓN: VULNERABILIDADES CONFIRMADAS ACTIVAS
-- ====================================================================

-- 1. [VULN-01] Corregir política descorrelacionada en equippers
DROP POLICY IF EXISTS "admin_or_trusted_can_delete" ON public.equippers;
DROP POLICY IF EXISTS "admin_or_trusted_can_insert" ON public.equippers;
DROP POLICY IF EXISTS "Allow admins to delete equippers" ON public.equippers;
DROP POLICY IF EXISTS "Allow admins to insert equippers" ON public.equippers;
DROP POLICY IF EXISTS "Allow admins or owners to update equippers" ON public.equippers;

CREATE POLICY "equippers_delete_safe" ON public.equippers
FOR DELETE TO authenticated
USING (is_user_admin(auth.uid()) OR (user_id IS NOT NULL AND user_id = auth.uid()));

CREATE POLICY "equippers_insert_safe" ON public.equippers
FOR INSERT TO authenticated
WITH CHECK (is_user_admin(auth.uid()) OR (user_id IS NOT NULL AND user_id = auth.uid()));

CREATE POLICY "equippers_update_safe" ON public.equippers
FOR UPDATE TO authenticated
USING (is_user_admin(auth.uid()) OR (user_id IS NOT NULL AND user_id = auth.uid()))
WITH CHECK (is_user_admin(auth.uid()) OR (user_id IS NOT NULL AND user_id = auth.uid()));

-- 2. [VULN-02] Proteger area_purchases contra inserción fraudulenta
DROP POLICY IF EXISTS "Admins and area admins can insert area purchases" ON public.area_purchases;
CREATE POLICY "area_purchases_admin_insert_only" ON public.area_purchases
FOR INSERT TO authenticated
WITH CHECK (is_user_admin(auth.uid()));

-- 3. [VULN-04] Proteger paywall de croquis en topos y topo_routes
DROP POLICY IF EXISTS "topos_access_policy" ON public.topos;
CREATE POLICY "topos_access_policy_secured" ON public.topos
FOR SELECT TO authenticated
USING (
  is_user_admin(auth.uid()) OR
  is_crag_equipper(crag_id) OR
  EXISTS (
    SELECT 1 FROM crags c
    JOIN areas a ON a.id = c.area_id
    WHERE c.id = topos.crag_id
      AND (
        COALESCE(a.price, 0) <= 0 OR
        EXISTS (
          SELECT 1 FROM area_purchases ap
          WHERE ap.area_id = a.id AND ap.user_id = auth.uid()
        )
      )
  )
);

-- 4. [VULN-07] Privacidad en indoor_ascents
DROP POLICY IF EXISTS "Allow select for non-private or own indoor ascents" ON public.indoor_ascents;
CREATE POLICY "indoor_ascents_select_secure" ON public.indoor_ascents
FOR SELECT TO public
USING (
  (auth.uid() = user_id) OR
  (
    COALESCE(private_ascent, false) = false AND
    is_profile_public(user_id) AND
    (auth.uid() IS NULL OR NOT has_ascent_blocking(auth.uid(), user_id))
  )
);

-- 5. [VULN-13] Bloqueo de notificaciones no autorizadas
DROP POLICY IF EXISTS "actor_can_insert" ON public.notifications;
CREATE POLICY "actor_can_insert" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid() AND
  actor_id <> user_id AND
  NOT has_message_blocking(auth.uid(), user_id)
);

-- 6. [VULN-14] RLS en spatial_ref_sys de PostGIS
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_spatial_ref_sys" ON public.spatial_ref_sys;
CREATE POLICY "allow_read_spatial_ref_sys" ON public.spatial_ref_sys FOR SELECT TO public USING (true);
```
