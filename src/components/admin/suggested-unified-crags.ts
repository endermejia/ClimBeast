import { Component, computed, inject, resource } from '@angular/core';

import { CragSimple, CragsService } from '../../services/crags.service';

import {
  SuggestedDuplicateCardComponent,
  type SuggestedDuplicateItem,
  SuggestedDuplicatesSectionComponent,
} from '../../components/admin/suggested-duplicate-card';

import { CragDto } from '../../models';

import { normalizeNameStrict } from '../../utils';

interface CragDuplicateGroup {
  items: CragSimple[];
  title: string;
  areaName: string;
  cardItems: SuggestedDuplicateItem[];
}

@Component({
  selector: 'app-suggested-unified-crags',
  imports: [
    SuggestedDuplicateCardComponent,
    SuggestedDuplicatesSectionComponent,
  ],
  template: `
    <app-suggested-duplicates-section
      titleKey="crags.suggestedDuplicates"
      [loading]="cragsResource.isLoading()"
      [empty]="duplicates().length === 0"
    >
      <div class="grid gap-2">
        @for (group of duplicates(); track $index) {
          <app-suggested-duplicate-card
            [title]="group.title"
            [subtitle]="group.areaName"
            [items]="group.cardItems"
            [mutedItems]="true"
            (unify)="onUnify(group.items)"
          />
        }
      </div>
    </app-suggested-duplicates-section>
  `,
})
export class SuggestedUnifiedCragsComponent {
  private readonly cragsService = inject(CragsService);

  protected readonly cragsResource = resource({
    loader: () => this.cragsService.getAllCragsSimple(),
  });

  protected readonly duplicates = computed<CragDuplicateGroup[]>(() => {
    const crags = this.cragsResource.value() ?? [];
    const groups = new Map<string, CragSimple[]>();

    for (const crag of crags) {
      // Key includes area_id to avoid cross-area merging
      const key = `${crag.area_id}-${normalizeNameStrict(crag.name)}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(crag);
    }

    return Array.from(groups.values())
      .filter((g) => g.length > 1)
      .map((group) => ({
        items: group,
        title: group[0].name,
        areaName: group[0]?.area?.name || '',
        cardItems: group.map((crag) => ({
          id: crag.id,
          label: crag.name,
          link:
            crag.area?.slug && crag.slug
              ? ['/area', crag.area.slug, crag.slug]
              : null,
        })),
      }));
  });

  protected async onUnify(group: CragSimple[]): Promise<void> {
    // Cast to CragDto[] for the service call
    const success = await this.cragsService.openUnifyCrags(
      group as unknown as CragDto[],
    );
    if (success) {
      this.cragsResource.reload();
    }
  }
}
