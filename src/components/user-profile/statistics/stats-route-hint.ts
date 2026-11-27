import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiScrollbar } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { AscentTypes, RouteScore } from '../../../models';

import { AscentCountDirective } from '../../../directives/ascent-count.directive';

@Component({
  selector: 'app-stats-route-hint',
  standalone: true,
  imports: [AscentCountDirective, RouterLink, TranslatePipe, TuiScrollbar],
  template: `
    <div class="trend-hint" [class.trend-hint--compact]="compact()">
      <div class="trend-hint-header">
        <span class="trend-hint-title">
          @if (ascentCount() !== null) {
            <span [appAscentCount]="ascentCount()"></span>
          }
          {{ title() }}
        </span>
        <span class="trend-hint-score">
          {{ value() }}
        </span>
      </div>

      @let list = routes() ?? [];
      @if (list.length > 0) {
        <tui-scrollbar class="trend-scroll">
          <div class="trend-routes">
            @for (route of list; track $index) {
              <div class="trend-route-row">
                <a
                  class="route-name"
                  [routerLink]="
                    route.isIndoor
                      ? ['/indoor', route.centerSlug, 'route', route.routeSlug]
                      : [
                          '/area',
                          route.areaSlug,
                          route.cragSlug,
                          route.routeSlug,
                        ]
                  "
                  [class.onsight]="route.type === AscentTypes.OS"
                  [class.flash]="route.type === AscentTypes.F"
                  [class.redpoint]="
                    route.type === AscentTypes.RP || !route.type
                  "
                >
                  {{ route.name || ('anonymous' | translate) }}
                </a>
                <span class="route-score">
                  <span class="route-score-grade">
                    {{ route.gradeLabel }}
                  </span>
                  <span class="route-score-val">{{ route.score }}</span>
                </span>
              </div>
            }
          </div>
        </tui-scrollbar>
      }
    </div>
  `,
  styles: `
    .trend-hint {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-width: 240px;
      padding: 0.5rem 0;
    }
    .trend-hint--compact {
      min-width: 210px;
    }
    .trend-hint-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      border-bottom: 1px solid var(--tui-border-normal);
      padding-bottom: 0.75rem;
      margin-bottom: 0.25rem;
    }
    .trend-hint-title {
      font: var(--tui-typography-body-s);
      opacity: 0.5;
      font-weight: bold;
    }
    .trend-hint-score {
      font: var(--tui-typography-heading-h4);
      font-weight: 900;
    }
    .trend-routes {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding-right: 1.25rem;
    }
    .trend-hint--compact .trend-routes {
      padding-right: 0;
    }
    .trend-route-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .route-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 130px;
      text-decoration: none;
      transition: opacity 0.2s;
    }
    .trend-hint--compact .route-name {
      max-width: 120px;
    }
    .route-name:hover {
      text-decoration: underline;
      opacity: 0.8;
    }
    .route-name.onsight {
      color: var(--tui-status-positive);
    }
    .route-name.flash {
      color: var(--tui-status-warning);
    }
    .route-name.redpoint {
      color: var(--tui-status-negative);
    }
    .route-score {
      font-family: monospace;
      text-align: right;
    }
    .route-score-grade {
      font: var(--tui-typography-body-m);
      opacity: 0.8;
      margin-right: 0.5rem;
    }
    .route-score-val {
      opacity: 0.6;
    }
    .trend-scroll {
      max-height: 250px;
    }
  `,
})
export class StatsRouteHintComponent {
  protected readonly AscentTypes = AscentTypes;

  title = input<string | number | null>(null);
  value = input<string | number | null>(null);
  routes = input<readonly RouteScore[] | null | undefined>([]);
  ascentCount = input<number | null>(null);
  compact = input(false);
}
