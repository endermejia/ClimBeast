export function toProxiedDesnivelUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const match = url.match(/^https?:\/\/(?:www\.)?desnivel\.com(\/.*)$/i);
  if (match) {
    return `/api/desnivel${match[1]}`;
  }
  return url;
}
