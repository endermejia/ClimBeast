import { Component, computed, inject, signal } from '@angular/core';

import { type TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import { AreasService } from '../../services/areas.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';

import {
  EntityUnifyFormComponent,
  type EntityUnifyPayload,
  type UnifyEntityItem,
} from '../../components/forms/entity-unify-form';

import { AreaDto, AreaListItem } from '../../models';

@Component({
  selector: 'app-area-unify',
  imports: [EntityUnifyFormComponent],
  template: `
    <app-entity-unify-form
      [items]="availableAreas()"
      [initialTarget]="initialTarget"
      [initialSources]="initialSources"
      [loading]="loading()"
      descriptionKey="areas.unifyDescription"
      targetLabelKey="areas.targetArea"
      sourcesLabelKey="areas.sourceAreas"
      newNameLabelKey="areas.newName"
      targetInputId="target-area"
      sourcesInputId="source-areas"
      (unify)="onUnify($event)"
      (cancelled)="context.completeWith(false)"
    />
  `,
  host: { class: 'block w-full' },
})
export class AreaUnifyComponent {
  protected readonly outdoorData = inject(OutdoorDataService);
  protected readonly context =
    injectContext<
      TuiDialogContext<boolean, AreaDto[] | AreaListItem[] | undefined>
    >();
  private readonly areasService = inject(AreasService);

  protected readonly loading = signal(false);

  protected readonly initialTarget: UnifyEntityItem | null;
  protected readonly initialSources: UnifyEntityItem[];

  constructor() {
    const initialAreas = this.context.data;
    this.initialTarget = initialAreas?.[0] ?? null;
    this.initialSources =
      initialAreas && initialAreas.length > 1 ? initialAreas.slice(1) : [];
  }

  protected readonly availableAreas = computed<UnifyEntityItem[]>(() => {
    const candidates = this.context.data;
    const globalList = this.outdoorData.areasList();
    const map = new Map<number, UnifyEntityItem>();
    // Prioritize candidates
    if (candidates && candidates.length > 0) {
      candidates.forEach((c) => map.set(c.id, c));
    }
    // Add global items if not present
    globalList.forEach((c: AreaListItem) => {
      if (!map.has(c.id)) map.set(c.id, c);
    });
    return Array.from(map.values());
  });

  protected async onUnify(payload: EntityUnifyPayload): Promise<void> {
    this.loading.set(true);
    const success = await this.areasService.unify(
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
