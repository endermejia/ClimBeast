import { Component, computed, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiLoader } from '@taiga-ui/core';
import { TuiAccordion } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { RouteSimple, RoutesService } from '../../services/routes.service';

import {
  SuggestedDuplicateCardComponent,
  type SuggestedDuplicateItem,
  SuggestedDuplicatesSectionComponent,
} from '../../components/admin/suggested-duplicate-card';

import { RouteDto } from '../../models';

interface RouteDuplicateGroupView {
  routes: RouteSimple[];
  title: string;
  cardItems: SuggestedDuplicateItem[];
}

interface AreaDuplicateRoutesView {
  id: number;
  name: string;
  slug: string;
  duplicateGroups: RouteDuplicateGroupView[];
}

@Component({
  selector: 'app-suggested-unified-routes',
  imports: [
    RouterLink,
    SuggestedDuplicateCardComponent,
    SuggestedDuplicatesSectionComponent,
    TranslatePipe,
    TuiAccordion,
    TuiLoader,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <app-suggested-duplicates-section
        titleKey="routes.suggestedDuplicates"
        [loading]="areasResource.isLoading()"
        [empty]="areas().length === 0"
        loaderSize="xl"
      >
        <tui-accordion [closeOthers]="false">
          @for (area of areas(); track area.id) {
            <button tuiAccordion class="font-bold">
              <a
                [routerLink]="['/area', area.slug]"
                target="_blank"
                class="underline underline-offset-2 hover:opacity-70"
                (click)="$event.stopPropagation()"
                >{{ area.name }}</a
              >
              <span class="ml-2 font-normal opacity-50">
                ({{ area.duplicateGroups.length }}
                {{ 'routes.duplicateGroups' | translate }})
              </span>
            </button>
            <tui-expand>
              <div class="grid gap-3 pt-2 pb-6 px-1">
                @for (group of area.duplicateGroups; track $index) {
                  <app-suggested-duplicate-card
                    [title]="group.title"
                    [items]="group.cardItems"
                    [mutedItems]="true"
                    (unify)="onUnify(group.routes)"
                  />
                }
              </div>
            </tui-expand>
          }
        </tui-accordion>
      </app-suggested-duplicates-section>

      @if (eightAnuGroups().length > 0) {
        <h3 class="font-bold text-lg mt-4">
          {{ 'routes.duplicatesByEightAnu' | translate }}
        </h3>
        @if (eightAnuResource.isLoading()) {
          <div class="flex justify-center p-8">
            <tui-loader size="xl" />
          </div>
        } @else {
          <div class="grid gap-2">
            @for (group of eightAnuGroups(); track group.eightAnuSlug) {
              <app-suggested-duplicate-card
                [eyebrow]="'8a.nu: ' + group.eightAnuSlug"
                (unify)="onUnify(group.routes)"
              >
                <div class="flex flex-col gap-1">
                  @for (route of group.routes; track route.id) {
                    <div class="text-sm">
                      @if (
                        route.crag?.area_slug && route.crag.slug && route.slug
                      ) {
                        <a
                          [routerLink]="[
                            '/area',
                            route.crag.area_slug,
                            route.crag.slug,
                            route.slug,
                          ]"
                          target="_blank"
                          class="font-medium underline underline-offset-2 hover:opacity-70"
                          >{{ route.name }}</a
                        >
                      } @else {
                        <span class="font-medium">{{ route.name }}</span>
                      }
                      <span class="opacity-50 ml-1">
                        @if (route.crag?.area_slug) {
                          <a
                            [routerLink]="['/area', route.crag.area_slug]"
                            target="_blank"
                            class="underline underline-offset-2 hover:opacity-100"
                            >{{
                              route.crag.area_name || route.crag.area_slug
                            }}</a
                          >
                        } @else {
                          {{ route.crag?.area_name || '?' }}
                        }
                        /
                        @if (route.crag?.area_slug && route.crag.slug) {
                          <a
                            [routerLink]="[
                              '/area',
                              route.crag.area_slug,
                              route.crag.slug,
                            ]"
                            target="_blank"
                            class="underline underline-offset-2 hover:opacity-100"
                            >{{ route.crag.name || 'Unknown' }}</a
                          >
                        } @else {
                          {{ route.crag?.name || 'Unknown' }}
                        }
                      </span>
                    </div>
                  }
                </div>
              </app-suggested-duplicate-card>
            }
          </div>
        }
      }
    </div>
  `,
})
export class SuggestedUnifiedRoutesComponent {
  private readonly routesService = inject(RoutesService);

  protected readonly areasResource = resource({
    loader: () => this.routesService.getAllDuplicateRoutesGroupedByArea(),
  });

  protected readonly areas = computed<AreaDuplicateRoutesView[]>(() =>
    (this.areasResource.value() ?? []).map((area) => ({
      id: area.id,
      name: area.name,
      slug: area.slug,
      duplicateGroups: area.duplicateGroups.map((group) => ({
        routes: group,
        title: group[0].name,
        cardItems: group.map((route) => ({
          id: route.id,
          label: route.crag?.name || 'Unknown',
          link:
            route.crag?.area_slug && route.crag.slug && route.slug
              ? ['/area', route.crag.area_slug, route.crag.slug, route.slug]
              : null,
        })),
      })),
    })),
  );

  protected readonly eightAnuResource = resource({
    loader: () => this.routesService.getAllRoutesWithDuplicateEightAnuSlugs(),
  });

  protected readonly eightAnuGroups = computed(
    () => this.eightAnuResource.value() ?? [],
  );

  protected async onUnify(group: RouteSimple[]): Promise<void> {
    const success = await this.routesService.openUnifyRoutes(
      group as unknown as RouteDto[],
    );
    if (success) {
      this.areasResource.reload();
      this.eightAnuResource.reload();
    }
  }
}
