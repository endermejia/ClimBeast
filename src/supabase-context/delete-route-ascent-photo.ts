import { buildCorsHeaders, jsonResponse } from './_shared/edge-http.ts';
import {
  authenticateBearerRequest,
  createR2SupabaseClients,
} from './_shared/r2-supabase-clients.ts';

const { supabaseAuthClient, supabaseAdminClient } = createR2SupabaseClients();

console.info('Delete-route-ascent-photo function started');

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('origin') ?? '', [
    'ascent-id',
    'is-indoor',
  ]);

  try {
    const auth = await authenticateBearerRequest(
      req,
      supabaseAuthClient,
      corsHeaders,
    );
    if ('response' in auth) {
      return auth.response;
    }

    const { userId } = auth;

    const ascentId =
      req.headers.get('ascent-id') || req.headers.get('Ascent-Id');

    if (!ascentId) {
      return jsonResponse(
        { error: 'Missing Ascent-Id header' },
        400,
        corsHeaders,
      );
    }

    // ─────────────────────────────
    // Check indoor vs outdoor
    // ─────────────────────────────
    const isIndoorHeader =
      req.headers.get('is-indoor') === 'true' ||
      req.headers.get('Is-Indoor') === 'true';
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        ascentId,
      );
    const isIndoor = isIndoorHeader || isUUID;
    const tableName = isIndoor ? 'indoor_ascents' : 'route_ascents';

    // ─────────────────────────────
    // Get ascent → user_id and photo_path check
    // ─────────────────────────────
    let bodyPhotoPath: string | null = null;
    try {
      const rawBody = await req.text();
      if (rawBody) {
        const parsed = JSON.parse(rawBody);
        if (typeof parsed?.photo_path === 'string') {
          bodyPhotoPath = parsed.photo_path;
        }
      }
    } catch {
      // ignore empty/non-JSON body
    }

    const { data: ascent } = await supabaseAdminClient
      .from(tableName)
      .select('user_id, photo_path')
      .eq('id', ascentId)
      .maybeSingle();

    if (!ascent) {
      // Ascent row was already deleted: allow owner to clean up orphaned photo_path
      if (
        bodyPhotoPath &&
        bodyPhotoPath.startsWith(`${userId}/`) &&
        !bodyPhotoPath.includes('..')
      ) {
        const { error: orphanDelErr } = await supabaseAdminClient.storage
          .from('route-ascent-photos')
          .remove([bodyPhotoPath]);
        if (orphanDelErr) {
          return jsonResponse(
            {
              error: 'Storage removal failed',
              details: orphanDelErr.message,
            },
            500,
            corsHeaders,
          );
        }
        return jsonResponse(
          { message: 'Orphaned photo deleted successfully' },
          200,
          corsHeaders,
        );
      }

      return jsonResponse({ error: 'Ascent not found' }, 404, corsHeaders);
    }

    if (ascent.user_id !== userId) {
      return jsonResponse(
        { error: 'Forbidden: only the owner can delete the photo' },
        403,
        corsHeaders,
      );
    }

    if (!ascent.photo_path) {
      return jsonResponse({ message: 'No photo to delete' }, 200, corsHeaders);
    }

    // ─────────────────────────────
    // Storage Deletion
    // ─────────────────────────────
    const bucket =
      ascent.photo_path.startsWith('ascents/') ||
      ascent.photo_path.startsWith('centers/')
        ? 'indoor-assets'
        : 'route-ascent-photos';
    const { error: deleteError } = await supabaseAdminClient.storage
      .from(bucket)
      .remove([ascent.photo_path]);

    if (deleteError) {
      console.error(
        '[delete-route-ascent-photo] Storage removal failed',
        deleteError,
      );
      return jsonResponse(
        {
          error: 'Storage removal failed',
          details: deleteError.message,
        },
        500,
        corsHeaders,
      );
    }

    // ─────────────────────────────
    // DB Update (Set photo_path and metadata to null)
    // ─────────────────────────────
    const { error: dbErr } = await supabaseAdminClient
      .from(tableName)
      .update({
        photo_path: null,
        photo_width: null,
        photo_height: null,
        photo_lqip: null,
      })
      .eq('id', ascentId);

    if (dbErr) {
      console.error('[delete-route-ascent-photo] DB update failed', dbErr);
      return jsonResponse(
        {
          error: 'DB update failed',
          details: dbErr.message,
        },
        500,
        corsHeaders,
      );
    }

    return jsonResponse(
      { message: 'Photo deleted successfully' },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: 'Server error' }, 500, corsHeaders);
  }
});
