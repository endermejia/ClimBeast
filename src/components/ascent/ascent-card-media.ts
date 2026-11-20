import {
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { TuiDialogService } from '@taiga-ui/core';

import { AscentsService } from '../../services/ascents.service';
import { ConsentService } from '../../services/consent.service';
import { SupabaseService } from '../../services/supabase.service';

import { getEmbedUrl, openPhotoViewer, PhotoMetadata } from '../../utils';

import {
  CarouselImageLoadedEvent,
  CarouselItem,
  CustomCarouselComponent,
} from '../ui/custom-carousel';

@Component({
  selector: 'app-ascent-card-media',
  imports: [CustomCarouselComponent],
  template: `
    @if (mediaItems(); as items) {
      @if (items.length > 0) {
        <div
          class="relative -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full bg-(--tui-background-neutral-1) overflow-hidden sm:rounded-2xl"
        >
          <app-custom-carousel
            [items]="items"
            [(index)]="index"
            [clickable]="true"
            [priority]="priority()"
            [loading]="priority() ? 'eager' : 'lazy'"
            [videoConsentGranted]="canLoadVideo()"
            (imageClick)="showEnlargedPhoto($event)"
            (imageLoaded)="onImageLoaded($event)"
            (loadVideoOnce)="allowVideoOnce.set(true)"
            (enableExternalMedia)="enableExternalMedia()"
          />
        </div>
      }
    }
  `,
})
export class AscentCardMediaComponent {
  private static readonly backfilledCache = new Map<string, PhotoMetadata>();

  private readonly ascentsService = inject(AscentsService);
  private readonly consent = inject(ConsentService);
  private readonly supabase = inject(SupabaseService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialogs = inject(TuiDialogService);

  ascentId = input<number | string | null | undefined>(null);
  isIndoor = input(false);
  photoPath = input<string | null | undefined>(null);
  photoWidth = input<number | null | undefined>(null);
  photoHeight = input<number | null | undefined>(null);
  photoLqip = input<string | null | undefined>(null);
  videoUrl = input<string | null | undefined>(null);
  priority = input(false);

  protected index = signal(0);
  protected readonly allowVideoOnce = signal(false);
  protected readonly localBackfilled = signal<PhotoMetadata | null>(null);
  protected readonly canLoadVideo = computed(
    () => this.consent.externalMediaAllowed() || this.allowVideoOnce(),
  );

  protected enableExternalMedia(): void {
    this.consent.updatePreferences({ externalMedia: true });
  }

  protected readonly ascentPhotoResource = resource({
    params: () => this.photoPath() || null,
    loader: async ({ params: path }) => {
      if (!path) return null;
      await this.supabase.whenReady();
      return this.supabase.getAscentSignedUrl(path);
    },
  });

  protected readonly mediaItems = computed(() => {
    const items: CarouselItem[] = [];
    const path = this.photoPath();
    if (path) {
      const cached =
        this.localBackfilled() ??
        AscentCardMediaComponent.backfilledCache.get(path) ??
        null;
      const photoUrl = this.ascentPhotoResource.value();
      const hasFailed =
        !this.ascentPhotoResource.isLoading() && photoUrl === '';

      if (!hasFailed) {
        items.push({
          type: 'image',
          url: photoUrl || '',
          width: this.photoWidth() || cached?.width || null,
          height: this.photoHeight() || cached?.height || null,
          lqip: this.photoLqip() || cached?.lqip || null,
          fallbackAspectRatio: '4 / 5',
        });
      }
    }
    const video = this.videoUrl();
    if (video) {
      const embed = getEmbedUrl(video);
      if (embed) {
        items.push({
          type: 'video',
          url: this.sanitizer.bypassSecurityTrustResourceUrl(embed),
        });
      }
    }
    return items;
  });

  protected async onImageLoaded(
    event: CarouselImageLoadedEvent,
  ): Promise<void> {
    const path = this.photoPath();
    const id = this.ascentId();
    if (!path || !id || !event.url) return;

    const hasAllMetadata = !!(
      this.photoWidth() &&
      this.photoHeight() &&
      this.photoLqip()
    );
    if (hasAllMetadata || AscentCardMediaComponent.backfilledCache.has(path)) {
      return;
    }

    const meta = await this.ascentsService.backfillPhotoMetadata(
      id,
      this.isIndoor(),
      event.url,
    );
    if (meta) {
      AscentCardMediaComponent.backfilledCache.set(path, meta);
      this.localBackfilled.set(meta);
    }
  }

  async showEnlargedPhoto(url: string | SafeResourceUrl): Promise<void> {
    if (typeof url !== 'string') return;

    let fullUrl = url;
    const path = this.photoPath();

    if (path) {
      const signed = await this.supabase.getAscentSignedUrl(path);
      if (signed) {
        fullUrl = signed;
      }
    }

    openPhotoViewer(this.dialogs, fullUrl);
  }
}
