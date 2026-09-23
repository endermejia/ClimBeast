import { LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiButton, TuiIcon, TuiLink, TuiTitle } from '@taiga-ui/core';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';

import { AmountByEveryGrade, normalizeRoutesByGrade } from '../../models';

import { ChartRoutesByGradeComponent } from '../charts/chart-routes-by-grade';

export type PlaceCardKind = 'area' | 'crag' | 'indoor';

export interface PlaceCardItem {
  name: string;
  slug: string;
  liked?: boolean;
  grades?: AmountByEveryGrade | null;
  routes_count?: number;
  crags_count?: number;
  topos_count?: number;
  topos?: { id: string | number; name: string; slug: string }[] | null;
  area_name?: string;
  area_slug?: string;
  approach?: number;
  city?: string | null;
  country?: string | null;
}

@Component({
  selector: 'app-card',
  imports: [
    ChartRoutesByGradeComponent,
    LowerCasePipe,
    RouterLink,
    TranslatePipe,
    TuiButton,
    TuiCardLarge,
    TuiHeader,
    TuiIcon,
    TuiLink,
    TuiTitle,
  ],
  template: `
    <div
      tuiCardLarge
      [appearance]="appearance()"
      class="w-full h-full flex flex-col gap-0!"
    >
      <header tuiHeader>
        <h2 tuiTitle class="font-bold! whitespace-normal! min-w-0">
          @if (place(); as p) {
            <span class="flex flex-wrap items-baseline gap-x-1.5">
              <a
                tuiLink
                [routerLink]="titleLink()"
                class="font-bold! text-2xl! text-(--tui-text-primary)! whitespace-normal!"
              >
                {{ p.data.name }}
              </a>
              @if (p.kind === 'crag' && showAreaName() && p.data.area_name) {
                <a
                  tuiLink
                  appearance="action-grayscale"
                  [routerLink]="areaOnlyLink()"
                  class="font-bold! text-base! text-(--tui-text-secondary)! whitespace-normal!"
                >
                  ({{ p.data.area_name }})
                </a>
              }
              @if (p.kind === 'indoor' && p.data.city) {
                <a
                  tuiLink
                  appearance="action-grayscale"
                  [routerLink]="['/indoor']"
                  [queryParams]="{ q: p.data.city }"
                  class="font-bold! text-base! text-(--tui-text-secondary)! whitespace-normal!"
                >
                  ({{ p.data.city }})
                </a>
              }
            </span>
          } @else {
            <ng-content select="[title]" />
          }
        </h2>

        <aside tuiAccessories>
          <ng-content select="[titleActions]" />
          @if (showLiked()) {
            <tui-icon
              icon="@tui.heart"
              class="shrink-0"
              [attr.aria-label]="'favorite' | translate"
              style="font-size: 1.5rem; color: var(--tui-background-accent-2)"
            />
          }
        </aside>

        <div tuiSubtitle class="truncate">
          <ng-content select="[subtitle]" />
        </div>
      </header>

      <section class="grow flex flex-col justify-center py-2">
        <div class="grid grid-cols-[1fr_auto] gap-4 items-stretch">
          <div class="flex flex-col justify-center min-w-0">
            @if (place(); as p) {
              <div class="flex flex-col gap-1">
                @if (p.kind === 'indoor' && p.data.country) {
                  <div class="text-xs opacity-60">
                    {{ p.data.country }}
                  </div>
                }

                <a
                  tuiLink
                  [routerLink]="titleLink()"
                  [queryParams]="{ tab: 'routes' }"
                  class="flex items-center gap-2 text-xl! text-(--tui-text-primary)! whitespace-normal!"
                >
                  <tui-icon icon="@tui.route" [style.font-size.rem]="1.25" />
                  <span>
                    {{ routesCount() }} {{ 'routes' | translate | lowercase }}
                  </span>
                </a>

                @if (p.kind === 'area') {
                  <a
                    tuiLink
                    [routerLink]="titleLink()"
                    [queryParams]="{ tab: 'crags' }"
                    class="flex items-center gap-2 text-xl! text-(--tui-text-primary)! whitespace-normal!"
                  >
                    <tui-icon
                      icon="@tui.layout-grid"
                      [style.font-size.rem]="1.25"
                    />
                    <span>
                      {{ p.data.crags_count ?? 0 }}
                      {{
                        ((p.data.crags_count ?? 0) === 1 ? 'crag' : 'crags')
                          | translate
                          | lowercase
                      }}
                    </span>
                  </a>
                }

                @if (toposCount() > 0) {
                  <a
                    tuiLink
                    [routerLink]="titleLink()"
                    [queryParams]="{ tab: 'topos' }"
                    class="flex items-center gap-2 text-xl! text-(--tui-text-primary)! whitespace-normal!"
                  >
                    <div
                      class="w-5 h-5 bg-current"
                      [style.mask]="'url(image/topo.svg) center/contain no-repeat'"
                    ></div>
                    <span>
                      {{ toposCount() }} {{ 'topos' | translate | lowercase }}
                    </span>
                  </a>
                }

                @if (p.kind === 'crag') {
                  @if (p.data.approach; as approachMinutes) {
                    <div class="flex items-center gap-2 text-xs opacity-60">
                      <tui-icon
                        icon="@tui.footprints"
                        [style.font-size.rem]="1"
                      />
                      <span>{{ approachMinutes }} min.</span>
                    </div>
                  }

                  @if (p.data.topos?.length) {
                    <div class="flex flex-wrap gap-2 pt-1">
                      @for (topo of p.data.topos; track topo.id) {
                        <button
                          tuiButton
                          size="xs"
                          appearance="info"
                          class="rounded-full!"
                          [routerLink]="[
                            '/area',
                            p.data.area_slug ?? '',
                            p.data.slug,
                            'topo',
                            topo.id,
                          ]"
                        >
                          {{ topo.name }}
                        </button>
                      }
                    </div>
                  }
                }
              </div>
            } @else {
              <ng-content select="[content]" />
            }
          </div>
          <div class="flex items-center shrink-0">
            @if (place(); as p) {
              <app-chart-routes-by-grade [grades]="p.data.grades ?? {}" />
            } @else {
              <ng-content select="[extra]" />
            }
          </div>
        </div>
      </section>

      @if (hasFooter()) {
        <footer class="pt-2">
          <ng-content select="[footer]" />
        </footer>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AppCardComponent {
  appearance = input<string>('outline');
  liked = input<boolean>(false);
  hasFooter = input<boolean>(false);
  kind = input<PlaceCardKind | null>(null);
  showAreaName = input<boolean>(true);

  item = input<PlaceCardItem | null, Partial<PlaceCardItem> | null>(null, {
    transform: (value) =>
      value
        ? ({
            ...value,
            liked: value.liked ?? false,
            grades: value.grades ?? {},
          } as PlaceCardItem)
        : null,
  });

  protected readonly place = computed(() => {
    const kind = this.kind();
    const data = this.item();
    return kind && data ? { kind, data } : null;
  });

  protected readonly showLiked = computed(
    () => this.liked() || !!this.item()?.liked,
  );

  protected readonly titleLink = computed<(string | number)[]>(() => {
    const data = this.item();
    if (!data) return [];
    switch (this.kind()) {
      case 'crag':
        return ['/area', data.area_slug ?? '', data.slug];
      case 'indoor':
        return ['/indoor', data.slug];
      default:
        return ['/area', data.slug];
    }
  });

  protected readonly areaOnlyLink = computed<(string | number)[]>(() => [
    '/area',
    this.item()?.area_slug ?? '',
  ]);

  protected readonly routesCount = computed(() => {
    const data = this.item();
    if (!data) return 0;
    if (data.routes_count != null) return data.routes_count;
    return Object.values(normalizeRoutesByGrade(data.grades ?? {})).reduce(
      (sum, amount) => sum + amount,
      0,
    );
  });

  protected readonly toposCount = computed(() => {
    const data = this.item();
    if (!data) return 0;
    return data.topos?.length ?? data.topos_count ?? 0;
  });
}
