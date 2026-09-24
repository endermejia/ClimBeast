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

  // Un guard que lanza cancela la navegación y deja la pantalla en blanco.
  try {
    // Wait for client init (resolves from localStorage, no network call needed).
    await supabase.whenReady();
    const session = supabase.session();

    if (session) {
      // Authenticated user (o sesión conservada en modo offline) -> /home
      return router.createUrlTree(['/home']);
    }

    // Non-authenticated user (online o sin conexión) -> /info
    return router.createUrlTree(['/info']);
  } catch (e) {
    console.warn('[rootRedirectGuard] Unexpected error, going to /info', e);
    return router.createUrlTree(['/info']);
  }
};
