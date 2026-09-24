import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';

import { SupabaseService } from '../services/supabase.service';

import { IS_BROWSER } from '../app/is-browser';

export const noAuthGuard: CanMatchFn = async (): Promise<boolean | UrlTree> => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);
  const isBrowser = inject(IS_BROWSER);

  if (!isBrowser) {
    return true;
  }

  // Un guard que lanza cancela la navegación y deja la pantalla en blanco.
  try {
    await supabase.whenReady();
    const session = supabase.session();

    if (session) {
      return router.createUrlTree(['/home']);
    }

    return true;
  } catch (e) {
    // /info es público: se muestra aunque falle la comprobación de sesión.
    console.warn('[noAuthGuard] Unexpected error, allowing access', e);
    return true;
  }
};
