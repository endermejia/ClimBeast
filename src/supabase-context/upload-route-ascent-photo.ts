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
  width?: number;
  height?: number;
  lqip?: string;
}

function extractImageDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  if (bytes.length < 24) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    if (width > 0 && height > 0) return { width, height };
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    const chunk = String.fromCharCode(
      bytes[12],
      bytes[13],
      bytes[14],
      bytes[15],
    );
    if (chunk === 'VP8 ' && bytes.length >= 30) {
      const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
      const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
      if (width > 0 && height > 0) return { width, height };
    } else if (chunk === 'VP8L' && bytes.length >= 25) {
      const b0 = bytes[21];
      const b1 = bytes[22];
      const b2 = bytes[23];
      const b3 = bytes[24];
      const width = 1 + (b0 | ((b1 & 0x3f) << 8));
      const height = 1 + ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10));
      if (width > 0 && height > 0) return { width, height };
    } else if (chunk === 'VP8X' && bytes.length >= 30) {
      const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      if (width > 0 && height > 0) return { width, height };
    }
  }

  // JPEG: FF D8
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === 0xff) {
        offset++;
        continue;
      }
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
        const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
        if (width > 0 && height > 0) return { width, height };
        break;
      }
      const segLen = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (segLen < 2) break;
      offset += 2 + segLen;
    }
  }

  return null;
}

const { supabaseAuthClient, supabaseAdminClient } = createR2SupabaseClients();

console.info('Upload-route-ascent-photo function started');

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
    // Get ascent → user_id check
    // ─────────────────────────────
    const { data: ascent, error: ascentErr } = await supabaseAdminClient
      .from(tableName)
      .select('user_id, photo_path')
      .eq('id', ascentId)
      .single();

    if (ascentErr || !ascent) {
      console.error(
        `[upload-route-ascent-photo] ascent not found in ${tableName}`,
        ascentErr,
      );
      return jsonResponse({ error: 'Ascent not found' }, 404, corsHeaders);
    }

    if (ascent.user_id !== userId) {
      return jsonResponse(
        { error: 'Forbidden: only the owner can upload a photo' },
        403,
        corsHeaders,
      );
    }

    if (payload.base64.length > 10 * 1024 * 1024) {
      return jsonResponse(
        { error: 'File size exceeds 10MB limit' },
        413,
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
    const fileName = `${userId}/${ascentId}.${ext}`;

    const base64 = payload.base64.replace(/^data:.*;base64,/, '');
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const bucket = 'route-ascent-photos';

    const { data: uploadData, error: uploadError } =
      await supabaseAdminClient.storage.from(bucket).upload(fileName, bytes, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[upload-route-ascent-photo] upload error', uploadError);
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

    if (ascent.photo_path && ascent.photo_path !== path) {
      await supabaseAdminClient.storage
        .from(bucket)
        .remove([ascent.photo_path]);
    }

    const parsedDims = extractImageDimensions(bytes);
    const validWidth =
      typeof payload.width === 'number' &&
      payload.width > 0 &&
      payload.width <= 10000
        ? Math.round(payload.width)
        : (parsedDims?.width ?? null);
    const validHeight =
      typeof payload.height === 'number' &&
      payload.height > 0 &&
      payload.height <= 10000
        ? Math.round(payload.height)
        : (parsedDims?.height ?? null);
    const validLqip =
      typeof payload.lqip === 'string' &&
      payload.lqip.startsWith('data:image/') &&
      payload.lqip.length <= 4096
        ? payload.lqip
        : null;

    const { error: dbErr } = await supabaseAdminClient
      .from(tableName)
      .update({
        photo_path: path,
        photo_width: validWidth,
        photo_height: validHeight,
        photo_lqip: validLqip,
      })
      .eq('id', ascentId);

    if (dbErr) {
      console.error('[upload-route-ascent-photo] DB update failed', dbErr);
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

    return jsonResponse(
      {
        path,
        publicUrl,
        photo_width: validWidth,
        photo_height: validHeight,
        photo_lqip: validLqip,
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: 'Server error' }, 500, corsHeaders);
  }
});
