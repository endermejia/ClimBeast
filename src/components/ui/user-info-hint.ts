import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  resource,
} from '@angular/core';
import { Router } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';

import { AscentsService } from '../../services/ascents.service';
import { FollowsService } from '../../services/follows.service';
import { SupabaseService } from '../../services/supabase.service';

import { AscentCardComponent } from '../ascent/ascent-card';
import { UserProfileStatsScoreComponent } from '../user-profile/statistics/score-card';
import { UserInfoComponent } from './user-info';

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
} from '../../utils';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="w-80 max-w-full p-1 text-(--tui-text-primary) overflow-hidden min-w-0"
    >
      @let profile = userProfileResource.value();
      <app-user-info
        [loading]="userProfileResource.isLoading()"
        [name]="profile?.name || fallbackName()"
        [avatar]="profile?.avatar || fallbackAvatar()"
        [city]="profile?.city"
        [country]="$any(profile?.country)"
        [age]="userAge()"
        [startingClimbingYear]="profile?.starting_climbing_year"
        [bio]="profile?.bio"
        [compact]="true"
        [avatarSize]="'l'"
        [nameClickable]="true"
        (nameClick)="navigateToProfile()"
      />

      <!-- Followers/Following/Equipped Routes -->
      <div class="flex items-center gap-3 text-xs py-1.5">
        <span class="flex items-center gap-1">
          <span class="font-bold">{{
            followersCountResource.value() ?? 0
          }}</span>
          <span>{{ 'followers' | translate }}</span>
        </span>
        <span class="flex items-center gap-1">
          <span class="font-bold">{{
            followingCountResource.value() ?? 0
          }}</span>
          <span>{{ 'following' | translate }}</span>
        </span>
        @if (equippedRoutesResource.value(); as equippedCount) {
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
      @if (latestAscentResource.value(); as ascent) {
        <div class="mt-3 border-t border-(--tui-border-normal) pt-2">
          <span class="text-xs font-semibold opacity-70 block mb-1">
            {{ 'ascent.latestAscent' | translate }}
          </span>
          <app-ascent-card [data]="ascent" [showUser]="false" />
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

  protected readonly userAge = computed(() => {
    const bd = this.userProfileResource.value()?.birth_date;
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
    params: () => this.userId(),
    loader: async ({ params: userId }) => {
      if (!userId) return 0;
      return await this.followsService.getFollowersCount(userId);
    },
  });

  protected readonly followingCountResource = resource({
    params: () => this.userId(),
    loader: async ({ params: userId }) => {
      if (!userId) return 0;
      return await this.followsService.getFollowingCount(userId);
    },
  });

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

  // --- Statistics ---
  protected readonly statsResource = resource({
    params: () => this.userId(),
    loader: async ({ params: userId }) => {
      if (!userId) return [];
      return await this.ascentsService.getUserStats(userId);
    },
  });

  protected readonly rawStats = computed(() => {
    const data = (this.statsResource.value() as UserAscentStatRecord[]) ?? [];
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

  protected navigateToProfile(event?: Event): void {
    event?.stopPropagation();
    const id = this.userId();
    if (id) {
      setTimeout(() => {
        void this.router.navigate(['/profile', id]);
      });
    }
  }
}
