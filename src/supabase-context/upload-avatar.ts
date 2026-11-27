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
}

const { supabaseAuthClient, supabaseAdminClient } = createR2SupabaseClients();

console.info('Upload-avatar function started');

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('origin') ?? '');

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

    // ---- Body (safe parse) ----
    const raw = await req.text();
    let payload: Payload;
    try {
      payload = raw ? JSON.parse(raw) : ({} as Payload);
    } catch (e) {
      console.error('[upload-avatar] invalid JSON body', e);
      return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders);
    }

    if (!payload?.base64) {
      return jsonResponse({ error: 'Missing base64' }, 400, corsHeaders);
    }

    if (payload.base64.length > 10 * 1024 * 1024) {
      return jsonResponse(
        { error: 'File size exceeds 10MB limit' },
        413,
        corsHeaders,
      );
    }

    // ---- Get previous avatar path from DB (to delete later) ----
    const { data: existingProfile } = await supabaseAdminClient
      .from('user_profiles')
      .select('avatar')
      .eq('id', userId)
      .single();

    const oldPath: string | null =
      (existingProfile?.avatar as string | null) ?? null;

    // ---- File path: userId + timestamp to avoid cache/collisions ----
    const rawExt =
      (payload.file_name || 'avatar.png').split('.').pop()?.toLowerCase() ||
      'png';
    const ALLOWED_EXTS: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const ext = ALLOWED_EXTS[rawExt] ? rawExt : 'png';
    const contentType = ALLOWED_EXTS[ext];
    const timestamp = Date.now();
    const fileName = `avatars/${userId}-${timestamp}.${ext}`;

    // ---- Base64 decode ----
    const base64 = payload.base64.replace(/^data:.*;base64,/, '');
    // atob available in Deno
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // ---- Upload using admin client ----
    const bucket = 'avatar';
    const { data: uploadData, error: uploadError } =
      await supabaseAdminClient.storage.from(bucket).upload(fileName, bytes, {
        contentType,
        // New filename per upload — no need to upsert
        upsert: false,
      });

    if (uploadError) {
      return jsonResponse(
        {
          error: 'Upload failed',
          details: uploadError.message,
        },
        500,
        corsHeaders,
      );
    }

    // ---- Save path in DB using admin client (bypass RLS) ----
    const path = uploadData?.path || fileName;
    const { error: dbErr } = await supabaseAdminClient
      .from('user_profiles')
      .update({ avatar: path })
      .eq('id', userId);

    if (dbErr) {
      return jsonResponse(
        { error: 'DB update failed', details: dbErr.message },
        500,
        corsHeaders,
      );
    }

    // ---- Try to delete previous avatar (best-effort) ----
    let deletedOld = false;
    if (oldPath && oldPath !== path) {
      const { error: delErr } = await supabaseAdminClient.storage
        .from(bucket)
        .remove([oldPath]);
      if (!delErr) deletedOld = true;
      else
        console.warn(
          '[upload-avatar] Failed to delete old avatar',
          delErr?.message,
        );
    }

    // ---- Public URL ----
    const publicUrl = `${R2_STORAGE_URL}/storage/v1/object/public/${bucket}/${encodeURIComponent(path)}`;

    return jsonResponse({ path, publicUrl, deletedOld }, 200, corsHeaders);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: 'Server error' }, 500, corsHeaders);
  }
});
