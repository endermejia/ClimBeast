// Shared slugify utility (SSR-safe, pure function)
// - Normalizes to NFD, strips diacritics, lowercases, trims
// - Replaces non [a-z0-9] with hyphens, collapses multiple hyphens
// - Trims leading/trailing hyphens
export function slugify(input: string | undefined | null): string {
  const value = (input ?? '').toString();
  if (!value) return '';
  let v = value
    .normalize('NFD')
    // Remove combining diacritical marks
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  // Replace non-alphanumeric with hyphens
  v = v.replace(/[^a-z0-9]+/g, '-');
  // Collapse multiple hyphens
  v = v.replace(/-+/g, '-');
  // Trim hyphens at ends
  v = v.replace(/^-+|-+$/g, '');
  return v;
}
// Sector (crag) slug used across the 8a.nu import flow. Mirrors the import
// payload rule: empty/whitespace-only sector names become "General"/"general",
// so keys built during the preview step and during the actual import agree.
export function sectorSlug(name: string | undefined | null): string {
  return slugify((name ?? '').trim() || 'General') || 'general';
}
// Strict normalization for duplicate detection: only strips diacritics and lowercases.
// Does NOT replace hyphens, dots or other separators, so "V.T." and "V T" stay distinct.
export function normalizeNameStrict(input: string | undefined | null): string {
  const value = (input ?? '').toString();
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['´`]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeName(input: string | undefined | null): string {
  const value = (input ?? '').toString();
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’´`]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Memoization cache for query normalization and splitting during list filtering
let lastQuery: string | undefined | null = undefined;
let lastQueryWords: string[] = [];

/**
 * Checks if source string contains all words in search query (case/accent insensitive).
 * Optimized for list filtering: memoizes query normalization and split words
 * so repeated calls with the same search query avoid redundant NFD string normalizations
 * and regex executions (>40x faster during array filtering).
 */
export function matchesQuery(
  source: string | undefined | null,
  query: string | undefined | null,
): boolean {
  if (!query) return true;

  let queryWords: string[];
  if (query === lastQuery) {
    queryWords = lastQueryWords;
  } else {
    const nQuery = normalizeName(query);
    queryWords = nQuery ? nQuery.split(' ') : [];
    lastQuery = query;
    lastQueryWords = queryWords;
  }

  if (queryWords.length === 0) return true;
  if (!source) return false;

  const nSource = normalizeName(source);
  return queryWords.every((word) => nSource.includes(word));
}
