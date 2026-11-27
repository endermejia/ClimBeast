import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDropList,
} from '@angular/cdk/drag-drop';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TuiIdentityMatcher, tuiIsString } from '@taiga-ui/cdk';
import {
  TuiAppearance,
  TuiButton,
  TuiCell,
  TuiDataList,
  TuiDropdown,
  TuiFilterByInputPipe,
  TuiIcon,
  TuiLabel,
  TuiOptGroup,
  TuiScrollbar,
  TuiSlider,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiChevron, TuiInputChip } from '@taiga-ui/kit';

import { TranslateModule } from '@ngx-translate/core';

import {
  GRADE_NUMBER_TO_LABEL,
  RouteBasicWithOwnData,
  SelectedRoute,
  TopoRouteWithRoute,
  VERTICAL_LIFE_GRADES,
} from '../../models';

import { GradeComponent } from '../ui/avatar-grade';
import { RoutePathMeta } from './topo-path-editor.utils';

@Component({
  selector: 'app-topo-path-editor-sidebar',
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    CdkDropList,
    FormsModule,
    GradeComponent,
    TranslateModule,
    TuiAppearance,
    TuiButton,
    TuiCell,
    TuiChevron,
    TuiDataList,
    TuiDropdown,
    TuiFilterByInputPipe,
    TuiIcon,
    TuiInputChip,
    TuiLabel,
    TuiOptGroup,
    TuiScrollbar,
    TuiSlider,
    TuiTitle,
  ],
  template: `
    <aside class="sidebar-inner">
      <div class="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
        <div class="flex items-center gap-2">
          <p class="sidebar-label m-0! p-0!">
            {{ 'routes' | translate }}
          </p>
        </div>
        <div class="flex items-center gap-1">
          <button
            tuiButton
            [appearance]="showRouteSelector() ? 'secondary' : 'flat'"
            size="s"
            iconStart="@tui.link"
            class="rounded-full!"
            [title]="'topos.manageRoutes' | translate"
            (click)="toggleRouteSelector.emit()"
          >
            {{ 'link' | translate }}
          </button>
          @if (canCreateRoute()) {
            <button
              tuiButton
              appearance="flat"
              size="s"
              iconStart="@tui.plus"
              class="rounded-full!"
              (click)="createNewRoute.emit()"
            >
              {{ 'new' | translate }}
            </button>
          }
        </div>
      </div>

      <!-- Multiselect to select routes of the crag and link new routes -->
      @if (showRouteSelector()) {
        <div class="px-3 pb-2 shrink-0">
          <tui-textfield
            multi
            tuiChevron
            [stringify]="stringifyRoute"
            [disabledItemHandler]="strings"
            [identityMatcher]="routeIdentityMatcher"
            [tuiTextfieldCleaner]="true"
            size="s"
            class="w-full"
          >
            <label tuiLabel for="topo-multiselect-routes">{{
              'topos.manageRoutes' | translate
            }}</label>
            <input
              tuiInputChip
              id="topo-multiselect-routes"
              autocomplete="off"
              [ngModel]="selectedRoutesForMultiselect()"
              (ngModelChange)="selectedRoutesChange.emit($event)"
              name="selectedRoutes"
              [placeholder]="'select' | translate"
            />
            <tui-input-chip *tuiItem />
            <tui-data-list *tuiDropdown>
              <tui-opt-group [label]="'routes' | translate" tuiMultiSelectGroup>
                @for (
                  route of availableRoutes() | tuiFilterByInput;
                  track route.id
                ) {
                  <button type="button" new tuiOption [value]="route">
                    <div tuiCell size="s">
                      <app-grade
                        [grade]="route.grade ?? 0"
                        [kind]="route.climbing_kind"
                      />
                      <div tuiTitle>
                        {{ route.name }}
                      </div>
                    </div>
                  </button>
                }
              </tui-opt-group>
            </tui-data-list>
          </tui-textfield>
        </div>
      }

      <tui-scrollbar class="sidebar-scroll">
        <!-- Selection guidance: changes once a route is selected -->
        <div
          class="mx-3 mt-1 flex items-center gap-2 rounded-xl bg-(--tui-background-neutral-2) px-3 py-2 text-xs leading-snug font-semibold text-(--tui-text-secondary)"
          [tuiAppearance]="selectedRoute() ? 'accent' : 'none'"
        >
          <tui-icon
            [icon]="
              selectedRoute() ? '@tui.pen-tool' : '@tui.mouse-pointer-click'
            "
            class="shrink-0"
          />
          <span>{{
            (selectedRoute()
              ? 'topos.editor.hintDrawReady'
              : 'topos.editor.hintSelectRoute'
            ) | translate
          }}</span>
        </div>

        <div
          #routeList
          class="route-list"
          cdkDropList
          [cdkDropListDisabled]="!canReorderRoutes()"
          (cdkDropListDropped)="routeDrop.emit($event)"
        >
          @for (item of routeItems(); track item.index) {
            <div
              cdkDrag
              class="route-item tui-interactive"
              role="button"
              tabindex="0"
              [attr.data-route-id]="item.tr.route_id"
              [class.route-item--active]="item.isSelected"
              [tuiAppearance]="item.isSelected ? 'accent' : 'none'"
              (click.zoneless)="routeSelect.emit(item.tr)"
              (keydown.enter.zoneless)="routeSelect.emit(item.tr)"
            >
              @if (canReorderRoutes()) {
                <tui-icon
                  icon="@tui.grip-vertical"
                  class="drag-handle opacity-30 shrink-0 cursor-grab active:cursor-grabbing"
                  cdkDragHandle
                  (click)="$event.stopPropagation()"
                />
              }
              @if (!isIndoor()) {
                <div class="route-num">{{ item.index + 1 }}</div>
              }
              <div class="route-info">
                <div class="route-name">{{ item.tr.route.name }}</div>
                @if (item.isTraverse) {
                  <span
                    class="text-[10px] text-(--tui-text-tertiary) flex items-center gap-0.5"
                  >
                    <tui-icon
                      icon="@tui.arrow-right-left"
                      class="text-[10px] scale-75"
                    />
                    {{ 'topos.editor.traverse' | translate }}
                  </span>
                }
              </div>
              @if (item.isSelected && canEditSelectedRoute()) {
                <button
                  tuiIconButton
                  appearance="flat"
                  size="s"
                  iconStart="@tui.pencil"
                  class="rounded-full! opacity-60 hover:opacity-100"
                  [title]="'edit' | translate"
                  (click)="routeEdit.emit({ route: item.tr, event: $event })"
                >
                  {{ 'edit' | translate }}
                </button>
              }
              <app-grade
                [grade]="item.tr.route.grade"
                [kind]="item.tr.route.climbing_kind"
                size="s"
              />

              <div class="flex items-center gap-1">
                @if (item.hasPath) {
                  @if (item.isSelected && canEditSelectedLine()) {
                    <button
                      tuiIconButton
                      appearance="flat"
                      size="s"
                      iconStart="@tui.trash"
                      class="rounded-full!"
                      [class.text-white!]="true"
                      [title]="'delete' | translate"
                      (click)="
                        pathRemove.emit(item.tr); $event.stopPropagation()
                      "
                    >
                      {{ 'delete' | translate }}
                    </button>
                  } @else {
                    <tui-icon icon="@tui.check" class="path-check" />
                  }
                }
                @if (!item.hasPath || item.isSelected) {
                  <button
                    tuiIconButton
                    appearance="flat"
                    size="s"
                    iconStart="@tui.unlink"
                    class="rounded-full! opacity-60 hover:opacity-100"
                    [title]="'unlink' | translate"
                    (click)="
                      routeUnlink.emit({ route: item.tr, event: $event })
                    "
                  >
                    {{ 'unlink' | translate }}
                  </button>
                }
              </div>
              <div
                *cdkDragPlaceholder
                class="route-item route-item--placeholder"
              ></div>
            </div>
          }
        </div>

        <!-- Tips inside scrollbar (only once a route is selected) -->
        @if (selectedRoute()) {
          <div class="tips">
            <p class="tip">
              <tui-icon icon="@tui.mouse-pointer-2" class="tip-icon" />
              {{ 'topos.editor.addPoint' | translate }}
            </p>
            <p class="tip">
              <tui-icon icon="@tui.move" class="tip-icon" />
              {{ 'topos.editor.movePoint' | translate }}
            </p>
            <p class="tip">
              <tui-icon icon="@tui.trash" class="tip-icon" />
              {{ deletePointTipKey() | translate }}
            </p>
            <div class="tip items-start!">
              <tui-icon
                icon="@tui.mouse-pointer-click"
                class="tip-icon mt-0.5 shrink-0"
              />
              <div class="flex-1 flex flex-col gap-1.5 min-w-0">
                <span> {{ 'topos.editor.cyclePointState' | translate }}: </span>
                <div
                  class="flex items-center justify-between flex-wrap gap-x-1.5 gap-y-1"
                >
                  <div class="flex items-center gap-1 shrink-0">
                    <span
                      class="w-2.5 h-2.5 rounded-full bg-[#22C55E] inline-block shrink-0 shadow-xs"
                    ></span>
                    <span>{{ 'topos.legend.start' | translate }}</span>
                  </div>
                  <tui-icon
                    icon="@tui.chevron-right"
                    class="text-[10px] opacity-35 shrink-0"
                  />
                  <div class="flex items-center gap-1 shrink-0">
                    <span
                      class="w-2.5 h-2.5 rounded-full bg-[#EF4444] inline-block shrink-0 shadow-xs"
                    ></span>
                    <span>{{ 'topos.legend.top' | translate }}</span>
                  </div>
                  <tui-icon
                    icon="@tui.chevron-right"
                    class="text-[10px] opacity-35 shrink-0"
                  />
                  <div class="flex items-center gap-1 shrink-0">
                    <span
                      class="w-2.5 h-2.5 rounded-full bg-[#3B82F6] inline-block shrink-0 shadow-xs"
                    ></span>
                    <span>{{ 'topos.legend.match' | translate }}</span>
                  </div>
                  <tui-icon
                    icon="@tui.chevron-right"
                    class="text-[10px] opacity-35 shrink-0"
                  />
                  <div class="flex items-center gap-1 shrink-0">
                    <span
                      class="w-2.5 h-2.5 rounded-full bg-[#EAB308] inline-block shrink-0 shadow-xs"
                    ></span>
                    <span>{{ 'topos.legend.foot' | translate }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      </tui-scrollbar>

      <!-- Compact Fixed Bottom Controls -->
      <div class="sidebar-controls">
        <!-- Path Type Selector & Traverse Toggle -->
        @if (selectedRoute()) {
          <div class="path-type-control">
            <div class="control-header">
              <span class="control-label">{{
                'topos.editor.pathType' | translate
              }}</span>
            </div>
            <div class="flex gap-2">
              <button
                tuiButton
                type="button"
                size="s"
                iconStart="@tui.minus"
                [appearance]="
                  selectedRoutePathType() === 'line' ? 'primary' : 'secondary'
                "
                class="flex-1"
                (click)="pathTypeChange.emit('line')"
              >
                {{ 'topos.editor.pathTypeLine' | translate }}
              </button>
              <button
                tuiButton
                type="button"
                size="s"
                iconStart="@tui.circle"
                [appearance]="
                  selectedRoutePathType() === 'circle' ? 'primary' : 'secondary'
                "
                class="flex-1"
                (click)="pathTypeChange.emit('circle')"
              >
                {{ 'topos.editor.pathTypeCircle' | translate }}
              </button>
            </div>

            <!-- Traverse toggle -->
            <button
              tuiButton
              type="button"
              size="s"
              iconStart="@tui.arrow-right-left"
              [appearance]="selectedRouteIsTraverse() ? 'primary' : 'secondary'"
              class="w-full mt-2"
              (click)="traverseToggle.emit()"
            >
              {{ 'topos.editor.traverse' | translate }}
            </button>
          </div>
        }

        <!-- Line Width Slider -->
        <div class="line-width-control">
          <div class="control-header">
            <span class="control-label">{{
              'topos.editor.lineWidth' | translate
            }}</span>
            <span class="control-value">{{ lineWidth() }}</span>
          </div>
          <input
            tuiSlider
            type="range"
            [min]="1"
            [max]="15"
            [step]="0.5"
            [ngModel]="lineWidth()"
            (ngModelChange)="lineWidthChange.emit($event)"
          />
        </div>
      </div>
    </aside>
  `,
  styles: `
    :host {
      width: 26rem;
      flex-shrink: 0;
      border-right: 1px solid var(--tui-border-normal);
      background: var(--tui-background-base);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 20;
      transition: transform 0.2s ease;
    }

    .sidebar-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .sidebar-label {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.45;
      padding: 1.25rem 1.25rem 0.5rem;
      flex-shrink: 0;
    }

    .sidebar-scroll {
      flex: 1 1 0%;
      min-height: 0;
      height: 0;
    }

    .route-list {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding: 0.25rem 0.75rem 0.5rem;
    }

    .route-item:not([data-appearance='accent']) {
      background: var(--tui-background-base);
    }

    .route-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 1rem;
      text-align: left;
      width: 100%;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      border: 1px solid transparent;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .route-item:hover {
      background: var(--tui-background-neutral-1-hover);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-color: var(--tui-border-hover);
    }

    .route-item[data-appearance='accent'] {
      border-color: transparent;
      box-shadow: 0 4px 15px var(--tui-background-accent-2-half);
    }

    .route-item--placeholder {
      background: var(--tui-background-neutral-1) !important;
      border: 1.5px dashed var(--tui-border-normal) !important;
      box-shadow: none !important;
      transform: none !important;
      opacity: 0.5;
    }

    .cdk-drag-preview .route-item,
    .cdk-drag-preview {
      background: var(--tui-background-base);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      border-radius: 1rem;
      opacity: 0.95;
    }

    .route-num {
      flex-shrink: 0;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.8rem;
      background: var(--tui-background-neutral-2);
      border: 1px solid var(--tui-border-normal);
      transition: all 0.2s ease;
    }

    .route-item--active .route-num {
      background: var(--tui-background-accent-1);
      color: var(--tui-text-primary-on-accent-1);
      border-color: transparent;
    }

    .route-info {
      flex: 1;
      min-width: 0;
    }

    .route-name {
      font-weight: 700;
      font-size: 0.875rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.01em;
    }

    .route-grade {
      font-size: 0.75rem;
      opacity: 0.55;
      font-weight: 600;
    }

    .route-item--active .route-grade {
      opacity: 0.85;
    }

    .route-action-slot {
      width: var(--tui-height-s);
      height: var(--tui-height-s);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .path-check {
      color: var(--tui-text-positive);
      font-size: 1rem;
      flex-shrink: 0;
      filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.1));
    }

    .tips {
      padding: 0.5rem 1.25rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      border-top: 1px solid var(--tui-border-normal);
      margin-top: 0.5rem;
    }

    .tip,
    .tip--danger {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      opacity: 0.65;
    }

    .tip--danger {
      opacity: 0.8;
    }

    .tip-icon {
      font-size: 0.875rem;
    }

    .tip-icon--danger {
      color: var(--tui-text-negative);
      font-size: 0.875rem;
    }

    .sidebar-controls {
      flex-shrink: 0;
      border-top: 1px solid var(--tui-border-normal);
      background: var(--tui-background-neutral-1);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.875rem 1.25rem;
    }

    .line-width-control,
    .path-type-control {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .path-type-control + .line-width-control {
      border-top: 1px solid var(--tui-border-normal);
      padding-top: 0.75rem;
    }

    .control-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .control-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.6;
    }

    .control-value {
      font-size: 0.875rem;
      font-weight: 800;
    }

    @media (max-width: 1279px) {
      :host {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        width: 85vw;
        max-width: 26rem;
        transform: translateX(-100%);
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
      }

      :host(.sidebar-open) {
        transform: translateX(0);
      }
    }

    @media (min-width: 1280px) {
      :host {
        transform: none !important;
      }
    }
  `,
  host: {
    class: 'route-sidebar',
    '[class.sidebar-open]': 'isOpen()',
  },
})
export class TopoPathEditorSidebarComponent {
  private readonly injector = inject(Injector);
  private readonly routeListElement =
    viewChild.required<ElementRef<HTMLDivElement>>('routeList');

  readonly isOpen = input.required<boolean>();
  readonly isIndoor = input<boolean>(false);
  readonly topoRoutes = input.required<readonly TopoRouteWithRoute[]>();
  readonly selectedRoute = input<TopoRouteWithRoute | null>(null);
  readonly routePathsMeta =
    input.required<ReadonlyMap<string | number, RoutePathMeta>>();
  readonly showRouteSelector = input.required<boolean>();
  readonly availableRoutes =
    input.required<readonly (RouteBasicWithOwnData | SelectedRoute)[]>();
  readonly selectedRoutesForMultiselect =
    input.required<readonly (RouteBasicWithOwnData | SelectedRoute)[]>();
  readonly canCreateRoute = input<boolean>(false);
  readonly canReorderRoutes = input<boolean>(false);
  readonly canEditSelectedRoute = input<boolean>(false);
  readonly canEditSelectedLine = input<boolean>(false);
  readonly deletePointTipKey = input.required<string>();
  readonly selectedRoutePathType = input.required<'line' | 'circle'>();
  readonly selectedRouteIsTraverse = input.required<boolean>();
  readonly lineWidth = input.required<number>();

  readonly toggleRouteSelector = output<void>();
  readonly createNewRoute = output<void>();
  readonly selectedRoutesChange =
    output<(RouteBasicWithOwnData | SelectedRoute)[]>();
  readonly routeDrop = output<CdkDragDrop<TopoRouteWithRoute[]>>();
  readonly routeSelect = output<TopoRouteWithRoute>();
  readonly routeEdit = output<{ route: TopoRouteWithRoute; event: Event }>();
  readonly pathRemove = output<TopoRouteWithRoute>();
  readonly routeUnlink = output<{ route: TopoRouteWithRoute; event: Event }>();
  readonly pathTypeChange = output<'line' | 'circle'>();
  readonly traverseToggle = output<void>();
  readonly lineWidthChange = output<number>();

  protected readonly routeItems = computed(() => {
    const selectedId = this.selectedRoute()?.route_id;
    const metaMap = this.routePathsMeta();
    return this.topoRoutes().map((tr, index) => {
      const meta = metaMap.get(tr.route_id);
      return {
        tr,
        index,
        isSelected: selectedId === tr.route_id,
        hasPath: !!meta?.hasPath,
        isTraverse: !!meta?.isTraverse,
      };
    });
  });

  protected readonly strings = tuiIsString;

  protected readonly stringifyRoute = (
    item: RouteBasicWithOwnData | SelectedRoute,
  ): string => `${item.name} (${this.gradeStringify(item.grade ?? 0)})`;

  protected readonly routeIdentityMatcher: TuiIdentityMatcher<
    RouteBasicWithOwnData | SelectedRoute
  > = (a, b) => String(a.id) === String(b.id);

  private gradeStringify(grade: number): string {
    return (
      GRADE_NUMBER_TO_LABEL[grade as VERTICAL_LIFE_GRADES] ||
      grade?.toString() ||
      ''
    );
  }

  /** Brings the given route into view inside the sidebar list. */
  scrollRouteIntoView(routeId: string | number): void {
    afterNextRender(
      {
        write: () => {
          const list = this.routeListElement().nativeElement;
          const target = Array.from(
            list.querySelectorAll<HTMLElement>('[data-route-id]'),
          ).find((el) => el.getAttribute('data-route-id') === String(routeId));
          target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        },
      },
      { injector: this.injector },
    );
  }
}
