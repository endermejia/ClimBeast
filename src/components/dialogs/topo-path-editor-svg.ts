import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';

import { TopoRouteWithRoute } from '../../models';

import {
  GradeLabelPipe,
  TopoPointPillGeometryPipe,
  TopoPointStateBadgePipe,
  TopoPointStateColorPipe,
  TopoPointStateLabelPipe,
} from '../../pipes';
import { getRouteStyleProperties } from '../../utils';

import { EditorPathEntry } from './topo-path-editor.utils';

export type EditorRouteStyle = ReturnType<typeof getRouteStyleProperties>;

@Component({
  selector: 'app-topo-path-editor-svg',
  imports: [
    GradeLabelPipe,
    NgTemplateOutlet,
    TopoPointPillGeometryPipe,
    TopoPointStateBadgePipe,
    TopoPointStateColorPipe,
    TopoPointStateLabelPipe,
  ],
  template: `
    <svg
      class="svg-overlay"
      [attr.viewBox]="viewBox()"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      @for (item of renderedPaths(); track item.routeId) {
        @let routeId = item.routeId;
        @let pathData = item.pathData;
        @let isSelected = item.isSelected;
        @let style = item.style;
        @let strokeWidthFactor = item.strokeWidthFactor;
        <g
          class="path-group"
          (click)="onPathSelect($event, routeId, pathData)"
          (touchstart)="onPathSelect($event, routeId, pathData)"
        >
          @if (pathData.type === 'circle') {
            @let strokeW = strokeWidthFactor * width();
            @let circleR = strokeW * 3.5;
            @let isTraverse = pathData.isTraverse;
            @for (pt of pathData.points; track $index) {
              @let ptColor = pt.state | topoPointStateColor: style.stroke;
              @let badge = pt.state | topoPointStateBadge;
              <!-- Hit area circle -->
              <circle
                [attr.cx]="pt.x * width()"
                [attr.cy]="pt.y * height()"
                [attr.r]="circleR + strokeW * 2"
                fill="transparent"
              />
              <!-- Shadow circle -->
              <circle
                [attr.cx]="pt.x * width()"
                [attr.cy]="pt.y * height()"
                [attr.r]="circleR"
                fill="none"
                stroke="white"
                [style.opacity]="style.isDashed ? 1 : 0.7"
                [attr.stroke-width]="strokeW + (style.isDashed ? 2.5 : 1.5)"
                [attr.stroke-dasharray]="
                  style.isDashed
                    ? width() * 0.008 + ' ' + width() * 0.008
                    : 'none'
                "
              />
              <!-- Main circle -->
              <circle
                [attr.cx]="pt.x * width()"
                [attr.cy]="pt.y * height()"
                [attr.r]="circleR"
                fill="rgba(0,0,0,0.05)"
                [attr.stroke]="style.stroke"
                [style.color]="style.stroke"
                [style.opacity]="style.opacity"
                [attr.stroke-width]="strokeW"
                [attr.stroke-dasharray]="
                  style.isDashed
                    ? width() * 0.008 + ' ' + width() * 0.008
                    : 'none'
                "
                [class.selected-circle-pulse]="isSelected"
              />
              @if (isTraverse) {
                <text
                  [attr.x]="pt.x * width()"
                  [attr.y]="pt.y * height() + circleR * 0.35"
                  text-anchor="middle"
                  fill="white"
                  font-weight="bold"
                  [attr.font-size]="circleR * 0.85"
                  style="pointer-events: none; user-select: none; text-shadow: 0 0 3px rgba(0,0,0,0.9)"
                >
                  {{ $index + 1 }}
                </text>
              }
              @if (badge) {
                <ng-container
                  *ngTemplateOutlet="
                    pointStatePill;
                    context: {
                      state: pt.state,
                      cx: pt.x * width(),
                      cy: pt.y * height(),
                      radius: circleR,
                      strokeW: strokeW,
                      fill: ptColor,
                      label: pt.state | topoPointStateLabel,
                    }
                  "
                />
              }
            }
          } @else {
            @let isTraverse = pathData.isTraverse;
            <!-- Hit area -->
            <polyline
              [attr.points]="item.pointsString"
              fill="none"
              stroke="transparent"
              [attr.stroke-width]="strokeWidthFactor * width() * 5"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
            <!-- Shadow -->
            <polyline
              [attr.points]="item.pointsString"
              fill="none"
              stroke="white"
              [style.opacity]="style.isDashed ? 1 : 0.7"
              [attr.stroke-width]="
                strokeWidthFactor * width() + (style.isDashed ? 2.5 : 1.5)
              "
              [attr.stroke-dasharray]="
                style.isDashed ? width() * 0.01 + ' ' + width() * 0.01 : 'none'
              "
              stroke-linejoin="round"
              stroke-linecap="round"
            />
            <!-- Main line -->
            <polyline
              [attr.points]="item.pointsString"
              fill="none"
              [attr.stroke]="style.stroke"
              [style.color]="style.stroke"
              [style.opacity]="style.opacity"
              [attr.stroke-width]="strokeWidthFactor * width()"
              [attr.stroke-dasharray]="
                style.isDashed ? width() * 0.01 + ' ' + width() * 0.01 : 'none'
              "
              stroke-linejoin="round"
              stroke-linecap="round"
            />

            @if (!isSelected) {
              @if (isTraverse) {
                @for (pt of pathData.points; track $index) {
                  @let strokeW = strokeWidthFactor * width();
                  @let ptColor = pt.state | topoPointStateColor: style.stroke;
                  @let badge = pt.state | topoPointStateBadge;
                  @let ptR = strokeW * 1.8;
                  <circle
                    [attr.cx]="pt.x * width()"
                    [attr.cy]="pt.y * height()"
                    [attr.r]="ptR"
                    [attr.fill]="style.stroke"
                    stroke="white"
                    stroke-width="1"
                  />
                  <text
                    [attr.x]="pt.x * width()"
                    [attr.y]="pt.y * height() + ptR * 0.35"
                    text-anchor="middle"
                    fill="white"
                    font-weight="bold"
                    [attr.font-size]="ptR * 0.85"
                    style="pointer-events: none; user-select: none; text-shadow: 0 0 3px rgba(0,0,0,0.9)"
                  >
                    {{ $index + 1 }}
                  </text>
                  @if (badge) {
                    <ng-container
                      *ngTemplateOutlet="
                        pointStatePill;
                        context: {
                          state: pt.state,
                          cx: pt.x * width(),
                          cy: pt.y * height(),
                          radius: ptR,
                          strokeW: strokeW,
                          fill: ptColor,
                          label: pt.state | topoPointStateLabel,
                        }
                      "
                    />
                  }
                }
              } @else {
                <!-- Intermediate state points for polylines -->
                @for (pt of pathData.points; track $index) {
                  @if (
                    $index > 0 &&
                    $index < pathData.points.length - 1 &&
                    pt.state &&
                    pt.state !== 'neutral'
                  ) {
                    @let strokeW = strokeWidthFactor * width();
                    @let ptColor = pt.state | topoPointStateColor: style.stroke;
                    @let ptR = strokeW * 1.4;
                    <circle
                      [attr.cx]="pt.x * width()"
                      [attr.cy]="pt.y * height()"
                      [attr.r]="ptR"
                      fill="white"
                      [attr.stroke]="style.stroke"
                      stroke-width="1.5"
                    />
                    <ng-container
                      *ngTemplateOutlet="
                        pointStatePill;
                        context: {
                          state: pt.state,
                          cx: pt.x * width(),
                          cy: pt.y * height(),
                          radius: ptR,
                          strokeW: strokeW,
                          fill: ptColor,
                          label: pt.state | topoPointStateLabel,
                        }
                      "
                    />
                  }
                }

                <!-- End dot -->
                @if (pathData.points[pathData.points.length - 1]; as last) {
                  @let strokeW = strokeWidthFactor * width();
                  @let isTop = last.state === 'top';
                  @let endR = strokeW * (isTop ? 1.6 : 1.2);
                  <circle
                    [attr.cx]="last.x * width()"
                    [attr.cy]="last.y * height()"
                    [attr.r]="endR"
                    [attr.fill]="isTop ? '#EF4444' : 'white'"
                    [style.opacity]="style.opacity"
                    [attr.stroke]="isTop ? 'white' : 'black'"
                    [attr.stroke-width]="isTop ? 1 : 0.5"
                  />
                  @if (isTop) {
                    <ng-container
                      *ngTemplateOutlet="
                        pointStatePill;
                        context: {
                          state: 'top',
                          cx: last.x * width(),
                          cy: last.y * height(),
                          radius: endR,
                          strokeW: strokeW,
                          fill: '#EF4444',
                          label: 'TOP',
                          position: 'above',
                        }
                      "
                    />
                  }
                }
              }
            }
          }

          <!-- Traverse route grade pill at start point -->
          @if (pathData.isTraverse && pathData.points.length > 0) {
            @if (pathData.points[0]; as first) {
              @let strokeW = strokeWidthFactor * width();
              @let gradeStr = pathData._ref.route.grade | gradeLabel;
              @if (gradeStr) {
                <g class="pointer-events-none" style="user-select: none">
                  <rect
                    [attr.x]="first.x * width() - strokeW * 2.2"
                    [attr.y]="first.y * height() - strokeW * 3.8"
                    [attr.width]="strokeW * 4.4"
                    [attr.height]="strokeW * 1.8"
                    [attr.rx]="strokeW * 0.9"
                    [attr.fill]="style.stroke"
                    stroke="white"
                    stroke-width="1"
                  />
                  <text
                    [attr.x]="first.x * width()"
                    [attr.y]="first.y * height() - strokeW * 2.5"
                    text-anchor="middle"
                    fill="white"
                    style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
                    [attr.font-size]="strokeW * 1.3"
                    font-weight="bold"
                    font-family="sans-serif"
                  >
                    {{ gradeStr }}
                  </text>
                </g>
              }
            }
          }
        </g>

        <!-- Control points (selected only) -->
        @if (isSelected) {
          @let strokeW = strokeWidthFactor * width();
          @let isTraverse = pathData.isTraverse;
          @for (pt of pathData.points; track $index) {
            @let ptColor = pt.state | topoPointStateColor: style.stroke;
            @let badge = pt.state | topoPointStateBadge;
            <g
              class="control-point"
              (mousedown)="
                pointDragStart.emit({ event: $event, routeId, index: $index })
              "
              (touchstart)="
                pointTouchStart.emit({ event: $event, routeId, index: $index })
              "
              (contextmenu)="
                pointRemove.emit({ event: $event, routeId, index: $index })
              "
              (dblclick)="
                pointStateCycle.emit({ event: $event, routeId, index: $index })
              "
            >
              @if (pathData.type === 'circle') {
                @let circleR = strokeW * 3.5;
                <!-- Circle mode control hit area -->
                <circle
                  [attr.cx]="pt.x * width()"
                  [attr.cy]="pt.y * height()"
                  [attr.r]="circleR"
                  fill="transparent"
                />
                @if (!isTraverse) {
                  <circle
                    [attr.cx]="pt.x * width()"
                    [attr.cy]="pt.y * height()"
                    [attr.r]="strokeW * 1.5"
                    fill="rgba(0,0,0,0.4)"
                  />
                  <circle
                    [attr.cx]="pt.x * width()"
                    [attr.cy]="pt.y * height()"
                    [attr.r]="strokeW * 0.9"
                    [attr.fill]="style.stroke"
                    stroke="white"
                    stroke-width="1"
                  />
                }
              } @else {
                <!-- Polyline mode control points -->
                @let ptR = isTraverse ? strokeW * 1.8 : strokeW * 0.9;
                @let haloR = isTraverse ? ptR + strokeW * 0.5 : strokeW * 1.5;
                <circle
                  [attr.cx]="pt.x * width()"
                  [attr.cy]="pt.y * height()"
                  [attr.r]="haloR"
                  fill="rgba(0,0,0,0.4)"
                />
                <circle
                  [attr.cx]="pt.x * width()"
                  [attr.cy]="pt.y * height()"
                  [attr.r]="ptR"
                  [attr.fill]="style.stroke"
                  stroke="white"
                  stroke-width="1"
                />
                @if (isTraverse) {
                  <text
                    [attr.x]="pt.x * width()"
                    [attr.y]="pt.y * height() + ptR * 0.35"
                    text-anchor="middle"
                    fill="white"
                    font-weight="bold"
                    [attr.font-size]="ptR * 0.85"
                    style="pointer-events: none; user-select: none; text-shadow: 0 0 3px rgba(0,0,0,0.9)"
                  >
                    {{ $index + 1 }}
                  </text>
                }
                @if (badge) {
                  <ng-container
                    *ngTemplateOutlet="
                      pointStatePill;
                      context: {
                        state: pt.state,
                        cx: pt.x * width(),
                        cy: pt.y * height(),
                        radius: ptR,
                        strokeW: strokeW,
                        fill: ptColor,
                        label: pt.state | topoPointStateLabel,
                      }
                    "
                  />
                }
              }
            </g>
          }
        }
      }

      <ng-template
        #pointStatePill
        let-state="state"
        let-cx="cx"
        let-cy="cy"
        let-radius="radius"
        let-strokeW="strokeW"
        let-fill="fill"
        let-label="label"
        let-position="position"
      >
        @let pill =
          state | topoPointPillGeometry: cx : cy : radius : strokeW : position;
        <svg:g class="pointer-events-none" style="user-select: none">
          <svg:rect
            [attr.x]="pill.x"
            [attr.y]="pill.y"
            [attr.width]="pill.width"
            [attr.height]="pill.height"
            [attr.rx]="pill.rx"
            [attr.fill]="fill"
            stroke="white"
            stroke-width="0.75"
          />
          <svg:text
            [attr.x]="pill.textX"
            [attr.y]="pill.textY"
            text-anchor="middle"
            fill="white"
            font-weight="bold"
            [attr.font-size]="pill.fontSize"
            font-family="sans-serif"
            style="text-shadow: 0 0 2px rgba(0,0,0,0.8)"
          >
            {{ label }}
          </svg:text>
        </svg:g>
      </ng-template>
    </svg>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .svg-overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .path-group {
      pointer-events: auto;
      cursor: pointer;
    }

    .control-point {
      cursor: move;
      pointer-events: auto;
    }
  `,
})
export class TopoPathEditorSvgComponent {
  readonly viewBox = input.required<string>();
  readonly width = input.required<number>();
  readonly height = input.required<number>();
  readonly lineWidth = input.required<number>();
  readonly visiblePathsEntries =
    input.required<readonly [string | number, EditorPathEntry][]>();
  readonly selectedRouteId = input<string | number | null>(null);
  readonly routeStyleMap =
    input.required<Record<string, EditorRouteStyle | undefined>>();
  readonly routeStrokeWidthMap =
    input.required<Record<string, number | undefined>>();
  readonly pointsStringMap = input.required<Record<string, string>>();

  readonly routeSelect = output<TopoRouteWithRoute>();
  readonly pointDragStart = output<{
    event: MouseEvent;
    routeId: string | number;
    index: number;
  }>();
  readonly pointTouchStart = output<{
    event: TouchEvent;
    routeId: string | number;
    index: number;
  }>();
  readonly pointRemove = output<{
    event: Event;
    routeId: string | number;
    index: number;
  }>();
  readonly pointStateCycle = output<{
    event: Event;
    routeId: string | number;
    index: number;
  }>();

  protected readonly renderedPaths = computed(() => {
    const selectedId = this.selectedRouteId();
    const styleMap = this.routeStyleMap();
    const strokeWidthMap = this.routeStrokeWidthMap();
    const pointsMap = this.pointsStringMap();
    const fallbackStrokeWidth = this.lineWidth() / 1000;

    return this.visiblePathsEntries().map(([routeId, pathData]) => {
      const key = String(routeId);
      const isSelected =
        selectedId !== null &&
        selectedId !== undefined &&
        String(selectedId) === key;
      return {
        routeId,
        pathData,
        isSelected,
        style: styleMap[key] || {
          stroke: '#22c55e',
          opacity: 0.8,
          isDashed: true,
        },
        strokeWidthFactor: strokeWidthMap[key] ?? fallbackStrokeWidth,
        pointsString: pointsMap[key] ?? '',
      };
    });
  });

  protected onPathSelect(
    event: Event,
    routeId: string | number,
    pathData: EditorPathEntry,
  ): void {
    event.stopPropagation();
    this.routeSelect.emit(
      pathData._ref || ({ route_id: routeId } as TopoRouteWithRoute),
    );
  }
}
