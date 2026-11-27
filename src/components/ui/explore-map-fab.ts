import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiButton, TuiDropdown } from '@taiga-ui/core';
import { TuiPulse } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { TourService, TourStep } from '../../services/tour.service';

import { TourHintComponent } from './tour-hint';

@Component({
  selector: 'app-explore-map-fab',
  imports: [
    RouterLink,
    TourHintComponent,
    TranslatePipe,
    TuiButton,
    TuiDropdown,
    TuiPulse,
  ],
  template: `
    <button
      tuiButton
      size="m"
      appearance="primary-grayscale"
      iconStart="@tui.map"
      routerLink="/explore"
      class="pointer-events-auto shadow-xl relative"
      [tuiDropdown]="tourHint"
      [tuiDropdownManual]="isExploreMapTourStep()"
      tuiDropdownDirection="top"
      (click)="onMapClick()"
    >
      @if (isExploreMapTourStep()) {
        <span class="absolute bottom-2 left-2 pointer-events-none z-10 size-0">
          <tui-pulse />
        </span>
      }
      {{ 'map' | translate }}
    </button>

    <ng-template #tourHint>
      <app-tour-hint
        class="w-72 max-w-[calc(100vw-2rem)] block"
        [description]="'tour.explore.mapButtonDescription' | translate"
        (next)="tourService.next()"
        (skip)="tourService.finish()"
      />
    </ng-template>
  `,
  host: {
    class:
      'absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none w-full flex justify-center z-20',
  },
})
export class ExploreMapFabComponent {
  protected readonly tourService = inject(TourService);

  protected readonly isExploreMapTourStep = computed(
    () =>
      this.tourService.isActive() &&
      this.tourService.step() === TourStep.EXPLORE_MAP,
  );

  protected onMapClick(): void {
    if (this.isExploreMapTourStep()) {
      void this.tourService.next();
    }
  }
}
