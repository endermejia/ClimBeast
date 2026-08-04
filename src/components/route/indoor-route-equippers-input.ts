import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TuiIdentityMatcher } from '@taiga-ui/cdk';
import { TuiDataList, TuiInput, TuiFilterByInputPipe } from '@taiga-ui/core';
import { TuiChevron, TuiHideSelectedPipe, TuiInputChip } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { IndoorService } from '../../services/indoor.service';

import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

import { EquipperDto, IndoorRouteWithExtras } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-indoor-route-equippers-input',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    TuiChevron,
    TuiDataList,
    TuiFilterByInputPipe,
    TuiHideSelectedPipe,
    TuiInput,
    TuiInputChip,
  ],
  template: `
    <tui-textfield
      multi
      tuiChevron
      tuiTextfieldSize="s"
      class="border-none! bg-transparent! h-full"
      style="border-block-end: none;"
      [tuiTextfieldCleaner]="false"
      [stringify]="equipperStringify"
      [identityMatcher]="equipperIdentityMatcher"
    >
      <input
        #chipInput
        tuiInputChip
        autocomplete="off"
        [ngModel]="equippers()"
        (ngModelChange)="onEquippersChange($event)"
        (input)="searchQuery.set(chipInput.value)"
        [placeholder]="'select' | translate"
      />
      <tui-input-chip *tuiItem />
      <tui-data-list *tuiDropdown>
        @let items = allEquippers.value() || [];
        @if (searchQuery().length > 2) {
          @for (
            item of items | tuiHideSelected | tuiFilterByInput;
            track item.name
          ) {
            <button tuiOption new [value]="item">
              {{ item.name }}
            </button>
          }
        } @else {
          <div class="p-2 text-sm opacity-60 text-center">
            {{ 'search' | translate }}
          </div>
        }
      </tui-data-list>
    </tui-textfield>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-40 max-w-64 h-full' },
})
export class IndoorRouteEquippersInputComponent {
  private readonly indoor = inject(IndoorService);
  private readonly supabase = inject(SupabaseService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly toast = inject(ToastService);

  route = input.required<IndoorRouteWithExtras>();
  equippers = linkedSignal<readonly (EquipperDto | string)[]>(
    () => (this.route()?.equippers as EquipperDto[]) || [],
  );
  searchQuery = signal('');

  protected readonly equipperStringify = (
    item: EquipperDto | string,
  ): string => (typeof item === 'string' ? item : item.name);

  protected readonly equipperIdentityMatcher: TuiIdentityMatcher<
    EquipperDto | string
  > = (a, b) => {
    if (a === b) return true;
    if (typeof a === 'string' || typeof b === 'string') return a === b;
    return a.id === b.id;
  };

  protected readonly allEquippers = resource<EquipperDto[], { query: string }>({
    params: () => ({ query: this.searchQuery() }),
    loader: async ({ params: { query } }) => {
      if (query.length <= 2 || !this.isBrowser) return [];
      await this.supabase.whenReady();
      const { data } = await this.supabase.client
        .from('equippers')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(20);
      return (data as EquipperDto[]) || [];
    },
  });

  async onEquippersChange(
    newEquippers: readonly (EquipperDto | string)[],
  ): Promise<void> {
    this.equippers.set(newEquippers);
    const r = this.route();
    if (!r) return;
    try {
      await this.indoor.setRouteEquippers(r.id, newEquippers);
    } catch (e) {
      console.error('[IndoorRouteEquippersInput] error', e);
      this.toast.error('errors.unexpected');
    }
  }
}
