import { Component, computed, inject, input, resource } from '@angular/core';

import { TuiButton, TuiIcon, TuiLoader } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import {
  type OfflineTopoTarget,
  OfflineToposService,
} from '../../services/offline-topos.service';
import { SupabaseService } from '../../services/supabase.service';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-topos-offline-bar',
  imports: [TranslatePipe, TuiButton, TuiIcon, TuiLoader],
  template: `
    @if (isBrowser && topos().length > 0 && statusResource.hasValue()) {
      <div class="flex items-center justify-between gap-3 flex-wrap">
        @if (allAvailable()) {
          <div
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium"
          >
            <tui-icon icon="@tui.circle-check" class="text-base shrink-0" />
            <span>{{ 'offline.toposAvailable' | translate }}</span>
          </div>
        } @else {
          <button
            tuiButton
            appearance="secondary"
            size="s"
            type="button"
            [iconStart]="isDownloading() ? '' : '@tui.download'"
            [disabled]="!isOnline() || isDownloading()"
            (click.zoneless)="download()"
          >
            @if (progress(); as prog) {
              <tui-loader size="xs" class="mr-1" />
              {{
                'offline.downloadingTopos'
                  | translate: { current: prog.current, total: prog.total }
              }}
            } @else {
              {{ 'offline.downloadTopos' | translate }}
            }
          </button>
        }
      </div>
    }
  `,
})
export class ToposOfflineBarComponent {
  protected readonly isBrowser = inject(IS_BROWSER);
  private readonly offlineTopos = inject(OfflineToposService);
  private readonly supabase = inject(SupabaseService);

  topos = input.required<readonly OfflineTopoTarget[]>();
  scopeKey = input.required<string>();

  protected readonly isOnline = this.supabase.isOnline;

  protected readonly statusResource = resource({
    params: () => ({
      topos: this.topos(),
      version: this.offlineTopos.version(),
    }),
    loader: async ({ params }) => {
      if (!params.topos.length) {
        return { total: 0, cachedCount: 0, allAvailable: false };
      }
      return this.offlineTopos.checkToposAvailability(params.topos);
    },
  });

  protected readonly progress = computed(
    () => this.offlineTopos.progressMap().get(this.scopeKey()) ?? null,
  );
  protected readonly isDownloading = computed(() => this.progress() !== null);
  protected readonly allAvailable = computed(
    () => this.statusResource.value()?.allAvailable ?? false,
  );

  protected download(): void {
    void this.offlineTopos.downloadTopos(this.scopeKey(), this.topos());
  }
}
