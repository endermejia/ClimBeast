import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  TuiButton,
  TuiCheckbox,
  TuiIcon,
  TuiNotification,
} from '@taiga-ui/core';
import { TuiAvatar, TuiSkeleton } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';

import { AscentsService } from '../../services/ascents.service';

import { EightAnuAscent, LABEL_TO_VERTICAL_LIFE } from '../../models';

import { GradeComponent } from '../ui/avatar-grade';

export type ResolvedAscentItem = EightAnuAscent & {
  _resolvedData: { slug: string; eightAnuSlugs: string[] } | undefined;
  _isNewArea: boolean;
  _isNewCrag: boolean;
};

@Component({
  selector: 'app-import-8a-step-confirm',
  imports: [
    DatePipe,
    FormsModule,
    GradeComponent,
    TranslatePipe,
    TuiAvatar,
    TuiButton,
    TuiCheckbox,
    TuiHeader,
    TuiIcon,
    TuiNotification,
    TuiSkeleton,
  ],
  template: `
    <div class="grid gap-4">
      <header tuiHeader class="flex flex-col gap-2">
        <span tuiSubtitle
          >{{
            'import8a.confirmSubtitle' | translate: { count: ascentsCount() }
          }}
        </span>
        @if (newAreasCount() > 0 || newCragsCount() > 0) {
          <div tuiNotification appearance="info" class="text-xs my-1">
            {{
              'import8a.newEntitiesNotice'
                | translate: { areas: newAreasCount(), crags: newCragsCount() }
            }}
          </div>
        }
        <div class="flex justify-between items-center w-full mt-2">
          <label
            class="text-xs opacity-60 flex items-center gap-1.5 select-none hover:opacity-100 transition-opacity cursor-pointer"
          >
            <input
              tuiCheckbox
              type="checkbox"
              [ngModel]="isAllSelected()"
              (ngModelChange)="toggleAll.emit($event)"
            />
            <span>{{ 'selectAll' | translate }}</span>
          </label>
          <span class="text-xs font-semibold opacity-70"
            >{{ selectedCount() }} / {{ ascentsWithResolved().length }}
            {{ 'selected' | translate }}</span
          >
        </div>
      </header>

      <div class="max-h-[35dvh] overflow-auto border rounded p-2">
        @for (
          ascent of ascentsWithResolved();
          track ascent.name + ascent.sector_name + ascent.date;
          let idx = $index
        ) {
          @defer (on viewport) {
            <div
              class="p-2 border-b last:border-0 flex justify-between items-center gap-4 transition-all duration-150"
              [class.opacity-40]="!selectedMap()[idx]"
            >
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    tuiCheckbox
                    type="checkbox"
                    [ngModel]="selectedMap()[idx]"
                    (ngModelChange)="
                      toggleSelect.emit({ index: idx, checked: $event })
                    "
                  />
                </label>
                <app-grade
                  [grade]="LABEL_TO_VERTICAL_LIFE[ascent.difficulty] ?? 0"
                  [kind]="ascent.climbing_kind"
                />
                <div>
                  <div class="font-semibold">
                    {{ ascent.name }}
                  </div>
                  <div
                    class="text-xs opacity-70 flex flex-wrap items-center gap-1 mt-0.5"
                  >
                    <span>{{ ascent.location_name }}</span>
                    <span>•</span>
                    <span>{{ ascent.sector_name }}</span>
                    <span>•</span>
                    <span>{{ ascent.date | date }}</span>
                    @if (ascent._isNewArea) {
                      <span
                        class="px-1.5 py-0.5 text-[10px] leading-none rounded font-medium bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                      >
                        {{ 'import8a.newArea' | translate }}
                      </span>
                    }
                    @if (ascent._isNewCrag) {
                      <span
                        class="px-1.5 py-0.5 text-[10px] leading-none rounded font-medium bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30"
                      >
                        {{ 'import8a.newCrag' | translate }}
                      </span>
                    }
                  </div>
                  @if (ascent._resolvedData; as data) {
                    <div class="text-[10px] opacity-50 flex gap-2">
                      <span>slug: {{ data.slug }}</span>
                      @for (slug8a of data.eightAnuSlugs; track slug8a) {
                        <span>8a: {{ slug8a }}</span>
                      }
                    </div>
                  }
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span
                  tuiAvatar
                  size="s"
                  class="text-(--tui-text-primary-on-accent-1)!"
                  [style.background]="
                    ascentsService.ascentInfo()[ascent.type || 'default']
                      .background
                  "
                >
                  <tui-icon
                    [icon]="
                      ascentsService.ascentInfo()[ascent.type || 'default'].icon
                    "
                  />
                </span>
              </div>
            </div>
          } @placeholder {
            <div
              class="p-2 border-b last:border-0 flex justify-between items-center gap-4"
            >
              <div class="flex items-center gap-3">
                <span tuiAvatar size="m" tuiSkeleton></span>
              </div>
              <div class="flex items-center gap-2">
                <span tuiAvatar size="s" tuiSkeleton></span>
              </div>
            </div>
          }
        }
      </div>

      <div class="mt-4 flex gap-2">
        <button
          tuiButton
          type="button"
          [disabled]="importing() || ascentsCount() === 0"
          (click)="import.emit()"
        >
          {{ 'import' | translate }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Import8aStepConfirmComponent {
  protected readonly ascentsService = inject(AscentsService);
  protected readonly LABEL_TO_VERTICAL_LIFE = LABEL_TO_VERTICAL_LIFE;

  readonly ascentsWithResolved =
    input.required<readonly ResolvedAscentItem[]>();
  readonly ascentsCount = input.required<number>();
  readonly selectedCount = input.required<number>();
  readonly isAllSelected = input.required<boolean>();
  readonly newAreasCount = input.required<number>();
  readonly newCragsCount = input.required<number>();
  readonly selectedMap = input.required<Record<number, boolean>>();
  readonly importing = input<boolean>(false);

  readonly toggleSelect = output<{ index: number; checked: boolean }>();
  readonly toggleAll = output<boolean>();
  readonly import = output<void>();
}
