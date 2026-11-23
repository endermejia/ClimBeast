import { Injector, runInInjectionContext } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AscentTypes, ClimbingKinds, EightAnuAscent } from '../models';

import { EightAnuService } from './eight-anu.service';

import { Import8aPayload, RouteMatcherService } from './route-matcher.service';

import { SupabaseService } from './supabase.service';

import { ToastService } from './toast.service';

describe('RouteMatcherService', () => {
  let service: RouteMatcherService;

  beforeEach(() => {
    const injector = Injector.create({
      providers: [
        {
          provide: SupabaseService,
          useValue: {
            authUserId: () => 'user-1',
            client: {},
          },
        },
        { provide: EightAnuService, useValue: {} },
        { provide: ToastService, useValue: {} },
        { provide: TranslateService, useValue: { instant: (k: string) => k } },
      ],
    });

    service = runInInjectionContext(injector, () => new RouteMatcherService());
  });

  it('deduplicates CSV ascents with space-separated timestamps against existing YYYY-MM-DD ascents', async () => {
    const existingKeys = new Set<string>(['2024-04-02|sin-problemas']);
    const getOrLoadSpy = vi
      .spyOn(service, 'getOrLoadExistingAscentKeys')
      .mockResolvedValue(existingKeys);

    const ascents: EightAnuAscent[] = [
      {
        route_boulder: 'ROUTE',
        name: 'Sin problemas',
        location_name: 'Alfar',
        sector_name: 'Alfar',
        country_code: 'ES',
        date: '2024-04-02 12:00:00',
        type: AscentTypes.RP,
        rating: 0,
        tries: 2,
        difficulty: '4a',
        comment: 'Primera reunión',
        recommended: false,
        climbing_kind: ClimbingKinds.SPORT,
      },
      {
        route_boulder: 'ROUTE',
        name: 'Nueva vía',
        location_name: 'Alfar',
        sector_name: 'Alfar',
        country_code: 'ES',
        date: '2024-04-03 12:00:00',
        type: AscentTypes.OS,
        rating: 5,
        tries: 1,
        difficulty: '5a',
        comment: '',
        recommended: false,
        climbing_kind: ClimbingKinds.SPORT,
      },
    ];

    const result = await service.deduplicateCsvAscentsAgainstExisting(
      ascents,
      new Map(),
    );

    expect(getOrLoadSpy).toHaveBeenCalledWith({
      from: '2024-04-02',
      to: '2024-04-03',
    });
    expect(result.skipped).toBe(1);
    expect(result.ascents).toHaveLength(1);
    expect(result.ascents[0].name).toBe('Nueva vía');
  });

  it('deduplicates payload ascents with timestamps against existing YYYY-MM-DD ascents', () => {
    const existingKeys = new Set<string>(['2024-04-02|sin-problemas']);
    const payload: Import8aPayload[] = [
      {
        area_name: 'Alfar',
        area_slug: 'alfar',
        area_8a_slug: 'alfar',
        crag_name: 'Alfar',
        crag_slug: 'alfar',
        crag_8a_slug: 'alfar',
        country_code: 'ES',
        lat: null,
        lng: null,
        route_name: 'Sin problemas',
        route_slug: 'sin-problemas',
        route_8a_slug: null,
        eight_anu_route_slugs: [],
        grade: 10,
        climbing_kind: ClimbingKinds.SPORT,
        date: '2024-04-02 12:00:00',
        style: AscentTypes.RP,
        attempts: 2,
        rating: null,
        comment: '',
        recommended: false,
      },
    ];

    const result = service.deduplicatePayloadAgainstExistingAscents(
      payload,
      existingKeys,
    );

    expect(result.skipped).toBe(1);
    expect(result.payload).toHaveLength(0);
  });

  it('deduplicates CSV ascent when route name slug matches an existing eight_anu_route_slug even if unresolved', async () => {
    const existingKeys = new Set<string>([
      '2019-08-25|turbo-diesel-aereo',
      '2019-08-25|turbo-diesel',
      '2019-08-25|8a:turbo-diesel',
      '2019-08-25|8a:turbo-diesel-el-corredor',
      '2019-08-25|8a:turbodiesel',
    ]);
    vi.spyOn(service, 'getOrLoadExistingAscentKeys').mockResolvedValue(
      existingKeys,
    );

    const ascents: EightAnuAscent[] = [
      {
        route_boulder: 'ROUTE',
        name: 'Turbodiesel',
        location_name: 'Agujas Rojas',
        sector_name: 'El Corredor',
        country_code: 'ES',
        date: '2019-08-25 00:00:00',
        type: AscentTypes.RP,
        rating: 0,
        tries: 1,
        difficulty: '7a',
        comment: '',
        recommended: false,
        climbing_kind: ClimbingKinds.SPORT,
      },
    ];

    const result = await service.deduplicateCsvAscentsAgainstExisting(
      ascents,
      new Map(),
    );

    expect(result.skipped).toBe(1);
    expect(result.ascents).toHaveLength(0);
  });

  it('does not falsely deduplicate identically named routes across different sectors of the same area', async () => {
    const existingKeys = new Set<string>([
      '2019-01-12|redovan|el-rut|cesar-el-rut',
      '2019-01-12|redovan|el-rut|8a:cesar',
    ]);
    vi.spyOn(service, 'getOrLoadExistingAscentKeys').mockResolvedValue(
      existingKeys,
    );

    const ascents: EightAnuAscent[] = [
      {
        route_boulder: 'ROUTE',
        name: 'Cesar',
        location_name: 'Redován',
        sector_name: 'El Rut',
        country_code: 'ES',
        date: '2019-01-12 00:00:00',
        type: AscentTypes.RP,
        rating: 3,
        tries: 1,
        difficulty: '7a',
        comment: '',
        recommended: false,
        climbing_kind: ClimbingKinds.SPORT,
      },
      {
        route_boulder: 'ROUTE',
        name: 'César',
        location_name: 'Redován',
        sector_name: 'La Pancha',
        country_code: 'ES',
        date: '2019-01-12 00:00:00',
        type: AscentTypes.F,
        rating: 5,
        tries: 1,
        difficulty: '7a+',
        comment: '',
        recommended: false,
        climbing_kind: ClimbingKinds.SPORT,
      },
    ];

    const result = await service.deduplicateCsvAscentsAgainstExisting(
      ascents,
      new Map(),
    );

    expect(result.skipped).toBe(1);
    expect(result.ascents).toHaveLength(1);
    expect(result.ascents[0].sector_name).toBe('La Pancha');
  });

  it('resolves renamed routes via eight_anu_route_slugs scoped to their sector without cross-matching', async () => {
    const dbRoutes = [
      {
        name: 'Cesar (El Rut)',
        slug: 'cesar-el-rut',
        eight_anu_route_slugs: ['cesar'],
        crag: {
          name: 'El Rut',
          slug: 'el-rut',
          eight_anu_sector_slugs: ['el-rut'],
          area: {
            name: 'Redován',
            slug: 'redovan',
            eight_anu_crag_slugs: ['redovan'],
          },
        },
      },
      {
        name: 'César (La Pancha)',
        slug: 'cesar-la-pancha',
        eight_anu_route_slugs: ['cesar', 'via-cesar'],
        crag: {
          name: 'La Pancha',
          slug: 'la-pancha',
          eight_anu_sector_slugs: ['la-pancha'],
          area: {
            name: 'Redován',
            slug: 'redovan',
            eight_anu_crag_slugs: ['redovan'],
          },
        },
      },
    ];

    const searchRouteSpy = vi.fn();
    const fromSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          overrideTypes: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        overlaps: vi.fn().mockReturnValue({
          overrideTypes: vi
            .fn()
            .mockResolvedValue({ data: dbRoutes, error: null }),
        }),
      }),
    });

    const injector = Injector.create({
      providers: [
        {
          provide: SupabaseService,
          useValue: {
            authUserId: () => 'user-1',
            client: { from: fromSpy },
          },
        },
        {
          provide: EightAnuService,
          useValue: { searchRoute: searchRouteSpy },
        },
        {
          provide: ToastService,
          useValue: {
            showLoader: () => ({ next: vi.fn(), complete: vi.fn() }),
            error: vi.fn(),
          },
        },
        { provide: TranslateService, useValue: { instant: (k: string) => k } },
      ],
    });

    const matcher = runInInjectionContext(
      injector,
      () => new RouteMatcherService(),
    );

    const ascents: EightAnuAscent[] = [
      {
        route_boulder: 'ROUTE',
        name: 'Cesar',
        location_name: 'Redován',
        sector_name: 'El Rut',
        country_code: 'ES',
        date: '2019-01-12',
        type: AscentTypes.RP,
        rating: 3,
        tries: 1,
        difficulty: '7a',
        comment: '',
        recommended: false,
        climbing_kind: ClimbingKinds.SPORT,
      },
      {
        route_boulder: 'ROUTE',
        name: 'César',
        route_8a_slug: 'via-cesar',
        location_name: 'Redován',
        sector_name: 'La Pancha',
        country_code: 'ES',
        date: '2024-01-22',
        type: AscentTypes.F,
        rating: 5,
        tries: 1,
        difficulty: '7a+',
        comment: '',
        recommended: false,
        climbing_kind: ClimbingKinds.SPORT,
      },
    ];

    const resolved = await matcher.resolveCsvAscentsWith8aData(
      ascents,
      new BehaviorSubject(0),
    );

    expect(searchRouteSpy).not.toHaveBeenCalled();
    expect(resolved.get('redovan|el-rut|cesar')).toEqual({
      slug: 'cesar-el-rut',
      eightAnuSlugs: ['cesar'],
    });
    expect(resolved.get('redovan|la-pancha|cesar')).toEqual({
      slug: 'cesar-la-pancha',
      eightAnuSlugs: ['cesar', 'via-cesar'],
    });
  });
});
