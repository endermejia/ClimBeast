import { computed, inject, Injectable, signal } from '@angular/core';

import type { TopoDetail } from '../models';

import { CACHE_KEYS } from '../constants';

import { IS_BROWSER } from '../app/is-browser';

import { CacheService } from './cache.service';
import { OutdoorDataService } from './outdoor-data.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { TopoImageCacheService } from './topo-image-cache.service';

export interface OfflineTopoTarget {
  id: number;
  photo?: string | null;
}

export interface OfflineToposStatus {
  total: number;
  cachedCount: number;
  allAvailable: boolean;
}

export interface OfflineDownloadProgress {
  current: number;
  total: number;
}

const DOWNLOAD_BATCH_SIZE = 3;

@Injectable({ providedIn: 'root' })
export class OfflineToposService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly cache = inject(CacheService);
  private readonly outdoorData = inject(OutdoorDataService);
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);
  private readonly topoImageCache = inject(TopoImageCacheService);

  private readonly localVersion = signal(0);

  /** Señal reactiva que cambia cuando se cachea un topo o su imagen. */
  readonly version = computed(
    () => this.localVersion() + this.topoImageCache.cacheVersion(),
  );

  /** Progreso de descarga activo por clave de ámbito (área o sector). */
  readonly progressMap = signal<ReadonlyMap<string, OfflineDownloadProgress>>(
    new Map(),
  );

  /**
   * Comprueba si todos los topos indicados tienen sus rutas (`TopoDetail`) y
   * sus imágenes (`TopoImageCacheService`) disponibles para consulta offline.
   */
  async checkToposAvailability(
    topos: readonly OfflineTopoTarget[],
  ): Promise<OfflineToposStatus> {
    if (!this.isBrowser || topos.length === 0) {
      return { total: topos.length, cachedCount: 0, allAvailable: false };
    }

    const version = this.outdoorData.topoPhotoVersion();
    const results = await Promise.all(
      topos.map((topo) => this.isTopoAvailableOffline(topo, version)),
    );
    const cachedCount = results.filter(Boolean).length;

    return {
      total: topos.length,
      cachedCount,
      allAvailable: cachedCount === topos.length,
    };
  }

  /**
   * Descarga y persiste en caché local todas las rutas e imágenes de los
   * topos indicados para que estén disponibles sin conexión.
   */
  async downloadTopos(
    scopeKey: string,
    topos: readonly OfflineTopoTarget[],
  ): Promise<boolean> {
    if (!this.isBrowser || topos.length === 0) return false;
    if (!this.supabase.isOnline()) return false;
    if (this.progressMap().has(scopeKey)) return false;

    this.setProgress(scopeKey, { current: 0, total: topos.length });
    const version = this.outdoorData.topoPhotoVersion();
    let completed = 0;

    try {
      for (let i = 0; i < topos.length; i += DOWNLOAD_BATCH_SIZE) {
        const batch = topos.slice(i, i + DOWNLOAD_BATCH_SIZE);
        await Promise.all(
          batch.map(async (topo) => {
            await this.downloadSingleTopo(topo, version);
            completed += 1;
            this.setProgress(scopeKey, {
              current: completed,
              total: topos.length,
            });
          }),
        );
      }

      this.localVersion.update((v) => v + 1);
      const status = await this.checkToposAvailability(topos);
      if (status.allAvailable) {
        this.toast.success('offline.toposDownloaded');
        return true;
      }
      this.toast.error('offline.toposDownloadError');
      return false;
    } catch {
      this.localVersion.update((v) => v + 1);
      this.toast.error('offline.toposDownloadError');
      return false;
    } finally {
      this.clearProgress(scopeKey);
    }
  }

  private async isTopoAvailableOffline(
    topo: OfflineTopoTarget,
    version: number,
  ): Promise<boolean> {
    const detail = this.cache.get<TopoDetail | null>(
      CACHE_KEYS.topoDetail(topo.id),
      null,
    );
    if (!detail || !Array.isArray(detail.topo_routes)) {
      return false;
    }

    if (!topo.photo) {
      return true;
    }

    const signedUrl = this.supabase.getCachedTopoSignedUrl(topo.photo, version);
    if (!signedUrl) {
      return false;
    }

    return this.topoImageCache.has(signedUrl);
  }

  private async downloadSingleTopo(
    topo: OfflineTopoTarget,
    version: number,
  ): Promise<void> {
    try {
      await this.outdoorData.cacheTopoDetail(topo.id);
      if (topo.photo) {
        const signedUrl = await this.supabase.getTopoSignedUrl(
          topo.photo,
          version,
        );
        if (signedUrl) {
          await this.topoImageCache.prefetch(signedUrl);
        }
      }
    } catch (e) {
      console.warn(
        `[OfflineToposService] Error downloading topo ${topo.id}`,
        e,
      );
    }
  }

  private setProgress(
    scopeKey: string,
    progress: OfflineDownloadProgress,
  ): void {
    this.progressMap.update((prev) => {
      const next = new Map(prev);
      next.set(scopeKey, progress);
      return next;
    });
  }

  private clearProgress(scopeKey: string): void {
    this.progressMap.update((prev) => {
      if (!prev.has(scopeKey)) return prev;
      const next = new Map(prev);
      next.delete(scopeKey);
      return next;
    });
  }
}
