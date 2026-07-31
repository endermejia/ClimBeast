import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { SupabaseService } from '../services/supabase.service';

import { IS_BROWSER } from '../app/is-browser';

/**
 * Guard that redirects authenticated users to /home and non-authenticated users to /info.
 * Used for the root path ('') to provide different landing pages based on auth status.
 */
export const rootRedirectGuard: CanActivateFn = async (): Promise<
  boolean | UrlTree
> => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);
  const isBrowser = inject(IS_BROWSER);

  // On the server, redirect to /info (landing page) by default
  if (!isBrowser) {
    return router.createUrlTree(['/info']);
  }

  // Wait for client init (resolves from localStorage, no network call needed).
  await supabase.whenReady();
  const session = supabase.session();

  if (session) {
    // Authenticated user -> redirect to /home
    return router.createUrlTree(['/home']);
  } else {
    // Non-authenticated user -> redirect to /info
    return router.createUrlTree(['/info']);
  }
};
