import {
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';

import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

export interface CarouselItem {
  type: 'image' | 'video';
  url: string | SafeResourceUrl;
  alt?: string;
  width?: number | null;
  height?: number | null;
  lqip?: string | null;
  fallbackAspectRatio?: string | null;
}

export interface CarouselImageLoadedEvent {
  url: string;
  width: number;
  height: number;
}

interface ProcessedCarouselSlide {
  item: CarouselItem;
  key: string;
  urlStr: string;
  isLoaded: boolean;
  hasError: boolean;
  showSkeleton: boolean;
  aspectRatio: string | null;
  isActive: boolean;
}

@Component({
  selector: 'app-custom-carousel',
  imports: [TranslatePipe, TuiButton, TuiIcon, TuiSkeleton],
  template: `
    <div
      class="relative w-full h-full overflow-hidden group rounded-inherit touch-pan-y"
      data-swipe-block
      (mouseenter)="isHovered.set(true)"
      (mouseleave)="isHovered.set(false)"
      (touchstart)="onTouchStart($event)"
      (touchmove)="onTouchMove($event)"
      (touchend)="onTouchEnd()"
    >
      <!-- Carousel Track -->
      <div
        class="flex h-full"
        [class.transition-transform]="!isDragging()"
        [class.duration-500]="!isDragging()"
        [class.ease-out]="!isDragging()"
        [style.transform]="trackTransform()"
      >
        @for (slide of processedSlides(); track slide.key) {
          <div
            class="w-full shrink-0 flex items-center justify-center min-h-[inherit]"
          >
            @if (slide.item.type === 'image') {
              <div
                class="relative w-full overflow-hidden flex items-center justify-center"
                [class.h-full]="objectCover()"
                [style.aspect-ratio]="slide.aspectRatio"
                [style.max-height]="objectCover() ? null : maxHeight()"
              >
                @if (slide.item.lqip) {
                  <img
                    [src]="slide.item.lqip"
                    alt=""
                    aria-hidden="true"
                    class="absolute inset-0 w-full h-full object-contain scale-105 blur-xl transition-opacity duration-500 ease-out pointer-events-none select-none"
                    [class.object-cover]="objectCover()"
                    [class.opacity-0]="slide.isLoaded"
                  />
                }
                @if (slide.showSkeleton) {
                  <div
                    [tuiSkeleton]="true"
                    class="absolute inset-0 w-full h-full pointer-events-none"
                    [class.opacity-30]="!!slide.item.lqip"
                  ></div>
                }
                @if (slide.urlStr) {
                  <img
                    [src]="slide.item.url"
                    [alt]="slide.item.alt || ''"
                    class="relative z-1 w-full block object-contain select-none transition-[opacity,filter,transform] duration-500 ease-out"
                    [class.h-full]="!!slide.aspectRatio || objectCover()"
                    [class.h-auto]="!slide.aspectRatio && !objectCover()"
                    [style.max-height]="maxHeight()"
                    [class.cursor-pointer]="clickable() && slide.isLoaded"
                    [class.object-cover]="objectCover()"
                    [class.opacity-0]="!slide.isLoaded"
                    [class.blur-md]="!slide.isLoaded"
                    [class.scale-105]="!slide.isLoaded"
                    [attr.tabindex]="clickable() ? 0 : null"
                    [attr.role]="clickable() ? 'button' : null"
                    [attr.fetchpriority]="priority() ? 'high' : null"
                    [attr.loading]="loading()"
                    (load)="onImageLoad(slide.urlStr, $event)"
                    (error)="onImageError(slide.urlStr)"
                    (click)="
                      clickable() &&
                        slide.isLoaded &&
                        imageClick.emit(slide.item.url)
                    "
                    (keydown.enter)="
                      clickable() &&
                        slide.isLoaded &&
                        imageClick.emit(slide.item.url)
                    "
                  />
                }
              </div>
            } @else {
              <div class="w-full aspect-video flex items-center justify-center">
                @if (videoConsentGranted()) {
                  <iframe
                    [src]="slide.item.url"
                    class="w-full h-full max-w-full"
                    frameborder="0"
                    allowfullscreen
                    loading="lazy"
                    referrerpolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  ></iframe>
                } @else {
                  <div
                    class="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center bg-(--tui-background-neutral-1)"
                  >
                    <div
                      class="w-12 h-12 rounded-full bg-(--tui-background-neutral-2) flex items-center justify-center text-(--tui-text-secondary)"
                    >
                      <tui-icon icon="@tui.play" class="text-xl" />
                    </div>
                    <div class="flex flex-col gap-1 max-w-sm">
                      <span
                        class="text-sm font-semibold text-(--tui-text-primary)"
                      >
                        {{ 'cookies.youtubeBlockedTitle' | translate }}
                      </span>
                      <p
                        class="m-0 text-xs leading-relaxed text-(--tui-text-secondary)"
                      >
                        {{ 'cookies.youtubeBlockedHint' | translate }}
                      </p>
                    </div>
                    <div
                      class="flex flex-wrap items-center justify-center gap-2"
                    >
                      <button
                        tuiButton
                        type="button"
                        size="s"
                        appearance="secondary"
                        (click)="loadVideoOnce.emit(); $event.stopPropagation()"
                      >
                        {{ 'cookies.youtubeLoadOnce' | translate }}
                      </button>
                      <button
                        tuiButton
                        type="button"
                        size="s"
                        appearance="primary"
                        (click)="
                          enableExternalMedia.emit(); $event.stopPropagation()
                        "
                      >
                        {{ 'cookies.youtubeEnableAlways' | translate }}
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- Navigation Arrows -->
      @if (items().length > 1) {
        <button
          type="button"
          class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center z-10 text-white hover:bg-black/70 transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none"
          [class.opacity-0]="!isHovered() && hideArrowsUntilHover()"
          [class.pointer-events-none]="!isHovered() && hideArrowsUntilHover()"
          [disabled]="index() === 0"
          (click)="prev(); $event.stopPropagation()"
        >
          <tui-icon icon="@tui.chevron-left" class="text-sm" />
        </button>
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center z-10 text-white hover:bg-black/70 transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none"
          [class.opacity-0]="!isHovered() && hideArrowsUntilHover()"
          [class.pointer-events-none]="!isHovered() && hideArrowsUntilHover()"
          [disabled]="index() === items().length - 1"
          (click)="next(); $event.stopPropagation()"
        >
          <tui-icon icon="@tui.chevron-right" class="text-sm" />
        </button>

        <!-- Dots -->
        <div
          class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 pointer-events-none bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1 transition-opacity duration-300"
          [class.opacity-0]="!isHovered() && hideDotsUntilHover()"
        >
          @for (slide of processedSlides(); track slide.key) {
            <div
              class="h-1.5 rounded-full bg-white transition-all duration-300"
              [style.width.rem]="slide.isActive ? 1 : 0.375"
              [style.opacity]="slide.isActive ? '1' : '0.45'"
            ></div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .rounded-inherit {
        border-radius: inherit;
      }
    `,
  ],
})
export class CustomCarouselComponent {
  items = input.required<CarouselItem[]>();
  index = model(0);
  clickable = input(false);
  objectCover = input(false);
  maxHeight = input('500px');
  hideArrowsUntilHover = input(false);
  hideDotsUntilHover = input(false);
  priority = input(false);
  loading = input<'lazy' | 'eager'>('lazy');
  videoConsentGranted = input(false);

  imageClick = output<string | SafeResourceUrl>();
  imageLoaded = output<CarouselImageLoadedEvent>();
  loadVideoOnce = output<void>();
  enableExternalMedia = output<void>();

  protected readonly isHovered = signal(false);
  protected readonly touchOffset = signal(0);
  protected readonly isDragging = signal(false);
  protected readonly loadedUrls = signal<
    Record<string, { width: number; height: number }>
  >({});
  protected readonly errorUrls = signal<Record<string, boolean>>({});

  protected readonly trackTransform = computed(
    () => `translateX(calc(-${this.index() * 100}% + ${this.touchOffset()}px))`,
  );

  protected readonly processedSlides = computed<ProcessedCarouselSlide[]>(
    () => {
      const list = this.items();
      const loadedMap = this.loadedUrls();
      const errorMap = this.errorUrls();
      const activeIdx = this.index();
      const cover = this.objectCover();

      return list.map((item, i) => {
        const urlStr = typeof item.url === 'string' ? item.url : '';
        const loadedInfo = urlStr ? loadedMap[urlStr] : undefined;
        const isLoaded = !!loadedInfo;
        const hasError = !!(urlStr && errorMap[urlStr]);
        const showSkeleton = !isLoaded && !hasError;
        const w = item.width || loadedInfo?.width || null;
        const h = item.height || loadedInfo?.height || null;
        const aspectRatio = cover
          ? null
          : w && h
            ? `${w} / ${h}`
            : (item.fallbackAspectRatio ?? null);

        return {
          item,
          key: `${item.type}-${i}`,
          urlStr,
          isLoaded,
          hasError,
          showSkeleton,
          aspectRatio,
          isActive: activeIdx === i,
        };
      });
    },
  );

  private touchStartX = 0;
  private readonly swipeThreshold = 50;

  protected onImageLoad(urlStr: string, event: Event): void {
    if (!urlStr) return;
    const img = event.target as HTMLImageElement | null;
    const width = img?.naturalWidth || 0;
    const height = img?.naturalHeight || 0;
    this.loadedUrls.update((prev) => ({
      ...prev,
      [urlStr]: { width, height },
    }));
    this.imageLoaded.emit({ url: urlStr, width, height });
  }

  protected onImageError(urlStr: string): void {
    if (!urlStr) return;
    this.errorUrls.update((prev) => ({
      ...prev,
      [urlStr]: true,
    }));
  }

  next(): void {
    if (this.index() < this.items().length - 1) {
      this.index.update((i) => i + 1);
    }
  }

  prev(): void {
    if (this.index() > 0) {
      this.index.update((i) => i - 1);
    }
  }

  protected onTouchStart(event: TouchEvent): void {
    if (this.items().length <= 1) return;
    this.touchStartX = event.touches[0].clientX;
    this.isDragging.set(true);
    this.touchOffset.set(0);
  }

  protected onTouchMove(event: TouchEvent): void {
    if (!this.isDragging()) return;
    const currentX = event.touches[0].clientX;
    const offset = currentX - this.touchStartX;

    // Resistance at the edges
    const isAtStart = this.index() === 0 && offset > 0;
    const isAtEnd = this.index() === this.items().length - 1 && offset < 0;

    if (isAtStart || isAtEnd) {
      this.touchOffset.set(offset * 0.3); // Apply 30% resistance
    } else {
      this.touchOffset.set(offset);
    }
  }

  protected onTouchEnd(): void {
    if (!this.isDragging()) return;

    const offset = this.touchOffset();
    this.isDragging.set(false);
    this.touchOffset.set(0);

    if (Math.abs(offset) > this.swipeThreshold) {
      if (offset > 0) {
        this.prev();
      } else {
        this.next();
      }
    }
  }
}
