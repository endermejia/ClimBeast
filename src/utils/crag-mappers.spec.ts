import { describe, it, expect } from 'vitest';

import { mapCragToDetail } from './crag-mappers';
import { VERTICAL_LIFE_GRADES } from '../models';

describe('mapCragToDetail', () => {
  const baseRawData = {
    id: 1,
    name: 'Test Crag',
    slug: 'test-crag',
    area_id: 10,
    latitude: 42.5,
    longitude: 1.5,
    description_en: null,
    description_es: null,
    warning_en: null,
    warning_es: null,
    approach: null,
    user_creator_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    eight_anu_sector_slugs: null,
    area: {
      name: 'Test Area',
      slug: 'test-area',
      purchased: [],
      price: 10,
      is_public: true,
      stripe_account_id: null,
      eight_anu_crag_slugs: null,
    },
    liked: [],
    crag_parkings: [],
    topos: [],
  };

  it('returns basic crag info with empty topos', () => {
    const result = mapCragToDetail(baseRawData as never);

    expect(result.id).toBe(1);
    expect(result.name).toBe('Test Crag');
    expect(result.slug).toBe('test-crag');
    expect(result.area_name).toBe('Test Area');
    expect(result.routes_count).toBe(0);
    expect(result.topos_count).toBe(0);
    expect(result.topos).toEqual([]);
  });

  it('computes routes_count from unique route_ids', () => {
    const data = {
      ...baseRawData,
      topos: [
        {
          id: 1,
          name: 'Topo 1',
          slug: 'topo-1',
          photo: 'photo1.jpg',
          shade_morning: false,
          shade_afternoon: false,
          shade_change_hour: null,
          topo_routes: [
            { route_id: 1, route: { grade: VERTICAL_LIFE_GRADES.G6a } },
            { route_id: 2, route: { grade: VERTICAL_LIFE_GRADES.G6b } },
          ],
        },
        {
          id: 2,
          name: 'Topo 2',
          slug: 'topo-2',
          photo: 'photo2.jpg',
          shade_morning: true,
          shade_afternoon: false,
          shade_change_hour: null,
          topo_routes: [
            { route_id: 2, route: { grade: VERTICAL_LIFE_GRADES.G7a } },
            { route_id: 3, route: { grade: null } },
          ],
        },
      ],
    };

    const result = mapCragToDetail(data as never);

    expect(result.routes_count).toBe(3); // route_ids 1, 2, 3
    expect(result.topos_count).toBe(2);
  });

  it('counts grades correctly in topos', () => {
    const data = {
      ...baseRawData,
      topos: [
        {
          id: 1,
          name: 'Topo 1',
          slug: 'topo-1',
          photo: null,
          shade_morning: false,
          shade_afternoon: false,
          shade_change_hour: null,
          topo_routes: [
            { route_id: 1, route: { grade: VERTICAL_LIFE_GRADES.G6a } },
            { route_id: 2, route: { grade: VERTICAL_LIFE_GRADES.G6a } },
            { route_id: 3, route: { grade: VERTICAL_LIFE_GRADES.G7a } },
          ],
        },
      ],
    };

    const result = mapCragToDetail(data as never);
    const topo = result.topos[0];

    expect(topo.grades[VERTICAL_LIFE_GRADES.G6a]).toBe(2);
    expect(topo.grades[VERTICAL_LIFE_GRADES.G7a]).toBe(1);
  });

  it('derives shade booleans', () => {
    const data = {
      ...baseRawData,
      topos: [
        {
          id: 1,
          name: 'T1',
          slug: 't1',
          photo: null,
          shade_morning: true,
          shade_afternoon: false,
          shade_change_hour: null,
          topo_routes: [],
        },
        {
          id: 2,
          name: 'T2',
          slug: 't2',
          photo: null,
          shade_morning: false,
          shade_afternoon: true,
          shade_change_hour: null,
          topo_routes: [],
        },
      ],
    };

    const result = mapCragToDetail(data as never);
    expect(result.shade_morning).toBe(true);
    expect(result.shade_afternoon).toBe(true);
    expect(result.shade_all_day).toBe(false); // no single topo has both
    expect(result.sun_all_day).toBe(false);
  });

  it('derives shade_all_day when a topo has both morning and afternoon shade', () => {
    const data = {
      ...baseRawData,
      topos: [
        {
          id: 1,
          name: 'T1',
          slug: 't1',
          photo: null,
          shade_morning: true,
          shade_afternoon: true,
          shade_change_hour: null,
          topo_routes: [],
        },
      ],
    };

    const result = mapCragToDetail(data as never);
    expect(result.shade_all_day).toBe(true);
  });

  it('derives sun_all_day when a topo has no shade', () => {
    const data = {
      ...baseRawData,
      topos: [
        {
          id: 1,
          name: 'T1',
          slug: 't1',
          photo: null,
          shade_morning: false,
          shade_afternoon: false,
          shade_change_hour: null,
          topo_routes: [],
        },
      ],
    };

    const result = mapCragToDetail(data as never);
    expect(result.sun_all_day).toBe(true);
  });

  it('extracts parkings from crag_parkings', () => {
    const data = {
      ...baseRawData,
      crag_parkings: [
        { parking: { lat: 42.5, lng: 1.5, name: 'P1' } },
        { parking: null },
        { parking: { lat: 42.6, lng: 1.6, name: 'P2' } },
      ],
    };

    const result = mapCragToDetail(data as never);
    expect(result.parkings).toHaveLength(2);
  });

  it('defaults latitude and longitude to 0 when null', () => {
    const data = { ...baseRawData, latitude: null, longitude: null };
    const result = mapCragToDetail(data as never);
    expect(result.latitude).toBe(0);
    expect(result.longitude).toBe(0);
  });

  it('sets liked to true when liked array is non-empty', () => {
    const data = { ...baseRawData, liked: [{ user_id: 'u1' }] };
    const result = mapCragToDetail(data as never);
    expect(result.liked).toBe(true);
  });

  it('sets purchased to true when area.purchased is non-empty', () => {
    const data = {
      ...baseRawData,
      area: { ...baseRawData.area, purchased: [{ user_id: 'u1' }] },
    };
    const result = mapCragToDetail(data as never);
    expect(result.purchased).toBe(true);
  });

  it('defaults area fields when area is null', () => {
    const data = { ...baseRawData, area: null };
    const result = mapCragToDetail(data as never);
    expect(result.area_name).toBe('');
    expect(result.area_slug).toBe('');
    expect(result.price).toBe(0);
    expect(result.is_public).toBe(true);
  });

  it('includes route_ids in topos', () => {
    const data = {
      ...baseRawData,
      topos: [
        {
          id: 1,
          name: 'T1',
          slug: 't1',
          photo: null,
          shade_morning: false,
          shade_afternoon: false,
          shade_change_hour: null,
          topo_routes: [
            { route_id: 10, route: { grade: 5 } },
            { route_id: 20, route: { grade: 6 } },
          ],
        },
      ],
    };

    const result = mapCragToDetail(data as never);
    expect(result.topos[0].route_ids).toEqual([10, 20]);
  });
});
