import crypto from 'node:crypto';
import https from 'node:https';

let cachedCookie: { cookie: string; expiresAt: number } | null = null;
let acquisitionPromise: Promise<string> | null = null;

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function solveChallenge(
  challenge: string,
  complexity: number,
): { sol: string; hashes: number; elapsed: number } {
  const challengeBuf = Buffer.from(challenge, 'utf8');
  let c = 0;
  const start = Date.now();
  while (true) {
    let byteLen = 1;
    if (c > 16777215) byteLen = 4;
    else if (c > 65535) byteLen = 3;
    else if (c > 255) byteLen = 2;

    const e = Buffer.alloc(byteLen);
    let temp = c;
    for (let n = byteLen - 1; n >= 0; n--) {
      e[n] = temp & 255;
      temp >>>= 8;
    }

    const payload = Buffer.concat([challengeBuf, e]);
    const hash = crypto.createHash('sha1').update(payload).digest();
    const firstWord = hash.readUInt32BE(0);

    if (firstWord >>> (32 - complexity) === 0) {
      const elapsed = Date.now() - start;
      return {
        sol: payload.toString('base64'),
        hashes: c,
        elapsed,
      };
    }
    c++;
    if (c > 10000000) throw new Error('Could not solve SG-Captcha challenge');
  }
}

async function doAcquireClearanceCookie(): Promise<string> {
  const res1 = await fetch(
    'https://www.desnivel.com/wp-json/wp/v2/posts?per_page=1',
    {
      headers: { 'User-Agent': BROWSER_USER_AGENT },
    },
  );

  if (res1.ok && res1.status === 200) {
    return '';
  }

  const html1 = await res1.text();
  const m1 = html1.match(/content="0;([^"]+)"/);
  if (!m1) {
    throw new Error('SG-Captcha initial redirect not found');
  }
  const nextUrl = 'https://www.desnivel.com' + m1[1];

  const res2 = await fetch(nextUrl, {
    headers: { 'User-Agent': BROWSER_USER_AGENT },
  });
  const html2 = await res2.text();
  const match = html2.match(/const sgchallenge="([^"]+)"/);
  const submitMatch = html2.match(/const sgsubmit_url="([^"]+)"/);
  if (!match || !submitMatch) {
    throw new Error('SG-Captcha challenge parameters not found in HTML');
  }

  const challenge = match[1];
  const submitPath = submitMatch[1];
  const complexity = parseInt(challenge.split(':')[0], 10);

  const solution = solveChallenge(challenge, complexity);
  const submitUrl =
    'https://www.desnivel.com' +
    submitPath +
    (submitPath.includes('?') ? '&' : '?') +
    'sol=' +
    encodeURIComponent(solution.sol) +
    '&s=' +
    solution.elapsed +
    ':' +
    solution.hashes;

  const res3 = await fetch(submitUrl, {
    headers: { 'User-Agent': BROWSER_USER_AGENT },
    redirect: 'manual',
  });

  const rawSetCookie = res3.headers.get('set-cookie') || '';
  await res3.text();
  const cookieMatch = rawSetCookie.match(/_I_=[^;]+/);
  if (!cookieMatch) {
    throw new Error('SG-Captcha clearance cookie was not returned');
  }

  const cookie = cookieMatch[0];
  cachedCookie = {
    cookie,
    expiresAt: Date.now() + 25 * 24 * 60 * 60 * 1000,
  };
  return cookie;
}

async function acquireClearanceCookie(): Promise<string> {
  if (cachedCookie && cachedCookie.expiresAt > Date.now()) {
    return cachedCookie.cookie;
  }
  if (!acquisitionPromise) {
    acquisitionPromise = doAcquireClearanceCookie().finally(() => {
      acquisitionPromise = null;
    });
  }
  return acquisitionPromise;
}

export async function fetchDesnivelUpstream(
  pathWithQuery: string,
): Promise<{ status: number; contentType: string; body: Uint8Array }> {
  let cookie = await acquireClearanceCookie();

  const makeReq = async (cookieHeader: string) => {
    const url = new URL(
      'https://www.desnivel.com' +
        (pathWithQuery.startsWith('/') ? pathWithQuery : '/' + pathWithQuery),
    );

    const isImage =
      pathWithQuery.startsWith('/images/') ||
      /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(pathWithQuery);
    const headers: Record<string, string> = {
      'User-Agent': BROWSER_USER_AGENT,
      Accept: isImage
        ? 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        : 'application/json, text/plain, */*',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      Referer: 'https://www.desnivel.com/',
    };
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    return new Promise<{
      status: number;
      contentType: string;
      body: Uint8Array;
    }>((resolve, reject) => {
      const req = https.request(
        {
          hostname: url.hostname,
          port: 443,
          path: url.pathname + url.search,
          method: 'GET',
          headers,
          ciphers:
            'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384',
          honorCipherOrder: true,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          res.on('end', () => {
            const fullBody = Buffer.concat(chunks);
            resolve({
              status: res.statusCode || 200,
              contentType: res.headers['content-type'] || 'application/json',
              body: new Uint8Array(fullBody),
            });
          });
        },
      );
      req.on('error', reject);
      req.end();
    });
  };

  let result = await makeReq(cookie);
  if (result.status === 202) {
    cachedCookie = null;
    cookie = await acquireClearanceCookie();
    result = await makeReq(cookie);
  }

  return result;
}
