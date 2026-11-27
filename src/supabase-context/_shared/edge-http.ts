export const ALLOWED_ORIGINS = [
  'http://localhost:4200',
  'https://climbeast.com',
] as const;

export const R2_STORAGE_URL = 'https://climbeast-storage.climbeast.workers.dev';

const BASE_ALLOWED_HEADERS = [
  'authorization',
  'x-client-info',
  'apikey',
  'content-type',
] as const;

export function rewriteStorageUrlToR2(
  urlStr: string,
  supabaseUrl: string,
  r2Url: string = R2_STORAGE_URL,
): string | null {
  const normalizedSupabaseUrl = supabaseUrl.replace(/\/$/, '');
  if (!normalizedSupabaseUrl) {
    return null;
  }

  const storagePrefix = `${normalizedSupabaseUrl}/storage/v1`;
  if (urlStr.startsWith(storagePrefix)) {
    return `${r2Url.replace(/\/$/, '')}/storage/v1${urlStr.slice(storagePrefix.length)}`;
  }

  return null;
}

export function buildCorsHeaders(
  origin: string,
  extraAllowedHeaders: readonly string[] = [],
): Record<string, string> {
  const corsHeaders: Record<string, string> = {};

  if ((ALLOWED_ORIGINS as readonly string[]).includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Headers'] = [
      ...BASE_ALLOWED_HEADERS,
      ...extraAllowedHeaders,
      'ngsw-bypass',
    ].join(', ');
    corsHeaders['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  }

  return corsHeaders;
}

export function extractBearerToken(authHeader: string | null): string {
  return (authHeader ?? '').replace(/^Bearer\s+/i, '').trim();
}

export function jsonResponse(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
