import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  TemplateRef,
  ViewChild,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParkingButtonComponent {
  private readonly dialogs = inject(TuiDialogService);

  crag = input<CragDetail | null>(null);
  parkings = input<ParkingDto[] | null>(null);

  @ViewChild('dialogTpl') private readonly dialogTpl!: TemplateRef<unknown>;

  protected readonly totalCapacity = computed(() => {
    const parkings = this.parkings() ?? this.crag()?.parkings ?? [];
    return parkings.reduce((sum, p) => sum + (p.size ?? 0), 0);
  });

  protected openDialog(): void {
    void firstValueFrom(this.dialogs.open(this.dialogTpl, { size: 'l' }), {
      defaultValue: undefined,
    });
  }
}
