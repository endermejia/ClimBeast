import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  signal,
  Signal,
  viewChild,
} from '@angular/core';

import { TuiButton } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { MapBuilder, MapBuilderCallbacks } from '../../services/map-builder';
import { MapDataService } from '../../services/map-data.service';

import type {
  MapAreaItem,
  MapBounds,
  MapCragItem,
  MapIndoorCenterItem,
  MapOptions,
  ParkingDto,
} from '../../models';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-map',
  imports: [TranslatePipe, TuiButton],
  template: `
    <div class="relative w-full h-full">
      <div
        #container
        class="absolute inset-0"
        aria-label="Interactive map"
        role="application"
      ></div>

      <div
        class="absolute left-4 top-4 z-1 flex flex-col gap-2 pointer-events-none"
      >
        <!-- Zoom in button -->
        <button
          tuiIconButton
          size="s"
          appearance="primary-grayscale"
          class="pointer-events-auto"
          (click.zoneless)="onZoomInClick()"
          [iconStart]="'@tui.plus'"
          [attr.aria-label]="'zoomIn' | translate"
        >
          {{ 'zoomIn' | translate }}
        </button>

        <!-- Zoom out button -->
        <button
          tuiIconButton
          size="s"
          appearance="primary-grayscale"
          class="pointer-events-auto"
          (click.zoneless)="onZoomOutClick()"
          [iconStart]="'@tui.minus'"
          [attr.aria-label]="'zoomOut' | translate"
        >
          {{ 'zoomOut' | translate }}
        </button>

        <!-- Locate button -->
        <button
          tuiIconButton
          size="s"
          appearance="primary-grayscale"
          class="pointer-events-auto"
          (click.zoneless)="onLocateClick()"
          [iconStart]="'@tui.locate'"
          [attr.aria-label]="'myLocation' | translate"
        >
          {{ 'myLocation' | translate }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow min-h-0 w-full',
  },
  providers: [MapBuilder],
})
export class MapComponent {
  private readonly isBrowserToken = inject(IS_BROWSER);
  private readonly mapBuilder = inject(MapBuilder);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly mapData = inject(MapDataService);

  private readonly mapInitialized = signal(false);
  public mapCragItems: InputSignal<readonly MapCragItem[]> = input<
    readonly MapCragItem[]
  >([]);

  public mapAreaItems: InputSignal<readonly MapAreaItem[]> = input<
    readonly MapAreaItem[]
  >([]);
  public mapIndoorItems: InputSignal<readonly MapIndoorCenterItem[]> = input<
    readonly MapIndoorCenterItem[]
  >([]);

  public selectedMapCragItem: InputSignal<MapCragItem | null> =
    input<MapCragItem | null>(null);
  public selectedMapCragItemChange: OutputEmitterRef<MapCragItem | null> =
    output<MapCragItem | null>();

  public mapParkingItems: InputSignal<readonly ParkingDto[]> = input<
    readonly ParkingDto[]
  >([]);
  public selectedMapParkingItem: InputSignal<ParkingDto | null> =
    input<ParkingDto | null>(null);
  public selectedMapParkingItemChange: OutputEmitterRef<ParkingDto | null> =
    output<ParkingDto | null>();

  public selection: InputSignal<{ lat: number; lng: number } | null> = input<{
    lat: number;
    lng: number;
  } | null>(null);

  public options: InputSignal<MapOptions> = input<MapOptions>({
    center: [38.7, -0.7],
    zoom: 10,
    maxZoom: 22,
    minZoom: 4,
  });
  public mapClick = output<{ lat: number; lng: number }>();
  public interactionStart = output<void>();

  private readonly callbacks: MapBuilderCallbacks = {
    onSelectedCragChange: (crag) => this.selectedMapCragItemChange.emit(crag),
    onSelectedParkingChange: (parking) =>
      this.selectedMapParkingItemChange.emit(parking),
    onMapClick: (lat, lng) => this.mapClick.emit({ lat, lng }),
    onInteractionStart: () => this.interactionStart.emit(),
    onViewportChange: (v: Partial<MapBounds>) => {
      if (!this.isBrowser()) return;
      const previousViewport = this.mapData.mapBounds();
      const viewport = {
        ...previousViewport,
        ...v,
      };
      this.mapData.mapBounds.set(viewport as MapBounds);
    },
  };

  private readonly containerRef: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild('container', { read: ElementRef });

  private isDestroyed = false;

  constructor() {
    effect(() => {
      const crags = this.mapCragItems();
      const areas = this.mapAreaItems();
      const selectedCrag = this.selectedMapCragItem();
      const parkings = this.mapParkingItems();
      const selectedParking = this.selectedMapParkingItem();
      const indoorItems = this.mapIndoorItems();

      if (this.mapInitialized() && !this.isDestroyed) {
        void this.mapBuilder.updateData(
          crags,
          selectedCrag,
          parkings,
          selectedParking,
          areas,
          indoorItems,
          this.callbacks,
        );
      }
    });

    effect(() => {
      const selection = this.selection();
      if (this.mapInitialized() && !this.isDestroyed && selection) {
        this.mapBuilder.setSelectionMarker(selection.lat, selection.lng);
      }
    });

    afterNextRender(() => {
      if (this.isDestroyed) return;
      this.mapData.mapActive.set(true);
      this.tryInit();
    });

    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;
      this.mapData.mapActive.set(false);
      if (this.initRafId !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(this.initRafId);
        this.initRafId = null;
      }
      try {
        this.mapBuilder.destroy();
      } catch {
        // ignore
      }
      this.mapInitialized.set(false);
    });
  }

  onLocateClick(): void {
    if (!this.isBrowser()) return;
    void this.mapBuilder.goToCurrentLocation();
  }

  onZoomInClick(): void {
    if (!this.isBrowser()) return;
    this.mapBuilder.zoomIn();
  }

  onZoomOutClick(): void {
    if (!this.isBrowser()) return;
    this.mapBuilder.zoomOut();
  }

  private isBrowser(): boolean {
    return this.isBrowserToken && typeof window !== 'undefined';
  }

  private initRafId: number | null = null;

  private tryInit(): void {
    const el = this.containerRef()?.nativeElement;
    if (!el || this.mapInitialized() || !this.isBrowser() || this.isDestroyed)
      return;
    this.initRafId = window.requestAnimationFrame(() => {
      this.initRafId = null;
      if (this.isDestroyed) return;
      void this.initMap();
    });
  }

  private async initMap(): Promise<void> {
    if (this.mapInitialized() || !this.isBrowser() || this.isDestroyed) return;
    const el = this.containerRef()?.nativeElement;
    if (!el) return;
    try {
      await this.mapBuilder.init(
        el,
        this.options(),
        this.mapCragItems(),
        this.selectedMapCragItem(),
        this.mapParkingItems(),
        this.selectedMapParkingItem(),
        this.mapAreaItems(),
        this.mapIndoorItems(),
        this.callbacks,
      );
      if (!this.isDestroyed) {
        this.mapInitialized.set(true);
      }
    } catch (e) {
      console.warn('[MapComponent] Failed to initialize map', e);
    }
  }
}
