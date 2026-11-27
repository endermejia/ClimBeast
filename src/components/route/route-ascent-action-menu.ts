import { Component, computed, input, model, output } from '@angular/core';

import { TuiButton, TuiDataList, TuiDropdown, TuiIcon } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-route-ascent-action-menu',
  imports: [TranslatePipe, TuiButton, TuiDataList, TuiDropdown, TuiIcon],
  template: `
    <button
      tuiIconButton
      type="button"
      [size]="size()"
      [appearance]="buttonAppearance()"
      [iconStart]="buttonIcon()"
      [style.background]="
        isAttemptProject() ? 'var(--tui-status-neutral)' : null
      "
      [class.text-(--tui-text-primary-on-accent-1)!]="isAttemptProject()"
      [class.transition-transform]="isAttemptProject()"
      [class.active:scale-95]="isAttemptProject()"
      class="rounded-full!"
      [tuiDropdown]="actionMenu"
      tuiDropdownAlign="end"
      [tuiDropdownMinHeight]="140"
      [tuiDropdownOpen]="open()"
      (tuiDropdownOpenChange)="open.set($event)"
      (click.zoneless)="$event.stopPropagation()"
    >
      {{ buttonLabelKey() | translate }}
    </button>

    <ng-template #actionMenu>
      <tui-data-list size="m">
        @if (hasOwnAscent()) {
          <button tuiOption class="whitespace-nowrap" (click)="onViewAscent()">
            <tui-icon icon="@tui.eye" class="mr-2" />
            {{ 'ascent.view' | translate }}
          </button>
        }
        <button
          tuiOption
          appearance="positive"
          class="whitespace-nowrap"
          (click)="onLogAscent()"
        >
          <tui-icon icon="@tui.square-check" class="mr-2" />
          {{ 'ascent.new' | translate }}
        </button>
        @if (canToggleProject()) {
          @if (isProject()) {
            <button
              tuiOption
              appearance="negative"
              class="whitespace-nowrap"
              (click)="onToggleProject()"
            >
              <tui-icon icon="@tui.bookmark" class="mr-2" />
              {{ 'project.remove' | translate }}
            </button>
          } @else {
            <button
              tuiOption
              appearance="info"
              class="whitespace-nowrap"
              (click)="onToggleProject()"
            >
              <tui-icon icon="@tui.bookmark" class="mr-2" />
              {{ 'project.add' | translate }}
            </button>
          }
        }
      </tui-data-list>
    </ng-template>
  `,
})
export class RouteAscentActionMenuComponent {
  size = input<'s' | 'm'>('m');
  isAttemptProject = input(false);
  isProject = input(false);
  hasOwnAscent = input(false);
  canToggleProject = input(true);
  open = model(false);

  viewAscent = output<void>();
  logAscent = output<void>();
  toggleProject = output<void>();

  protected readonly buttonAppearance = computed(() =>
    this.isAttemptProject() ? 'none' : this.isProject() ? 'info' : 'neutral',
  );

  protected readonly buttonIcon = computed(() =>
    this.isAttemptProject()
      ? '@tui.circle-dashed'
      : this.isProject()
        ? '@tui.bookmark'
        : '@tui.circle-plus',
  );

  protected readonly buttonLabelKey = computed(() =>
    this.isAttemptProject()
      ? 'ascentTypes.attempt'
      : this.isProject()
        ? 'project'
        : 'ascent.new',
  );

  protected onViewAscent(): void {
    this.viewAscent.emit();
    this.open.set(false);
  }

  protected onLogAscent(): void {
    this.logAscent.emit();
    this.open.set(false);
  }

  protected onToggleProject(): void {
    this.toggleProject.emit();
    this.open.set(false);
  }
}
