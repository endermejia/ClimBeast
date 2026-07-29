import { inject, Injectable } from '@angular/core';

import { LocalStorage } from './local-storage';

export interface SignedUrlEntry {
  url: string;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class SignedUrlCache {
  private readonly storage = inject(LocalStorage);

  /** Read a cached signed URL entry. Returns null if missing or expired. */
  get(cacheKey: string): SignedUrlEntry | null {
    try {
      const raw = this.storage.getItem(cacheKey);
      if (!raw) return null;
      const entry: SignedUrlEntry = JSON.parse(raw);
      if (Date.now() < entry.expiresAt) {
        return entry;
      }
    } catch {
      // corrupted cache — treat as miss
    }
    return null;
  }

  /** Write a signed URL entry to cache. */
  set(cacheKey: string, entry: SignedUrlEntry): void {
    try {
      this.storage.setItem(cacheKey, JSON.stringify(entry));
    } catch {
      // storage full — best effort
    }
  }

  /** Build a deterministic cache key. */
  static key(prefix: string, path: string, extra?: string): string {
    return extra ? `${prefix}:${path}:${extra}` : `${prefix}:${path}`;
  }
}
