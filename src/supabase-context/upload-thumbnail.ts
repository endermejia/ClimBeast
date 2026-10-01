Deno.serve(() => {
  return new Response(
    JSON.stringify({ error: 'Endpoint deprecated and removed.' }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 410,
    },
  );
});
