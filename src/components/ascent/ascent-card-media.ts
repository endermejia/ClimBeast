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
import { TuiSkeleton } from '@taiga-ui/kit';

import { SupabaseService } from '../../services/supabase.service';

import { getEmbedUrl, openPhotoViewer } from '../../utils';

import { CustomCarouselComponent } from '../ui/custom-carousel';

@Component({
  selector: 'app-ascent-card-media',
  imports: [CustomCarouselComponent, TuiSkeleton],
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
            (imageClick)="showEnlargedPhoto($event)"
          />
        </div>
      } @else if (ascentPhotoResource.isLoading()) {
        <div
          class="aspect-4/3 bg-(--tui-background-neutral-1) -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full rounded-none sm:rounded-2xl"
          tuiSkeleton
        ></div>
      }
    }
  `,
})
export class AscentCardMediaComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialogs = inject(TuiDialogService);

  photoPath = input<string | null | undefined>(null);
  videoUrl = input<string | null | undefined>(null);
  priority = input(false);

  protected index = signal(0);

  protected readonly ascentPhotoResource = resource({
    params: () => this.photoPath() || null,
    loader: async ({ params: path }) => {
      if (!path) return null;
      await this.supabase.whenReady();
      return this.supabase.getAscentSignedUrl(path);
    },
  });

  protected readonly mediaItems = computed(() => {
    const items: {
      type: 'image' | 'video';
      url: string | SafeResourceUrl;
    }[] = [];
    const photo = this.ascentPhotoResource.value();
    if (photo) {
      items.push({ type: 'image', url: photo });
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
