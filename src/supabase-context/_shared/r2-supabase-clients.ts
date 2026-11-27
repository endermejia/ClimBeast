import {
  createClient,
  type SupabaseClient,
} from 'npm:@supabase/supabase-js@2.33.0';

import {
  extractBearerToken,
  jsonResponse,
  rewriteStorageUrlToR2,
} from './edge-http.ts';

export interface R2SupabaseClients {
  supabaseAuthClient: SupabaseClient;
  supabaseAdminClient: SupabaseClient;
}

export type BearerAuthResult = { userId: string } | { response: Response };

export function createR2SupabaseClients(): R2SupabaseClients {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error('Missing SUPABASE_URL or keys');
  }

  // Client to validate token / get user
  const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  // Admin client with service role to bypass RLS for DB writes/storage
  const supabaseAdminClient = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: { persistSession: false },
      global: {
        fetch: (reqUrl, options) => {
          const rewrittenUrl = rewriteStorageUrlToR2(
            reqUrl.toString(),
            supabaseUrl,
          );
          if (rewrittenUrl) {
            return fetch(rewrittenUrl, options);
          }
          return fetch(reqUrl, options);
        },
      },
    },
  );

  return { supabaseAuthClient, supabaseAdminClient };
}

export async function authenticateBearerRequest(
  req: Request,
  supabaseAuthClient: SupabaseClient,
  corsHeaders: Record<string, string>,
): Promise<BearerAuthResult> {
  if (req.method === 'OPTIONS') {
    return {
      response: new Response(null, { status: 204, headers: corsHeaders }),
    };
  }

  if (req.method !== 'POST') {
    return {
      response: new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders,
      }),
    };
  }

  const token = extractBearerToken(req.headers.get('authorization'));
  if (!token) {
    return {
      response: jsonResponse({ error: 'Missing auth token' }, 401, corsHeaders),
    };
  }

  const { data: userResult, error: userErr } =
    await supabaseAuthClient.auth.getUser(token);

  if (userErr || !userResult.user) {
    return {
      response: jsonResponse({ error: 'Invalid token' }, 401, corsHeaders),
    };
  }

  return { userId: userResult.user.id };
}
