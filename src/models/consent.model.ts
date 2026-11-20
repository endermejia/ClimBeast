/**
 * Preferencias de consentimiento de cookies y tecnologías similares (RGPD /
 * LOPDGDD / art. 22.2 LSSI-CE / Guía de Cookies AEPD).
 */
export interface ConsentPreferences {
  /** Almacenamiento técnico estrictamente necesario (exento art. 22.2 LSSI-CE). */
  necessary: true;
  /** Telemetría anónima de rendimiento web (@vercel/speed-insights). */
  analytics: boolean;
  /** Contenido multimedia externo integrado (vídeos de YouTube en encadenes). */
  externalMedia: boolean;
}

export interface StoredConsentRecord extends ConsentPreferences {
  /** Versión de la política de cookies bajo la que se otorgó o rechazó. */
  version: string;
  /** Marca temporal (ms epoch) de la decisión del usuario. */
  timestamp: number;
}

/** Versión vigente de la configuración de cookies/privacidad. */
export const CONSENT_VERSION = '2026-11-20';

/** Vigencia máxima recomendada por la AEPD: 24 meses (730 días). */
export const CONSENT_MAX_AGE_MS = 730 * 24 * 60 * 60 * 1000;
