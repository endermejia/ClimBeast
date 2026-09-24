import { DOCUMENT } from '@angular/common';
import {
  Component,
  computed,
  afterNextRender,
  effect,
  inject,
  OnDestroy,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';

import { TuiSwipe } from '@taiga-ui/cdk';
import { TuiRoot } from '@taiga-ui/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { filter, map, merge, startWith } from 'rxjs';

import { CartService } from '../services/cart.service';
import { LocalStorage } from '../services/local-storage';
import { NotificationService } from '../services/notification.service';
import { OfflineWarmupService } from '../services/offline-warmup.service';
import { RealtimeService } from '../services/realtime.service';
import { SeoService } from '../services/seo.service';
import { SwipeNavigationService } from '../services/swipe-navigation.service';
import { ThemeService } from '../services/theme.service';

import { CartOverlayComponent } from '../components/cart-overlay/cart-overlay';
import { NavbarComponent } from '../components/ui/navbar';
import { OfflineBannerComponent } from '../components/ui/offline-banner';

import { STORAGE_KEYS } from '../constants';
import { reactToObservable } from '../utils';

import { IS_BROWSER } from './is-browser';

@Component({
  selector: 'app-root',
  imports: [
    OfflineBannerComponent,
    CartOverlayComponent,
    NavbarComponent,
    RouterOutlet,
    TranslateModule,
    TuiRoot,
    TuiSwipe,
  ],
  template: `
    <tui-root [attr.tuiTheme]="isDark() ? 'dark' : 'light'">
      <app-offline-banner />
      @if (navPending()) {
        <!-- Barra de progreso: un arranque lento o sin conexión nunca se
             percibe como pantalla en blanco. -->
        <div
          class="fixed inset-x-0 top-0 z-9999 h-1 animate-pulse bg-sky-500"
          role="progressbar"
          aria-label="Loading"
        ></div>
      }
      <div
        class="fixed inset-0 w-full h-full overflow-hidden flex flex-col-reverse md:flex-row"
      >
        @if (showNavbar()) {
          <app-navbar />
        }
        <main
          data-swipe-host
          class="flex-1 min-h-0 relative flex flex-col overflow-y-auto"
          (tuiSwipe)="swipeNav.onSwipe($event)"
        >
          <router-outlet />
        </main>
      </div>

      @if (cartService.showCart()) {
        <app-cart-overlay
          (closeOverlay)="cartService.showCart.set(false)"
          (checkout)="onCheckout()"
        />
      }
    </tui-root>
  `,
})
export class AppComponent implements OnDestroy {
  protected readonly router = inject(Router);
  protected readonly swipeNav = inject(SwipeNavigationService);
  private readonly themeService = inject(ThemeService);
  protected readonly cartService = inject(CartService);
  private swCheckInterval: ReturnType<typeof setInterval> | null = null;
  private suppressRogueSearch: ((e: KeyboardEvent) => void) | null = null;

  protected readonly theme = this.themeService.selectedTheme;
  protected readonly isDark = this.themeService.isDark;

  protected onCheckout(): void {
    this.cartService.showCart.set(false);
    void this.router.navigate(['/merchandising/checkout']);
  }
  private translate = inject(TranslateService);
  private storage = inject(LocalStorage);
  private readonly notifications = inject(NotificationService);
  protected readonly realtime = inject(RealtimeService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly doc = inject(DOCUMENT);
  private readonly seo = inject(SeoService);
  private readonly swUpdate = inject(SwUpdate);
  private readonly offlineWarmup = inject(OfflineWarmupService);

  private readonly gdprKey = STORAGE_KEYS.gdprAccepted;

  /**
   * Ruta actual sin query/hash. El valor inicial sale de la URL de forma
   * síncrona (misma ruta en el servidor y en el cliente) para no esperar a
   * `NavigationEnd`, que llega cuando terminan los guards (con llamada a red).
   */
  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.doc?.location?.pathname ?? '/' },
  );

  /**
   * `true` mientras el Router está navegando (guards, carga de chunks...).
   * Se muestra una barra de progreso para que esperas largas sin conexión
   * nunca se perciban como pantalla en blanco.
   */
  protected readonly navPending = toSignal(
    merge(
      this.router.events.pipe(
        filter((e): e is NavigationStart => e instanceof NavigationStart),
        map(() => true),
      ),
      this.router.events.pipe(
        filter(
          (
            e,
          ): e is
            | NavigationEnd
            | NavigationCancel
            | NavigationError
            | NavigationSkipped =>
            e instanceof NavigationEnd ||
            e instanceof NavigationCancel ||
            e instanceof NavigationError ||
            e instanceof NavigationSkipped,
        ),
        map(() => false),
      ),
    ),
    { initialValue: this.router.getCurrentNavigation() !== null },
  );

  /**
   * Se decide solo por la ruta (sin esperar a la sesión) para que el navbar
   * venga ya en el HTML del servidor y en el primer render: así no desplaza el
   * contenido al aparecer.
   */
  protected readonly showNavbar = computed(() => {
    const path = this.currentPath().split('?')[0].split('#')[0];
    return !['/login', '/signup', '/info', '/reset-password'].some((p) =>
      path.startsWith(p),
    );
  });

  private readonly langChange = toSignal(
    merge(
      this.translate.onLangChange.pipe(map(() => true)),
      this.translate.onDefaultLangChange.pipe(map(() => true)),
    ).pipe(startWith(true)),
  );

  constructor() {
    effect(() => {
      if (this.isBrowser && this.storage.getItem(this.gdprKey) !== 'true') {
        this.notifications.showGdpr();
      }
    });

    // Precaché de datos (áreas, etc.) para uso offline: reacciona a la sesión
    // y al estado de conexión (lee señales dentro de warmup()).
    effect(() => {
      this.offlineWarmup.warmup();
    });

    afterNextRender(() => {
      if (
        this.isBrowser &&
        this.storage.getItem(STORAGE_KEYS.updateApplied) === 'true'
      ) {
        this.storage.removeItem(STORAGE_KEYS.updateApplied);
        this.notifications.success('updateApplied');
      }
    });

    effect(() => {
      if (this.langChange()) {
        this.updateSeoTags();
      }
    });

    if (this.isBrowser) {
      // Intercept rogue hardware key events (e.g. OnePlus alert slider / physical mute switches)
      // which fire KEYCODE_F3 (133 / DOM 114) and KEYCODE_SEARCH (84 / DomKey: BrowserSearch / Find),
      // triggering the browser's Find-in-page modal
      this.suppressRogueSearch = (e: KeyboardEvent) => {
        const key = (e.key || '').toLowerCase();
        const code = (e.code || '').toLowerCase();
        const keyCode = e.keyCode || e.which;

        const isFKey =
          key === 'f3' ||
          code === 'f3' ||
          keyCode === 114 ||
          keyCode === 133 ||
          /^f\d+$/.test(key) ||
          /^f\d+$/.test(code) ||
          (keyCode >= 112 && keyCode <= 123) ||
          (keyCode >= 121 && keyCode <= 132);

        const isSearchKey =
          key === 'find' ||
          code === 'find' ||
          key === 'search' ||
          code === 'search' ||
          keyCode === 84 ||
          keyCode === 170 ||
          ((keyCode === 84 || keyCode === 170) && key !== 't');

        if (isFKey || isSearchKey) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      };

      window.addEventListener('keydown', this.suppressRogueSearch, {
        capture: true,
        passive: false,
      });
      window.addEventListener('keyup', this.suppressRogueSearch, {
        capture: true,
        passive: false,
      });
      if (this.doc) {
        this.doc.addEventListener('keydown', this.suppressRogueSearch, {
          capture: true,
          passive: false,
        });
        this.doc.addEventListener('keyup', this.suppressRogueSearch, {
          capture: true,
          passive: false,
        });
      }
    }

    if (this.isBrowser && this.swUpdate.isEnabled) {
      // Check for updates immediately on startup
      void this.swUpdate.checkForUpdate().catch(() => {
        // Ignore errors
      });

      // Check for updates on navigation
      reactToObservable(
        this.router.events.pipe(
          filter((event) => event instanceof NavigationEnd),
        ),
        () => {
          void this.swUpdate.checkForUpdate().catch(() => {
            // Ignore errors
          });
        },
      );

      // Check for updates every hour
      const oneHour = 60 * 60 * 1000;
      this.swCheckInterval = setInterval(() => {
        void this.swUpdate.checkForUpdate().catch(() => {
          // Ignore errors
        });
      }, oneHour);

      // Auto-apply update and reload
      reactToObservable(
        this.swUpdate.versionUpdates.pipe(
          filter(
            (evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY',
          ),
        ),
        () => {
          this.storage.setItem(STORAGE_KEYS.updateApplied, 'true');
          void this.swUpdate
            .activateUpdate()
            .then(() => {
              window.location.reload();
            })
            .catch(() => {
              window.location.reload();
            });
        },
      );

      // Handle unrecoverable state (corrupted cache). Con throttle y solo con
      // conexión: recargar sin red con la caché corrupta entra en bucle de
      // pantallas en blanco.
      reactToObservable(this.swUpdate.unrecoverable, () => {
        const now = Date.now();
        const last = Number(
          this.storage.getItem(STORAGE_KEYS.unrecoverableReloadTs) || 0,
        );
        if (now - last <= 15000 || !navigator.onLine) return;
        this.storage.setItem(STORAGE_KEYS.unrecoverableReloadTs, String(now));
        this.storage.setItem(STORAGE_KEYS.updateApplied, 'true');
        window.location.reload();
      });
    }
  }

  ngOnDestroy(): void {
    if (this.suppressRogueSearch && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.suppressRogueSearch, {
        capture: true,
      });
      window.removeEventListener('keyup', this.suppressRogueSearch, {
        capture: true,
      });
      if (this.doc) {
        this.doc.removeEventListener('keydown', this.suppressRogueSearch, {
          capture: true,
        });
        this.doc.removeEventListener('keyup', this.suppressRogueSearch, {
          capture: true,
        });
      }
      this.suppressRogueSearch = null;
    }
    if (this.swCheckInterval !== null) {
      clearInterval(this.swCheckInterval);
      this.swCheckInterval = null;
    }
  }

  private updateSeoTags() {
    const appTitle = this.translate.instant('seo.title');
    const description = this.translate.instant('seo.description');

    if (appTitle === 'seo.title' || !appTitle) return;

    // Update <html lang> attribute to reflect active language
    const lang = this.translate.currentLang || this.translate.defaultLang;
    if (this.doc?.documentElement) {
      this.doc.documentElement.lang = lang ?? 'es';
    }

    this.seo.setPage({
      title: appTitle,
      description,
    });
  }
}
