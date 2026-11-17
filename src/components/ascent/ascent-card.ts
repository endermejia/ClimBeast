import { Component, computed, inject, input } from '@angular/core';

import { TuiAppearance } from '@taiga-ui/core';

import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { AuthStateService } from '../../services/auth-state.service';

import { ClimbingKind, RouteAscentWithExtras } from '../../models';

import { AscentCardHeaderComponent } from './ascent-card-header';
import { AscentCardItemComponent } from './ascent-card-item';

@Component({
  selector: 'app-ascent-card',
  imports: [AscentCardHeaderComponent, AscentCardItemComponent, TuiAppearance],
  template: `
    @let ascent = data();
    @let grouped = isGrouped();
    <div
      [tuiAppearance]="
        hasDuplicate()
          ? 'negative'
          : highlightOwn() && isOwnAscent()
            ? 'positive'
            : 'flat-grayscale'
      "
      class="flex flex-col gap-1 p-4 sm:rounded-3xl rounded-none relative no-underline text-inherit hover:no-underline -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full text-left"
    >
      <app-ascent-card-header
        [userId]="ascent.user_id"
        [user]="ascent.user"
        [date]="ascent.date"
        [showUser]="showUser()"
        [showDate]="showDate()"
        [showEdit]="!grouped && isOwnAscent()"
        [isPrivate]="!!ascent.private_ascent"
        (editClick)="editSingleAscent()"
      />

      <div
        class="flex flex-col"
        [class.divide-y]="grouped"
        [class.divide-(--tui-border-normal)]="grouped"
      >
        @for (entry of trackedAscents(); track entry.key) {
          <app-ascent-card-item
            class="block"
            [class.pt-3]="grouped && !$first"
            [class.pb-3]="grouped && !$last"
            [ascent]="entry.ascent"
            [showRoute]="showRoute()"
            [showCrag]="showCrag()"
            [showArea]="showArea()"
            [showCenter]="showCenter()"
            [showPhoto]="showPhoto()"
            [showComment]="showComment()"
            [showLikesAndComments]="showLikesAndComments()"
            [showEdit]="grouped && isOwnAscent()"
            [priority]="priority() && $first"
          />
        }
      </div>
    </div>
  `,
})
export class AscentCardComponent {
  protected readonly authState = inject(AuthStateService);
  private readonly ascentsService = inject(AscentsService);

  data = input.required<RouteAscentWithExtras>();
  extraAscents = input<RouteAscentWithExtras[]>([]);
  showUser = input(true);
  showRoute = input(true);
  showCrag = input(true);
  showArea = input(true);
  showCenter = input(true);
  showPhoto = input(true);
  showComment = input(true);
  showDate = input(true);
  showLikesAndComments = input(true);
  priority = input(false);
  highlightOwn = input(false);

  protected readonly isGrouped = computed(() => this.extraAscents().length > 0);

  protected readonly ascentsList = computed(() => [
    this.data(),
    ...this.extraAscents(),
  ]);

  protected readonly trackedAscents = computed(() =>
    this.ascentsList().map((ascent) => {
      const r = ascent.route;
      const isIndoorItem = !!(
        r &&
        'center_slug' in r &&
        (r as { center_slug?: string }).center_slug
      );
      return {
        key: `${isIndoorItem ? 'indoor' : 'outdoor'}-${ascent.id}`,
        ascent,
      };
    }),
  );

  protected readonly isIndoor = computed(() => {
    const r = this.data().route;
    return !!(
      r &&
      'center_slug' in r &&
      (r as { center_slug?: string }).center_slug
    );
  });

  protected readonly isOwnAscent = computed(() => {
    const currentUserId = this.authState.userProfile()?.id;
    const ascentUserId = this.data()?.user_id;
    return !!(currentUserId && ascentUserId && currentUserId === ascentUserId);
  });

  protected readonly hasDuplicate = computed(() =>
    this.ascentsList().some((a) => a.is_duplicate),
  );

  async editSingleAscent() {
    const item = this.data();
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
