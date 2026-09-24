import { inject } from '@angular/core';
import { CanMatchFn, Route, Router, UrlTree } from '@angular/router';

import { SupabaseService } from '../services/supabase.service';

import { CACHE_KEYS } from '../constants/cache-keys';

import { IS_BROWSER } from '../app/is-browser';

export const authGuard: CanMatchFn = async (
  route: Route,
): Promise<boolean | UrlTree> => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);
  const isBrowser = inject(IS_BROWSER);

  // On the server, allow matching to render pages; actual redirects should be handled in serverRoutes if needed
  if (!isBrowser) {
    return true;
  }

  // Un guard que lanza una excepción cancela la navegación y deja el
  // router-outlet vacío (pantalla en blanco): nunca se propaga.
  try {
    // Wait for client init (resolves from localStorage, no network call needed).
    await supabase.whenReady();
    const session = supabase.session();
    if (!session) {
      // Sin conexión y sin sesión guardada: a la landing pública; el login no
      // podría completarse sin red.
      return router.createUrlTree([supabase.isOnline() ? '/login' : '/info']);
    }

    // If the user name is equal to their email, they need to complete their profile setup.
    // We redirect them to /profile/config unless they are already going there.
    if (route.path !== 'profile/config') {
      // We try to get the profile from the resource, or fetch it if not available yet.
      let profileName = supabase.userProfile()?.name;

      if (!profileName && supabase.isOnline()) {
        try {
          const { data, error } = await supabase.client
            .from('user_profiles')
            .select('name')
            .eq('id', session.user.id)
            .maybeSingle();
          if (error) throw error;
          profileName = data?.name;
        } catch (e) {
          console.warn(
            '[authGuard] Error fetching user profile name, falling back to cache',
            e,
          );
          try {
            const cacheKey = CACHE_KEYS.userProfile(session.user.id);
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              profileName = parsed?.name;
            }
          } catch (cacheErr) {
            console.warn('[authGuard] Error reading from cache', cacheErr);
          }
        }
      }

      if (profileName && profileName === session.user.email) {
        return router.createUrlTree(['/profile/config']);
      }
    } else if (supabase.isOnline()) {
      // When on the profile config route, always fetch fresh data to check if setup is complete
      try {
        const { data, error } = await supabase.client
          .from('user_profiles')
          .select('name')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) throw error;

        // If profile is now complete (name != email), refresh the signal
        if (data?.name && data.name !== session.user.email) {
          supabase.userProfileResource.reload();
        }
      } catch (e) {
        console.warn(
          '[authGuard] Error fetching profile data on config route',
          e,
        );
      }
    }

    return true;
  } catch (e) {
    // Redirigir a una ruta pública segura en vez de dejar la navegación vacía.
    console.warn('[authGuard] Unexpected error, using safe fallback', e);
    return router.createUrlTree(['/page-not-found']);
  }
};
