import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import type { TopoRouteWithRoute } from '../../models';

import { GradeLabelPipe } from '../../pipes';

export interface RenderedRoute extends TopoRouteWithRoute {
  style: { stroke: string; opacity: number; isDashed: boolean };
  width: number;
  pointsString: string;
}

@Component({
  selector: 'app-topo-route-renderer',
  imports: [GradeLabelPipe],
  template: `
    @if (hasAccess()) {
      @let ratio = imageRatio();
      @let hScale = 1000 / ratio;
      <svg
        class="absolute inset-0 w-full h-full pointer-events-none"
        [attr.viewBox]="'0 0 1000 ' + hScale"
        preserveAspectRatio="none"
      >
        <!-- Clickable transparent overlay for paths -->
        @for (tr of renderedRoutes(); track tr.route_id) {
          @if (tr.path && tr.path.points.length > 0) {
            @if (tr.path.type === 'circle') {
              @for (pt of tr.path.points; track $index) {
                <circle
                  class="pointer-events-auto cursor-pointer"
                  (click)="onPathClick($event, tr); $event.stopPropagation()"
                  (mouseenter)="hoverRoute.emit(tr.route_id)"
                  (mouseleave)="unhoverRoute.emit()"
                  [attr.cx]="pt.x * 1000"
                  [attr.cy]="pt.y * hScale"
                  [attr.r]="tr.width * 3500 + 10"
                  fill="transparent"
                />
              }
            } @else {
              <polyline
                class="pointer-events-auto cursor-pointer"
                (click)="onPathClick($event, tr); $event.stopPropagation()"
                (mouseenter)="hoverRoute.emit(tr.route_id)"
                (mouseleave)="unhoverRoute.emit()"
                [attr.points]="tr.pointsString"
                fill="none"
                stroke="transparent"
                [attr.stroke-width]="
                  (selectedRouteId() === tr.route_id ? 0.06 : 0.025) * 1000
                "
                stroke-linejoin="round"
                stroke-linecap="round"
              />
            }
          }
        }

        <!-- Visible path drawing -->
        @for (tr of renderedRoutes(); track tr.route_id) {
          @if (tr.path && tr.path.points.length > 0) {
            @let circleR = tr.width * 3500;
            @let isSel =
              selectedRouteId() === tr.route_id ||
              hoveredRouteId() === tr.route_id;
            @if (tr.path.type === 'circle') {
              @for (pt of tr.path.points; track $index) {
                <circle
                  [attr.cx]="pt.x * 1000"
                  [attr.cy]="pt.y * hScale"
                  [attr.r]="circleR"
                  fill="none"
                  stroke="white"
                  [style.opacity]="tr.style.isDashed ? 1 : 0.7"
                  [attr.stroke-width]="
                    tr.width * 1000 + (tr.style.isDashed ? 2.5 : 1.5)
                  "
                  [attr.stroke-dasharray]="tr.style.isDashed ? '6, 6' : 'none'"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                  class="transition-all duration-300"
                />
                <circle
                  [attr.cx]="pt.x * 1000"
                  [attr.cy]="pt.y * hScale"
                  [attr.r]="circleR"
                  fill="rgba(0,0,0,0.05)"
                  [attr.stroke]="tr.style.stroke"
                  [style.color]="tr.style.stroke"
                  [style.opacity]="tr.style.opacity"
                  [attr.stroke-width]="tr.width * 1000"
                  [attr.stroke-dasharray]="tr.style.isDashed ? '6, 6' : 'none'"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                  class="transition-all duration-300"
                  [class.selected-circle-pulse]="isSel"
                />
              }
            } @else {
              <polyline
                [attr.points]="tr.pointsString"
                fill="none"
                stroke="white"
                [style.opacity]="tr.style.isDashed ? 1 : 0.7"
                [attr.stroke-width]="
                  tr.width * 1000 + (tr.style.isDashed ? 2.5 : 1.5)
                "
                [attr.stroke-dasharray]="tr.style.isDashed ? '10, 10' : 'none'"
                stroke-linejoin="round"
                stroke-linecap="round"
                class="transition-all duration-300"
              />
              <polyline
                [attr.points]="tr.pointsString"
                fill="none"
                [attr.stroke]="tr.style.stroke"
                [style.color]="tr.style.stroke"
                [style.opacity]="tr.style.opacity"
                [attr.stroke-width]="tr.width * 1000"
                [attr.stroke-dasharray]="tr.style.isDashed ? '10, 10' : 'none'"
                stroke-linejoin="round"
                stroke-linecap="round"
                class="transition-all duration-300"
                [class.selected-line-glow]="isGlowActive() && isSel"
              />
              @if (tr.path.points[tr.path.points.length - 1]; as last) {
                <circle
                  [attr.cx]="last.x * 1000"
                  [attr.cy]="last.y * hScale"
                  [attr.r]="tr.width * 1000"
                  fill="white"
                  [style.opacity]="tr.style.opacity"
                  stroke="black"
                  [attr.stroke-width]="0.5"
                  class="transition-all duration-300"
                  [class.selected-circle-pulse]="!isGlowActive() && isSel"
                />
              }
            }
          }
        }

        <!-- Grade labels / start markers -->
        @for (tr of renderedRoutes(); track tr.route_id) {
          @if (tr.path && tr.path.points.length > 0) {
            <g
              class="pointer-events-auto cursor-pointer"
              (click)="onPathClick($event, tr); $event.stopPropagation()"
              (mouseenter)="hoverRoute.emit(tr.route_id)"
              (mouseleave)="unhoverRoute.emit()"
            >
              @if (tr.path.points[0]; as first) {
                <circle
                  [attr.cx]="first.x * 1000"
                  [attr.cy]="first.y * hScale"
                  [attr.r]="tr.width * 2000"
                  [attr.fill]="tr.style.stroke"
                  stroke="white"
                  stroke-width="1"
                />
                <text
                  [attr.x]="first.x * 1000"
                  [attr.y]="first.y * hScale + tr.width * 600"
                  text-anchor="middle"
                  fill="white"
                  style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
                  [attr.font-size]="tr.width * 1600"
                  font-weight="bold"
                  font-family="sans-serif"
                >
                  {{ tr.route.grade | gradeLabel }}
                </text>
              }
            </g>
          }
        }
      </svg>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopoRouteRendererComponent {
  readonly renderedRoutes = input.required<readonly RenderedRoute[]>();
  readonly imageRatio = input.required<number>();
  readonly selectedRouteId = input<string | number | null>(null);
  readonly hoveredRouteId = input<string | number | null>(null);
  readonly hasAccess = input<boolean>(false);
  readonly isGlowActive = input<boolean>(false);

  readonly pathClick = output<{ event: Event; route: TopoRouteWithRoute }>();
  readonly hoverRoute = output<string | number>();
  readonly unhoverRoute = output<void>();

  protected onPathClick(event: Event, route: TopoRouteWithRoute): void {
    this.pathClick.emit({ event, route });
  }
}
