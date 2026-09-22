import { describe, expect, it } from 'vitest';

import {
  collectCsvMatchInputs,
  type DbAreaRecord,
  type DbCragRecord,
  matchExistingAreas,
  matchExistingCrags,
} from './eight-anu-match';

const area = (overrides: Partial<DbAreaRecord>): DbAreaRecord => ({
  id: 1,
  slug: '',
  name: '',
  eight_anu_crag_slugs: null,
  ...overrides,
});

const crag = (overrides: Partial<DbCragRecord>): DbCragRecord => ({
  id: 1,
  area_id: 1,
  slug: '',
  name: '',
  eight_anu_sector_slugs: null,
  ...overrides,
});

describe('matchExistingAreas', () => {
  it('matches by exact slug', () => {
    const result = matchExistingAreas(
      [{ slug: 'sierra', name: 'Sierra' }],
      [area({ id: 7, slug: 'sierra', name: 'Sierra' })],
    );

    expect(result.existingAreaSlugs.has('sierra')).toBe(true);
    expect(result.dbAreaIdBySlug.get('sierra')).toBe(7);
  });

  it('matches by normalised name when the stored slug differs', () => {
    const result = matchExistingAreas(
      [{ slug: 'sierra-de-guadarrama', name: 'Sierra de Guadarrama' }],
      [area({ id: 3, slug: 'sierra', name: '  SIERRA de Guadarrama ' })],
    );

    expect(result.existingAreaSlugs.has('sierra-de-guadarrama')).toBe(true);
    expect(result.dbAreaIdBySlug.get('sierra-de-guadarrama')).toBe(3);
  });

  it('matches by stored 8a.nu slugs', () => {
    const result = matchExistingAreas(
      [{ slug: 'la-roca', name: 'La Roca' }],
      [
        area({
          id: 9,
          slug: 'roca',
          name: 'Roca',
          eight_anu_crag_slugs: ['la-roca'],
        }),
      ],
    );

    expect(result.existingAreaSlugs.has('la-roca')).toBe(true);
    expect(result.dbAreaIdBySlug.get('la-roca')).toBe(9);
  });

  it('adds stored 8a.nu slugs of the matched area', () => {
    const result = matchExistingAreas(
      [{ slug: 'roca', name: 'Roca' }],
      [
        area({
          id: 9,
          slug: 'roca',
          name: 'Roca',
          eight_anu_crag_slugs: ['la-roca'],
        }),
      ],
    );

    expect(result.existingAreaSlugs.has('la-roca')).toBe(true);
  });

  it('returns no match for unknown areas', () => {
    const result = matchExistingAreas(
      [{ slug: 'desconocida', name: 'Desconocida' }],
      [area({ id: 1, slug: 'otra', name: 'Otra' })],
    );

    expect(result.existingAreaSlugs.size).toBe(0);
    expect(result.dbAreaIdBySlug.size).toBe(0);
  });
});

describe('matchExistingCrags', () => {
  const areaIdBySlug = new Map([['sierra', 1]]);

  it('matches crag by slug within its matched area', () => {
    const keys = matchExistingCrags(
      [
        {
          areaSlug: 'sierra',
          cragSlug: 'becerriles',
          cragName: 'Los Becerriles',
        },
      ],
      areaIdBySlug,
      [crag({ id: 5, area_id: 1, slug: 'becerriles', name: 'Los Becerriles' })],
    );

    expect(keys.has('sierra|becerriles')).toBe(true);
  });

  it('matches crag by normalised name when the stored slug differs', () => {
    const keys = matchExistingCrags(
      [
        {
          areaSlug: 'sierra',
          cragSlug: 'los-becerriles',
          cragName: 'Los Becerriles',
        },
      ],
      areaIdBySlug,
      [crag({ id: 5, area_id: 1, slug: 'becerriles', name: 'los becerriles' })],
    );

    expect(keys.has('sierra|los-becerriles')).toBe(true);
  });

  it('matches crag by stored 8a.nu slugs', () => {
    const keys = matchExistingCrags(
      [{ areaSlug: 'sierra', cragSlug: 'becerriles', cragName: 'Becerriles' }],
      areaIdBySlug,
      [
        crag({
          id: 5,
          area_id: 1,
          slug: 'viejo-nombre',
          name: 'Viejo Nombre',
          eight_anu_sector_slugs: ['becerriles'],
        }),
      ],
    );

    expect(keys.has('sierra|becerriles')).toBe(true);
  });

  it('does not match a homonymous crag from a different area', () => {
    const keys = matchExistingCrags(
      [{ areaSlug: 'sierra', cragSlug: 'cerro', cragName: 'Cerro' }],
      areaIdBySlug,
      [crag({ id: 6, area_id: 42, slug: 'cerro', name: 'Cerro' })],
    );

    expect(keys.has('sierra|cerro')).toBe(false);
  });

  it('skips crags whose area does not exist in the database', () => {
    const keys = matchExistingCrags(
      [{ areaSlug: 'nueva-area', cragSlug: 'cerro', cragName: 'Cerro' }],
      areaIdBySlug,
      [crag({ id: 6, area_id: 1, slug: 'cerro', name: 'Cerro' })],
    );

    expect(keys.size).toBe(0);
  });
});

describe('collectCsvMatchInputs', () => {
  it('defaults empty sector names to General/general', () => {
    const { csvCrags } = collectCsvMatchInputs([
      { location_name: 'Sierra', sector_name: '   ' },
    ]);

    expect(csvCrags).toEqual([
      { areaSlug: 'sierra', cragSlug: 'general', cragName: 'General' },
    ]);
  });

  it('dedupes areas and sectors across ascents', () => {
    const { csvAreas, csvCrags } = collectCsvMatchInputs([
      { location_name: 'Sierra', sector_name: 'Cerro' },
      { location_name: 'Sierra', sector_name: 'Cerro' },
      { location_name: 'Sierra', sector_name: 'Muro' },
      { location_name: 'Valle', sector_name: 'Cerro' },
    ]);

    expect(csvAreas).toEqual([
      { slug: 'sierra', name: 'Sierra' },
      { slug: 'valle', name: 'Valle' },
    ]);
    expect(csvCrags).toEqual([
      { areaSlug: 'sierra', cragSlug: 'cerro', cragName: 'Cerro' },
      { areaSlug: 'sierra', cragSlug: 'muro', cragName: 'Muro' },
      { areaSlug: 'valle', cragSlug: 'cerro', cragName: 'Cerro' },
    ]);
  });
});
