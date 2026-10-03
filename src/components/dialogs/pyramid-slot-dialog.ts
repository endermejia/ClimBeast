import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  TuiButton,
  TuiDialogContext,
  TuiIcon,
  TuiInput,
  TuiLoader,
  TuiScrollbar,
} from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { RoutesService } from '../../services/routes.service';

import {
  AscentType,
  ClimbingKind,
  ClimbingKinds,
  RouteDto,
  RouteSearchResult,
} from '../../models';

import { AscentTypeComponent } from '../ascent/ascent-type';

import { GradeComponent } from '../ui/avatar-grade';

export interface PyramidRouteItem extends RouteSearchResult {
  location: string;
}

export interface PyramidSlotDialogData {
  level: number;
  expectedGrade?: number;
  currentRouteId?: number | null;
  currentRoute?:
    (RouteDto & { crag?: { slug: string; area?: { slug: string } } }) | null;
  isCompleted?: boolean;
  ascent?: { score: number; type: AscentType };
  userId: string;
  year: number;
  canDelete?: boolean;
  kind?: ClimbingKind;
}

@Component({
  selector: 'app-pyramid-slot-dialog',
  standalone: true,
  imports: [
    AscentTypeComponent,
    CommonModule,
    FormsModule,
    GradeComponent,
    TranslatePipe,
    TuiButton,
    TuiIcon,
    TuiInput,
    TuiLoader,
    TuiScrollbar,
  ],
  template: `
    <div class="flex flex-col gap-4 p-4 min-w-[320px] max-w-[400px]">
      <div class="flex flex-col gap-1">
        <span class="text-sm opacity-60 uppercase font-bold tracking-wider">
          {{ 'pyramid.level' | translate }} {{ data.level }}
        </span>
        @if (data.expectedGrade) {
          <div class="flex items-center gap-2">
            <span class="text-xs"
              >{{ 'pyramid.requiredGrade' | translate }}:</span
            >
            <app-grade
              [grade]="data.expectedGrade"
              [kind]="data.kind || ClimbingKinds.SPORT"
            />
          </div>
        }
      </div>

      @if (data.currentRouteId && data.currentRoute) {
        <div
          class="flex flex-col items-center gap-2 p-4 rounded-2xl border cursor-pointer transition-transform hover:scale-105"
          [class.bg-(--tui-status-positive-pale)]="data.isCompleted"
          [class.border-(--tui-status-positive)]="data.isCompleted"
          [class.bg-(--tui-background-neutral-1)]="!data.isCompleted"
          [class.border-transparent]="!data.isCompleted"
          tabindex="0"
          (click)="goToRoute(data.currentRoute)"
          (keydown.enter)="goToRoute(data.currentRoute)"
        >
          <div class="flex items-center gap-3 w-full justify-center">
            <app-grade
              [grade]="data.currentRoute.grade"
              [kind]="data.currentRoute.climbing_kind"
            />
            <span
              class="font-bold text-lg truncate max-w-[200px] hover:underline"
              >{{ data.currentRoute.name }}</span
            >
          </div>

          @if (data.isCompleted && data.ascent) {
            <div class="flex items-center gap-2 mt-2">
              <app-ascent-type [type]="data.ascent.type" />
              <span class="font-bold text-(--tui-status-positive) text-sm">
                +{{ data.ascent.score }} {{ 'points' | translate }}
              </span>
            </div>
          }
        </div>
      } @else {
        <!-- Search Field -->
        <tui-textfield tuiTextfieldSize="m" [tuiTextfieldCleaner]="true">
          <tui-icon tuiIconStart icon="@tui.search" />
          <input
            tuiInput
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearchChange($event)"
            [placeholder]="'search' | translate"
            autocomplete="off"
          />
        </tui-textfield>

        <!-- Results List -->
        <tui-loader [overlay]="true" [loading]="loading()">
          <tui-scrollbar class="max-h-[300px] -mx-2 px-2">
            <div class="flex flex-col gap-2 mt-2">
              @for (route of results(); track route.id) {
                <div
                  class="flex items-center justify-between p-3 rounded-2xl bg-(--tui-background-neutral-1) hover:bg-(--tui-background-neutral-2) cursor-pointer transition-colors border border-transparent hover:border-(--tui-border-normal)"
                  tabindex="0"
                  (click)="selectRoute(route)"
                  (keydown.enter)="selectRoute(route)"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <app-grade
                      [grade]="route.grade"
                      [kind]="route.climbing_kind"
                      size="s"
                    />
                    <div class="flex flex-col min-w-0">
                      <span class="font-bold truncate">{{ route.name }}</span>
                      @if (route.location) {
                        <span class="text-[10px] opacity-60 truncate">
                          {{ route.location }}
                        </span>
                      }
                    </div>
                  </div>
                  <tui-icon icon="@tui.chevron-right" class="opacity-40" />
                </div>
              } @empty {
                @if (hasMinQuery()) {
                  <div class="p-8 text-center opacity-40 italic">
                    {{ 'noResults' | translate }}
                  </div>
                } @else {
                  <div class="p-8 text-center opacity-40 italic">
                    {{ 'pyramid.startTyping' | translate }}
                  </div>
                }
              }
            </div>
          </tui-scrollbar>
        </tui-loader>
      }

      <!-- Actions -->
      @if (data.currentRouteId) {
        <div
          class="flex justify-center mt-2 border-t border-(--tui-border-normal) pt-4"
        >
          <button
            tuiButton
            appearance="flat-destructive"
            size="m"
            class="w-full"
            [disabled]="data.canDelete === false"
            (click)="removeRoute()"
          >
            {{ 'pyramid.remove' | translate }}
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class PyramidSlotDialogComponent {
  protected readonly ClimbingKinds = ClimbingKinds;

  private readonly routesService = inject(RoutesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly context =
    inject<TuiDialogContext<RouteSearchResult | null, PyramidSlotDialogData>>(
      POLYMORPHEUS_CONTEXT,
    );

  readonly data = this.context.data;
  readonly searchQuery = signal('');
  private readonly debouncedQuery = signal('');
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
    });
  }

  readonly searchRoutesResource = resource({
    params: () => ({
      query: this.debouncedQuery(),
      expectedGrade: this.data.expectedGrade,
    }),
    loader: async ({ params: { query, expectedGrade } }) => {
      if (query.length < 2) return [];
      try {
        return await this.routesService.searchRoutes(query, expectedGrade);
      } catch (e) {
        console.error('Error searching routes:', e);
        return [];
      }
    },
  });

  readonly loading = computed(() => this.searchRoutesResource.isLoading());

  readonly results = computed<PyramidRouteItem[]>(() => {
    const routes = this.searchRoutesResource.value() ?? [];
    return routes.map((route) => ({
      ...route,
      location: [route.crag_name, route.area_name].filter(Boolean).join(' / '),
    }));
  });

  readonly hasMinQuery = computed(() => this.searchQuery().trim().length >= 2);

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      this.debouncedQuery.set('');
      return;
    }
    this.debounceTimer = setTimeout(() => {
      this.debouncedQuery.set(trimmed);
    }, 400);
  }

  selectRoute(route: RouteSearchResult | null): void {
    this.context.completeWith(route);
  }

  removeRoute(): void {
    this.context.completeWith(null);
  }

  goToRoute(
    route: RouteDto & { crag?: { slug: string; area?: { slug: string } } },
  ): void {
    const areaSlug = route.crag?.area?.slug;
    const cragSlug = route.crag?.slug;
    const routeSlug = route.slug;

    if (areaSlug && cragSlug && routeSlug) {
      this.context.completeWith(null); // Dismiss without action
      void this.router.navigate(['/area', areaSlug, cragSlug, routeSlug]);
    }
  }
}
