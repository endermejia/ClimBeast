import { Component, computed, inject, signal } from '@angular/core';

import { type TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import { CragsService } from '../../services/crags.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';

import {
  EntityUnifyFormComponent,
  type EntityUnifyPayload,
  type UnifyEntityItem,
} from '../../components/forms/entity-unify-form';

import { CragDto } from '../../models';

@Component({
  selector: 'app-crag-unify',
  imports: [EntityUnifyFormComponent],
  template: `
    <app-entity-unify-form
      [items]="availableCrags()"
      [initialTarget]="initialTarget"
      [initialSources]="initialSources"
      [loading]="loading()"
      descriptionKey="crags.unifyDescription"
      targetLabelKey="crags.targetCrag"
      sourcesLabelKey="crags.sourceCrags"
      newNameLabelKey="crags.newName"
      targetInputId="target-crag"
      sourcesInputId="source-crags"
      (unify)="onUnify($event)"
      (cancelled)="context.completeWith(false)"
    />
  `,
  host: { class: 'block w-full' },
})
export class CragUnifyComponent {
  protected readonly outdoorData = inject(OutdoorDataService);
  protected readonly context =
    injectContext<TuiDialogContext<boolean, { candidates?: CragDto[] }>>();
  private readonly cragsService = inject(CragsService);

  protected readonly loading = signal(false);

  protected readonly initialTarget: UnifyEntityItem | null;
  protected readonly initialSources: UnifyEntityItem[];

  constructor() {
    const candidates = this.context.data?.candidates;
    this.initialTarget = candidates?.[0] ?? null;
    this.initialSources =
      candidates && candidates.length > 1 ? candidates.slice(1) : [];
  }

  protected readonly availableCrags = computed<UnifyEntityItem[]>(() => {
    const candidates = this.context.data?.candidates ?? [];
    const globalList = this.outdoorData.cragsList();
    const map = new Map<number, UnifyEntityItem>();
    // Prioritize candidates
    candidates.forEach((c) => map.set(c.id, c));
    // Add global items if not present
    globalList.forEach((c) => {
      if (!map.has(c.id)) map.set(c.id, c);
    });
    return Array.from(map.values());
  });

  protected async onUnify(payload: EntityUnifyPayload): Promise<void> {
    this.loading.set(true);
    const success = await this.cragsService.unify(
      payload.targetId,
      payload.sourceIds,
      payload.newName,
    );
    this.loading.set(false);

    if (success) {
      this.context.completeWith(true);
    }
  }
}
