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

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);
