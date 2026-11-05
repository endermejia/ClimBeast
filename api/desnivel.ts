import type { IncomingMessage, ServerResponse } from 'node:http';

import { fetchDesnivelUpstream } from '../src/server/desnivel-fetcher';

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const parsed = new URL(req.url || '/', 'https://localhost');
    let targetPath = parsed.searchParams.get('path') || '';
    parsed.searchParams.delete('path');
    const remainingQuery = parsed.searchParams.toString();
    if (remainingQuery) {
      targetPath += (targetPath.includes('?') ? '&' : '?') + remainingQuery;
    }
    if (!targetPath.startsWith('/')) {
      targetPath = '/' + targetPath;
    }

    const result = await fetchDesnivelUpstream(targetPath);
    res.statusCode = result.status;
    res.setHeader('Content-Type', result.contentType);
    const isImage =
      targetPath.startsWith('/images/') ||
      /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(targetPath);
    res.setHeader(
      'Cache-Control',
      isImage
        ? 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'
        : 'public, s-maxage=300, stale-while-revalidate=600',
    );
    res.end(Buffer.from(result.body));
  } catch (e: unknown) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Desnivel upstream fetch failed',
        message: e instanceof Error ? e.message : String(e),
      }),
    );
  }
}
