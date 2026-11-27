import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEYS } from '../constants';

import { MockLocalStorage } from '../testing';
import { LocalStorage } from './local-storage';
import { VisitedArea, VisitedAreasService } from './visited-areas.service';
import { VisitedCrag, VisitedCragsService } from './visited-crags.service';
import {
  VisitedIndoorCenter,
  VisitedIndoorCentersService,
} from './visited-indoor-centers.service';

describe('Visited items services', () => {
  let storage: MockLocalStorage;

  beforeEach(() => {
    storage = new MockLocalStorage();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  function setupTestBed() {
    TestBed.configureTestingModule({
      providers: [
        VisitedAreasService,
        VisitedCragsService,
        VisitedIndoorCentersService,
        { provide: LocalStorage, useValue: storage },
      ],
    });
  }

  describe('VisitedAreasService', () => {
    it('starts empty when storage has no data', () => {
      setupTestBed();
      const service = TestBed.inject(VisitedAreasService);
      expect(service.visitedAreas()).toEqual([]);
    });

    it('recovers gracefully from corrupted or non-array JSON in storage', () => {
      storage.setItem(STORAGE_KEYS.visitedAreas, '{broken-json');
      setupTestBed();
      expect(TestBed.inject(VisitedAreasService).visitedAreas()).toEqual([]);

      TestBed.resetTestingModule();
      storage.setItem(STORAGE_KEYS.visitedAreas, '{"not":"an-array"}');
      setupTestBed();
      expect(TestBed.inject(VisitedAreasService).visitedAreas()).toEqual([]);
    });

    it('hydrates existing areas from storage on creation', () => {
      const existing: VisitedArea[] = [
        { id: 1, name: 'El Chorro', slug: 'el-chorro', visitedAt: 1000 },
      ];
      storage.setItem(STORAGE_KEYS.visitedAreas, JSON.stringify(existing));
      setupTestBed();

      const service = TestBed.inject(VisitedAreasService);
      expect(service.visitedAreas()).toEqual(existing);
    });

    it('deduplicates by id, moves item to front, updates visitedAt, and persists', () => {
      setupTestBed();
      const service = TestBed.inject(VisitedAreasService);

      const t1 = Date.now();
      service.addVisitedArea({ id: 1, name: 'Area 1', slug: 'area-1' });

      vi.advanceTimersByTime(5000);
      const t2 = Date.now();
      service.addVisitedArea({ id: 2, name: 'Area 2', slug: 'area-2' });

      vi.advanceTimersByTime(5000);
      const t3 = Date.now();
      service.addVisitedArea({ id: 1, name: 'Area 1 Updated', slug: 'area-1' });

      const result = service.visitedAreas();
      expect(result).toEqual([
        { id: 1, name: 'Area 1 Updated', slug: 'area-1', visitedAt: t3 },
        { id: 2, name: 'Area 2', slug: 'area-2', visitedAt: t2 },
      ]);
      expect(result[0].visitedAt).toBeGreaterThan(t1);

      const persisted = JSON.parse(
        storage.getItem(STORAGE_KEYS.visitedAreas) ?? '[]',
      );
      expect(persisted).toEqual(result);
    });

    it('caps stored areas at 10 items keeping the most recent ones', () => {
      setupTestBed();
      const service = TestBed.inject(VisitedAreasService);

      for (let i = 1; i <= 12; i++) {
        vi.advanceTimersByTime(1000);
        service.addVisitedArea({ id: i, name: `Area ${i}`, slug: `area-${i}` });
      }

      const result = service.visitedAreas();
      expect(result).toHaveLength(10);
      expect(result.map((a) => a.id)).toEqual([
        12, 11, 10, 9, 8, 7, 6, 5, 4, 3,
      ]);

      const persisted = JSON.parse(
        storage.getItem(STORAGE_KEYS.visitedAreas) ?? '[]',
      ) as VisitedArea[];
      expect(persisted).toHaveLength(10);
      expect(persisted.map((a) => a.id)).toEqual([
        12, 11, 10, 9, 8, 7, 6, 5, 4, 3,
      ]);
    });
  });

  describe('VisitedCragsService', () => {
    it('starts empty and recovers from corrupted JSON', () => {
      setupTestBed();
      expect(TestBed.inject(VisitedCragsService).visitedCrags()).toEqual([]);

      TestBed.resetTestingModule();
      storage.setItem(STORAGE_KEYS.visitedCrags, 'not valid json');
      setupTestBed();
      expect(TestBed.inject(VisitedCragsService).visitedCrags()).toEqual([]);
    });

    it('deduplicates, moves to front, updates visitedAt, caps at 10, and persists', () => {
      setupTestBed();
      const service = TestBed.inject(VisitedCragsService);

      for (let i = 1; i <= 11; i++) {
        vi.advanceTimersByTime(1000);
        service.addVisitedCrag({
          id: i,
          name: `Crag ${i}`,
          slug: `crag-${i}`,
          area_slug: 'el-chorro',
        });
      }

      expect(service.visitedCrags()).toHaveLength(10);
      expect(service.visitedCrags()[0].id).toBe(11);
      expect(service.visitedCrags()[9].id).toBe(2);

      vi.advanceTimersByTime(1000);
      const revisitTime = Date.now();
      service.addVisitedCrag({
        id: 5,
        name: 'Crag 5',
        slug: 'crag-5',
        area_slug: 'el-chorro',
      });

      const crags = service.visitedCrags();
      expect(crags).toHaveLength(10);
      expect(crags[0]).toEqual({
        id: 5,
        name: 'Crag 5',
        slug: 'crag-5',
        area_slug: 'el-chorro',
        visitedAt: revisitTime,
      });
      expect(crags.filter((c) => c.id === 5)).toHaveLength(1);

      const persisted = JSON.parse(
        storage.getItem(STORAGE_KEYS.visitedCrags) ?? '[]',
      ) as VisitedCrag[];
      expect(persisted).toEqual(crags);
    });
  });

  describe('VisitedIndoorCentersService', () => {
    it('starts empty and recovers from corrupted JSON', () => {
      setupTestBed();
      expect(
        TestBed.inject(VisitedIndoorCentersService).visitedCenters(),
      ).toEqual([]);

      TestBed.resetTestingModule();
      storage.setItem(STORAGE_KEYS.visitedIndoorCenters, '[invalid');
      setupTestBed();
      expect(
        TestBed.inject(VisitedIndoorCentersService).visitedCenters(),
      ).toEqual([]);
    });

    it('supports string ids, deduplicates, moves to front, updates visitedAt, caps at 10, and persists', () => {
      setupTestBed();
      const service = TestBed.inject(VisitedIndoorCentersService);

      for (let i = 1; i <= 11; i++) {
        vi.advanceTimersByTime(1000);
        service.addVisitedCenter({
          id: `center-${i}`,
          name: `Gym ${i}`,
          slug: `gym-${i}`,
        });
      }

      expect(service.visitedCenters()).toHaveLength(10);
      expect(service.visitedCenters()[0].id).toBe('center-11');
      expect(service.visitedCenters()[9].id).toBe('center-2');

      vi.advanceTimersByTime(2500);
      const revisitTime = Date.now();
      service.addVisitedCenter({
        id: 'center-3',
        name: 'Gym 3',
        slug: 'gym-3',
      });

      const centers = service.visitedCenters();
      expect(centers).toHaveLength(10);
      expect(centers[0]).toEqual({
        id: 'center-3',
        name: 'Gym 3',
        slug: 'gym-3',
        visitedAt: revisitTime,
      });
      expect(centers.filter((c) => c.id === 'center-3')).toHaveLength(1);

      const persisted = JSON.parse(
        storage.getItem(STORAGE_KEYS.visitedIndoorCenters) ?? '[]',
      ) as VisitedIndoorCenter[];
      expect(persisted).toEqual(centers);
    });
  });
});
