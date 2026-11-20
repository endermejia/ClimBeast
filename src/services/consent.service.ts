import {
  computed,
  effect,
  inject,
  Injectable,
  InjectionToken,
  signal,
} from '@angular/core';

import {
  injectSpeedInsights,
  type SpeedInsightsProps,
} from '@vercel/speed-insights';

import {
  CONSENT_MAX_AGE_MS,
  CONSENT_VERSION,
  ConsentPreferences,
  StoredConsentRecord,
} from '../models';

import { STORAGE_KEYS } from '../constants';

import { IS_BROWSER } from '../app/is-browser';
import { LocalStorage } from './local-storage';

export type SpeedInsightsInjector = (
  props?: SpeedInsightsProps,
) => { setRoute: (route: string | null) => void } | null;

export const SPEED_INSIGHTS_INJECTOR =
  new InjectionToken<SpeedInsightsInjector>('SPEED_INSIGHTS_INJECTOR', {
    providedIn: 'root',
    factory: () => injectSpeedInsights,
  });

/**
 * Gestiona el consentimiento granular de cookies y tecnologías similares
 * conforme al RGPD, LOPDGDD, art. 22.2 LSSI-CE y la Guía de Cookies de la AEPD:
 *
 * - Bloqueo preventivo: ninguna categoría no técnica (`analytics`,
 *   `externalMedia`) está activa hasta que el usuario da consentimiento expreso.
 * - Caducidad máxima de 24 meses (`CONSENT_MAX_AGE_MS`) y versionado
 *   (`CONSENT_VERSION`).
 * - Inyecta `@vercel/speed-insights` únicamente cuando `analytics` está
 *   aceptado y bloquea cualquier envío en tiempo real vía `beforeSend` si el
 *   usuario revoca el consentimiento en la misma sesión.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly storage = inject(LocalStorage);
  private readonly speedInsightsInjector = inject(SPEED_INSIGHTS_INJECTOR);

  private speedInsightsInjected = false;

  private readonly _record = signal<StoredConsentRecord | null>(
    this.loadStoredConsent(),
  );

  /** Registro persistido actual o `null` si el usuario aún no ha decidido (o caducó). */
  readonly record = this._record.asReadonly();

  /** `true` si existe una decisión válida y vigente (aceptada, rechazada o personalizada). */
  readonly hasDecided = computed(() => this._record() !== null);

  /** `true` si el usuario consintió métricas de rendimiento (`@vercel/speed-insights`). */
  readonly analyticsAllowed = computed(
    () => this._record()?.analytics === true,
  );

  /** `true` si el usuario consintió contenido multimedia externo (vídeos de YouTube). */
  readonly externalMediaAllowed = computed(
    () => this._record()?.externalMedia === true,
  );

  /** Estado actual de todas las categorías (privacidad por defecto: todo opcional en `false`). */
  readonly preferences = computed<ConsentPreferences>(() => ({
    necessary: true,
    analytics: this.analyticsAllowed(),
    externalMedia: this.externalMediaAllowed(),
  }));

  constructor() {
    effect(() => {
      if (this.isBrowser && this.analyticsAllowed()) {
        this.ensureSpeedInsights();
      }
    });
  }

  acceptAll(): void {
    this.save({
      necessary: true,
      analytics: true,
      externalMedia: true,
    });
  }

  rejectAll(): void {
    this.save({
      necessary: true,
      analytics: false,
      externalMedia: false,
    });
  }

  updatePreferences(
    partial: Partial<Pick<ConsentPreferences, 'analytics' | 'externalMedia'>>,
  ): void {
    const current = this.preferences();
    this.save({
      necessary: true,
      analytics: partial.analytics ?? current.analytics,
      externalMedia: partial.externalMedia ?? current.externalMedia,
    });
  }

  reset(): void {
    this._record.set(null);
    if (this.isBrowser) {
      this.storage.removeItem(STORAGE_KEYS.cookieConsent);
      this.storage.removeItem(STORAGE_KEYS.gdprAccepted);
    }
  }

  private save(prefs: ConsentPreferences): void {
    const next: StoredConsentRecord = {
      ...prefs,
      necessary: true,
      version: CONSENT_VERSION,
      timestamp: Date.now(),
    };
    this._record.set(next);
    if (this.isBrowser) {
      this.storage.setItem(STORAGE_KEYS.cookieConsent, JSON.stringify(next));
      // Limpia la clave heredada sin granularidad AEPD
      this.storage.removeItem(STORAGE_KEYS.gdprAccepted);
    }
  }

  private loadStoredConsent(): StoredConsentRecord | null {
    if (!this.isBrowser) return null;
    const raw = this.storage.getItem(STORAGE_KEYS.cookieConsent);
    if (!raw) return null;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!this.isValidRecord(parsed)) {
        return null;
      }
      const age = Date.now() - parsed.timestamp;
      if (age < 0 || age > CONSENT_MAX_AGE_MS) {
        this.storage.removeItem(STORAGE_KEYS.cookieConsent);
        return null;
      }
      if (parsed.version !== CONSENT_VERSION) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private isValidRecord(value: unknown): value is StoredConsentRecord {
    if (typeof value !== 'object' || value === null) return false;
    const obj = value as Record<string, unknown>;
    return (
      obj['necessary'] === true &&
      typeof obj['analytics'] === 'boolean' &&
      typeof obj['externalMedia'] === 'boolean' &&
      typeof obj['version'] === 'string' &&
      typeof obj['timestamp'] === 'number' &&
      Number.isFinite(obj['timestamp'])
    );
  }

  private ensureSpeedInsights(): void {
    if (this.speedInsightsInjected || !this.isBrowser) return;
    this.speedInsightsInjected = true;
    try {
      this.speedInsightsInjector({
        beforeSend: (event) => (this.analyticsAllowed() ? event : null),
      });
    } catch (err: unknown) {
      console.warn('[ConsentService] Failed to initialize Speed Insights', err);
      this.speedInsightsInjected = false;
    }
  }
}
