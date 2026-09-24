import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';

import type { TuiSwipeEvent } from '@taiga-ui/cdk';

import { filter, map } from 'rxjs';

/**
 * Rutas que participan en la navegación circular por swipe:
 * home → áreas → perfil → home.
 */
const SWIPE_CYCLE = ['/home', '/area', '/profile'];

/**
 * Margen (ms) que deja la animación de View Transitions antes de limpiar
 * `data-nav-dir` del `<html>`.
 */
const CLEAR_DELAY_MS = 500;

function normalizePath(url: string): string {
  return url.split('?')[0].split('#')[0];
}

/**
 * Detecta si el gesto empieza dentro de un contenedor con scroll horizontal
 * (carruseles, listas deslizables...), para no robarle el gesto.
 *
 * El recorrido se detiene en el anfitrión (`[data-swipe-host]`) sin evaluarlo,
 * porque es un contenedor con scroll vertical cuyo `scrollWidth` podría
 * desbordar por motivos ajenos al gesto.
 */
function startsInHorizontalScroller(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  for (let el: Element | null = target; el !== null; el = el.parentElement) {
    if (el.hasAttribute('data-swipe-host')) return false;

    const overflowX = getComputedStyle(el).overflowX;
    if (
      el.scrollWidth > el.clientWidth + 2 &&
      (overflowX === 'auto' || overflowX === 'scroll')
    ) {
      return true;
    }
  }

  return false;
}

@Injectable({
  providedIn: 'root',
})
export class SwipeNavigationService {
  private readonly router = inject(Router);
  private readonly doc = inject(DOCUMENT);

  private clearTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => normalizePath(e.urlAfterRedirects)),
    ),
    { initialValue: normalizePath(this.doc?.location?.pathname ?? '/') },
  );

  /**
   * Navega circularmente entre home → áreas → perfil → home según el gesto:
   * izquierda = siguiente, derecha = anterior.
   *
   * Marca `data-nav-dir` en `<html>` antes de navegar para que el CSS de
   * View Transitions (styles.css) reproduzca el deslizamiento, y lo limpia
   * cuando la navegación termina (o se cancela).
   */
  async onSwipe(swipe: TuiSwipeEvent): Promise<void> {
    if (swipe.direction !== 'left' && swipe.direction !== 'right') return;

    const index = this.cycleIndex(this.currentPath());
    if (index < 0) return;

    if (startsInHorizontalScroller(swipe.events[0]?.target ?? null)) return;

    const step = swipe.direction === 'left' ? 1 : SWIPE_CYCLE.length - 1;
    const target = SWIPE_CYCLE[(index + step) % SWIPE_CYCLE.length];

    this.cancelClear();
    this.doc.documentElement.setAttribute(
      'data-nav-dir',
      swipe.direction === 'left' ? 'next' : 'prev',
    );

    const navigated = await this.router.navigate([target]);
    if (navigated) {
      this.scheduleClear();
    } else {
      this.clearNow();
    }
  }

  private cycleIndex(path: string): number {
    if (path === '/home') return 0;
    if (path === '/area') return 1;
    if (path === '/profile' || path.startsWith('/profile/')) return 2;
    return -1;
  }

  private scheduleClear(): void {
    this.cancelClear();
    this.clearTimer = setTimeout(() => this.clearNow(), CLEAR_DELAY_MS);
  }

  private cancelClear(): void {
    if (this.clearTimer !== null) {
      clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
  }

  private clearNow(): void {
    this.cancelClear();
    this.doc.documentElement.removeAttribute('data-nav-dir');
  }
}
