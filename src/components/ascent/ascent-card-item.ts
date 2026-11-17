import { Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TuiButton, TuiHint, TuiIcon } from '@taiga-ui/core';
import { TuiBadge, TuiRating } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { AuthStateService } from '../../services/auth-state.service';

import { ClimbingKind, RouteAscentWithExtras } from '../../models';

import { GradeComponent } from '../ui/avatar-grade';
import { ClimbingKindIconComponent } from '../ui/climbing-kind-icon';
import { RouteInfoHintComponent } from '../ui/route-info-hint';
import { AscentCardMediaComponent } from './ascent-card-media';
import { AscentCommentsComponent } from './ascent-comments';
import { AscentLastCommentComponent } from './ascent-last-comment';
import { AscentLikesComponent } from './ascent-likes';
import { AscentTypeComponent } from './ascent-type';

@Component({
  selector: 'app-ascent-card-item',
  imports: [
    AscentCardMediaComponent,
    AscentCommentsComponent,
    AscentLastCommentComponent,
    AscentLikesComponent,
    AscentTypeComponent,
    ClimbingKindIconComponent,
    FormsModule,
    GradeComponent,
    RouteInfoHintComponent,
    RouterLink,
    TranslatePipe,
    TuiBadge,
    TuiButton,
    TuiHint,
    TuiIcon,
    TuiRating,
  ],
  template: `
    @let item = ascent();
    <div class="flex flex-col gap-1">
      @if (showPhoto() && (item.photo_path || item.video_url)) {
        <app-ascent-card-media
          [photoPath]="item.photo_path"
          [videoUrl]="item.video_url"
          [priority]="priority()"
        />
      }

      <div class="flex flex-col gap-1">
        <div class="flex flex-col gap-1">
          @if ((item.route && showRoute()) || (showEdit() && isOwnAscent())) {
            <div class="flex items-start justify-between gap-2">
              @if (item.route && showRoute()) {
                <div class="text-lg leading-tight wrap-break-word min-w-0">
                  @if (item.route.climbing_kind; as kind) {
                    <app-climbing-kind-icon
                      [kind]="kind"
                      iconClass="align-text-bottom mr-1"
                    />
                  }
                  @if (isIndoor()) {
                    <a
                      class="font-bold hover:underline cursor-pointer"
                      [routerLink]="[
                        '/indoor',
                        item.route.center_slug,
                        'route',
                        item.route.slug,
                      ]"
                      [tuiHint]="routeHintTemplate"
                      (contextmenu.zoneless)="$event.preventDefault()"
                    >
                      {{ item.route.name }}
                    </a>
                    @if (showCenter() && item.route.center_name) {
                      <span class="mx-1.5 opacity-70 text-sm">&bull;</span>
                      <span class="text-sm opacity-70">
                        <a
                          class="hover:underline cursor-pointer"
                          [routerLink]="['/indoor', item.route.center_slug]"
                        >
                          {{ item.route.center_name }}
                        </a>
                      </span>
                    }
                  } @else {
                    <a
                      class="font-bold hover:underline cursor-pointer"
                      [routerLink]="[
                        '/area',
                        item.route.area_slug,
                        item.route.crag_slug || 'general',
                        item.route.slug,
                      ]"
                      [tuiHint]="routeHintTemplate"
                      (contextmenu.zoneless)="$event.preventDefault()"
                    >
                      {{ item.route.name }}
                    </a>
                    @if (showCrag() && item.route.crag_name) {
                      <span class="mx-1.5 opacity-70 text-sm">•</span>
                      <span class="text-sm opacity-70">
                        <a
                          class="hover:underline cursor-pointer"
                          [routerLink]="[
                            '/area',
                            item.route.area_slug,
                            item.route.crag_slug || 'general',
                          ]"
                        >
                          {{ item.route.crag_name }}
                        </a>
                        @if (showArea() && item.route.area_name) {
                          <a
                            class="hover:underline cursor-pointer ml-1"
                            [routerLink]="['/area', item.route.area_slug]"
                          >
                            ({{ item.route.area_name }})
                          </a>
                        }
                      </span>
                    }
                  }
                  <ng-template #routeHintTemplate>
                    <app-route-info-hint
                      [routeId]="item.route_id || item.route.id"
                      [isIndoor]="isIndoor()"
                      [grade]="item.route.grade"
                    />
                  </ng-template>
                </div>
              } @else {
                <span class="flex-1"></span>
              }

              @if (showEdit() && isOwnAscent()) {
                <div class="flex flex-col items-end gap-1 shrink-0">
                  <button
                    tuiButton
                    size="xs"
                    appearance="secondary-grayscale"
                    class="rounded-full!"
                    (click)="editAscent()"
                  >
                    {{ 'edit' | translate }}
                  </button>
                  @if (item.private_ascent) {
                    <span tuiBadge appearance="accent" class="text-xs">
                      {{ 'private' | translate }}
                    </span>
                  }
                </div>
              }
            </div>
          }

          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            @if (item.grade) {
              <app-grade
                [grade]="item.grade"
                [kind]="item.route?.climbing_kind"
              />
            }
            @if (item.soft) {
              <span tuiBadge size="s" appearance="neutral">
                {{ 'ascent.soft' | translate }}
              </span>
            }
            @if (item.hard) {
              <span tuiBadge size="s" appearance="neutral">
                {{ 'ascent.hard' | translate }}
              </span>
            }
            @if (item.type; as ascentType) {
              <app-ascent-type [type]="ascentType" [attempts]="item.attempts" />
            }
            @if (item.rate) {
              <div [tuiHint]="item.rate">
                <tui-rating
                  [ngModel]="item.rate"
                  [max]="5"
                  [readOnly]="true"
                  class="pointer-events-none"
                  [style.font-size.rem]="1"
                  [attr.aria-label]="'rating' | translate"
                />
              </div>
            }
            @if (item.recommended) {
              <tui-icon
                icon="@tui.thumbs-up"
                class="w-4! h-4! text-(--tui-text-action)"
                [tuiHint]="'ascent.recommend' | translate"
              />
            }
          </div>
        </div>
      </div>

      @if (showComment() && item.comment; as ascentComment) {
        <p
          class="text-sm italic border-l-2 border-(--tui-border-normal) pl-3 py-1 self-start"
        >
          "{{ ascentComment }}"
        </p>
      }

      @if (moreInfoBadges().length > 0) {
        <div class="flex flex-wrap gap-x-1 gap-y-1">
          @for (badge of moreInfoBadges(); track badge.key) {
            <span tuiBadge size="s" appearance="neutral">
              {{ badge.label | translate }}
            </span>
          }
        </div>
      }

      @if (item.is_duplicate) {
        <div
          class="flex items-center gap-2 text-xs font-bold text-(--tui-text-negative) uppercase tracking-wider mt-1"
        >
          <tui-icon icon="@tui.triangle-alert" class="w-4! h-4!" />
          {{ 'ascent.duplicateWarning' | translate }}
        </div>
      }

      @if (showLikesAndComments() && !isIndoor()) {
        <footer class="flex flex-col gap-1 mt-2">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 min-h-9">
            <app-ascent-likes
              [ascentId]="item.id"
              [isPrivate]="!!item.private_ascent"
            />
            <app-ascent-comments
              [ascentId]="item.id"
              [isPrivate]="!!item.private_ascent"
            />
          </div>
          @if (showComment()) {
            <app-ascent-last-comment [ascentId]="item.id" />
          }
        </footer>
      }
    </div>
  `,
})
export class AscentCardItemComponent {
  private readonly authState = inject(AuthStateService);
  private readonly ascentsService = inject(AscentsService);

  ascent = input.required<RouteAscentWithExtras>();
  showRoute = input(true);
  showCrag = input(true);
  showArea = input(true);
  showCenter = input(true);
  showPhoto = input(true);
  showComment = input(true);
  showLikesAndComments = input(true);
  showEdit = input(false);
  priority = input(false);

  protected readonly isIndoor = computed(() => {
    const r = this.ascent().route;
    return !!(
      r &&
      'center_slug' in r &&
      (r as { center_slug?: string }).center_slug
    );
  });

  protected readonly isOwnAscent = computed(() => {
    const currentUserId = this.authState.userProfile()?.id;
    const ascentUserId = this.ascent()?.user_id;
    return !!(currentUserId && ascentUserId && currentUserId === ascentUserId);
  });

  private static readonly MORE_INFO_FIELDS: {
    key: keyof RouteAscentWithExtras;
    label: string;
  }[] = [
    { key: 'cruxy', label: 'ascent.climbing.cruxy' },
    { key: 'athletic', label: 'ascent.climbing.athletic' },
    { key: 'sloper', label: 'ascent.climbing.sloper' },
    { key: 'endurance', label: 'ascent.climbing.endurance' },
    { key: 'technical', label: 'ascent.climbing.technical' },
    { key: 'crimpy', label: 'ascent.climbing.crimpy' },
    { key: 'slab', label: 'ascent.steepness.slab' },
    { key: 'vertical', label: 'ascent.steepness.vertical' },
    { key: 'overhang', label: 'ascent.steepness.overhang' },
    { key: 'roof', label: 'ascent.steepness.roof' },
    { key: 'bad_anchor', label: 'ascent.safety.bad_anchor' },
    { key: 'bad_bolts', label: 'ascent.safety.bad_bolts' },
    { key: 'high_first_bolt', label: 'ascent.safety.high_first_bolt' },
    { key: 'lose_rock', label: 'ascent.safety.lose_rock' },
    {
      key: 'bad_clipping_position',
      label: 'ascent.safety.bad_clipping_position',
    },
    { key: 'chipped', label: 'ascent.other.chipped' },
    { key: 'with_kneepad', label: 'ascent.other.with_kneepad' },
    { key: 'first_ascent', label: 'ascent.other.first_ascent' },
    { key: 'traditional', label: 'ascent.other.traditional' },
    { key: 'sit_start', label: 'ascent.boulder.sit_start' },
    { key: 'top_out', label: 'ascent.boulder.top_out' },
    { key: 'highball', label: 'ascent.boulder.highball' },
  ];

  protected readonly moreInfoBadges = computed(() => {
    const a = this.ascent();
    return AscentCardItemComponent.MORE_INFO_FIELDS.filter((f) => !!a[f.key]);
  });

  async editAscent() {
    const item = this.ascent();
    await firstValueFrom(
      this.ascentsService.openAscentForm({
        ascentData: item,
        isIndoor: this.isIndoor(),
        routeId: item.route_id as number | string,
        routeName: item.route?.name,
        climbingKind: item.route?.climbing_kind as ClimbingKind,
        grade: item.route?.grade || undefined,
      }),
      { defaultValue: false },
    );
  }
}
