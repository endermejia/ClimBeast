import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiButton, TuiLoader } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

export interface SuggestedDuplicateItem {
  id: string | number;
  label: string;
  link?: (string | number)[] | null;
}

@Component({
  selector: 'app-suggested-duplicate-card',
  imports: [RouterLink, TranslatePipe, TuiButton],
  template: `
    <div
      class="border border-(--tui-border-normal) p-4 rounded-xl flex items-center justify-between gap-4"
    >
      <div class="flex-1 min-w-0">
        @if (eyebrow(); as eyebrowText) {
          <div class="text-xs opacity-50 mb-1">
            {{ eyebrowText }}
          </div>
        }
        @if (title(); as titleText) {
          <div class="font-bold">
            {{ titleText }}
            @if (subtitle(); as subtitleText) {
              <span class="font-normal opacity-70 text-sm">
                ({{ subtitleText }})
              </span>
            }
          </div>
        }
        @if (items().length > 0) {
          <div class="flex flex-col gap-1" [class.mt-1]="hasTitle()">
            @for (item of items(); track item.id) {
              <div class="text-sm" [class.opacity-70]="mutedItems()">
                @if (item.link; as link) {
                  <a
                    [routerLink]="link"
                    target="_blank"
                    class="underline underline-offset-2"
                    [class.font-medium]="!mutedItems()"
                    [class.hover:opacity-70]="!mutedItems()"
                    [class.hover:opacity-100]="mutedItems()"
                    >{{ item.label }}</a
                  >
                } @else if (!mutedItems()) {
                  <span class="font-medium">{{ item.label }}</span>
                } @else {
                  {{ item.label }}
                }
              </div>
            }
          </div>
        } @else {
          <ng-content />
        }
      </div>
      <button
        tuiButton
        size="m"
        appearance="primary"
        type="button"
        (click)="unify.emit()"
      >
        {{ 'unify' | translate }}
      </button>
    </div>
  `,
})
export class SuggestedDuplicateCardComponent {
  readonly eyebrow = input<string | null>(null);
  readonly title = input<string | null>(null);
  readonly subtitle = input<string | null>(null);
  readonly items = input<readonly SuggestedDuplicateItem[]>([]);
  readonly mutedItems = input<boolean>(false);

  readonly unify = output<void>();

  protected readonly hasTitle = computed(() => !!this.title());
}

@Component({
  selector: 'app-suggested-duplicates-section',
  imports: [TranslatePipe, TuiLoader],
  template: `
    <div class="flex flex-col gap-4">
      <h3 class="font-bold text-lg">
        {{ titleKey() | translate }}
      </h3>

      @if (loading()) {
        <div class="flex justify-center" [class]="loaderContainerClass()">
          <tui-loader [size]="loaderSize()" class="m-auto" />
        </div>
      } @else if (empty()) {
        <p class="opacity-70">{{ emptyKey() | translate }}</p>
      } @else {
        <ng-content />
      }
    </div>
  `,
})
export class SuggestedDuplicatesSectionComponent {
  readonly titleKey = input.required<string>();
  readonly loading = input<boolean>(false);
  readonly empty = input<boolean>(false);
  readonly emptyKey = input<string>('admin.noDuplicatesFound');
  readonly loaderSize = input<'m' | 'l' | 'xl'>('m');

  protected readonly loaderContainerClass = computed(() =>
    this.loaderSize() === 'xl' ? 'p-8' : 'p-4',
  );
}
