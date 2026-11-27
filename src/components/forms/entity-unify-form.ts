import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required } from '@angular/forms/signals';

import {
  TuiButton,
  TuiDataList,
  TuiError,
  TuiFilterByInputPipe,
  TuiInput,
  TuiLabel,
  TuiOptGroup,
  TuiScrollbar,
} from '@taiga-ui/core';
import {
  TuiChevron,
  TuiComboBox,
  TuiInputChip,
  TuiMultiSelect,
} from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

export interface UnifyEntityItem {
  id: number;
  name: string;
}

export interface EntityUnifyPayload {
  targetId: number;
  sourceIds: number[];
  newName: string;
}

export interface EntityUnifySelection {
  target: UnifyEntityItem | null;
  sources: UnifyEntityItem[];
}

@Component({
  selector: 'app-entity-unify-form',
  imports: [
    FormField,
    FormsModule,
    TranslatePipe,
    TuiButton,
    TuiChevron,
    TuiComboBox,
    TuiDataList,
    TuiError,
    TuiFilterByInputPipe,
    TuiInput,
    TuiInputChip,
    TuiLabel,
    TuiMultiSelect,
    TuiOptGroup,
    TuiScrollbar,
  ],
  template: `
    <div class="lw-form-sheet">
      <tui-scrollbar class="lw-form-sheet-body">
        <div class="flex flex-col gap-4">
          <p class="text-sm opacity-70">
            {{ descriptionKey() | translate }}
          </p>

          <tui-textfield tuiChevron class="block" [stringify]="stringify">
            <label tuiLabel [for]="targetInputId()">{{
              targetLabelKey() | translate
            }}</label>
            <input
              tuiComboBox
              [id]="targetInputId()"
              autocomplete="off"
              [ngModel]="model().target"
              (ngModelChange)="onTargetChange($event)"
              name="targetEntity"
              [placeholder]="'select' | translate"
            />
            <tui-data-list *tuiDropdown>
              @for (item of items() | tuiFilterByInput; track item.id) {
                <button tuiOption new [value]="item">
                  {{ item.name }}
                </button>
              }
            </tui-data-list>
          </tui-textfield>
          @if (showTargetError()) {
            <tui-error [error]="'errors.required' | translate" />
          }

          <tui-textfield
            tuiChevron
            multi
            class="block"
            [stringify]="stringify"
            [disabledItemHandler]="isInvalidItem"
          >
            <label tuiLabel [for]="sourcesInputId()">{{
              sourcesLabelKey() | translate
            }}</label>
            <input
              tuiInputChip
              [id]="sourcesInputId()"
              autocomplete="off"
              [ngModel]="model().sources"
              (ngModelChange)="onSourcesChange($event)"
              name="sourceEntities"
              [placeholder]="'select' | translate"
            />
            <tui-input-chip *tuiItem />
            <tui-data-list *tuiDropdown>
              <tui-opt-group tuiMultiSelectGroup>
                @for (
                  item of availableSources() | tuiFilterByInput;
                  track item.id
                ) {
                  <button tuiOption new [value]="item">
                    {{ item.name }}
                  </button>
                }
              </tui-opt-group>
            </tui-data-list>
          </tui-textfield>
          @if (showSourcesError()) {
            <tui-error [error]="'errors.required' | translate" />
          }

          <tui-textfield class="block">
            <label tuiLabel for="new-name">{{
              newNameLabelKey() | translate
            }}</label>
            <input
              tuiInput
              id="new-name"
              autocomplete="off"
              [formField]="unifyForm.newName"
              type="text"
              [placeholder]="newNamePlaceholder()"
            />
          </tui-textfield>

          <ng-content />
        </div>
      </tui-scrollbar>

      <div class="lw-form-sheet-footer">
        <button
          tuiButton
          size="m"
          appearance="flat"
          type="button"
          (click)="cancelled.emit()"
        >
          {{ 'cancel' | translate }}
        </button>
        <button
          tuiButton
          size="m"
          appearance="primary"
          type="button"
          [disabled]="isUnifyDisabled()"
          (click)="onSubmit()"
        >
          {{ 'unify' | translate }}
        </button>
      </div>
    </div>
  `,
  host: { class: 'block w-full' },
})
export class EntityUnifyFormComponent {
  readonly items = input.required<readonly UnifyEntityItem[]>();
  readonly initialTarget = input<UnifyEntityItem | null>(null);
  readonly initialSources = input<readonly UnifyEntityItem[]>([]);
  readonly loading = input<boolean>(false);
  readonly descriptionKey = input.required<string>();
  readonly targetLabelKey = input.required<string>();
  readonly sourcesLabelKey = input.required<string>();
  readonly newNameLabelKey = input.required<string>();
  readonly targetInputId = input<string>('target-entity');
  readonly sourcesInputId = input<string>('source-entities');

  readonly unify = output<EntityUnifyPayload>();
  readonly cancelled = output<void>();
  readonly selectionChange = output<EntityUnifySelection>();

  readonly model = signal<{
    target: UnifyEntityItem | null;
    sources: UnifyEntityItem[];
    newName: string;
  }>({
    target: null,
    sources: [],
    newName: '',
  });

  readonly unifyForm = form(this.model, (schemaPath) => {
    required(schemaPath.target);
    required(schemaPath.sources);
  });

  readonly availableSources = computed(() => {
    const targetId = this.model().target?.id;
    return this.items().filter((item) => item.id !== targetId);
  });

  protected readonly showTargetError = computed(
    () =>
      this.unifyForm.target().invalid() && this.unifyForm.target().touched(),
  );

  protected readonly showSourcesError = computed(
    () =>
      this.unifyForm.sources().invalid() && this.unifyForm.sources().touched(),
  );

  protected readonly newNamePlaceholder = computed(
    () => this.model().target?.name ?? '',
  );

  protected readonly isUnifyDisabled = computed(
    () =>
      this.unifyForm.target().invalid() ||
      this.model().sources.length === 0 ||
      this.loading(),
  );

  protected readonly isInvalidItem = (item: UnifyEntityItem): boolean =>
    !this.items().some((a) => a.id === item.id);

  protected readonly stringify = (item: UnifyEntityItem): string => item.name;

  constructor() {
    effect(() => {
      const target = this.initialTarget();
      const sources = [...this.initialSources()];
      this.model.update((m) => ({
        ...m,
        target,
        sources,
      }));
    });
  }

  onTargetChange(target: UnifyEntityItem | null): void {
    const nextSources =
      target == null
        ? this.model().sources
        : this.model().sources.filter((s) => s.id !== target.id);
    this.model.update((m) => ({
      ...m,
      target,
      sources: nextSources,
    }));
    this.selectionChange.emit({ target, sources: nextSources });
  }

  onSourcesChange(sources: UnifyEntityItem[]): void {
    this.model.update((m) => ({ ...m, sources }));
    this.selectionChange.emit({ target: this.model().target, sources });
  }

  protected onSubmit(): void {
    const { target, sources, newName } = this.model();
    if (!target || sources.length === 0 || this.loading()) return;

    this.unify.emit({
      targetId: target.id,
      sourceIds: sources.map((s) => s.id),
      newName: newName || target.name,
    });
  }
}
