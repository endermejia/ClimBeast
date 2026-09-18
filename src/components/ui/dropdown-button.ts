import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  TemplateRef,
} from '@angular/core';

import { TuiDropdown, TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'app-dropdown-button',
  imports: [TuiDropdown, TuiIcon],
  template: `
    @if (count() > 1) {
      <button
        type="button"
        class="inline-flex items-center gap-1 font-bold cursor-pointer hover:opacity-80 transition-opacity"
        [class.text-xl]="size() === 'xl'"
        [class.text-2xl]="size() === '2xl'"
        [tuiDropdown]="content()"
        [(tuiDropdownOpen)]="open"
      >
        {{ label() }}
        <tui-icon icon="@tui.chevron-down" [class.rotate-180]="open()" />
      </button>
    } @else {
      <span
        class="font-bold"
        [class.text-xl]="size() === 'xl'"
        [class.text-2xl]="size() === '2xl'"
      >
        {{ label() }}
      </span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownButtonComponent {
  label = input.required<string>();
  content = input.required<TemplateRef<Record<string, unknown>> | null>();
  count = input(1);
  size = input<'xl' | '2xl'>('xl');

  open = model(false);
}
