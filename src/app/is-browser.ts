import { InjectionToken } from '@angular/core';

/**
 * Injection token that provides a boolean indicating whether the app is
 * running in a browser. Inject instead of calling
 * `isPlatformBrowser(inject(PLATFORM_ID))` in new code.
 *
 * Provide at app level via:
 * ```ts
 * { provide: IS_BROWSER, useFactory: () => isPlatformBrowser(inject(PLATFORM_ID)) }
 * ```
 */
export const IS_BROWSER = new InjectionToken<boolean>('IS_BROWSER');
