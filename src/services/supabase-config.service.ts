import { inject, Injectable, InjectionToken, Provider } from '@angular/core';

import { ENV_SUPABASE_URL } from '../environments/environment';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const SUPABASE_URL = new InjectionToken<string>('SUPABASE_URL');
export const SUPABASE_ANON_KEY = new InjectionToken<string>(
  'SUPABASE_ANON_KEY',
);

export function provideSupabaseConfig(config: SupabaseConfig): Provider[] {
  return [
    { provide: SUPABASE_URL, useValue: config.url },
    { provide: SUPABASE_ANON_KEY, useValue: config.anonKey },
  ];
}

@Injectable({ providedIn: 'root' })
export class SupabaseConfigService {
  readonly url =
    inject(SUPABASE_URL, { optional: true }) || ENV_SUPABASE_URL || '';
  readonly anonKey = inject(SUPABASE_ANON_KEY, { optional: true }) || '';
}
