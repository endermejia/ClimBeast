import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
  WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  TuiAppearance,
  TuiIcon,
  TuiInput,
  TuiLabel,
  TuiLoader,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TuiBadge,
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiSegmented,
} from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { SupabaseService } from '../../services/supabase.service';

import { EmptyStateComponent } from '../../components/ui/empty-state';

import { matchesQuery } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

interface AreaFundSummary {
  areaId: number;
  name: string;
  slug: string;
  totalNet: number;
  totalGross: number;
  donationsCount: number;
  lastDonationDate: string | null;
}

@Component({
  selector: 'app-admin-area-funds',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    EmptyStateComponent,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiBadge,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiIcon,
    TuiInput,
    TuiLabel,
    TuiLoader,
    TuiScrollbar,
    TuiSegmented,
    TuiTextfield,
  ],
  template: `
    <section class="flex flex-col w-full max-w-7xl mx-auto p-4 grow min-h-0">
      <!-- Header -->
      <header class="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-2xl font-bold m-0">
          <a
            routerLink="/admin"
            class="no-underline text-inherit flex items-center gap-2"
          >
            <tui-icon icon="@tui.arrow-left" />
            <tui-badged-content [style.--tui-radius.%]="50" class="shrink-0">
              @if (areasWithFundsCount(); as count) {
                <ng-container tuiSlot="top">
                  <tui-badge-notification tuiAppearance="accent" size="s">
                    {{ count }}
                  </tui-badge-notification>
                </ng-container>
              }
              <div
                class="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
              >
                <tui-icon icon="@tui.coins" />
              </div>
            </tui-badged-content>
            {{ 'admin.areaFunds.title' | translate }}
          </a>
        </h1>

        <!-- Overall Balance Badge -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-(--tui-text-secondary)">
            {{ 'admin.areaFunds.totalBalance' | translate }}:
          </span>
          <span
            tuiBadge
            size="l"
            appearance="accent"
            class="font-mono font-bold text-base"
          >
            {{ totalCollected() | currency: 'EUR' : 'symbol' : '1.2-2' }}
          </span>
        </div>
      </header>

      <p class="mb-6 text-tui-text-secondary opacity-60">
        {{ 'admin.areaFunds.description' | translate }}
      </p>

      <!-- Search & Filters -->
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <tui-textfield
          class="grow block bg-(--tui-background-base)"
          tuiTextfieldSize="m"
        >
          <label tuiLabel for="area-funds-search">
            {{ 'searchPlaceholder' | translate }}
          </label>
          <input
            tuiInput
            #fundsSearch
            id="area-funds-search"
            autocomplete="off"
            [value]="query()"
            (input.zoneless)="onQuery(fundsSearch.value)"
          />
        </tui-textfield>

        <tui-segmented
          size="m"
          class="shrink-0"
          [activeItemIndex]="onlyWithDonations() ? 1 : 0"
          (activeItemIndexChange)="onSegmentChange($event)"
        >
          <button type="button">
            {{ 'all' | translate }}
          </button>
          <button type="button">
            {{ 'admin.areaFunds.donationsCount' | translate }}
          </button>
        </tui-segmented>
      </div>

      <!-- List -->
      <tui-scrollbar class="flex grow">
        @if (dataResource.isLoading()) {
          <div class="flex items-center justify-center py-12">
            <tui-loader size="xxl" />
          </div>
        } @else {
          <div
            class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pb-8"
          >
            @for (item of filtered(); track item.areaId) {
              <div
                class="flex flex-col justify-between p-4 bg-(--tui-background-base) rounded-2xl border border-(--tui-border-normal) hover:border-(--tui-border-hover) hover:shadow-xs transition-all gap-3"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <h2 class="font-bold text-base truncate m-0">
                      {{ item.name }}
                    </h2>
                    <span class="text-xs text-(--tui-text-tertiary)">
                      ID: {{ item.areaId }}
                    </span>
                  </div>
                  <span
                    tuiBadge
                    size="m"
                    [appearance]="item.totalNet > 0 ? 'accent' : 'neutral'"
                    class="font-mono font-bold shrink-0"
                  >
                    {{ item.totalNet | currency: 'EUR' : 'symbol' : '1.2-2' }}
                  </span>
                </div>

                <div
                  class="flex items-center justify-between text-xs text-(--tui-text-secondary) pt-2 border-t border-(--tui-border-normal)"
                >
                  <div class="flex items-center gap-1.5">
                    <tui-icon icon="@tui.heart" class="text-rose-500 text-sm" />
                    <span>
                      {{ item.donationsCount }}
                      {{ 'admin.areaFunds.donationsCount' | translate }}
                    </span>
                  </div>

                  @if (item.lastDonationDate) {
                    <span>
                      {{ item.lastDonationDate | date: 'mediumDate' }}
                    </span>
                  }
                </div>

                <div class="flex justify-end pt-1">
                  <a
                    [routerLink]="['/area', item.slug]"
                    tuiButton
                    size="s"
                    appearance="textfield"
                    class="no-underline text-inherit"
                  >
                    <tui-icon icon="@tui.external-link" />
                    {{ 'admin.areaFunds.viewArea' | translate }}
                  </a>
                </div>
              </div>
            } @empty {
              <div class="col-span-full">
                <app-empty-state
                  icon="@tui.coins"
                  message="admin.areaFunds.empty"
                />
              </div>
            }
          </div>
        }
      </tui-scrollbar>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class AdminAreaFundsComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly isBrowser = inject(IS_BROWSER);

  readonly query: WritableSignal<string> = signal('');
  readonly onlyWithDonations: WritableSignal<boolean> = signal(false);

  readonly dataResource = resource({
    loader: async () => {
      if (!this.isBrowser) return [] as AreaFundSummary[];

      await this.supabase.whenReady();

      const [areasRes, donationsRes] = await Promise.all([
        this.supabase.client
          .from('areas')
          .select('id, name, slug')
          .order('name'),
        this.supabase.client
          .from('area_donations')
          .select('area_id, net_amount, gross_amount, created_at'),
      ]);

      const areas = areasRes.data || [];
      const donations = donationsRes.data || [];

      const statsMap = new Map<
        number,
        { net: number; gross: number; count: number; lastDate: string | null }
      >();

      for (const d of donations) {
        const areaId = Number(d.area_id);
        const existing = statsMap.get(areaId) || {
          net: 0,
          gross: 0,
          count: 0,
          lastDate: null,
        };
        existing.net += Number(d.net_amount || 0);
        existing.gross += Number(d.gross_amount || 0);
        existing.count += 1;
        if (
          !existing.lastDate ||
          new Date(d.created_at) > new Date(existing.lastDate)
        ) {
          existing.lastDate = d.created_at;
        }
        statsMap.set(areaId, existing);
      }

      const summaries: AreaFundSummary[] = areas.map((a) => {
        const stats = statsMap.get(Number(a.id));
        return {
          areaId: Number(a.id),
          name: a.name,
          slug: a.slug,
          totalNet: stats ? stats.net : 0,
          totalGross: stats ? stats.gross : 0,
          donationsCount: stats ? stats.count : 0,
          lastDonationDate: stats?.lastDate ?? null,
        };
      });

      // Sort by totalNet desc, then by name
      summaries.sort((a, b) => {
        if (b.totalNet !== a.totalNet) return b.totalNet - a.totalNet;
        return a.name.localeCompare(b.name);
      });

      return summaries;
    },
  });

  readonly allSummaries = computed(() => this.dataResource.value() ?? []);

  readonly totalCollected = computed(() => {
    return this.allSummaries().reduce((acc, curr) => acc + curr.totalNet, 0);
  });

  readonly areasWithFundsCount = computed(() => {
    return this.allSummaries().filter((s) => s.donationsCount > 0).length;
  });

  readonly filtered = computed(() => {
    const q = this.query().trim();
    const onlyWith = this.onlyWithDonations();
    let list = this.allSummaries();

    if (onlyWith) {
      list = list.filter((s) => s.donationsCount > 0);
    }

    if (!q) return list;
    return list.filter(
      (s) => matchesQuery(s.name, q) || matchesQuery(s.slug, q),
    );
  });

  protected onQuery(val: string): void {
    this.query.set(val);
  }

  protected onSegmentChange(index: number): void {
    this.onlyWithDonations.set(index === 1);
  }
}
