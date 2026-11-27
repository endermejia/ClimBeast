import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  resource,
  signal,
  viewChild,
} from '@angular/core';

import { TuiButton, TuiDialogContext, TuiLoader } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslateModule } from '@ngx-translate/core';

import { AppDialogsService } from '../../services/app-dialogs.service';
import { AuthStateService } from '../../services/auth-state.service';
import { IndoorDataService } from '../../services/indoor-data.service';
import { IndoorService } from '../../services/indoor.service';
import { LayoutService } from '../../services/layout.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { RoutesService } from '../../services/routes.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';

import {
  ClimbingKind,
  IndoorCenterDto,
  IndoorRouteDto,
  RouteBasicWithOwnData,
  SelectedRoute,
  TopoPathEditorResult,
  topoPathToJson,
  TopoRouteWithRoute,
} from '../../models';

import {
  addPointToPath,
  attachWheelListener,
  constrainTranslation,
  cyclePointState,
  getRouteStrokeWidth,
  getRouteStyleProperties,
  handleErrorToast,
  handleWheelZoom,
  removePoint,
  setupEditorMousePan,
  setupEditorTouchPanPinch,
  startDragPointMouse,
  startDragPointTouch,
} from '../../utils';

import {
  applyPathsSnapshot,
  arePathsSnapshotsEqual,
  canRedo,
  canUndo,
  createHistoryState,
  createPathsSnapshot,
  pushHistory,
  redoHistory,
  type TopoPathHistorySnapshot,
  type TopoPathHistoryState,
  undoHistory,
} from './topo-path-editor-history';
import { TopoPathEditorSidebarComponent } from './topo-path-editor-sidebar';
import { TopoPathEditorSvgComponent } from './topo-path-editor-svg';
import {
  buildPathsToUpdate,
  buildRoutePathsMeta,
  cloneTopoPoint,
  computeCenteredTranslation,
  computeFitScale,
  computePathCentroid,
  type EditorPathEntry,
  filterModifiedIndoorRoutes,
  formatSvgPoints,
  parseRouteId,
  serializeTopoPath,
} from './topo-path-editor.utils';

export interface TopoPathEditorConfig {
  imageUrl: string;
  topoRoutes: TopoRouteWithRoute[];
  topoName?: string;
  topoId?: number | string; // Needed if standalone = true
  // If true, the dialog saves directly to database via ToposService
  standalone?: boolean;
  isIndoor?: boolean;
  centerId?: string;
  center?: IndoorCenterDto;
  cragId?: number | string;
}

@Component({
  selector: 'app-topo-path-editor-dialog',
  imports: [
    TopoPathEditorSidebarComponent,
    TopoPathEditorSvgComponent,
    TranslateModule,
    TuiButton,
    TuiLoader,
  ],
  template: `
    <div class="editor-root">
      <!-- ═════════════════════ BODY (canvas + sidebar) ═════════════════════ -->
      <div class="editor-body">
        <!-- ── ROUTE SIDEBAR ── -->
        <app-topo-path-editor-sidebar
          #sidebar
          [isOpen]="sidebarOpen()"
          [isIndoor]="!!context.data.isIndoor"
          [topoRoutes]="topoRoutesList()"
          [selectedRoute]="selectedRoute()"
          [routePathsMeta]="routePathsMeta()"
          [showRouteSelector]="showRouteSelector()"
          [availableRoutes]="availableRoutes()"
          [selectedRoutesForMultiselect]="selectedRoutesForMultiselect()"
          [canCreateRoute]="canCreateRoute()"
          [canReorderRoutes]="canReorderRoutes()"
          [canEditSelectedRoute]="canEditSelectedRoute()"
          [canEditSelectedLine]="canEditSelectedLine()"
          [deletePointTipKey]="deletePointTipKey()"
          [selectedRoutePathType]="selectedRoutePathType()"
          [selectedRouteIsTraverse]="selectedRouteIsTraverse()"
          [lineWidth]="lineWidth()"
          (toggleRouteSelector)="toggleRouteSelector()"
          (createNewRoute)="createNewIndoorRoute()"
          (selectedRoutesChange)="onSelectedRoutesChange($event)"
          (routeDrop)="dropRoute($event)"
          (routeSelect)="selectRoute($event, true)"
          (routeEdit)="editRoute($event.route, $event.event)"
          (pathRemove)="removePath($event)"
          (routeUnlink)="unlinkRoute($event.route, $event.event)"
          (pathTypeChange)="setSelectedRoutePathType($event)"
          (traverseToggle)="toggleSelectedRouteTraverse()"
          (lineWidthChange)="lineWidth.set($event)"
        />

        <!-- Mobile backdrop -->
        @if (sidebarOpen()) {
          <div
            class="mobile-backdrop"
            (click)="sidebarOpen.set(false)"
            role="presentation"
          ></div>
        }

        <!-- ── CANVAS AREA ── -->
        <div class="canvas-area" #editorArea>
          <div
            #container
            class="canvas-container"
            [style.transform]="transform()"
            [style.transform-origin]="'0 0'"
            [style.width.px]="width()"
            [style.height.px]="height()"
            (mousedown.zoneless)="onImageClick($event)"
            (contextmenu.zoneless)="$event.preventDefault()"
            (touchstart.zoneless)="onTouchStart($event)"
          >
            <img
              #image
              [src]="context.data.imageUrl"
              class="topo-image"
              (load)="onImageLoad()"
              alt="Topo background"
            />

            <!-- SVG Paths Overlay -->
            <app-topo-path-editor-svg
              [viewBox]="viewBox()"
              [width]="width()"
              [height]="height()"
              [lineWidth]="lineWidth()"
              [visiblePathsEntries]="visiblePathsEntries()"
              [selectedRouteId]="selectedRoute()?.route_id ?? null"
              [routeStyleMap]="routeStyleMap()"
              [routeStrokeWidthMap]="routeStrokeWidthMap()"
              [pointsStringMap]="pointsStringMap()"
              (routeSelect)="selectRoute($event)"
              (pointDragStart)="
                startDragging($event.event, $event.routeId, $event.index)
              "
              (pointTouchStart)="
                startDraggingTouch($event.event, $event.routeId, $event.index)
              "
              (pointRemove)="
                removePoint($event.event, $event.routeId, $event.index)
              "
              (pointStateCycle)="
                cyclePointState($event.event, $event.routeId, $event.index)
              "
            />
          </div>

          <!-- Guidance shown while no route is selected -->
          @if (!selectedRoute() && !loading()) {
            <button
              tuiButton
              type="button"
              appearance="primary"
              size="m"
              iconStart="@tui.route"
              class="absolute top-4 left-1/2 z-40 max-w-[calc(100%_-_2rem)] -translate-x-1/2 shadow-lg"
              (click)="selectFirstRouteOrOpenList()"
            >
              {{ 'topos.editor.hintSelectToDraw' | translate }}
            </button>
          }

          <!-- Loading overlay -->
          @if (loading()) {
            <div class="loading-overlay">
              <tui-loader size="xl"></tui-loader>
            </div>
          }
        </div>
      </div>

      <!-- ═══════════════════════ FOOTER ═══════════════════════ -->
      <footer class="editor-footer">
        <div class="footer-actions-left xl:hidden!">
          <button
            tuiIconButton
            appearance="flat"
            size="m"
            class="xl:hidden!"
            type="button"
            [iconStart]="sidebarOpen() ? '@tui.x' : '@tui.list'"
            [attr.aria-label]="(sidebarOpen() ? 'close' : 'routes') | translate"
            (click)="toggleSidebar()"
          >
            {{ (sidebarOpen() ? 'close' : 'routes') | translate }}
          </button>
        </div>

        <div class="footer-actions-right">
          <button
            tuiButton
            type="button"
            appearance="flat"
            size="m"
            (click)="close()"
          >
            {{ 'cancel' | translate }}
          </button>
          <button
            tuiButton
            type="button"
            appearance="primary"
            size="m"
            [disabled]="loading()"
            (click)="saveAll()"
          >
            {{ 'save' | translate }}
          </button>
        </div>
      </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 10000;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* ── Root layout ── */
    .editor-root {
      display: flex;
      flex-direction: column;
      width: 100dvw;
      height: 100dvh;
      overflow: hidden;
      background: var(--tui-background-neutral-2);
      color: var(--tui-text-primary);
    }

    /* ── Footer ── */
    .editor-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.25rem;
      flex-shrink: 0;
      border-top: 1px solid var(--tui-border-normal);
      background: var(--tui-background-base);
      gap: 1rem;
      position: relative;
      z-index: 50;
    }

    .footer-actions-left {
      display: none;
    }

    .footer-actions-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-left: auto;
    }

    /* ── Body ── */
    .editor-body {
      display: flex;
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    /* ── Mobile/tablet sidebar overlay (below xl) ── */
    @media (max-width: 1279px) {
      .footer-actions-left {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
    }

    @media (min-width: 1280px) {
      .mobile-backdrop {
        display: none !important;
      }

      .footer-actions-left {
        display: none !important;
      }
    }

    /* ── Mobile backdrop ── */
    .mobile-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 15;
    }

    /* ── Canvas area ── */
    .canvas-area {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: var(--tui-background-neutral-2);
      cursor: grab;
      z-index: 10;
    }

    .canvas-area:active {
      cursor: grabbing;
    }

    .canvas-container {
      position: absolute;
      top: 0;
      left: 0;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
      border-radius: 0.5rem;
      overflow: hidden;
      transform-origin: 0 0;
      transition: transform 75ms ease-out;
      line-height: 0;
    }

    .topo-image {
      display: block;
      width: 100%;
      height: 100%;
      pointer-events: none;
      user-select: none;
      object-fit: cover;
    }

    /* ── Loading overlay ── */
    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
    }
  `,
  host: {
    '(window:keydown)': 'onKeyDown($event)',
  },
})
export class TopoPathEditorDialogComponent implements AfterViewInit {
  protected readonly context =
    injectContext<
      TuiDialogContext<TopoPathEditorResult | boolean, TopoPathEditorConfig>
    >();
  private readonly authState = inject(AuthStateService);
  private readonly topos = inject(ToposService);
  private readonly indoor = inject(IndoorService);
  private readonly indoorData = inject(IndoorDataService);
  private readonly layoutService = inject(LayoutService);
  private readonly outdoorData = inject(OutdoorDataService);
  private readonly routesService = inject(RoutesService);
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);
  private readonly appDialogs = inject(AppDialogsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly unlinkedRouteIds = new Set<string | number>();
  private readonly newlyLinkedRouteIds = new Set<string | number>();
  protected readonly topoRoutesVersion = signal(0);

  protected readonly indoorCenterResource = resource({
    params: () => {
      if (!this.context.data.isIndoor) return null;
      if (this.context.data.center) return null;
      return this.context.data.centerId
        ? String(this.context.data.centerId)
        : null;
    },
    loader: async ({ params: centerId }) => {
      if (!centerId) return null;
      return await this.indoor.getCenterById(centerId);
    },
  });

  protected readonly effectiveCenter = computed<IndoorCenterDto | null>(() => {
    return (
      this.context.data.center ?? this.indoorCenterResource.value() ?? null
    );
  });

  protected readonly canCreateRoute = computed<boolean>(() => {
    if (!this.context.data.isIndoor || !this.context.data.centerId) {
      return false;
    }
    const center = this.effectiveCenter();
    if (center) {
      return this.authState.canCreateIndoorRoute(center);
    }
    const centerId = String(this.context.data.centerId);
    return (
      this.authState.isAdmin() ||
      this.authState.adminIndoorCenters().includes(centerId) ||
      this.authState.routesetterIndoorCenters().includes(centerId)
    );
  });

  protected readonly canReorderRoutes = computed<boolean>(() => {
    if (!this.context.data.isIndoor) {
      return true;
    }
    const center = this.effectiveCenter();
    if (center) {
      return this.authState.canEditIndoorTopo(center);
    }
    const centerId = this.context.data.centerId;
    if (this.authState.isAdmin()) return true;
    if (centerId) {
      const idStr = String(centerId);
      return (
        this.authState.adminIndoorCenters().includes(idStr) ||
        this.authState.routesetterIndoorCenters().includes(idStr)
      );
    }
    return false;
  });

  protected readonly deletePointTipKey = computed(() =>
    this.layoutService.isMobile()
      ? 'topos.editor.deletePointMobile'
      : 'topos.editor.deletePoint',
  );

  protected readonly imageElement =
    viewChild.required<ElementRef<HTMLImageElement>>('image');
  protected readonly containerElement =
    viewChild.required<ElementRef<HTMLDivElement>>('container');
  protected readonly editorAreaElement =
    viewChild.required<ElementRef<HTMLDivElement>>('editorArea');
  protected readonly sidebarComponent =
    viewChild<TopoPathEditorSidebarComponent>('sidebar');

  loading = signal(false);
  selectedRoute = signal<TopoRouteWithRoute | null>(null);
  sidebarOpen = signal(true);
  showRouteSelector = signal(false);

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  toggleRouteSelector(): void {
    this.showRouteSelector.update((v) => !v);
  }

  topoRoutes: TopoRouteWithRoute[] = [];
  newIndoorRoutes: IndoorRouteDto[] = [];
  hasRouteEdits = false;
  pathsMap = new Map<string | number, EditorPathEntry>();
  lineWidth = signal(1.5);
  protected pathsVersion = signal(0);

  protected readonly historyState = signal<
    TopoPathHistoryState<TopoPathHistorySnapshot>
  >(createHistoryState(new Map()));

  readonly canUndo = computed(() => canUndo(this.historyState()));
  readonly canRedo = computed(() => canRedo(this.historyState()));

  protected readonly topoRoutesList = computed(() => {
    this.topoRoutesVersion();
    return [...this.topoRoutes];
  });

  protected readonly routePathsMeta = computed(() => {
    this.pathsVersion();
    return buildRoutePathsMeta(this.pathsMap);
  });

  protected readonly selectedRoutePathType = computed<'line' | 'circle'>(() => {
    this.pathsVersion();
    const selected = this.selectedRoute();
    const defaultType = this.context.data.isIndoor ? 'circle' : 'line';
    if (!selected) return defaultType;
    const path = this.pathsMap.get(selected.route_id);
    return (path?.type as 'line' | 'circle') || defaultType;
  });

  protected readonly effectiveCragId = computed<number | undefined>(() => {
    if (this.context.data.cragId) {
      return Number(this.context.data.cragId);
    }
    const fromFirstRoute = (
      this.context.data.topoRoutes?.[0]?.route as unknown as {
        crag_id?: number;
      }
    )?.crag_id;
    if (fromFirstRoute) {
      return Number(fromFirstRoute);
    }
    return this.outdoorData.cragDetail()?.id;
  });

  protected readonly cragRoutesResource = resource({
    params: () => ({
      cragId: this.effectiveCragId(),
      isIndoor: this.context.data.isIndoor,
      centerId: this.context.data.centerId,
    }),
    loader: async ({ params }) => {
      if (params.isIndoor) {
        if (!params.centerId) return [];
        await this.supabase.whenReady();
        const { data, error } = await this.supabase.client
          .from('indoor_routes')
          .select('id, name, grade, climbing_kind, color, center_id')
          .eq('center_id', params.centerId)
          .order('name');
        if (error) {
          console.error('[TopoEditor] Error loading indoor routes', error);
          return [];
        }
        return (data || []) as unknown as RouteBasicWithOwnData[];
      }
      let cragId = params.cragId;
      if (!cragId && this.context.data.topoId) {
        await this.supabase.whenReady();
        const { data: topoData } = await this.supabase.client
          .from('topos')
          .select('crag_id')
          .eq('id', Number(this.context.data.topoId))
          .single();
        if (topoData?.crag_id) {
          cragId = Number(topoData.crag_id);
        }
      }
      if (!cragId) return [];
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('routes')
        .select('id, name, grade, climbing_kind, slug, height, crag_id')
        .eq('crag_id', cragId)
        .order('name');
      if (error) {
        console.error('[TopoEditor] Error loading crag routes', error);
        return [];
      }
      return (data || []) as RouteBasicWithOwnData[];
    },
  });

  protected readonly availableRoutes = computed<
    (RouteBasicWithOwnData | SelectedRoute)[]
  >(() => {
    this.topoRoutesVersion();
    const fetched = this.cragRoutesResource.value() ?? [];
    const current = this.topoRoutes.map((tr) => tr.route);
    const map = new Map<string, RouteBasicWithOwnData | SelectedRoute>();
    for (const r of current) {
      map.set(String(r.id), r);
    }
    for (const r of fetched) {
      if (!map.has(String(r.id))) {
        map.set(String(r.id), r);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  });

  protected readonly selectedRoutesForMultiselect = computed<
    (RouteBasicWithOwnData | SelectedRoute)[]
  >(() => {
    this.topoRoutesVersion();
    return this.topoRoutes.map((tr) => tr.route as SelectedRoute);
  });

  protected readonly canEditSelectedRoute = computed<boolean>(() => {
    const tr = this.selectedRoute();
    if (!tr) return false;
    if (!this.context.data.isIndoor) return true;
    const center = this.effectiveCenter();
    if (center) {
      return this.authState.canEditIndoorRoute(
        center,
        tr.route as unknown as IndoorRouteDto,
      );
    }
    const cId =
      this.context.data.centerId ||
      (tr.route as unknown as IndoorRouteDto)?.center_id;
    if (this.authState.isAdmin()) return true;
    if (cId) {
      const idStr = String(cId);
      return (
        this.authState.adminIndoorCenters().includes(idStr) ||
        this.authState.routesetterIndoorCenters().includes(idStr)
      );
    }
    return false;
  });

  protected readonly canEditSelectedLine = computed<boolean>(() => {
    const tr = this.selectedRoute();
    if (!tr) return false;
    if (!this.context.data.isIndoor) return true;
    const center = this.effectiveCenter();
    if (!tr.path) {
      if (center) {
        return this.authState.canCreateIndoorLine(center);
      }
      return true;
    }
    if (center) {
      return this.authState.canEditIndoorLine(center, tr);
    }
    const cId =
      this.context.data.centerId ||
      (tr.route as unknown as IndoorRouteDto)?.center_id;
    if (this.authState.isAdmin()) return true;
    if (cId) {
      const idStr = String(cId);
      return (
        this.authState.adminIndoorCenters().includes(idStr) ||
        this.authState.routesetterIndoorCenters().includes(idStr)
      );
    }
    return false;
  });

  protected readonly selectedRouteIsTraverse = computed<boolean>(() => {
    this.pathsVersion();
    const selected = this.selectedRoute();
    if (!selected) return false;
    const path = this.pathsMap.get(selected.route_id);
    return path?.isTraverse || false;
  });

  protected setSelectedRoutePathType(type: 'line' | 'circle'): void {
    const selected = this.selectedRoute();
    if (!selected) return;
    const current = this.pathsMap.get(selected.route_id);
    if (current) {
      current.type = type;
    } else {
      this.pathsMap.set(selected.route_id, {
        points: [],
        type,
        _ref: selected,
      });
    }
    if (selected.path) {
      selected.path.type = type;
    }
    const matchingTopoRoute = this.topoRoutes.find(
      (r) => r.route_id === selected.route_id,
    );
    if (matchingTopoRoute?.path) {
      matchingTopoRoute.path.type = type;
    }
    this.recordHistory();
    this.pathsVersion.update((v) => v + 1);
    this.cdr.markForCheck();
  }

  protected toggleSelectedRouteTraverse(): void {
    const selected = this.selectedRoute();
    if (!selected) return;
    const current = this.pathsMap.get(selected.route_id);
    let nextVal = false;
    if (current) {
      current.isTraverse = !current.isTraverse;
      nextVal = current.isTraverse;
    } else {
      nextVal = true;
      this.pathsMap.set(selected.route_id, {
        points: [],
        type: 'circle',
        isTraverse: true,
        _ref: selected,
      });
    }
    if (selected.path) {
      selected.path.isTraverse = nextVal;
    }
    const matchingTopoRoute = this.topoRoutes.find(
      (r) => r.route_id === selected.route_id,
    );
    if (matchingTopoRoute) {
      if (!matchingTopoRoute.path) {
        matchingTopoRoute.path = {
          points: [],
          type: current?.type || 'circle',
          isTraverse: nextVal,
        };
      } else {
        matchingTopoRoute.path.isTraverse = nextVal;
      }
    }
    this.recordHistory();
    this.pathsVersion.update((v) => v + 1);
    this.cdr.markForCheck();
  }

  width = signal(0);
  height = signal(0);
  viewBox = computed(() => `0 0 ${this.width()} ${this.height()}`);

  protected readonly routeStrokeWidthMap = computed(() => {
    this.pathsVersion();
    const selected = this.selectedRoute();
    const lw = this.lineWidth();
    const map: Record<string, number | undefined> = {};
    for (const [key] of this.pathsMap) {
      const isSelected = String(selected?.route_id) === String(key);
      map[String(key)] = getRouteStrokeWidth(isSelected, false, lw, 'editor');
    }
    return map;
  });

  protected readonly routeStyleMap = computed(() => {
    this.pathsVersion();
    const selected = this.selectedRoute();
    const hasSelection = selected !== null;
    const map: Record<
      string,
      ReturnType<typeof getRouteStyleProperties> | undefined
    > = {};
    for (const [key, entry] of this.pathsMap) {
      const isSelected = String(selected?.route_id) === String(key);
      const routeColor = this.context.data.isIndoor
        ? (entry._ref?.route?.color ?? null)
        : entry._ref?.route?.color || entry.color || entry._ref?.path?.color;
      map[String(key)] = getRouteStyleProperties(
        isSelected,
        false,
        entry._ref?.route?.grade,
        routeColor,
        hasSelection,
      );
    }
    return map;
  });

  protected readonly pathsEntries = computed(() => {
    this.pathsVersion();
    return Array.from(this.pathsMap.entries());
  });

  protected readonly visibleRouteIds = computed(() => {
    const isIndoor = this.context.data.isIndoor;
    const selected = this.selectedRoute();
    if (isIndoor && selected) {
      return new Set<string | number>([selected.route_id]);
    }
    return null;
  });

  protected readonly visiblePathsEntries = computed(() => {
    this.pathsVersion();
    const visibleIds = this.visibleRouteIds();
    const entries = Array.from(this.pathsMap.entries());
    if (!visibleIds) return entries;
    return entries.filter(([routeId]) => visibleIds.has(routeId));
  });

  protected readonly pointsStringMap = computed(() => {
    this.pathsVersion();
    const w = this.width();
    const h = this.height();
    const map: Record<string, string> = {};
    for (const [key, entry] of this.pathsMap) {
      map[String(key)] = formatSvgPoints(entry.points, w, h);
    }
    return map;
  });

  draggingPoint: { routeId: string | number; index: number } | null = null;
  scale = signal(1);
  translateX = signal(0);
  translateY = signal(0);
  isPanning = signal(false);

  // Zoom/Pan state adapter
  private readonly zoomPanState = {
    scale: this.scale,
    translateX: this.translateX,
    translateY: this.translateY,
  };

  transform = computed(
    () =>
      `translate(${this.translateX()}px, ${this.translateY()}px) scale(${this.scale()})`,
  );

  routesReordered = false;
  private readonly initialPathsSerialized = new Map<string, string>();

  constructor() {
    this.topoRoutes = [...this.context.data.topoRoutes];
    // Initialize paths from existing data
    this.topoRoutes.forEach((tr) => {
      if (tr.path) {
        if (tr.path.width) {
          this.lineWidth.set(tr.path.width);
        }
        this.pathsMap.set(tr.route_id, {
          points: tr.path.points.map(cloneTopoPoint),
          color: tr.path.color,
          width: tr.path.width,
          type: tr.path.type || 'line',
          isTraverse: tr.path.isTraverse || false,
          _ref: tr,
        });
        this.initialPathsSerialized.set(
          String(tr.route_id),
          serializeTopoPath(tr.path),
        );
      } else {
        this.initialPathsSerialized.set(String(tr.route_id), '');
      }
    });
    this.historyState.set(
      createHistoryState(createPathsSnapshot(this.pathsMap)),
    );
  }

  private recordHistory(): void {
    const snapshot = createPathsSnapshot(this.pathsMap);
    this.historyState.update((state) =>
      pushHistory(state, snapshot, arePathsSnapshotsEqual),
    );
  }

  undo(): void {
    const current = this.historyState();
    if (!canUndo(current)) return;
    const next = undoHistory(current);
    this.historyState.set(next);
    this.pathsMap = applyPathsSnapshot(next.present, this.topoRoutes);
    this.pathsVersion.update((v) => v + 1);
    this.cdr.markForCheck();
  }

  redo(): void {
    const current = this.historyState();
    if (!canRedo(current)) return;
    const next = redoHistory(current);
    this.historyState.set(next);
    this.pathsMap = applyPathsSnapshot(next.present, this.topoRoutes);
    this.pathsVersion.update((v) => v + 1);
    this.cdr.markForCheck();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      return;
    }

    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
    } else if (key === 'y' && !event.shiftKey) {
      event.preventDefault();
      this.redo();
    }
  }

  ngAfterViewInit(): void {
    this.doAttachWheelListener();
  }

  private doAttachWheelListener(): void {
    const cleanup = attachWheelListener(
      this.editorAreaElement()?.nativeElement,
      (e) => this.onWheel(e),
    );
    this.destroyRef.onDestroy(() => cleanup());
  }

  onImageLoad(): void {
    const img = this.imageElement().nativeElement;
    const area = this.editorAreaElement().nativeElement;

    // Use natural dimensions for the coordinate system
    this.width.set(img.naturalWidth);
    this.height.set(img.naturalHeight);

    const initialScale = computeFitScale(
      area.clientWidth,
      area.clientHeight,
      img.naturalWidth,
      img.naturalHeight,
    );

    this.scale.set(initialScale);
    this.translateX.set(0);
    this.translateY.set(0);
    this.doConstrainTranslation();

    // Try attaching again if not attached yet
    this.doAttachWheelListener();
  }

  resetZoom(): void {
    this.onImageLoad(); // Re-fit
  }

  onWheel(event: Event): void {
    handleWheelZoom(
      event,
      this.zoomPanState,
      this.containerElement().nativeElement,
      {},
      { afterZoom: () => this.doConstrainTranslation() },
    );
  }

  async onSelectedRoutesChange(
    newSelected: (RouteBasicWithOwnData | SelectedRoute)[],
  ): Promise<void> {
    const currentIds = new Set(
      this.topoRoutes.map((tr) => String(tr.route_id)),
    );
    const newIds = new Set(newSelected.map((r) => String(r.id)));

    // 1. Newly added routes
    const added = newSelected.filter((r) => !currentIds.has(String(r.id)));
    if (added.length > 0) {
      for (const r of added) {
        const newTopoRoute: TopoRouteWithRoute = {
          topo_id: this.context.data.topoId ?? 0,
          route_id: r.id,
          number: this.topoRoutes.length + 1,
          route: r as unknown as RouteBasicWithOwnData,
          path: null,
        };
        this.topoRoutes = [...this.topoRoutes, newTopoRoute];
        this.pathsMap.set(r.id, {
          points: [],
          type: this.context.data.isIndoor ? 'circle' : 'line',
          _ref: newTopoRoute,
        });
        this.newlyLinkedRouteIds.add(r.id);
        this.unlinkedRouteIds.delete(r.id);
      }
      this.recordHistory();
      this.pathsVersion.update((v) => v + 1);
      this.topoRoutesVersion.update((v) => v + 1);
      this.routesReordered = true;

      const lastAdded = added[added.length - 1];
      const matching = this.topoRoutes.find(
        (tr) => String(tr.route_id) === String(lastAdded.id),
      );
      if (matching) {
        this.selectRoute(matching);
        this.sidebarComponent()?.scrollRouteIntoView(matching.route_id);
      }
    }

    // 2. Removed routes
    const removed = this.topoRoutes.filter(
      (tr) => !newIds.has(String(tr.route_id)),
    );
    if (removed.length > 0) {
      for (const tr of removed) {
        await this.unlinkRoute(tr);
      }
    }
  }

  async unlinkRoute(tr: TopoRouteWithRoute, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

    const confirmed = await this.appDialogs.confirm({
      labelKey: 'unlink',
      contentKey: 'topos.removeRouteConfirm',
      contentParams: { name: tr.route.name },
      yesKey: 'unlink',
      appearance: 'primary-destructive',
    });

    if (!confirmed) {
      this.topoRoutesVersion.update((v) => v + 1);
      this.cdr.markForCheck();
      return;
    }

    if (this.selectedRoute()?.route_id === tr.route_id) {
      this.selectedRoute.set(null);
    }

    this.pathsMap.delete(tr.route_id);
    this.pathsMap = new Map(this.pathsMap);

    this.topoRoutes = this.topoRoutes.filter((r) => r.route_id !== tr.route_id);
    this.topoRoutes.forEach((r, i) => {
      r.number = i + 1;
    });

    const wasExisting = this.context.data.topoRoutes.some(
      (r) => String(r.route_id) === String(tr.route_id),
    );
    if (wasExisting) {
      this.unlinkedRouteIds.add(tr.route_id);
    }
    this.newlyLinkedRouteIds.delete(tr.route_id);

    const indoorIdx = this.newIndoorRoutes.findIndex(
      (r) => String(r.id) === String(tr.route_id),
    );
    if (indoorIdx !== -1) {
      const [removed] = this.newIndoorRoutes.splice(indoorIdx, 1);
      void this.indoor.deleteRoute(removed.id);
    }

    this.routesReordered = true;
    this.recordHistory();
    this.pathsVersion.update((v) => v + 1);
    this.topoRoutesVersion.update((v) => v + 1);
    this.cdr.markForCheck();
  }

  private doConstrainTranslation(): void {
    constrainTranslation(
      this.zoomPanState,
      {
        area: this.editorAreaElement().nativeElement,
        container: this.containerElement().nativeElement,
      },
      this.width(),
      this.height(),
    );
  }

  async createNewIndoorRoute(): Promise<void> {
    const centerId = this.context.data.centerId;
    if (!centerId) return;

    const currentTopoId = this.context.data.topoId
      ? String(this.context.data.topoId)
      : undefined;

    const result = await this.indoor.openIndoorRouteForm(centerId, undefined, {
      hideTopo: true,
      defaultTopoId: currentTopoId,
    });
    if (result && typeof result === 'object') {
      const newRoute = result as IndoorRouteDto;
      const newTopoRoute: TopoRouteWithRoute = {
        topo_id: currentTopoId ?? 0,
        route_id: newRoute.id,
        number: this.topoRoutes.length + 1,
        path: null,
        user_creator_id: this.supabase.authUserId() ?? newRoute.user_creator_id,
        route: newRoute as unknown as RouteBasicWithOwnData,
      };
      this.topoRoutes = [...this.topoRoutes, newTopoRoute];
      this.newIndoorRoutes.push(newRoute);
      this.pathsMap.set(newRoute.id, {
        points: [],
        type: 'circle',
        _ref: newTopoRoute,
      });
      this.recordHistory();
      this.pathsVersion.update((v) => v + 1);
      this.topoRoutesVersion.update((v) => v + 1);
      // A brand new route is always selected so it can be drawn right away
      this.selectedRoute.set(newTopoRoute);
      this.sidebarComponent()?.scrollRouteIntoView(newRoute.id);
      this.cdr.markForCheck();
    }
  }

  async editRoute(tr: TopoRouteWithRoute, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

    if (this.context.data.isIndoor) {
      const center = this.context.data.center;
      const canEdit = center
        ? this.authState.canEditIndoorRoute(
            center,
            tr.route as unknown as IndoorRouteDto,
          )
        : this.authState.canEditIndoorInCenter(
            this.context.data.centerId ||
              (tr.route as unknown as IndoorRouteDto)?.center_id,
          );
      if (!canEdit) {
        this.toast.error('errors.insufficientPrivilege');
        return;
      }

      const centerId =
        this.context.data.centerId ||
        (tr.route as unknown as IndoorRouteDto)?.center_id;
      if (!centerId) return;

      const currentTopoId = this.context.data.topoId
        ? String(this.context.data.topoId)
        : undefined;

      const result = await this.indoor.openIndoorRouteForm(
        centerId,
        tr.route as unknown as IndoorRouteDto,
        {
          hideTopo: true,
          defaultTopoId: currentTopoId,
        },
      );

      if (result) {
        const updated =
          typeof result === 'object' ? (result as IndoorRouteDto) : null;

        if (updated) {
          tr.route.name = updated.name;
          tr.route.grade = updated.grade ?? tr.route.grade;
          tr.route.climbing_kind = (updated.climbing_kind ??
            tr.route.climbing_kind) as ClimbingKind;
          tr.route.color = updated.color;
          const idx = this.newIndoorRoutes.findIndex(
            (r) => r.id === tr.route_id,
          );
          if (idx !== -1) {
            this.newIndoorRoutes[idx] = updated;
          }
        } else {
          const { data } = await this.supabase.client
            .from('indoor_routes')
            .select('id, name, grade, climbing_kind, color')
            .eq('id', String(tr.route_id))
            .single();
          if (data) {
            tr.route.name = data.name;
            tr.route.grade = data.grade ?? tr.route.grade;
            tr.route.climbing_kind = (data.climbing_kind ??
              tr.route.climbing_kind) as ClimbingKind;
            tr.route.color = data.color;
          }
        }

        this.hasRouteEdits = true;
        const pathEntry = this.pathsMap.get(tr.route_id);
        if (pathEntry) {
          pathEntry._ref = tr;
          if (this.context.data.isIndoor) {
            pathEntry.color = tr.route.color ?? undefined;
          }
        }
        if (tr.path && this.context.data.isIndoor) {
          tr.path.color = tr.route.color ?? undefined;
        }
        this.topoRoutes = [...this.topoRoutes];
        this.pathsVersion.update((v) => v + 1);
        this.topoRoutesVersion.update((v) => v + 1);

        if (this.selectedRoute()?.route_id === tr.route_id) {
          this.selectedRoute.set({ ...tr });
        }
        this.cdr.markForCheck();
      }
    } else {
      const cragId = (tr.route as unknown as { crag_id?: number }).crag_id;
      const result = await this.routesService.openRouteForm({
        cragId,
        routeData: {
          id: Number(tr.route_id),
          crag_id: cragId,
          name: tr.route.name,
          slug: tr.route.slug,
          grade: tr.route.grade,
          climbing_kind: tr.route.climbing_kind,
          height: (tr.route as unknown as { height?: number | null }).height,
        },
      });

      if (result) {
        const { data } = await this.routesService.getById(Number(tr.route_id));
        if (data) {
          tr.route.name = data.name;
          tr.route.grade = data.grade ?? tr.route.grade;
          tr.route.climbing_kind = (data.climbing_kind ??
            tr.route.climbing_kind) as ClimbingKind;
          tr.route.slug = data.slug;
          if ('height' in data) {
            (tr.route as unknown as { height?: number | null }).height =
              data.height;
          }
        }

        const pathEntry = this.pathsMap.get(tr.route_id);
        if (pathEntry) {
          pathEntry._ref = tr;
        }
        this.pathsVersion.update((v) => v + 1);
        this.topoRoutesVersion.update((v) => v + 1);

        if (this.selectedRoute()?.route_id === tr.route_id) {
          this.selectedRoute.set({ ...tr });
        }
        this.cdr.markForCheck();
      }
    }
  }

  selectRoute(tr: TopoRouteWithRoute, fromList = false): void {
    const selected = this.selectedRoute();

    if (fromList) {
      if (selected?.route_id === tr.route_id) {
        this.selectedRoute.set(null);
      } else {
        this.selectedRoute.set(tr);
        this.centerOnRoute(tr);
      }
    } else {
      if (!selected) {
        this.selectedRoute.set(tr);
        this.centerOnRoute(tr);
      }
    }
  }

  /**
   * Canvas hint action: on small screens the list is hidden behind the
   * drawer, so open it; on desktop select the first route right away.
   */
  protected selectFirstRouteOrOpenList(): void {
    if (this.layoutService.isNotDesktop()) {
      this.sidebarOpen.set(true);
      return;
    }
    const first = this.topoRoutes[0];
    if (!first) return;
    this.selectedRoute.set(first);
    this.centerOnRoute(first);
    this.cdr.markForCheck();
  }

  private centerOnRoute(tr: TopoRouteWithRoute): void {
    const path = this.pathsMap.get(tr.route_id);
    const center = path ? computePathCentroid(path.points) : null;
    if (!center) return;

    // Center the view on the route keeping the current zoom level,
    // same behaviour as the topo viewer.
    this.centerOnPoint(center);
  }

  private centerOnPoint(point: { x: number; y: number }): void {
    const areaEl = this.editorAreaElement()?.nativeElement;
    const containerEl = this.containerElement()?.nativeElement;
    if (!areaEl || !containerEl) return;

    const areaRect = areaEl.getBoundingClientRect();
    const target = computeCenteredTranslation(point, {
      areaWidth: areaRect.width,
      areaHeight: areaRect.height,
      contentWidth: this.width(),
      contentHeight: this.height(),
      scale: this.scale(),
      restingLeft: containerEl.offsetLeft,
      restingTop: containerEl.offsetTop,
    });

    this.translateX.set(target.x);
    this.translateY.set(target.y);
    this.cdr.markForCheck();
  }

  onImageClick(event: Event): void {
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.button !== 0 || this.draggingPoint) return;

    setupEditorMousePan(
      mouseEvent,
      this.zoomPanState,
      {},
      {
        onNoMove: (e) => this.addPoint(e),
        afterMove: () => this.doConstrainTranslation(),
      },
    );
  }

  private lastTapTime = 0;
  private lastTapIndex = -1;
  private lastTapRouteId: string | number | null = null;

  cyclePointState(event: Event, routeId: string | number, index: number): void {
    event.stopPropagation();
    event.preventDefault();
    const parsedRouteId = parseRouteId(routeId);

    if (this.context.data.isIndoor) {
      const route = this.topoRoutes.find((r) => r.route_id === parsedRouteId);
      if (route?.path) {
        const center = this.context.data.center;
        const canEdit = center
          ? this.authState.canEditIndoorLine(center, route)
          : this.authState.canEditIndoorInCenter(this.context.data.centerId);
        if (!canEdit) return;
      }
    }

    const pathData = this.pathsMap.get(parsedRouteId);
    if (!pathData || !pathData.points[index]) return;

    pathData.points[index].state = cyclePointState(
      pathData.points[index].state,
    );
    this.pathsMap.set(parsedRouteId, { ...pathData });
    this.recordHistory();
    this.pathsVersion.update((v) => v + 1);
    this.cdr.markForCheck();
  }

  private addPoint(event: MouseEvent): void {
    const route = this.selectedRoute();
    if (!route) return;

    if (this.context.data.isIndoor && route.path) {
      const center = this.context.data.center;
      const canEdit = center
        ? this.authState.canEditIndoorLine(center, route)
        : this.authState.canEditIndoorInCenter(this.context.data.centerId);
      if (!canEdit) {
        this.toast.error('errors.insufficientPrivilege');
        return;
      }
    }

    const defaultType = this.context.data.isIndoor ? 'circle' : 'line';
    addPointToPath(
      event,
      route.route_id,
      this.containerElement().nativeElement,
      this.pathsMap,
      { _ref: route, type: defaultType },
    );
    this.recordHistory();
    this.pathsVersion.update((v) => v + 1);
    this.cdr.markForCheck();
  }

  startDragging(
    event: MouseEvent,
    routeId: string | number,
    index: number,
  ): void {
    const parsedRouteId = parseRouteId(routeId);

    if (this.context.data.isIndoor) {
      const route = this.topoRoutes.find((r) => r.route_id === parsedRouteId);
      if (route?.path) {
        const center = this.context.data.center;
        const canEdit = center
          ? this.authState.canEditIndoorLine(center, route)
          : this.authState.canEditIndoorInCenter(this.context.data.centerId);
        if (!canEdit) return;
      }
    }

    this.draggingPoint = { routeId: parsedRouteId, index };

    startDragPointMouse(
      event,
      parsedRouteId,
      index,
      this.containerElement().nativeElement,
      this.pathsMap,
      {
        onUpdate: () => {
          this.pathsVersion.update((v) => v + 1);
          this.cdr.markForCheck();
        },
        onEnd: () => {
          this.draggingPoint = null;
          this.recordHistory();
          this.pathsVersion.update((v) => v + 1);
          this.cdr.markForCheck();
        },
      },
    );
  }

  startDraggingTouch(
    event: TouchEvent,
    routeId: string | number,
    index: number,
  ): void {
    const parsedRouteId = parseRouteId(routeId);
    const now = Date.now();
    if (
      this.lastTapRouteId === parsedRouteId &&
      this.lastTapIndex === index &&
      now - this.lastTapTime < 350
    ) {
      this.cyclePointState(event, parsedRouteId, index);
      this.lastTapTime = 0;
      this.lastTapIndex = -1;
      this.lastTapRouteId = null;
      return;
    }
    this.lastTapTime = now;
    this.lastTapIndex = index;
    this.lastTapRouteId = parsedRouteId;

    this.draggingPoint = { routeId: parsedRouteId, index };

    startDragPointTouch(
      event,
      parsedRouteId,
      index,
      this.containerElement().nativeElement,
      this.pathsMap,
      {
        onLongPress: () => {
          this.removePoint(event, parsedRouteId, index);
          this.draggingPoint = null;
        },
        onUpdate: () => {
          this.pathsVersion.update((v) => v + 1);
          this.cdr.markForCheck();
        },
        onEnd: () => {
          this.draggingPoint = null;
          this.recordHistory();
          this.pathsVersion.update((v) => v + 1);
        },
      },
    );
  }

  onTouchStart(event: Event): void {
    setupEditorTouchPanPinch(
      event,
      this.zoomPanState,
      this.containerElement().nativeElement,
      {},
      {
        afterMove: () => this.doConstrainTranslation(),
        isDraggingPoint: () => !!this.draggingPoint,
      },
    );
  }

  dropRoute(event: CdkDragDrop<TopoRouteWithRoute[]>): void {
    moveItemInArray(this.topoRoutes, event.previousIndex, event.currentIndex);
    // Reassign numbers based on new order (1-based)
    this.topoRoutes.forEach((tr, i) => {
      tr.number = i + 1;
    });
    this.topoRoutes = [...this.topoRoutes];
    this.routesReordered = true;
    this.topoRoutesVersion.update((v) => v + 1);
    this.cdr.markForCheck();
  }

  removePoint(event: Event, routeId: string | number, index: number): void {
    const route = this.topoRoutes.find((r) => r.route_id === routeId);
    if (this.context.data.isIndoor) {
      if (route?.path) {
        const center = this.context.data.center;
        const canEdit = center
          ? this.authState.canEditIndoorLine(center, route)
          : this.authState.canEditIndoorInCenter(this.context.data.centerId);
        if (!canEdit) return;
      }
    }
    removePoint(event, routeId, index, this.pathsMap);
    const updated = this.pathsMap.get(routeId);
    if (updated && updated.points.length === 0) {
      this.pathsMap.delete(routeId);
      this.pathsMap = new Map(this.pathsMap);
      if (route) {
        route.path = null;
      }
    }
    this.recordHistory();
    this.pathsVersion.update((v) => v + 1);
    this.cdr.markForCheck();
  }

  async removePath(tr: TopoRouteWithRoute): Promise<void> {
    if (this.context.data.isIndoor && tr.path) {
      const center = this.context.data.center;
      const canEdit = center
        ? this.authState.canEditIndoorLine(center, tr)
        : this.authState.canEditIndoorInCenter(this.context.data.centerId);
      if (!canEdit) {
        this.toast.error('errors.insufficientPrivilege');
        return;
      }
    }
    const confirmed = await this.appDialogs.confirm({
      labelKey: 'delete',
      contentKey: 'topos.editor.removePathConfirm',
      yesKey: 'delete',
      appearance: 'primary-destructive',
    });
    if (confirmed) {
      this.pathsMap.delete(tr.route_id);
      this.pathsMap = new Map(this.pathsMap);
      tr.path = null;
      const matching = this.topoRoutes.find((r) => r.route_id === tr.route_id);
      if (matching) {
        matching.path = null;
      }
      this.recordHistory();
      this.pathsVersion.update((v) => v + 1);
      this.selectedRoute.set(null);
      this.cdr.markForCheck();
    }
  }

  close(): void {
    if (this.newIndoorRoutes.length > 0) {
      const idsToDelete = this.newIndoorRoutes.map((r) => r.id);
      void Promise.all(idsToDelete.map((id) => this.indoor.deleteRoute(id)));
    }
    if (this.context.data.isIndoor && this.hasRouteEdits) {
      const topoId = this.context.data.topoId;
      if (topoId) {
        this.indoor.invalidateTopoCache(topoId);
      }
      this.indoorData.topoDetailResource.reload();
      this.indoor.reloadCenterRoutes();
    }
    this.context.completeWith(false);
  }

  async saveAll(): Promise<void> {
    this.loading.set(true);
    try {
      const pathsToUpdate = buildPathsToUpdate(
        this.topoRoutes,
        this.pathsMap,
        this.lineWidth(),
        !!this.context.data.isIndoor,
      );

      if (!this.context.data.standalone) {
        // Return paths to caller
        this.context.completeWith({
          saved: true,
          paths: pathsToUpdate,
          routeIds: this.topoRoutes.map((tr) => tr.route_id),
          newIndoorRoutes: this.newIndoorRoutes,
          newRoutes: this.topoRoutes.map(
            (tr) => tr.route as unknown as RouteBasicWithOwnData,
          ),
        });
        return;
      }

      const topoId = this.context.data.topoId;
      if (!topoId) throw new Error('Missing topoId for database saving');

      if (this.context.data.isIndoor) {
        // 1. Delete unlinked indoor routes
        for (const routeId of this.unlinkedRouteIds) {
          await this.supabase.client
            .from('indoor_topo_routes')
            .delete()
            .match({ topo_id: String(topoId), route_id: String(routeId) });
        }

        const pathsMap = new Map(
          pathsToUpdate.map((p) => [String(p.routeId), p.path]),
        );
        const newRouteIdSet = new Set(
          this.newIndoorRoutes.map((r) => String(r.id)),
        );

        const routesToUpsert = filterModifiedIndoorRoutes(
          this.topoRoutes,
          pathsToUpdate,
          this.initialPathsSerialized,
          {
            routesReordered: this.routesReordered,
            newRouteIds: newRouteIdSet,
            newlyLinkedRouteIds: this.newlyLinkedRouteIds,
          },
        );

        if (routesToUpsert.length > 0) {
          const upsertPromises = routesToUpsert.map((tr) => {
            const rawPath = pathsMap.get(String(tr.route_id));
            const path =
              rawPath && rawPath.points && rawPath.points.length > 0
                ? rawPath
                : null;
            const idx = this.topoRoutes.findIndex(
              (r) => String(r.route_id) === String(tr.route_id),
            );
            return this.supabase.client.from('indoor_topo_routes').upsert({
              topo_id: String(topoId),
              route_id: String(tr.route_id),
              number: idx >= 0 ? idx : (tr.number ?? 0),
              path: path ? topoPathToJson(path) : null,
              user_creator_id: this.supabase.authUserId(),
            });
          });
          const upsertResults = await Promise.all(upsertPromises);
          const upsertErr = upsertResults.find((r) => r.error)?.error;
          if (upsertErr) throw upsertErr;
        }

        this.newIndoorRoutes = [];
        this.newlyLinkedRouteIds.clear();
        this.unlinkedRouteIds.clear();
        this.indoor.invalidateTopoCache(topoId);
        this.indoorData.topoDetailResource.reload();
        this.indoor.reloadCenterRoutes();
      } else {
        // 1. Delete unlinked routes
        for (const routeId of this.unlinkedRouteIds) {
          await this.topos.removeRoute(topoId, routeId, false);
        }

        // 2. Add newly linked routes or update existing routes order
        for (let i = 0; i < this.topoRoutes.length; i++) {
          const tr = this.topoRoutes[i];
          if (this.newlyLinkedRouteIds.has(tr.route_id)) {
            await this.topos.addRoute(
              {
                topo_id: Number(topoId),
                route_id: Number(tr.route_id),
                number: i,
              },
              false,
            );
          } else {
            await this.topos.updateRouteOrder(topoId, tr.route_id, i, false);
          }
        }

        // 3. Update route paths
        if (pathsToUpdate.length > 0) {
          await this.topos.bulkUpdateRoutePaths(topoId, pathsToUpdate, false);
        }

        this.newlyLinkedRouteIds.clear();
        this.unlinkedRouteIds.clear();
        this.outdoorData.topoDetailResource.reload();
        this.outdoorData.cragDetailResource.reload();
      }

      this.toast.success('messages.toasts.pathsSaved');
      this.context.completeWith(true);
    } catch (error) {
      console.error('Error saving paths:', error);
      handleErrorToast(error, this.toast);
    } finally {
      this.loading.set(false);
    }
  }
}
