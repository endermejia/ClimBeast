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

  await supabase.whenReady();
  const session = supabase.session();

  if (session) {
    return router.createUrlTree(['/home']);
  }

  return true;
};
