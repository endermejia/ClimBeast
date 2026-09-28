import { Router, UrlTree } from '@angular/router';

/**
 * Builds the `/page-not-found` UrlTree, tagging `offline=true` when the
 * browser currently has no connectivity.
 *
 * `PageNotFoundComponent` reads that flag to render the "not cached offline"
 * fallback (with *go back* / *go home* actions) instead of the plain 404, so a
 * user who is offline always lands on a screen they can act on.
 *
 * Guards should redirect through this helper rather than building the tree
 * themselves, otherwise the 404 page cannot tell "wrong URL" from "no network".
 */
export function pageNotFoundTree(router: Router): UrlTree {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  return router.createUrlTree(['/page-not-found'], {
    queryParams: isOffline ? { offline: 'true' } : undefined,
  });
}
