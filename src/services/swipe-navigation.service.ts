import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';

import type { TuiSwipeEvent } from '@taiga-ui/cdk';

import { filter, map } from 'rxjs';

import { ExploreTabService, isExploreContext } from './explore-tab.service';

/**
 * Longitud del ciclo home → explorar → perfil → home. Solo la posición es
 * fija; el destino de cada una se resuelve en `cycleTarget`.
 */
const CYCLE_LENGTH = 3;

/**
 * Margen (ms) que deja la animación de View Transitions antes de limpiar
 * `data-nav-dir` del `<html>`.
 */
const CLEAR_DELAY_MS = 500;

function normalizePath(url: string): string {
  return url.split('?')[0].split('#')[0];
}

/**
 * Detecta si el gesto empieza en una superficie que tiene su propio uso para
 * el arrastre horizontal, para no robarle el gesto:
 *
 * - contenedores con scroll horizontal nativo (carruseles, chips, listas),
 * - el mapa de Leaflet (`leaflet-container`),
 * - cualquier elemento marcado con `data-swipe-block` (el visor de topos, con
 *   su pan/zoom; `app-custom-carousel`, con su arrastre propio).
 *
 * El recorrido se detiene en el anfitrión (`[data-swipe-host]`) sin evaluarlo,
 * porque es un contenedor con scroll vertical cuyo `scrollWidth` podría
 * desbordar por motivos ajenos al gesto.
 */
function startsInBlockedSurface(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  for (let el: Element | null = target; el !== null; el = el.parentElement) {
    if (el.hasAttribute('data-swipe-host')) return false;

    if (
      el.hasAttribute('data-swipe-block') ||
      el.classList.contains('leaflet-container')
    ) {
      return true;
    }

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
  private readonly exploreTab = inject(ExploreTabService);

  private clearTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * `true` cuando la navegación en curso ya arrancó su View Transition
   * (vía `onViewTransitionCreated`); entonces la limpieza de `data-nav-dir`
   * se ata a `transition.finished` en lugar de a un temporizador.
   */
  private transitionCreated = false;

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => normalizePath(e.urlAfterRedirects)),
    ),
    { initialValue: normalizePath(this.doc?.location?.pathname ?? '/') },
  );

  /**
   * Navega circularmente entre home → explorar → perfil → home según el gesto:
   * izquierda = siguiente, derecha = anterior. Las pantallas que cuentan como
   * "explorar" las define `isExploreContext` (el mismo criterio que usa el
   * navbar), y su destino se resuelve con `ExploreTabService.target()`, igual
   * que al pulsar el botón "Explorar" del navbar.
   *
   * Marca `data-nav-dir` en `<html>` antes de navegar para que el CSS de
   * View Transitions (styles.css) reproduzca el deslizamiento.
   *
   * `data-nav-dir` debe seguir puesto mientras la transición esté viva (el
   * CSS que anima los snapshots es en vivo), así que si la transición se crea
   * se limpia al terminar (`onViewTransitionCreated`); si no llegó a crearse
   * (sin soporte, primera navegación tras cargar...), se limpia tras un
   * temporizador de respaldo.
   */
  async onSwipe(swipe: TuiSwipeEvent): Promise<void> {
    if (swipe.direction !== 'left' && swipe.direction !== 'right') return;

    const index = this.cycleIndex(this.currentPath());
    if (index < 0) return;

    if (startsInBlockedSurface(swipe.events[0]?.target ?? null)) return;

    const step = swipe.direction === 'left' ? 1 : CYCLE_LENGTH - 1;
    const target = this.cycleTarget((index + step) % CYCLE_LENGTH);

    this.cancelClear();
    this.transitionCreated = false;
    this.doc.documentElement.setAttribute(
      'data-nav-dir',
      swipe.direction === 'left' ? 'next' : 'prev',
    );

    const navigated = await this.router.navigate([target]);
    if (!navigated) {
      this.clearNow();
    } else if (!this.transitionCreated) {
      this.scheduleClear();
    }
  }

  /**
   * Llamado desde `withViewTransitions({ onViewTransitionCreated })` cuando el
   * navegador crea la View Transition de una navegación. Si es la transición
   * de un swipe (hay `data-nav-dir`), la limpieza se pospone a que termine.
   */
  onViewTransitionCreated(transition: ViewTransition): void {
    if (!this.doc.documentElement.hasAttribute('data-nav-dir')) return;

    this.transitionCreated = true;
    void transition.finished.catch(() => undefined).then(() => this.clearNow());
  }

  private cycleIndex(path: string): number {
    if (path === '/home') return 0;
    if (path === '/profile' || path.startsWith('/profile/')) return 2;
    if (isExploreContext(path)) return 1;
    return -1;
  }

  /**
   * Destino de cada posición del ciclo:
   *
   * - 0 → `/home` y 2 → `/profile` son fijos;
   * - 1 (explorar) → `ExploreTabService.target()`, el mismo destino que el
   *   botón "Explorar" del navbar: la última ruta de detalle visitada o, en
   *   su defecto, el último listado (áreas o indoor).
   */
  private cycleTarget(index: number): string {
    if (index === 0) return '/home';
    if (index === 2) return '/profile';
    return this.exploreTab.target();
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
