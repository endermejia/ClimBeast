import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { describe, it, expect, beforeEach } from 'vitest';

import { IS_BROWSER } from '../app/is-browser';

import { MockLocalStorage } from '../testing';
import { CacheService } from './cache.service';
import { LocalStorage } from './local-storage';

describe('CacheService', () => {
  let service: CacheService;
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CacheService,
        { provide: LocalStorage, useClass: MockLocalStorage },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
      ],
    });
    service = TestBed.inject(CacheService);
    mockStorage = TestBed.inject(LocalStorage) as unknown as MockLocalStorage;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return default value when key not found', () => {
    const result = service.get('nonexistent', 'default');
    expect(result).toBe('default');
  });

  it('should return cached value when key exists', () => {
    mockStorage.setItem('test-key', JSON.stringify('cached-value'));
    const result = service.get('test-key', 'default');
    expect(result).toBe('cached-value');
  });

  it('should handle corrupted cache entry', () => {
    mockStorage.setItem('corrupted', 'not-valid-json');
    const result = service.get('corrupted', 'default');
    expect(result).toBe('default');
  });

  it('should return null for getLastUpdated when key not found', () => {
    expect(service.getLastUpdated('nonexistent')).toBeNull();
  });

  it('should return timestamp for cached entry', () => {
    mockStorage.setItem('key:_ts', '1234567890');
    expect(service.getLastUpdated('key')).toBe(1234567890);
  });

  it('should set and get values', () => {
    service.set('mykey', { data: 'test' });
    const result = service.get('mykey', null);
    expect(result).toEqual({ data: 'test' });
  });

  it('should remove values', () => {
    service.set('to-remove', 'value');
    service.remove('to-remove');
    expect(service.get('to-remove', null)).toBeNull();
  });

  it('should clear all values', () => {
    service.set('key1', 'value1');
    service.set('key2', 'value2');
    service.clear();
    expect(service.get('key1', null)).toBeNull();
  });
});
