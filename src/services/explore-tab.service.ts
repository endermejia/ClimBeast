import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';

import { filter, map } from 'rxjs';

import { STORAGE_KEYS } from '../constants';

import { LocalStorage } from './local-storage';

export type ExploreTab = '/area' | '/indoor';

const DEFAULT_TAB: ExploreTab = '/area';

function normalizePath(url: string): string {
  return url.split('?')[0].split('#')[0];
}

/**
 * Rutas de detalle explorables: un área, un crag o un centro indoor concreto
 * (incluidas sus subrutas de ruta/topo). `/area/redirect` no cuenta porque es
 * un helper de redirección, no una pantalla.
 */
function isDetailPath(path: string): boolean {
  if (path.startsWith('/area/')) return !path.startsWith('/area/redirect');
  return path.startsWith('/indoor/');
}

/** Rutas que ya forman parte del contexto "explorar" (listados y mapa). */
function isExploreContext(path: string): boolean {
  return (
    path === '/explore' ||
    path === '/area' ||
    path.startsWith('/area/') ||
    path === '/indoor' ||
    path.startsWith('/indoor/')
  );
}

/**
 * Estado del botón "Explorar" del navbar:
 *
 * 1. Recuerda la última opción seleccionada en el `tui-segmented` de los
 *    listados (áreas o indoor) y la persiste en localStorage.
 * 2. Recuerda la última ruta de detalle visitada (área, crag o centro
 *    indoor): la primera pulsación desde fuera de explorar vuelve a ella y la
 *    siguiente ya lleva al listado, que es el último que se visitó.
 */
@Injectable({
  providedIn: 'root',
})
export class ExploreTabService {
  private readonly router = inject(Router);
  private readonly storage = inject(LocalStorage);

  private readonly tab = signal<ExploreTab>(this.readStored());

  /** Última ruta de detalle (área/crag/indoor); se olvida al volver a un listado. */
  private readonly detailPath = signal<string | null>(null);

  /** Ruta del último segmento seleccionado: `/area` o `/indoor`. */
  readonly link = this.tab.asReadonly();

  /** Ruta de detalle pendiente de retomar, si la hay. */
  readonly pendingDetail = this.detailPath.asReadonly();

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => normalizePath(e.urlAfterRedirects)),
    ),
    { initialValue: normalizePath(this.router.url) },
  );

  /**
   * Destino del botón "Explorar": la última ruta de detalle visitada cuando
   * venimos de fuera de explorar; en cualquier otro caso (o una vez retomado
   * el detalle) el último listado visitado.
   */
  readonly target = computed(() => {
    const path = this.currentPath();
    const detail = this.detailPath();
    if (detail && detail !== path && !isExploreContext(path)) return detail;
    return this.tab();
  });

  constructor() {
    effect(() => {
      const path = this.currentPath();

      // Visitar cualquiera de los dos listados equivale a seleccionar su
      // segmento: se registra y se persiste la preferencia.
      if ((path === '/area' || path === '/indoor') && this.tab() !== path) {
        this.tab.set(path);
        this.storage.setItem(STORAGE_KEYS.exploreLastTab, path);
      }

      // Al entrar en un detalle se recuerda para volver a él desde el navbar;
      // al volver a un listado se olvida, de modo que la siguiente pulsación
      // lleva al listado y no al detalle otra vez.
      if (isDetailPath(path)) {
        this.detailPath.set(path);
      } else if (path === '/area' || path === '/indoor') {
        this.detailPath.set(null);
      }
    });
  }

  private readStored(): ExploreTab {
    const stored = this.storage.getItem(STORAGE_KEYS.exploreLastTab);
    return stored === '/area' || stored === '/indoor' ? stored : DEFAULT_TAB;
  }
}
