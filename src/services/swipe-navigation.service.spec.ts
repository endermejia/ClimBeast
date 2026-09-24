import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import type { TuiSwipeEvent } from '@taiga-ui/cdk';

import { describe, it, expect, beforeEach } from 'vitest';

import { MockLocalStorage } from '../testing/mock-local-storage';
import { LocalStorage } from './local-storage';
import { SwipeNavigationService } from './swipe-navigation.service';

@Component({ template: '', standalone: true })
class BlankComponent {}

function swipeEvent(
  direction: TuiSwipeEvent['direction'],
  target: Element | null = null,
): TuiSwipeEvent {
  return {
    direction,
    events: [{ target } as Event, {} as Event],
  } as unknown as TuiSwipeEvent;
}

describe('SwipeNavigationService', () => {
  let service: SwipeNavigationService;
  let router: Router;

  const currentRoute = () =>
    router.url.split('?')[0].replace(/\/+$/, '') || '/';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'home', component: BlankComponent },
          { path: 'area', component: BlankComponent },
          { path: 'area/:slug', component: BlankComponent },
          { path: 'indoor', component: BlankComponent },
          { path: 'explore', component: BlankComponent },
          { path: 'profile', component: BlankComponent },
          { path: 'other', component: BlankComponent },
        ]),
        { provide: LocalStorage, useClass: MockLocalStorage },
      ],
    });
    service = TestBed.inject(SwipeNavigationService);
    router = TestBed.inject(Router);
    document.documentElement.removeAttribute('data-nav-dir');
  });

  it('debería estar creado', () => {
    expect(service).toBeTruthy();
  });

  it('navega home → áreas con swipe a la izquierda', async () => {
    await router.navigate(['/home']);
    await service.onSwipe(swipeEvent('left'));

    expect(currentRoute()).toBe('/area');
    expect(document.documentElement.getAttribute('data-nav-dir')).toBe('next');
  });

  it('navega áreas → home con swipe a la derecha (circular hacia atrás)', async () => {
    await router.navigate(['/area']);
    await service.onSwipe(swipeEvent('right'));

    expect(currentRoute()).toBe('/home');
    expect(document.documentElement.getAttribute('data-nav-dir')).toBe('prev');
  });

  it('navega perfil → home con swipe a la izquierda (circular hacia delante)', async () => {
    await router.navigate(['/profile']);
    await service.onSwipe(swipeEvent('left'));

    expect(currentRoute()).toBe('/home');
    expect(document.documentElement.getAttribute('data-nav-dir')).toBe('next');
  });

  it('ignora los swipes verticales', async () => {
    await router.navigate(['/home']);
    await service.onSwipe(swipeEvent('top'));

    expect(currentRoute()).toBe('/home');
    expect(document.documentElement.getAttribute('data-nav-dir')).toBeNull();
  });

  it('ignora los swipes fuera de las rutas del ciclo', async () => {
    await router.navigate(['/other']);
    await service.onSwipe(swipeEvent('left'));

    expect(currentRoute()).toBe('/other');
    expect(document.documentElement.getAttribute('data-nav-dir')).toBeNull();
  });

  it('navega desde el mapa de explorar (/explore)', async () => {
    await router.navigate(['/explore']);
    await service.onSwipe(swipeEvent('left'));

    expect(currentRoute()).toBe('/profile');
    expect(document.documentElement.getAttribute('data-nav-dir')).toBe('next');
  });

  it('navega desde el listado de indoor', async () => {
    await router.navigate(['/indoor']);
    await service.onSwipe(swipeEvent('right'));

    expect(currentRoute()).toBe('/home');
    expect(document.documentElement.getAttribute('data-nav-dir')).toBe('prev');
  });

  it('navega desde una pantalla de detalle de explorar', async () => {
    await router.navigate(['/area/mi-area']);
    await service.onSwipe(swipeEvent('left'));

    expect(currentRoute()).toBe('/profile');
    expect(document.documentElement.getAttribute('data-nav-dir')).toBe('next');
  });

  it('al pasar a explorar retoma la última ruta de detalle visitada', async () => {
    await router.navigate(['/area/el-chorro']);
    TestBed.flushEffects();
    await router.navigate(['/home']);
    TestBed.flushEffects();

    await service.onSwipe(swipeEvent('left'));

    expect(currentRoute()).toBe('/area/el-chorro');
    expect(document.documentElement.getAttribute('data-nav-dir')).toBe('next');
  });

  it('ignora los swipes que empiezan en un scroll horizontal', async () => {
    const host = document.createElement('div');
    host.setAttribute('data-swipe-host', '');
    const scroller = document.createElement('div');
    const child = document.createElement('span');
    scroller.style.overflowX = 'auto';
    scroller.appendChild(child);
    host.appendChild(scroller);
    document.body.appendChild(host);

    // jsdom no hace layout: forzamos las medidas del contenedor.
    Object.defineProperty(scroller, 'scrollWidth', { value: 400 });
    Object.defineProperty(scroller, 'clientWidth', { value: 100 });

    await router.navigate(['/home']);
    await service.onSwipe(swipeEvent('left', child));

    expect(currentRoute()).toBe('/home');
    expect(document.documentElement.getAttribute('data-nav-dir')).toBeNull();

    host.remove();
  });

  it('ignora los swipes que empiezan en una superficie bloqueada', async () => {
    const host = document.createElement('div');
    host.setAttribute('data-swipe-host', '');
    const blocked = document.createElement('div');
    blocked.setAttribute('data-swipe-block', '');
    const child = document.createElement('span');
    blocked.appendChild(child);
    host.appendChild(blocked);
    document.body.appendChild(host);

    await router.navigate(['/home']);
    await service.onSwipe(swipeEvent('left', child));

    expect(currentRoute()).toBe('/home');
    expect(document.documentElement.getAttribute('data-nav-dir')).toBeNull();

    host.remove();
  });

  it('limpia data-nav-dir pasados 500ms de la navegación', async () => {
    await router.navigate(['/home']);
    await service.onSwipe(swipeEvent('left'));
    expect(document.documentElement.getAttribute('data-nav-dir')).toBe('next');

    await new Promise((resolve) => setTimeout(resolve, 550));
    expect(document.documentElement.getAttribute('data-nav-dir')).toBeNull();
  }, 3000);
});
