import { buildCorsHeaders, jsonResponse } from './_shared/edge-http.ts';
import {
  authenticateBearerRequest,
  createR2SupabaseClients,
} from './_shared/r2-supabase-clients.ts';

const { supabaseAuthClient, supabaseAdminClient } = createR2SupabaseClients();

console.info('Delete-topo-photo function started');

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('origin') ?? '', [
    'topo-id',
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

    // ─────────────────────────────
    // Admin check
    // ─────────────────────────────
    const { data: isAdmin, error: adminErr } = await supabaseAdminClient.rpc(
      'is_user_admin',
      {
        p_uid: userId,
      },
    );

    if (adminErr) {
      console.error('[delete-topo-photo] is_user_admin error', adminErr);
      return jsonResponse(
        { error: 'Permission check failed' },
        500,
        corsHeaders,
      );
    }

    const topoId = req.headers.get('topo-id') || req.headers.get('Topo-Id');

    if (!topoId) {
      return jsonResponse(
        { error: 'Missing Topo-Id header' },
        400,
        corsHeaders,
      );
    }

    // ─────────────────────────────
    // Get topo → crag_id and photo path check
    // ─────────────────────────────
    const { data: topo, error: topoErr } = await supabaseAdminClient
      .from('topos')
      .select('crag_id, photo')
      .eq('id', topoId)
      .single();

    if (topoErr || !topo) {
      console.error('[delete-topo-photo] topo not found', topoErr);
      return jsonResponse({ error: 'Topo not found' }, 404, corsHeaders);
    }

    // ─────────────────────────────
    // Crag admin check (only if not admin)
    let isCragAdmin = false;
    if (!isAdmin) {
      const { data, error } = await supabaseAdminClient.rpc(
        'is_crag_equipper',
        { p_crag_id: topo.crag_id, p_uid: userId },
      );

      if (error) {
        console.error('[delete-topo-photo] is_crag_equipper error', error);
        return jsonResponse(
          { error: 'Permission check failed' },
          500,
          corsHeaders,
        );
      }

      isCragAdmin = Boolean(data);
    }

    if (!isAdmin && !isCragAdmin) {
      return jsonResponse(
        { error: 'Forbidden: admin or crag admin only' },
        403,
        corsHeaders,
      );
    }

    if (!topo.photo) {
      return jsonResponse({ message: 'No photo to delete' }, 200, corsHeaders);
    }

    // ─────────────────────────────
    // Storage Deletion
    // ─────────────────────────────
    const bucket = 'topos';
    const { error: deleteError } = await supabaseAdminClient.storage
      .from(bucket)
      .remove([topo.photo, `topos/${topoId}_thumb.webp`]);

    if (deleteError) {
      console.error('[delete-topo-photo] Storage removal failed', deleteError);
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
    // DB Update (Set photo to null)
    // ─────────────────────────────
    const { error: dbErr } = await supabaseAdminClient
      .from('topos')
      .update({ photo: null })
      .eq('id', topoId);

    if (dbErr) {
      console.error('[delete-topo-photo] DB update failed', dbErr);
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
