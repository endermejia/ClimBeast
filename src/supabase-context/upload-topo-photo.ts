import {
  buildCorsHeaders,
  jsonResponse,
  R2_STORAGE_URL,
} from './_shared/edge-http.ts';
import {
  authenticateBearerRequest,
  createR2SupabaseClients,
} from './_shared/r2-supabase-clients.ts';

interface Payload {
  file_name: string;
  content_type?: string;
  base64: string;
  thumbnail_base64?: string;
}

const { supabaseAuthClient, supabaseAdminClient } = createR2SupabaseClients();

console.info('Upload-topo-photo function started');

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
      console.error('[upload-topo-photo] is_user_admin error', adminErr);
      return jsonResponse(
        { error: 'Permission check failed' },
        500,
        corsHeaders,
      );
    }

    // ─────────────────────────────
    // Payload
    // ─────────────────────────────
    const raw = await req.text();
    let payload: Payload;

    try {
      payload = raw ? JSON.parse(raw) : ({} as Payload);
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders);
    }

    if (!payload?.base64) {
      return jsonResponse({ error: 'Missing base64' }, 400, corsHeaders);
    }

    const MAX_PHOTO_BYTES = 50 * 1024 * 1024; // 50MB
    const MAX_BASE64_LENGTH = Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 512;

    if (payload.base64.length > MAX_BASE64_LENGTH) {
      return jsonResponse(
        { error: 'File size exceeds 50MB limit' },
        413,
        corsHeaders,
      );
    }

    if (
      payload.thumbnail_base64 &&
      payload.thumbnail_base64.length > 5 * 1024 * 1024
    ) {
      return jsonResponse(
        { error: 'Thumbnail size exceeds 5MB limit' },
        413,
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
    // Get topo → crag_id
    // ─────────────────────────────
    const { data: topo, error: topoErr } = await supabaseAdminClient
      .from('topos')
      .select('crag_id')
      .eq('id', topoId)
      .single();

    if (topoErr || !topo) {
      console.error('[upload-topo-photo] topo not found', topoErr);
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
        console.error('[upload-topo-photo] is_crag_equipper error', error);
        return jsonResponse(
          { error: 'Internal Server Error: failed to check permissions' },
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

    // ─────────────────────────────
    // Upload
    // ─────────────────────────────
    const rawExt =
      (payload.file_name || 'photo.png').split('.').pop()?.toLowerCase() ||
      'png';
    const ALLOWED_EXTS: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const ext = ALLOWED_EXTS[rawExt] ? rawExt : 'png';
    const contentType = ALLOWED_EXTS[ext];
    const fileName = `topos/${topoId}.${ext}`;

    const base64 = payload.base64.replace(/^data:.*;base64,/, '');
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    if (bytes.length > MAX_PHOTO_BYTES) {
      return jsonResponse(
        { error: 'File size exceeds 50MB limit' },
        413,
        corsHeaders,
      );
    }

    const bucket = 'topos';

    const { data: uploadData, error: uploadError } =
      await supabaseAdminClient.storage.from(bucket).upload(fileName, bytes, {
        contentType: contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[upload-topo-photo] upload error', uploadError);
      return jsonResponse(
        {
          error: 'Upload failed',
          details: uploadError.message,
        },
        500,
        corsHeaders,
      );
    }

    const path = uploadData?.path || fileName;

    if (payload.thumbnail_base64) {
      try {
        const thumbBase64 = payload.thumbnail_base64.replace(
          /^data:.*;base64,/,
          '',
        );
        const thumbBinary = atob(thumbBase64);
        const thumbBytes = new Uint8Array(thumbBinary.length);
        for (let i = 0; i < thumbBinary.length; i++) {
          thumbBytes[i] = thumbBinary.charCodeAt(i);
        }
        const thumbFileName = `topos/${topoId}_thumb.webp`;
        await supabaseAdminClient.storage
          .from(bucket)
          .upload(thumbFileName, thumbBytes, {
            contentType: 'image/webp',
            upsert: true,
          });
      } catch (thumbErr) {
        console.warn('[upload-topo-photo] Thumbnail upload error:', thumbErr);
      }
    }

    const { error: dbErr } = await supabaseAdminClient
      .from('topos')
      .update({ photo: path })
      .eq('id', topoId);

    if (dbErr) {
      console.error('[upload-topo-photo] DB update failed', dbErr);
      return jsonResponse(
        {
          error: 'DB update failed',
          details: dbErr.message,
        },
        500,
        corsHeaders,
      );
    }

    const publicUrl = `${R2_STORAGE_URL}/storage/v1/object/public/${bucket}/${encodeURIComponent(path)}`;

    return jsonResponse({ path, publicUrl }, 200, corsHeaders);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: 'Server error' }, 500, corsHeaders);
  }
});
