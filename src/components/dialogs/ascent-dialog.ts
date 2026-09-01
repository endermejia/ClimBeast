import { Component, computed, effect, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { TuiDialogContext, TuiScrollbar } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import { AscentsService } from '../../services/ascents.service';

import { AscentCardComponent } from '../ascent/ascent-card';
import { AscentCardSkeletonComponent } from '../ascent/ascent-card-skeleton';
import { EmptyStateComponent } from '../ui/empty-state';

export interface AscentDialogData {
  ascentId: number | string;
}

@Component({
  selector: 'app-ascent-dialog',
  standalone: true,
  imports: [
    AscentCardComponent,
    AscentCardSkeletonComponent,
    EmptyStateComponent,
    TuiScrollbar,
  ],
  template: `
    <div class="flex flex-col max-h-[80dvh] -m-4">
      <tui-scrollbar class="grow min-h-0 overflow-x-hidden!">
        <div class="p-4">
          @if (ascent(); as data) {
            <app-ascent-card [data]="data" />
          } @else if (loading()) {
            <app-ascent-card-skeleton />
          } @else {
            <div class="py-20">
              <app-empty-state />
            </div>
          }
        </div>
      </tui-scrollbar>
    </div>
  `,
})
export class AscentDialogComponent {
  private readonly ascentsService = inject(AscentsService);
  protected readonly context =
    injectContext<TuiDialogContext<void, AscentDialogData>>();

  private readonly ascentId = this.context.data?.ascentId ?? 0;
  private readonly deletedAscentId = toSignal(
    this.ascentsService.ascentDeleted,
  );
  private readonly updatedAscent = toSignal(this.ascentsService.ascentUpdated);

  protected readonly ascentResource = resource({
    params: () => {
      const id = this.ascentId;
      return id ? id : null;
    },
    loader: ({ params: id }) => {
      if (!id) return Promise.resolve(null);
      return this.ascentsService.getAscentById(id);
    },
  });

  protected readonly ascent = computed(() => this.ascentResource.value());
  protected readonly loading = computed(() => this.ascentResource.isLoading());

  constructor() {
    effect(() => {
      const deletedId = this.deletedAscentId();
      if (
        deletedId !== undefined &&
        String(deletedId) === String(this.ascentId)
      ) {
        this.context.completeWith();
      }
    });

    effect(() => {
      const updated = this.updatedAscent();
      if (updated && String(updated.id) === String(this.ascentId)) {
        this.ascentResource.reload();
      }
    });
  }
}
