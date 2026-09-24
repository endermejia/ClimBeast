import { effect, inject, Injectable, signal } from '@angular/core';
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
 * Recuerda la última opción seleccionada en el `tui-segmented` de los
 * listados (áreas o indoor) para que el botón "Explorar" del navbar abra
 * esa misma opción. Se persiste en localStorage.
 */
@Injectable({
  providedIn: 'root',
})
export class ExploreTabService {
  private readonly router = inject(Router);
  private readonly storage = inject(LocalStorage);

  private readonly tab = signal<ExploreTab>(this.readStored());

  /** Ruta del último segmento seleccionado: `/area` o `/indoor`. */
  readonly link = this.tab.asReadonly();

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => normalizePath(e.urlAfterRedirects)),
    ),
    { initialValue: normalizePath(this.router.url) },
  );

  constructor() {
    // Visitar cualquiera de los dos listados equivale a seleccionar su
    // segmento: se registra y se persiste la preferencia.
    effect(() => {
      const path = this.currentPath();
      if ((path === '/area' || path === '/indoor') && this.tab() !== path) {
        this.tab.set(path);
        this.storage.setItem(STORAGE_KEYS.exploreLastTab, path);
      }
    });
  }

  private readStored(): ExploreTab {
    const stored = this.storage.getItem(STORAGE_KEYS.exploreLastTab);
    return stored === '/area' || stored === '/indoor' ? stored : DEFAULT_TAB;
  }
}
