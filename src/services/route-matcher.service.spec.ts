import { Injector, runInInjectionContext } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
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
});
