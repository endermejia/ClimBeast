import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
} from '@angular/core';

import { TuiLoader } from '@taiga-ui/core';

import { IndoorService } from '../../services/indoor.service';
import { SupabaseService } from '../../services/supabase.service';

import { ChartAscentsByGradeComponent } from '../../components/charts/chart-ascents-by-grade';
import { ChartAscentsByStyleComponent } from '../../components/charts/chart-ascents-by-style';

import {
  GRADE_NUMBER_TO_LABEL,
  RouteAscentWithExtras,
  VERTICAL_LIFE_GRADES,
} from '../../models';

@Component({
  selector: 'app-route-info-hint',
  standalone: true,
  imports: [
    ChartAscentsByGradeComponent,
    ChartAscentsByStyleComponent,
    CommonModule,
    TuiLoader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="w-80 max-w-full p-2 text-(--tui-text-primary) overflow-hidden min-w-0 flex flex-col gap-3"
    >
      @if (ascentsResource.isLoading()) {
        <div class="py-4 flex justify-center items-center">
          <tui-loader size="m" />
        </div>
      } @else {
        <app-chart-ascents-by-grade
          [ascents]="ascents()"
          [gradeLabel]="gradeLabel()"
          class="w-full"
        />
        @if (ascents().length > 0) {
          <app-chart-ascents-by-style [ascents]="ascents()" class="w-full" />
        }
      }
    </div>
  `,
})
export class RouteInfoHintComponent {
  routeId = input<number | string | null | undefined>();
  isIndoor = input<boolean>(false);
  grade = input<number | null | undefined>();

  private readonly supabase = inject(SupabaseService);
  private readonly indoor = inject(IndoorService);

  readonly gradeLabel = computed(() => {
    const g = this.grade();
    return g !== undefined && g !== null
      ? (GRADE_NUMBER_TO_LABEL[g as VERTICAL_LIFE_GRADES] ?? '?')
      : '?';
  });

  protected readonly ascentsResource = resource({
    params: () => ({
      routeId: this.routeId(),
      isIndoor: this.isIndoor(),
    }),
    loader: async ({ params }) => {
      const { routeId, isIndoor } = params;
      if (!routeId) return [];
      await this.supabase.whenReady();

      if (isIndoor) {
        return (await this.indoor.getRouteAscents(
          String(routeId),
        )) as unknown as RouteAscentWithExtras[];
      }

      const client = await this.supabase.getClient();
      const { data, error } = await client
        .from('route_ascents')
        .select('*')
        .eq('route_id', Number(routeId))
        .order('date', { ascending: false });

      if (error) {
        console.error('[RouteInfoHint] Error loading route ascents:', error);
        return [];
      }

      return (data || []) as unknown as RouteAscentWithExtras[];
    },
  });

  protected readonly ascents = computed(
    () => this.ascentsResource.value() ?? [],
  );
}
