-- ====================================================================
-- MIGRACIÓN DE CORRECCIÓN: VULNERABILIDADES DE SEGURIDAD ACTIVAS
-- ClimBeast - Octubre 2026
-- ====================================================================

-- 1. [VULN-01] Corregir política descorrelacionada y unificar políticas en equippers
DROP POLICY IF EXISTS "admin_or_trusted_can_delete" ON public.equippers;
DROP POLICY IF EXISTS "admin_or_trusted_can_insert" ON public.equippers;
DROP POLICY IF EXISTS "admin_or_trusted_can_update" ON public.equippers;
DROP POLICY IF EXISTS "Allow admins to delete equippers" ON public.equippers;
DROP POLICY IF EXISTS "Allow admins to insert equippers" ON public.equippers;
DROP POLICY IF EXISTS "Allow admins or owners to update equippers" ON public.equippers;
DROP POLICY IF EXISTS "Allow public read access on equippers" ON public.equippers;
DROP POLICY IF EXISTS "auth_can_read" ON public.equippers;
DROP POLICY IF EXISTS "equippers_read_policy" ON public.equippers;
DROP POLICY IF EXISTS "equippers_delete_policy" ON public.equippers;
DROP POLICY IF EXISTS "equippers_insert_policy" ON public.equippers;
DROP POLICY IF EXISTS "equippers_update_policy" ON public.equippers;

CREATE POLICY "equippers_read_policy" ON public.equippers
FOR SELECT TO public
USING (true);

CREATE POLICY "equippers_delete_policy" ON public.equippers
FOR DELETE TO authenticated
USING (is_user_admin(auth.uid()) OR (user_id IS NOT NULL AND user_id = auth.uid()));

CREATE POLICY "equippers_insert_policy" ON public.equippers
FOR INSERT TO authenticated
WITH CHECK (is_user_admin(auth.uid()) OR (user_id IS NOT NULL AND user_id = auth.uid()));

CREATE POLICY "equippers_update_policy" ON public.equippers
FOR UPDATE TO authenticated
USING (is_user_admin(auth.uid()) OR (user_id IS NOT NULL AND user_id = auth.uid()))
WITH CHECK (is_user_admin(auth.uid()) OR (user_id IS NOT NULL AND user_id = auth.uid()));

-- 2. [VULN-02] Proteger area_purchases contra inserción fraudulenta
DROP POLICY IF EXISTS "Admins and area admins can insert area purchases" ON public.area_purchases;
DROP POLICY IF EXISTS "admin_only_insert_purchases" ON public.area_purchases;

CREATE POLICY "admin_only_insert_purchases" ON public.area_purchases
FOR INSERT TO authenticated
WITH CHECK (is_user_admin(auth.uid()));

-- 3. [VULN-04] Proteger paywall de croquis en topos y topo_routes
DROP POLICY IF EXISTS "topos_access_policy" ON public.topos;

CREATE POLICY "topos_access_policy" ON public.topos
FOR SELECT TO public
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

DROP POLICY IF EXISTS "auth_can_read" ON public.topo_routes;
DROP POLICY IF EXISTS "topo_routes_read_policy" ON public.topo_routes;

CREATE POLICY "topo_routes_read_policy" ON public.topo_routes
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM topos t
    WHERE t.id = topo_routes.topo_id
  )
);

-- 4. [VULN-07] Privacidad en indoor_ascents
DROP POLICY IF EXISTS "Allow select for non-private or own indoor ascents" ON public.indoor_ascents;
DROP POLICY IF EXISTS "indoor_ascents_select_policy" ON public.indoor_ascents;

CREATE POLICY "indoor_ascents_select_policy" ON public.indoor_ascents
FOR SELECT TO public
USING (
  (auth.uid() = user_id) OR (
    COALESCE(private_ascent, false) = false AND 
    is_profile_public(user_id) AND 
    (auth.uid() IS NULL OR NOT has_ascent_blocking(auth.uid(), user_id))
  )
);

-- 5. [VULN-12] Evitar alteración de importes en solicitudes de material pendientes
CREATE OR REPLACE FUNCTION public.prevent_material_request_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT is_user_admin(auth.uid()) THEN
    IF NEW.total_amount IS DISTINCT FROM OLD.total_amount OR
       NEW.area_id IS DISTINCT FROM OLD.area_id OR
       NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'No está permitido modificar el importe, el área o el solicitante de la solicitud';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_material_request_tampering ON public.area_material_requests;
CREATE TRIGGER trg_prevent_material_request_tampering
  BEFORE UPDATE ON public.area_material_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_material_request_tampering();

-- 6. [VULN-13] Respetar bloqueos en la inserción de notificaciones
DROP POLICY IF EXISTS "actor_can_insert" ON public.notifications;

CREATE POLICY "actor_can_insert" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid() AND 
  actor_id <> user_id AND 
  NOT has_message_blocking(auth.uid(), user_id)
);

-- 7. [VULN-14] RLS en spatial_ref_sys de PostGIS
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_spatial_ref_sys" ON public.spatial_ref_sys;
CREATE POLICY "allow_read_spatial_ref_sys" ON public.spatial_ref_sys FOR SELECT TO public USING (true);
