import { inject, Injectable, signal } from '@angular/core';

import { IS_BROWSER } from '../app/is-browser';

/** Nombre de la caché de bytes (Cache Storage) con las fotos de los topos. */
const TOPO_IMAGE_CACHE = 'topo-images';

/** Límite de imágenes persistidas; las más antiguas se descartan (LRU). */
const MAX_ENTRIES = 200;

/**
 * Caché persistente de imágenes de topos (indoor y outdoor).
 *
 * La primera vez que se ve un topo se devuelve la URL normal (pública o
 * firmada) y en segundo plano se descargan los bytes a Cache Storage. En
 * visitas posteriores —incluso recargando la página o sin conexión— se
 * devuelve un `blob:` URL con la copia guardada, de modo que la imagen
 * "ya vista" siempre se muestra.
 *
 * Todo es best-effort: si Cache Storage, `fetch` o `createObjectURL` no
 * están disponibles (SSR, jsdom, modo privado), se devuelve la URL original
 * y la app funciona como hasta ahora.
 */
@Injectable({ providedIn: 'root' })
export class TopoImageCacheService {
  private readonly isBrowser = inject(IS_BROWSER);

  /** `null` cuando Cache Storage no está disponible en este entorno. */
  private readonly cacheReady = this.openCache();

  /** `blob:` URL ya materializada por clave, para no recrearla en cada render. */
  private readonly objectUrls = new Map<string, string>();

  /** Descargas en curso, para no pedir la misma imagen dos veces. */
  private readonly pending = new Map<string, Promise<boolean>>();

  /** Se incrementa cada vez que cambia el contenido de la caché de imágenes. */
  readonly cacheVersion = signal(0);

  /**
   * Indica si la imagen de `url` ya tiene sus bytes persistidos en caché.
   */
  async has(url: string | null | undefined): Promise<boolean> {
    if (!url || !this.isBrowser) return false;
    try {
      if (this.objectUrls.has(url)) return true;
      const cache = await this.cacheReady;
      if (!cache) return false;
      const cached = await cache.match(url);
      return !!cached;
    } catch {
      return false;
    }
  }

  /**
   * Descarga y persiste la imagen de `url` en Cache Storage esperando a que
   * finalice. Devuelve `true` si la imagen queda disponible en caché.
   */
  async prefetch(url: string | null | undefined): Promise<boolean> {
    if (!url || !this.isBrowser) return false;
    try {
      const cache = await this.cacheReady;
      if (!cache) return false;

      if (this.objectUrls.has(url) || (await cache.match(url))) {
        return true;
      }

      return await this.download(url, cache);
    } catch {
      return false;
    }
  }

  /**
   * Devuelve la URL que debe usar el `<img>` de un topo.
   *
   * @param url URL pública (indoor) o firmada (outdoor) de la imagen.
   * @returns `blob:` URL si la imagen ya estaba cacheada; si no, la URL
   * original (y lanza la descarga en segundo plano). `null` si no hay URL.
   */
  async resolve(url: string | null | undefined): Promise<string | null> {
    if (!url) return null;
    try {
      const cache = await this.cacheReady;
      if (!cache) return url;

      const existing = this.objectUrls.get(url);
      if (existing) return existing;

      const cached = await cache.match(url);
      if (cached) {
        const blobUrl = await this.toBlobUrl(url, cached);
        if (blobUrl) return blobUrl;
      }

      void this.download(url, cache);
      return url;
    } catch {
      return url;
    }
  }

  /**
   * Elimina de la caché todas las imágenes cuya URL contiene `path`.
   *
   * Se usa cuando la foto de un topo cambia en el mismo path (el caso
   * indoor no lleva `?v=` de versión como el outdoor firmado).
   */
  async invalidate(path: string | null | undefined): Promise<void> {
    if (!path || !this.isBrowser) return;
    try {
      const cache = await this.cacheReady;
      if (!cache) return;
      const keys = await cache.keys();
      let deleted = false;
      await Promise.all(
        keys.map(async (request) => {
          if (!request.url.includes(path)) return;
          this.revoke(request.url);
          if (await cache.delete(request)) {
            deleted = true;
          }
        }),
      );
      if (deleted) {
        this.cacheVersion.update((v) => v + 1);
      }
    } catch {
      // best effort
    }
  }

  private openCache(): Promise<Cache | null> {
    if (!this.isBrowser || typeof caches === 'undefined') {
      return Promise.resolve(null);
    }
    try {
      return caches.open(TOPO_IMAGE_CACHE).catch(() => null);
    } catch {
      return Promise.resolve(null);
    }
  }

  /** Materializa la respuesta cacheada en un `blob:` URL reutilizable. */
  private async toBlobUrl(
    key: string,
    response: Response,
  ): Promise<string | null> {
    if (typeof URL?.createObjectURL !== 'function') return null;
    try {
      const blob = await response.blob();
      if (!blob.size) return null;
      const blobUrl = URL.createObjectURL(blob);
      this.objectUrls.set(key, blobUrl);
      return blobUrl;
    } catch {
      return null;
    }
  }

  /** Descarga la imagen a Cache Storage y devuelve `true` si se guardó. */
  private download(url: string, cache: Cache): Promise<boolean> {
    const existing = this.pending.get(url);
    if (existing) return existing;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return Promise.resolve(false);
    }
    const task = (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) return false;
        await cache.put(url, response);
        await this.trim(cache);
        this.cacheVersion.update((v) => v + 1);
        return true;
      } catch {
        // Sin red o bloqueado por CORS: se usa la caché del navegador.
        return false;
      } finally {
        this.pending.delete(url);
      }
    })();
    this.pending.set(url, task);
    return task;
  }

  /** Descarta las entradas más antiguas al superar el límite. */
  private async trim(cache: Cache): Promise<void> {
    const keys = await cache.keys();
    if (keys.length <= MAX_ENTRIES) return;
    const excess = keys.slice(0, keys.length - MAX_ENTRIES);
    await Promise.all(
      excess.map(async (request) => {
        this.revoke(request.url);
        await cache.delete(request);
      }),
    );
  }

  private revoke(key: string): void {
    const blobUrl = this.objectUrls.get(key);
    if (!blobUrl) return;
    if (typeof URL?.revokeObjectURL === 'function') {
      URL.revokeObjectURL(blobUrl);
    }
    this.objectUrls.delete(key);
  }
}
