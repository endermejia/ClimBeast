import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { describe, it, expect, beforeEach } from 'vitest';

import { STORAGE_KEYS } from '../constants';

import { MockLocalStorage } from '../testing/mock-local-storage';
import { ExploreTabService } from './explore-tab.service';
import { LocalStorage } from './local-storage';

@Component({ template: '', standalone: true })
class BlankComponent {}

describe('ExploreTabService', () => {
  let service: ExploreTabService;
  let router: Router;
  let storage: MockLocalStorage;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'home', component: BlankComponent },
          { path: 'area', component: BlankComponent },
          { path: 'indoor', component: BlankComponent },
          { path: 'profile', component: BlankComponent },
        ]),
        { provide: LocalStorage, useClass: MockLocalStorage },
      ],
    });
    router = TestBed.inject(Router);
    storage = TestBed.inject(LocalStorage) as unknown as MockLocalStorage;
  });

  it('usa /area como opción por defecto', () => {
    service = TestBed.inject(ExploreTabService);

    expect(service.link()).toBe('/area');
  });

  it('lee la última opción guardada en localStorage', () => {
    storage.setItem(STORAGE_KEYS.exploreLastTab, '/indoor');
    service = TestBed.inject(ExploreTabService);

    expect(service.link()).toBe('/indoor');
  });

  it('ignora valores guardados inválidos', () => {
    storage.setItem(STORAGE_KEYS.exploreLastTab, '/explore');
    service = TestBed.inject(ExploreTabService);

    expect(service.link()).toBe('/area');
  });

  it('recuerda el último listado visitado y lo persiste', async () => {
    service = TestBed.inject(ExploreTabService);

    await router.navigate(['/indoor']);
    TestBed.flushEffects();

    expect(service.link()).toBe('/indoor');
    expect(storage.getItem(STORAGE_KEYS.exploreLastTab)).toBe('/indoor');

    await router.navigate(['/area']);
    TestBed.flushEffects();

    expect(service.link()).toBe('/area');
    expect(storage.getItem(STORAGE_KEYS.exploreLastTab)).toBe('/area');
  });

  it('no cambia la opción al navegar fuera de los listados', async () => {
    service = TestBed.inject(ExploreTabService);

    await router.navigate(['/indoor']);
    TestBed.flushEffects();
    await router.navigate(['/home']);
    TestBed.flushEffects();

    expect(service.link()).toBe('/indoor');
    expect(storage.getItem(STORAGE_KEYS.exploreLastTab)).toBe('/indoor');
  });
});
