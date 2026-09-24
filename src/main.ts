import { registerLocaleData } from '@angular/common';
import localeCa from '@angular/common/locales/ca';
import localeDe from '@angular/common/locales/de';
import localeEn from '@angular/common/locales/en';
import localeEs from '@angular/common/locales/es';
import localeEu from '@angular/common/locales/eu';
import localeFr from '@angular/common/locales/fr';
import localeIt from '@angular/common/locales/it';
import { bootstrapApplication } from '@angular/platform-browser';

import { injectSpeedInsights } from '@vercel/speed-insights';

import { AppComponent } from './app/app';
import { appConfig } from './app/app.config';

registerLocaleData(localeEs, 'es');
registerLocaleData(localeEn, 'en');
registerLocaleData(localeCa, 'ca');
registerLocaleData(localeCa, 'va');
registerLocaleData(localeDe, 'de');
registerLocaleData(localeEu, 'eu');
registerLocaleData(localeFr, 'fr');
registerLocaleData(localeIt, 'it');

injectSpeedInsights();

bootstrapApplication(AppComponent, appConfig).catch((err) => {
  console.error(err);
  renderBootstrapFallback();
});

/**
 * Si el arranque falla, `<app-root>` se quedaría vacío = pantalla en blanco.
 * Se pinta un fallback estático con opción a reintentar.
 */
function renderBootstrapFallback(): void {
  if (typeof document === 'undefined') return;
  const root = document.querySelector('app-root');
  if (!root) return;
  root.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:12px;padding:24px;font-family:system-ui,sans-serif;text-align:center;">
      <p style="margin:0;font-size:1.125rem;font-weight:600;">No se ha podido cargar la app</p>
      <p style="margin:0;color:#6b7280;">Comprueba tu conexión a internet y vuelve a intentarlo.</p>
      <button type="button" id="lw-bootstrap-retry" style="margin-top:8px;padding:8px 20px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-size:1rem;cursor:pointer;">Reintentar</button>
    </div>`;
  root.querySelector('#lw-bootstrap-retry')?.addEventListener('click', () => {
    window.location.reload();
  });
}
