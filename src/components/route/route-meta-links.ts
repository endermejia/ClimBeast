import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiButton } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { AvatarUrlPipe } from '../../pipes';

export interface RouteMetaEquipper {
  id: string | number;
  name: string;
  avatar?: string | null;
}

export interface RouteMetaTopoLink {
  id: string | number;
  name: string;
  link: (string | number)[];
  queryParams?: Record<string, string | number>;
  hasPath?: boolean | null;
}

@Component({
  selector: 'app-route-meta-links',
  imports: [AvatarUrlPipe, RouterLink, TranslatePipe, TuiAvatar, TuiButton],
  template: `
    @if (equippers().length > 0) {
      <div class="flex flex-col items-center">
        <span
          class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-1"
        >
          {{ 'equippers' | translate }}
        </span>
        <div class="flex flex-wrap gap-2 justify-center">
          @for (e of equippers(); track e.id) {
            <a
              tuiButton
              appearance="secondary"
              size="s"
              class="min-w-fit!"
              [routerLink]="['/equipper', e.id]"
            >
              @if (e.avatar; as avatar) {
                <span tuiAvatar size="xs" class="shrink-0">
                  <img [src]="avatar | avatarUrl" [alt]="e.name" />
                </span>
              }
              {{ e.name }}
            </a>
          }
        </div>
      </div>
    }

    @if (topos().length > 0) {
      <div class="flex flex-col items-center">
        <span
          class="text-xs uppercase opacity-60 font-semibold tracking-wider mb-2"
        >
          {{ (topos().length === 1 ? 'topo' : 'topos') | translate }}
        </span>
        <div class="flex flex-wrap gap-2 justify-center">
          @for (t of topos(); track t.id) {
            <a
              tuiButton
              [appearance]="t.hasPath === false ? 'warning' : 'info'"
              size="s"
              class="min-w-fit!"
              [routerLink]="t.link"
              [queryParams]="t.queryParams"
            >
              {{ t.name }}
            </a>
          }
        </div>
      </div>
    }
  `,
  host: {
    class: 'flex flex-col gap-6',
    '[class.hidden]': '!hasContent()',
  },
})
export class RouteMetaLinksComponent {
  readonly equippers = input<readonly RouteMetaEquipper[]>([]);
  readonly topos = input<readonly RouteMetaTopoLink[]>([]);

  protected readonly hasContent = computed(
    () => this.equippers().length > 0 || this.topos().length > 0,
  );
}
