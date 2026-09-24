import { inject, Injectable } from '@angular/core';

import { CACHE_KEYS } from '../constants';

import { IS_BROWSER } from '../app/is-browser';

import { CacheService } from './cache.service';
import { OutdoorDataService } from './outdoor-data.service';
import { SupabaseService } from './supabase.service';

/** Caducidad de la caché de áreas para decidir si vale la pena refrescarla. */
const AREAS_LIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class OfflineWarmupService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);
  private readonly cache = inject(CacheService);
  private readonly outdoorData = inject(OutdoorDataService);

  private warmed = false;

  /**
   * Precachea las listas principales en localStorage cuando hay sesión y red,
   * para que la PWA pueda mostrar áreas/crags/topos sin conexión.
   *
   * Lee señales (sesión/conexión): debe llamarse desde un `effect()` para que
   * se re-evalúe cuando la sesión termine de inicializar o se recupere la red.
   * Solo ejecuta el precaché una vez por carga de página.
   */
  warmup(): void {
    const online = this.supabase.isOnline();
    const session = this.supabase.session();
    if (!this.isBrowser || !session || !online || this.warmed) return;
    this.warmed = true;
    this.warmAreasList();
  }

  private warmAreasList(): void {
    const userId = this.supabase.authUserId();
    const key = userId
      ? `${CACHE_KEYS.areasList}_${userId}`
      : CACHE_KEYS.areasList;
    const lastUpdated = this.cache.getLastUpdated(key);
    // Solo se refresca si la entrada no existe o tiene más de 24h: la
    // stale-while-revalidate normal ya se encarga del resto.
    if (
      lastUpdated !== null &&
      Date.now() - lastUpdated < AREAS_LIST_MAX_AGE_MS
    ) {
      return;
    }
    this.outdoorData.reloadAreasList();
  }
}
