import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';

import { SupabaseService } from '../services/supabase.service';

import { waitForResource } from '../utils';

import { IS_BROWSER } from '../app/is-browser';

/** Allows route matching only for admin users. On server, always allow. */
export const adminGuard: CanMatchFn = async (): Promise<boolean | UrlTree> => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);
  const isBrowser = inject(IS_BROWSER);

  if (!isBrowser) return true;

  // Un guard que lanza cancela la navegación y deja el router-outlet vacío
  // (pantalla en blanco): nunca se propaga una excepción.
  try {
    // Ensure the client is initialized and session is loaded
    await supabase.whenReady();
    const session = await supabase.getSession();

    if (!session) {
      // Sin conexión y sin sesión guardada: landing pública en vez de login.
      return router.createUrlTree([supabase.isOnline() ? '/login' : '/info']);
    }

    // Wait for user profile to be loaded
    const profile = await waitForResource(supabase.userProfileResource);

    if (profile !== undefined) {
      if (profile?.is_admin) {
        return true;
      }

      // User is logged in but not an admin
      console.warn(
        '[AdminGuard] User is not admin. is_admin:',
        profile?.is_admin,
      );
      return router.createUrlTree(['/page-not-found']);
    }

    // If profile didn't load after waiting, redirect to page-not-found
    console.error('[AdminGuard] Timeout waiting for user profile');
    return router.createUrlTree(['/page-not-found']);
  } catch (e) {
    console.warn('[AdminGuard] Unexpected error, using safe fallback', e);
    return router.createUrlTree(['/page-not-found']);
  }
};

/** Allows route matching for admin or area admin users. On server, always allow. */
export const areaAdminGuard: CanMatchFn = async (): Promise<
  boolean | UrlTree
> => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);
  const isBrowser = inject(IS_BROWSER);

  if (!isBrowser) return true;

  try {
    await supabase.whenReady();
    const session = await supabase.getSession();

    if (!session) {
      return router.createUrlTree([supabase.isOnline() ? '/login' : '/info']);
    }

    const profile = await waitForResource(supabase.userProfileResource);

    if (profile !== undefined) {
      if (profile?.is_admin) {
        return true;
      }

      // Check if user has area admin permissions
      const areas = await waitForResource(supabase.adminAreasResource);
      if (areas !== undefined && areas.length > 0) {
        return true;
      }

      console.warn('[AreaAdminGuard] User has no admin permissions');
    }

    return router.createUrlTree(['/page-not-found']);
  } catch (e) {
    console.warn('[AreaAdminGuard] Unexpected error, using safe fallback', e);
    return router.createUrlTree(['/page-not-found']);
  }
};

/** Allows route matching for admin or indoor center admin users. On server, always allow. */
export const indoorAdminGuard: CanMatchFn = async (): Promise<
  boolean | UrlTree
> => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);
  const isBrowser = inject(IS_BROWSER);

  if (!isBrowser) return true;

  try {
    await supabase.whenReady();
    const session = await supabase.getSession();

    if (!session) {
      return router.createUrlTree([supabase.isOnline() ? '/login' : '/info']);
    }

    const profile = await waitForResource(supabase.userProfileResource);

    if (profile !== undefined) {
      if (profile?.is_admin) {
        return true;
      }

      // Check if user has indoor center admin permissions
      const centers = await waitForResource(
        supabase.adminIndoorCentersResource,
      );
      if (centers !== undefined && centers.length > 0) {
        return true;
      }

      console.warn(
        '[IndoorAdminGuard] User has no indoor center admin permissions',
      );
    }

    return router.createUrlTree(['/page-not-found']);
  } catch (e) {
    console.warn('[IndoorAdminGuard] Unexpected error, using safe fallback', e);
    return router.createUrlTree(['/page-not-found']);
  }
};

/** Allows route matching for admin or routesetters. On server, always allow. */
export const routesetterGuard: CanMatchFn = async (): Promise<
  boolean | UrlTree
> => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);
  const isBrowser = inject(IS_BROWSER);

  if (!isBrowser) return true;

  try {
    await supabase.whenReady();
    const session = await supabase.getSession();

    if (!session) {
      return router.createUrlTree([supabase.isOnline() ? '/login' : '/info']);
    }

    const profile = await waitForResource(supabase.userProfileResource);

    if (profile !== undefined) {
      if (profile?.is_admin) {
        return true;
      }

      // Check if user is routesetter in any indoor center
      const centers = await waitForResource(
        supabase.routesetterIndoorCentersResource,
      );
      if (centers !== undefined && centers.length > 0) {
        return true;
      }

      console.warn('[RoutesetterGuard] User has no routesetter permissions');
    }

    return router.createUrlTree(['/page-not-found']);
  } catch (e) {
    console.warn('[RoutesetterGuard] Unexpected error, using safe fallback', e);
    return router.createUrlTree(['/page-not-found']);
  }
};
