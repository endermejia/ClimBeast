import { createClient } from 'npm:@supabase/supabase-js@2.33.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const _SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdminClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  if (action === 'test-user-sign') {
    // Generate a session or token for user
    const { data: userData } = await supabaseAdminClient.auth.admin.listUsers();
    const user = userData?.users?.[0];
    if (!user) return new Response('No user', { status: 400 });

    // Create a client with a custom token or sign in
    // In Supabase, service client can create signed url directly or we can inspect RLS
    const adminSign1 = await supabaseAdminClient.storage
      .from('topos')
      .createSignedUrl('topos/29.jpg', 60);
    const adminSign2 = await supabaseAdminClient.storage
      .from('topos')
      .createSignedUrl('topos/29_thumb.webp', 60);

    return new Response(
      JSON.stringify({
        user: { id: user.id, email: user.email },
        adminSign1,
        adminSign2,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  return new Response('ok');
});
