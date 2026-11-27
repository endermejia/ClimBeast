import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';

import { SupabaseService } from '../services/supabase.service';

import { pageNotFoundTree, waitForResource } from '../utils';

import { IS_BROWSER } from '../app/is-browser';

interface RoleGuardConfig {
  tag: string;
  checkRole?: (supabase: SupabaseService) => Promise<boolean>;
  unauthorizedMessage?: string;
}

function createRoleGuard(config: RoleGuardConfig): CanMatchFn {
  return async (): Promise<boolean | UrlTree> => {
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

      // Wait for user profile to be loaded (use cached profile immediately if available)
      const profile =
        supabase.userProfile() ??
        (await waitForResource(supabase.userProfileResource));

      if (profile !== undefined) {
        if (profile?.is_admin) {
          return true;
        }

        if (config.checkRole) {
          if (await config.checkRole(supabase)) {
            return true;
          }
          if (config.unauthorizedMessage) {
            console.warn(`[${config.tag}] ${config.unauthorizedMessage}`);
          }
        } else {
          console.warn(
            `[${config.tag}] User is not admin. is_admin:`,
            profile?.is_admin,
          );
        }

        return pageNotFoundTree(router);
      }

      if (!config.checkRole) {
        console.error(`[${config.tag}] Timeout waiting for user profile`);
      }
      return pageNotFoundTree(router);
    } catch (e) {
      console.warn(`[${config.tag}] Unexpected error, using safe fallback`, e);
      return pageNotFoundTree(router);
    }
  };
}

async function hasAnyAssignedId<T>(
  cached: readonly T[],
  resourceRef: Parameters<typeof waitForResource<readonly T[] | undefined>>[0],
): Promise<boolean> {
  const items = cached.length > 0 ? cached : await waitForResource(resourceRef);
  return items !== undefined && items.length > 0;
}

/** Allows route matching only for admin users. On server, always allow. */
export const adminGuard: CanMatchFn = createRoleGuard({
  tag: 'AdminGuard',
});

/** Allows route matching for admin or area admin users. On server, always allow. */
export const areaAdminGuard: CanMatchFn = createRoleGuard({
  tag: 'AreaAdminGuard',
  checkRole: (supabase) =>
    hasAnyAssignedId(supabase.adminAreas(), supabase.adminAreasResource),
  unauthorizedMessage: 'User has no admin permissions',
});

/** Allows route matching for admin or indoor center admin users. On server, always allow. */
export const indoorAdminGuard: CanMatchFn = createRoleGuard({
  tag: 'IndoorAdminGuard',
  checkRole: (supabase) =>
    hasAnyAssignedId(
      supabase.adminIndoorCenters(),
      supabase.adminIndoorCentersResource,
    ),
  unauthorizedMessage: 'User has no indoor center admin permissions',
});

/** Allows route matching for admin or routesetters. On server, always allow. */
export const routesetterGuard: CanMatchFn = createRoleGuard({
  tag: 'RoutesetterGuard',
  checkRole: (supabase) =>
    hasAnyAssignedId(
      supabase.routesetterIndoorCenters(),
      supabase.routesetterIndoorCentersResource,
    ),
  unauthorizedMessage: 'User has no routesetter permissions',
});
