import { registerLocaleData } from '@angular/common';
import localeCa from '@angular/common/locales/ca';
import localeDe from '@angular/common/locales/de';
import localeEn from '@angular/common/locales/en';
import localeEs from '@angular/common/locales/es';
import localeEu from '@angular/common/locales/eu';
import localeFr from '@angular/common/locales/fr';
import localeIt from '@angular/common/locales/it';
import {
  bootstrapApplication,
  BootstrapContext,
} from '@angular/platform-browser';

import { AppComponent } from './app/app';
import { config } from './app/app.config.server';

/**
 * El SSR puede acabar con un rechazo de promesa sin capturar (p. ej. un fallo
 * de inyección cuando Vite recarga los módulos tras una compilación fallida, o
 * una navegación que el router rechaza). Node mataría el proceso entero —y con
 * él el servidor de desarrollo— así que se deja constancia en el log y la
 * petición fallida no tumba el proceso.
 */
process.on('unhandledRejection', (reason) => {
  console.error('[SSR] Unhandled promise rejection:', reason);
});

registerLocaleData(localeEs, 'es');
registerLocaleData(localeEn, 'en');
registerLocaleData(localeCa, 'ca');
registerLocaleData(localeCa, 'va');
registerLocaleData(localeDe, 'de');
registerLocaleData(localeEu, 'eu');
registerLocaleData(localeFr, 'fr');
registerLocaleData(localeIt, 'it');

const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(AppComponent, config, context);

export { bootstrap as default };
