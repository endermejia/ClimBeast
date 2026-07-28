import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';

import { LocalStorage } from './local-storage';

describe('LocalStorage', () => {
  let service: LocalStorage;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocalStorage, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    service = TestBed.inject(LocalStorage);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set and get item', () => {
    service.setItem('test-key', 'test-value');
    expect(service.getItem('test-key')).toBe('test-value');
  });

  it('should return null for nonexistent key', () => {
    expect(service.getItem('nonexistent')).toBeNull();
  });

  it('should remove item', () => {
    service.setItem('to-delete', 'value');
    service.removeItem('to-delete');
    expect(service.getItem('to-delete')).toBeNull();
  });

  it('should clear all items', () => {
    service.setItem('key1', 'value1');
    service.setItem('key2', 'value2');
    service.clear();
    expect(service.getItem('key1')).toBeNull();
    expect(service.getItem('key2')).toBeNull();
  });
});
