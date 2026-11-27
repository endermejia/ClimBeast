import { Component, computed, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, required, submit } from '@angular/forms/signals';

import { TuiIdentityMatcher, tuiIsString } from '@taiga-ui/cdk';
import { type TuiDialogContext } from '@taiga-ui/core';
import {
  TuiButton,
  TuiCell,
  TuiDataList,
  TuiFilterByInputPipe,
  TuiIcon,
  TuiInput,
  TuiLabel,
  TuiOptGroup,
  TuiScrollbar,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiChevron, TuiInputChip, TuiMultiSelect } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { ParkingsService } from '../../services/parkings.service';

import { SupabaseService } from '../../services/supabase.service';

import { ParkingDto } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-link-parking-form',
  imports: [
    FormsModule,
    TranslatePipe,
    TuiButton,
    TuiCell,
    TuiChevron,
    TuiDataList,
    TuiFilterByInputPipe,
    TuiIcon,
    TuiInput,
    TuiInputChip,
    TuiLabel,
    TuiMultiSelect,
    TuiOptGroup,
    TuiScrollbar,
    TuiTitle,
  ],
  template: `
    <form class="lw-form-sheet" (submit.zoneless)="onSubmit($event)">
      <tui-scrollbar class="lw-form-sheet-body">
        <div class="flex flex-col gap-4">
          <tui-textfield
            multi
            tuiChevron
            [tuiTextfieldCleaner]="true"
            [stringify]="parkingStringify"
            [disabledItemHandler]="strings"
            [identityMatcher]="parkingIdentityMatcher"
          >
            <label tuiLabel for="parkings">
              {{ 'parkings' | translate }}
            </label>
            <input
              tuiInputChip
              id="parkings"
              [ngModel]="model().selectedParkings"
              (ngModelChange)="onParkingsChange($event)"
              name="selectedParkings"
              [placeholder]="'select' | translate"
              autocomplete="off"
            />
            <tui-input-chip *tuiItem />
            <tui-data-list *tuiDropdown>
              <tui-opt-group label="Parkings" tuiMultiSelectGroup>
                @for (
                  parking of availableParkings() | tuiFilterByInput;
                  track parking.id
                ) {
                  <button type="button" new tuiOption [value]="parking">
                    <div tuiCell size="s">
                      <tui-icon icon="@tui.parking-square" />
                      <div tuiTitle>
                        {{ parking.name }}
                      </div>
                    </div>
                  </button>
                }
              </tui-opt-group>
            </tui-data-list>
          </tui-textfield>
        </div>
      </tui-scrollbar>

      <div class="lw-form-sheet-footer">
        <button
          tuiButton
          size="m"
          appearance="flat"
          type="button"
          (click.zoneless)="close()"
        >
          {{ 'cancel' | translate }}
        </button>
        <button
          [disabled]="model().selectedParkings.length === 0"
          tuiButton
          size="m"
          appearance="primary"
          type="submit"
        >
          {{ 'apply' | translate }}
        </button>
      </div>
    </form>
  `,
})
export class LinkParkingFormComponent {
  private readonly parkingsService = inject(ParkingsService);
  private readonly supabase = inject(SupabaseService);
  private readonly isBrowser = inject(IS_BROWSER);

  private readonly context =
    injectContext<
      TuiDialogContext<
        boolean,
        { cragId: number; existingParkingIds: number[] }
      >
    >();

  protected readonly model = signal({
    selectedParkings: [] as ParkingDto[],
  });

  protected readonly linkForm = form(this.model, (path) => {
    required(path.selectedParkings);
  });

  protected readonly allParkings = resource({
    loader: async () => {
      if (!this.isBrowser) return [];
      await this.supabase.whenReady();
      return this.parkingsService.getAll();
    },
  });

  protected readonly availableParkings = computed(() => {
    const all = this.allParkings.value() || [];
    const existingIds = this.context.data.existingParkingIds;
    return all.filter((p) => !existingIds.includes(p.id));
  });

  protected readonly parkingStringify = (item: ParkingDto): string => item.name;

  protected readonly parkingIdentityMatcher: TuiIdentityMatcher<ParkingDto> = (
    a,
    b,
  ) => a.id === b.id;

  protected readonly strings = tuiIsString;

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    submit(this.linkForm, async () => {
      const cragId = this.context.data.cragId;
      const selected = this.model().selectedParkings;

      try {
        for (const p of selected) {
          await this.parkingsService.addParkingToCrag(cragId, p.id);
        }
        this.context.completeWith(true);
      } catch (e) {
        console.error('[LinkParkingFormComponent] Error linking parkings:', e);
      }
    });
  }

  close(): void {
    this.context.completeWith(false);
  }

  onParkingsChange(parkings: ParkingDto[]): void {
    this.model.update((m) => ({ ...m, selectedParkings: parkings }));
  }
}

export default LinkParkingFormComponent;
