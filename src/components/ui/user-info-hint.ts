import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/core';
import type { TuiCountryIsoCode } from '@taiga-ui/i18n';

import { TranslatePipe } from '@ngx-translate/core';

import { AscentsService } from '../../services/ascents.service';
import { FollowsService } from '../../services/follows.service';
import { SupabaseService } from '../../services/supabase.service';

import {
  RouteAscentWithExtras,
  RouteWithExtras,
  UserAscentStatRecord,
  UserProfileDto,
} from '../../models';

import {
  calculatePeriodScore,
  getMaxGrade,
  mapAscentRouteToExtras,
  openPhotoViewer,
  safeResourceValue,
} from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

import { AscentCardComponent } from '../ascent/ascent-card';
import { UserProfileStatsScoreComponent } from '../user-profile/statistics/score-card';
import { UserInfoComponent } from './user-info';

@Component({
  selector: 'app-user-info-hint',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    UserInfoComponent,
    UserProfileStatsScoreComponent,
    forwardRef(() => AscentCardComponent),
  ],
  host: {
    class: 'block w-80 max-w-full',
    '[attr.data-hint-loading]': 'isReady() ? null : ""',
    '[attr.data-hint-ready]': 'isReady() ? "" : null',
  },
  template: `
    <div class="w-full p-1 text-(--tui-text-primary) overflow-hidden min-w-0">
      @let profile = userProfile();
      <app-user-info
        [loading]="false"
        [showBio]="false"
        [name]="userName()"
        [avatar]="userAvatar()"
        [city]="profile?.city"
        [country]="userCountry()"
        [age]="userAge()"
        [startingClimbingYear]="profile?.starting_climbing_year"
        [compact]="true"
        [avatarSize]="'l'"
        [avatarClickable]="true"
        [nameClickable]="true"
        (avatarClick)="enlargeAvatar(userAvatar())"
        (nameClick)="navigateToProfile()"
      />

      <!-- Bio (full width, below image/name, above follows) -->
      @if (profile?.bio) {
        <p class="text-sm opacity-80 py-1.5 w-full wrap-anywhere">
          {{ profile.bio }}
        </p>
      }

      <!-- Followers/Following/Equipped Routes -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs py-1.5">
        <span class="flex items-center gap-1">
          <span class="font-bold">{{ followersCount() }}</span>
          <span>{{ 'followers' | translate }}</span>
        </span>
        <span class="flex items-center gap-1">
          <span class="font-bold">{{ followingCount() }}</span>
          <span>{{ 'following' | translate }}</span>
        </span>
        @if (equippedRoutesCount(); as equippedCount) {
          <span class="flex items-center gap-1">
            <span class="font-bold">{{ equippedCount }}</span>
            <span>{{ 'equippedRoutes' | translate }}</span>
          </span>
        }
      </div>

      <!-- User Key Statistics -->
      <app-user-profile-stats-score
        [compact]="true"
        [totalScore]="totalScore()"
        [totalAscents]="totalAscents()"
        [maxRedpoint]="maxRedpoint()"
        [maxOnsight]="maxOnsight()"
        [maxFlash]="maxFlash()"
      />

      <!-- User Latest Ascent -->
      @if (latestAscent(); as ascent) {
        <div class="mt-3 border-t border-(--tui-border-normal) pt-2">
          <span class="text-xs font-semibold opacity-70 block mb-1">
            {{ 'ascent.latestAscent' | translate }}
          </span>
          <app-ascent-card
            [data]="ascent"
            [showUser]="false"
            [showPhoto]="false"
            [showComment]="false"
            [showLikesAndComments]="false"
          />
        </div>
      }
    </div>
  `,
})
export class UserInfoHintComponent {
  userId = input<string | null | undefined>();
  fallbackName = input<string | null | undefined>();
  fallbackAvatar = input<string | null | undefined>();

  private readonly supabase = inject(SupabaseService);
  private readonly ascentsService = inject(AscentsService);
  private readonly followsService = inject(FollowsService);
  private readonly router = inject(Router);
  private readonly dialogs = inject(TuiDialogService);
  private readonly isBrowser = inject(IS_BROWSER);

  protected readonly userProfileResource = resource({
    params: () => this.userId(),
    loader: async ({ params: userId }) => {
      if (!userId) return null;
      await this.supabase.whenReady();
      const { data } = await this.supabase.client
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      return data as UserProfileDto | null;
    },
  });

  protected readonly userProfile = computed(() =>
    safeResourceValue(this.userProfileResource, null),
  );

  protected readonly userName = computed(
    () => this.userProfile()?.name || this.fallbackName(),
  );

  protected readonly userAvatar = computed(
    () => this.userProfile()?.avatar || this.fallbackAvatar(),
  );

  protected readonly userCountry = computed(
    () =>
      (this.userProfile()?.country as TuiCountryIsoCode | null | undefined) ??
      null,
  );

  protected readonly userAge = computed(() => {
    const bd = this.userProfile()?.birth_date;
    if (!bd) return null;
    const d = new Date(bd);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
    return years;
  });

  // --- Followers/Following ---
  protected readonly followersCountResource = resource({
    params: () => ({
      userId: this.userId(),
      change: this.followsService.followChange(),
    }),
    loader: async ({ params }) => {
      if (!params.userId) return 0;
      return await this.followsService.getFollowersCount(params.userId);
    },
  });

  protected readonly followersCount = computed(
    () => safeResourceValue(this.followersCountResource, 0) ?? 0,
  );

  protected readonly followingCountResource = resource({
    params: () => ({
      userId: this.userId(),
      change: this.followsService.followChange(),
    }),
    loader: async ({ params }) => {
      if (!params.userId) return 0;
      return await this.followsService.getFollowingCount(params.userId);
    },
  });

  protected readonly followingCount = computed(
    () => safeResourceValue(this.followingCountResource, 0) ?? 0,
  );

  // --- Equipped Routes ---
  protected readonly equippedRoutesResource = resource({
    params: () => this.userId(),
    loader: async ({ params: userId }) => {
      if (!userId) return 0;
      await this.supabase.whenReady();
      const { data: equipper } = await this.supabase.client
        .from('equippers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      if (!equipper) return 0;
      const { count } = await this.supabase.client
        .from('route_equippers')
        .select('*', { count: 'exact', head: true })
        .eq('equipper_id', equipper.id);
      return count ?? 0;
    },
  });

  protected readonly equippedRoutesCount = computed(
    () => safeResourceValue(this.equippedRoutesResource, 0) ?? 0,
  );

  // --- Statistics ---
  protected readonly statsResource = resource({
    params: () => this.userId(),
    loader: async ({ params: userId }) => {
      if (!userId) return [];
      return await this.ascentsService.getUserStats(userId);
    },
  });

  protected readonly rawStats = computed(() => {
    const data =
      (safeResourceValue(this.statsResource, []) as UserAscentStatRecord[]) ??
      [];
    return data.filter((a) => a.ascent_type !== 'attempt');
  });

  protected readonly periodScoreData = computed(() => {
    return calculatePeriodScore(this.rawStats());
  });

  protected readonly totalScore = computed(() => this.periodScoreData().score);
  protected readonly totalAscents = computed(() => this.rawStats().length);
  protected readonly maxRedpoint = computed(() =>
    getMaxGrade(this.rawStats(), ['rp']),
  );
  protected readonly maxOnsight = computed(() =>
    getMaxGrade(this.rawStats(), ['os', 'onsight']),
  );
  protected readonly maxFlash = computed(() =>
    getMaxGrade(this.rawStats(), ['f', 'flash']),
  );

  // --- Latest Ascent ---
  protected readonly latestAscentResource = resource({
    params: () => this.userId(),
    loader: async ({ params: userId }) => {
      if (!userId) return null;
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('route_ascents')
        .select(
          `
          *,
          routes!inner (
            id, name, slug, grade, climbing_kind,
            crag_id, created_at, eight_anu_route_slugs, height, user_creator_id,
            liked:route_likes(id),
            project:route_projects(id),
            ascents:route_ascents(rate, type),
            crags!inner (
              slug,
              name,
              area_id,
              areas!inner (slug, name)
            )
          )
        `,
        )
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      const { routes: route, ...ascentRest } = data;
      let mappedRoute: RouteWithExtras | undefined = undefined;
      if (route) {
        mappedRoute = mapAscentRouteToExtras(route as Record<string, unknown>);
      }
      return {
        ...ascentRest,
        route: mappedRoute,
      } as RouteAscentWithExtras;
    },
  });

  protected readonly latestAscent = computed(() =>
    safeResourceValue(this.latestAscentResource, null),
  );

  protected readonly isDataLoading = computed(
    () =>
      this.userProfileResource.isLoading() ||
      this.followersCountResource.isLoading() ||
      this.followingCountResource.isLoading() ||
      this.equippedRoutesResource.isLoading() ||
      this.statsResource.isLoading() ||
      this.latestAscentResource.isLoading(),
  );

  protected readonly isReady = signal(false);

  constructor() {
    effect((onCleanup) => {
      if (this.isDataLoading()) {
        this.isReady.set(false);
        return;
      }

      if (!this.isBrowser || typeof requestAnimationFrame === 'undefined') {
        this.isReady.set(true);
        return;
      }

      let frame1: number | null = null;
      let frame2: number | null = null;

      frame1 = requestAnimationFrame(() => {
        frame1 = null;
        frame2 = requestAnimationFrame(() => {
          frame2 = null;
          this.isReady.set(true);
        });
      });

      onCleanup(() => {
        if (frame1 !== null) cancelAnimationFrame(frame1);
        if (frame2 !== null) cancelAnimationFrame(frame2);
      });
    });
  }

  protected navigateToProfile(event?: Event): void {
    event?.stopPropagation();
    const id = this.userId();
    if (id) {
      setTimeout(() => {
        void this.router.navigate(['/profile', id]);
      });
    }
  }

  protected enlargeAvatar(avatar: string | null | undefined): void {
    if (!avatar) return;
    const photoUrl = this.supabase.buildAvatarUrl(avatar);
    if (photoUrl) {
      setTimeout(() => {
        void openPhotoViewer(this.dialogs, photoUrl);
      });
    }
  }
}
