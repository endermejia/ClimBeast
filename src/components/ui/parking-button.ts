import {
  Component,
  computed,
  inject,
  input,
  TemplateRef,
  viewChild,
} from '@angular/core';

import { TuiButton, TuiDialogService } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { CragParkingsComponent } from '../../components/crag/crag-parkings';

import { CragDetail, ParkingDto } from '../../models';

@Component({
  selector: 'app-parking-button',
  imports: [CragParkingsComponent, TuiButton, TranslatePipe],
  template: `
    @if (totalCapacity() > 0) {
      <button
        appearance="flat-grayscale"
        size="m"
        tuiButton
        type="button"
        iconStart="@tui.square-parking"
        (click.zoneless)="openDialog()"
        [attr.aria-label]="'parkings' | translate"
      >
        {{ totalCapacity() }} {{ 'capacityShort' | translate }}
      </button>
    }
    <ng-template #dialogTpl>
      <app-crag-parkings [crag]="crag()" [parkings]="parkings()" />
    </ng-template>
  `,
})
export class ParkingButtonComponent {
  private readonly dialogs = inject(TuiDialogService);

  crag = input<CragDetail | null>(null);
  parkings = input<ParkingDto[] | null>(null);

  private readonly dialogTpl = viewChild<TemplateRef<unknown>>('dialogTpl');

  protected readonly totalCapacity = computed(() => {
    const parkings = this.parkings() ?? this.crag()?.parkings ?? [];
    return parkings.reduce((sum, p) => sum + (p.size ?? 0), 0);
  });

  protected openDialog(): void {
    const tpl = this.dialogTpl();
    if (!tpl) return;
    void firstValueFrom(this.dialogs.open(tpl, { size: 'l' }), {
      defaultValue: undefined,
    });
  }
}
