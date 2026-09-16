-- Migration: Indoor Center Permissions & Creator Tracking
-- Configurable granular permissions per indoor center for routes, topos, and topo lines

-- 1. Add permissions JSONB column to indoor_centers
ALTER TABLE public.indoor_centers 
ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{
  "can_create_routes": "routesetters",
  "can_edit_routes": "routesetters_and_creator",
  "can_archive_routes": "routesetters_and_creator",
  "can_create_topos": "routesetters",
  "can_edit_topos": "routesetters_and_creator",
  "can_archive_topos": "routesetters_and_creator",
  "can_create_lines": "routesetters",
  "can_edit_lines": "routesetters_and_creator"
}'::jsonb;

-- 2. Add creator columns to indoor_routes, indoor_topos, indoor_topo_routes
ALTER TABLE public.indoor_routes
ADD COLUMN IF NOT EXISTS user_creator_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL DEFAULT auth.uid();

ALTER TABLE public.indoor_topos
ADD COLUMN IF NOT EXISTS user_creator_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL DEFAULT auth.uid();

ALTER TABLE public.indoor_topo_routes
ADD COLUMN IF NOT EXISTS user_creator_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL DEFAULT auth.uid();

-- 3. Helper function to read permission key from indoor center
CREATE OR REPLACE FUNCTION public.get_indoor_center_permission(
    p_center_id UUID,
    p_permission_key TEXT
) RETURNS TEXT AS $$
    SELECT COALESCE(
        permissions->>p_permission_key,
        CASE 
            WHEN p_permission_key IN ('can_create_routes', 'can_create_topos', 'can_create_lines') THEN 'routesetters'
            ELSE 'routesetters_and_creator'
        END
    )
    FROM public.indoor_centers
    WHERE id = p_center_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Preserve original creator on updates
CREATE OR REPLACE FUNCTION public.preserve_indoor_creator_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_creator_id := COALESCE(OLD.user_creator_id, NEW.user_creator_id, auth.uid());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_preserve_indoor_routes_creator ON public.indoor_routes;
CREATE TRIGGER trg_preserve_indoor_routes_creator
    BEFORE UPDATE ON public.indoor_routes
    FOR EACH ROW
    EXECUTE FUNCTION public.preserve_indoor_creator_id();

DROP TRIGGER IF EXISTS trg_preserve_indoor_topos_creator ON public.indoor_topos;
CREATE TRIGGER trg_preserve_indoor_topos_creator
    BEFORE UPDATE ON public.indoor_topos
    FOR EACH ROW
    EXECUTE FUNCTION public.preserve_indoor_creator_id();

DROP TRIGGER IF EXISTS trg_preserve_indoor_topo_routes_creator ON public.indoor_topo_routes;
CREATE TRIGGER trg_preserve_indoor_topo_routes_creator
    BEFORE UPDATE ON public.indoor_topo_routes
    FOR EACH ROW
    EXECUTE FUNCTION public.preserve_indoor_creator_id();

-- 5. Trigger to enforce separate edit vs archive permissions on indoor_routes
CREATE OR REPLACE FUNCTION public.enforce_indoor_route_update_permissions()
RETURNS TRIGGER AS $$
DECLARE
    v_center_id UUID := NEW.center_id;
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN := is_user_admin(v_user_id) OR is_indoor_center_admin(v_center_id);
    v_is_routesetter BOOLEAN := is_indoor_center_routesetter(v_center_id);
    v_is_creator BOOLEAN := (OLD.user_creator_id IS NOT NULL AND OLD.user_creator_id = v_user_id);
    v_can_edit BOOLEAN;
    v_can_archive BOOLEAN;
BEGIN
    IF v_is_admin OR v_is_routesetter OR v_is_creator THEN
        RETURN NEW;
    END IF;

    v_can_edit := (get_indoor_center_permission(v_center_id, 'can_edit_routes') = 'all');
    v_can_archive := (get_indoor_center_permission(v_center_id, 'can_archive_routes') = 'all');

    IF v_can_edit THEN
        RETURN NEW;
    END IF;

    IF v_can_archive THEN
        IF (NEW.name IS DISTINCT FROM OLD.name OR
            NEW.grade IS DISTINCT FROM OLD.grade OR
            NEW.color IS DISTINCT FROM OLD.color OR
            NEW.climbing_kind IS DISTINCT FROM OLD.climbing_kind OR
            NEW.slug IS DISTINCT FROM OLD.slug OR
            NEW.topo_id IS DISTINCT FROM OLD.topo_id OR
            NEW.center_id IS DISTINCT FROM OLD.center_id OR
            NEW.user_creator_id IS DISTINCT FROM OLD.user_creator_id) THEN
            RAISE EXCEPTION 'Only routesetters, center admins or route creators can edit route details';
        END IF;
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Insufficient permissions to update indoor route';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_indoor_route_update ON public.indoor_routes;
CREATE TRIGGER trg_enforce_indoor_route_update
    BEFORE UPDATE ON public.indoor_routes
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_indoor_route_update_permissions();

-- 6. Trigger to enforce separate edit vs archive permissions on indoor_topos
CREATE OR REPLACE FUNCTION public.enforce_indoor_topo_update_permissions()
RETURNS TRIGGER AS $$
DECLARE
    v_center_id UUID := NEW.center_id;
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN := is_user_admin(v_user_id) OR is_indoor_center_admin(v_center_id);
    v_is_routesetter BOOLEAN := is_indoor_center_routesetter(v_center_id);
    v_is_creator BOOLEAN := (OLD.user_creator_id IS NOT NULL AND OLD.user_creator_id = v_user_id);
    v_can_edit BOOLEAN;
    v_can_archive BOOLEAN;
BEGIN
    IF v_is_admin OR v_is_routesetter OR v_is_creator THEN
        RETURN NEW;
    END IF;

    v_can_edit := (get_indoor_center_permission(v_center_id, 'can_edit_topos') = 'all');
    v_can_archive := (get_indoor_center_permission(v_center_id, 'can_archive_topos') = 'all');

    IF v_can_edit THEN
        RETURN NEW;
    END IF;

    IF v_can_archive THEN
        IF (NEW.name IS DISTINCT FROM OLD.name OR
            NEW.image_url IS DISTINCT FROM OLD.image_url OR
            NEW.climbing_kind IS DISTINCT FROM OLD.climbing_kind OR
            NEW.start_date IS DISTINCT FROM OLD.start_date OR
            NEW.end_date IS DISTINCT FROM OLD.end_date OR
            NEW.center_id IS DISTINCT FROM OLD.center_id OR
            NEW.user_creator_id IS DISTINCT FROM OLD.user_creator_id) THEN
            RAISE EXCEPTION 'Only routesetters, center admins or topo creators can edit topo details';
        END IF;
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Insufficient permissions to update indoor topo';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_indoor_topo_update ON public.indoor_topos;
CREATE TRIGGER trg_enforce_indoor_topo_update
    BEFORE UPDATE ON public.indoor_topos
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_indoor_topo_update_permissions();

-- 7. Replace old generic ALL policies with granular RLS policies

-- indoor_routes
DROP POLICY IF EXISTS "Routes are editable by center admins or routesetters" ON public.indoor_routes;
DROP POLICY IF EXISTS "indoor_routes_insert" ON public.indoor_routes;
DROP POLICY IF EXISTS "indoor_routes_update" ON public.indoor_routes;
DROP POLICY IF EXISTS "indoor_routes_delete" ON public.indoor_routes;

CREATE POLICY "indoor_routes_insert"
    ON public.indoor_routes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        is_user_admin(auth.uid()) OR
        is_indoor_center_admin(center_id) OR
        is_indoor_center_routesetter(center_id) OR
        get_indoor_center_permission(center_id, 'can_create_routes') = 'all'
    );

CREATE POLICY "indoor_routes_update"
    ON public.indoor_routes
    FOR UPDATE
    TO authenticated
    USING (
        is_user_admin(auth.uid()) OR
        is_indoor_center_admin(center_id) OR
        is_indoor_center_routesetter(center_id) OR
        (user_creator_id IS NOT NULL AND user_creator_id = auth.uid()) OR
        get_indoor_center_permission(center_id, 'can_edit_routes') = 'all' OR
        get_indoor_center_permission(center_id, 'can_archive_routes') = 'all'
    );

CREATE POLICY "indoor_routes_delete"
    ON public.indoor_routes
    FOR DELETE
    TO authenticated
    USING (
        is_user_admin(auth.uid()) OR
        is_indoor_center_admin(center_id) OR
        is_indoor_center_routesetter(center_id) OR
        (user_creator_id IS NOT NULL AND user_creator_id = auth.uid())
    );

-- indoor_topos
DROP POLICY IF EXISTS "Topos are editable by center admins or routesetters" ON public.indoor_topos;
DROP POLICY IF EXISTS "indoor_topos_insert" ON public.indoor_topos;
DROP POLICY IF EXISTS "indoor_topos_update" ON public.indoor_topos;
DROP POLICY IF EXISTS "indoor_topos_delete" ON public.indoor_topos;

CREATE POLICY "indoor_topos_insert"
    ON public.indoor_topos
    FOR INSERT
    TO authenticated
    WITH CHECK (
        is_user_admin(auth.uid()) OR
        is_indoor_center_admin(center_id) OR
        is_indoor_center_routesetter(center_id) OR
        get_indoor_center_permission(center_id, 'can_create_topos') = 'all'
    );

CREATE POLICY "indoor_topos_update"
    ON public.indoor_topos
    FOR UPDATE
    TO authenticated
    USING (
        is_user_admin(auth.uid()) OR
        is_indoor_center_admin(center_id) OR
        is_indoor_center_routesetter(center_id) OR
        (user_creator_id IS NOT NULL AND user_creator_id = auth.uid()) OR
        get_indoor_center_permission(center_id, 'can_edit_topos') = 'all' OR
        get_indoor_center_permission(center_id, 'can_archive_topos') = 'all'
    );

CREATE POLICY "indoor_topos_delete"
    ON public.indoor_topos
    FOR DELETE
    TO authenticated
    USING (
        is_user_admin(auth.uid()) OR
        is_indoor_center_admin(center_id) OR
        is_indoor_center_routesetter(center_id) OR
        (user_creator_id IS NOT NULL AND user_creator_id = auth.uid())
    );

-- indoor_topo_routes
DROP POLICY IF EXISTS "Indoor topo routes are editable by center admins or routesetter" ON public.indoor_topo_routes;
DROP POLICY IF EXISTS "indoor_topo_routes_insert" ON public.indoor_topo_routes;
DROP POLICY IF EXISTS "indoor_topo_routes_update" ON public.indoor_topo_routes;
DROP POLICY IF EXISTS "indoor_topo_routes_delete" ON public.indoor_topo_routes;

CREATE POLICY "indoor_topo_routes_insert"
    ON public.indoor_topo_routes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        is_user_admin(auth.uid()) OR
        is_indoor_center_admin((SELECT center_id FROM public.indoor_topos WHERE id = topo_id)) OR
        is_indoor_center_routesetter((SELECT center_id FROM public.indoor_topos WHERE id = topo_id)) OR
        get_indoor_center_permission((SELECT center_id FROM public.indoor_topos WHERE id = topo_id), 'can_create_lines') = 'all'
    );

CREATE POLICY "indoor_topo_routes_update"
    ON public.indoor_topo_routes
    FOR UPDATE
    TO authenticated
    USING (
        is_user_admin(auth.uid()) OR
        is_indoor_center_admin((SELECT center_id FROM public.indoor_topos WHERE id = topo_id)) OR
        is_indoor_center_routesetter((SELECT center_id FROM public.indoor_topos WHERE id = topo_id)) OR
        (user_creator_id IS NOT NULL AND user_creator_id = auth.uid()) OR
        get_indoor_center_permission((SELECT center_id FROM public.indoor_topos WHERE id = topo_id), 'can_edit_lines') = 'all'
    );

CREATE POLICY "indoor_topo_routes_delete"
    ON public.indoor_topo_routes
    FOR DELETE
    TO authenticated
    USING (
        is_user_admin(auth.uid()) OR
        is_indoor_center_admin((SELECT center_id FROM public.indoor_topos WHERE id = topo_id)) OR
        is_indoor_center_routesetter((SELECT center_id FROM public.indoor_topos WHERE id = topo_id)) OR
        (user_creator_id IS NOT NULL AND user_creator_id = auth.uid())
    );
