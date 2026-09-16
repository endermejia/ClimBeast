CREATE TABLE IF NOT EXISTS public.indoor_center_routesetter_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES public.indoor_centers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT indoor_center_routesetter_requests_center_id_user_id_key UNIQUE (center_id, user_id)
);

ALTER TABLE public.indoor_center_routesetter_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_can_read"
    ON public.indoor_center_routesetter_requests
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "own_can_insert"
    ON public.indoor_center_routesetter_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_can_delete"
    ON public.indoor_center_routesetter_requests
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "admin_can_delete"
    ON public.indoor_center_routesetter_requests
    FOR DELETE
    TO authenticated
    USING (
        is_user_admin(auth.uid()) OR
        is_indoor_center_admin(center_id)
    );
