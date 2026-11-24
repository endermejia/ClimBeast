import {
  Component,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TuiIdentityMatcher } from '@taiga-ui/cdk';
import { TuiDataList, TuiInput, TuiFilterByInputPipe } from '@taiga-ui/core';
import { TuiChevron, TuiHideSelectedPipe, TuiInputChip } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { RoutesService } from '../../services/routes.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

import { EquipperDto, RouteWithExtras } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-route-equippers-input',
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
      class="h-full! w-full! items-center border-none! bg-transparent!"
      [tuiTextfieldCleaner]="false"
      [stringify]="equipperStringify"
      [identityMatcher]="equipperIdentityMatcher"
    >
      <input
        #chipInput
        #tuiDropdownHost
        tuiInputChip
        autocomplete="off"
        [ngModel]="equippers()"
        (ngModelChange)="onEquippersChange($event)"
        (input)="searchQuery.set(chipInput.value)"
        (blur)="onInputBlur($event)"
        [placeholder]="'select' | translate"
      />
      <tui-input-chip *tuiItem />
      <tui-data-list *tuiDropdown>
        @let items = allEquippers.hasValue() ? allEquippers.value() : [];
        @if (searchQuery().length > 2) {
          @for (
            item of items | tuiHideSelected | tuiFilterByInput;
            track item.id
          ) {
            <button type="button" tuiOption new [value]="item">
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
  host: { class: 'block min-w-0 w-full h-full' },
})
export class RouteEquippersInputComponent {
  private readonly routes = inject(RoutesService);
  private readonly supabase = inject(SupabaseService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly toast = inject(ToastService);
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  route = input.required<RouteWithExtras>();
  autoSave = input(true);

  equippersChange = output<readonly (EquipperDto | string)[]>();
  equippersChanged = output<EquipperDto[]>();

  equippers = linkedSignal<readonly (EquipperDto | string)[]>(
    () => (this.route()?.equippers as EquipperDto[]) || [],
  );
  searchQuery = signal('');

  private readonly knownEquippers = new Map<string, EquipperDto>();

  protected readonly equipperStringify = (
    item: EquipperDto | string,
  ): string => (typeof item === 'string' ? item : item.name);

  protected readonly equipperIdentityMatcher: TuiIdentityMatcher<
    EquipperDto | string
  > = (a, b) => {
    if (a === b) return true;
    if (
      typeof a === 'string' ||
      typeof b === 'string' ||
      a.id <= 0 ||
      b.id <= 0
    ) {
      return (
        this.equipperStringify(a).trim().toLowerCase() ===
        this.equipperStringify(b).trim().toLowerCase()
      );
    }
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
      const list = (data as EquipperDto[]) || [];
      for (const eq of list) {
        this.knownEquippers.set(eq.name.toLowerCase(), eq);
      }
      return list;
    },
  });

  onInputBlur(event: FocusEvent): void {
    const related = event.relatedTarget as Element | null;
    if (
      related &&
      (this.hostEl.nativeElement.contains(related) ||
        related.closest('tui-dropdown, [role="listbox"]'))
    ) {
      return;
    }

    const input = event.target as HTMLInputElement | null;
    const raw = input?.value.trim() ?? '';
    if (!raw || !input) return;

    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    this.searchQuery.set('');

    const tokens = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (tokens.length === 0) return;

    const current = this.equippers();
    const next = this.normalizeEquippers([...current, ...tokens]);
    if (!this.areSameEquippers(current, next)) {
      void this.onEquippersChange(next);
    }
  }

  async onEquippersChange(
    newEquippers: readonly (EquipperDto | string)[],
  ): Promise<void> {
    const normalized = this.normalizeEquippers(newEquippers);
    this.equippers.set(normalized);
    this.equippersChange.emit(normalized);

    if (!this.autoSave()) return;

    const r = this.route();
    if (!r) return;
    try {
      const saved = await this.routes.setRouteEquippers(r.id, normalized);
      this.equippers.set(saved);
      this.equippersChanged.emit(saved);
    } catch (e) {
      console.error('[RouteEquippersInput] error', e);
      this.toast.error('errors.unexpected');
    }
  }

  private normalizeEquippers(
    items: readonly (EquipperDto | string)[],
  ): (EquipperDto | string)[] {
    const result: (EquipperDto | string)[] = [];
    const seenIds = new Set<number>();
    const seenNames = new Set<string>();

    for (const item of items) {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (!trimmed) continue;
        const lower = trimmed.toLowerCase();
        const known = this.knownEquippers.get(lower);
        if (known) {
          if (seenIds.has(known.id) || seenNames.has(lower)) continue;
          seenIds.add(known.id);
          seenNames.add(lower);
          result.push(known);
        } else {
          if (seenNames.has(lower)) continue;
          seenNames.add(lower);
          result.push(trimmed);
        }
      } else {
        const lower = item.name.trim().toLowerCase();
        if ((item.id > 0 && seenIds.has(item.id)) || seenNames.has(lower)) {
          continue;
        }
        if (item.id > 0) seenIds.add(item.id);
        seenNames.add(lower);
        result.push(item);
      }
    }

    return result;
  }

  private areSameEquippers(
    a: readonly (EquipperDto | string)[],
    b: readonly (EquipperDto | string)[],
  ): boolean {
    if (a.length !== b.length) return false;
    return a.every((item, i) => this.equipperIdentityMatcher(item, b[i]));
  }
}
