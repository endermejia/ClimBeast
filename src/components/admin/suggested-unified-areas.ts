import { Component, computed, inject, resource } from '@angular/core';

import { AreasService } from '../../services/areas.service';

import {
  SuggestedDuplicateCardComponent,
  type SuggestedDuplicateItem,
  SuggestedDuplicatesSectionComponent,
} from '../../components/admin/suggested-duplicate-card';

import { AreaDto } from '../../models';

import { normalizeName } from '../../utils';

interface AreaDuplicateGroup {
  areas: AreaDto[];
  cardItems: SuggestedDuplicateItem[];
}

@Component({
  selector: 'app-suggested-unified-areas',
  imports: [
    SuggestedDuplicateCardComponent,
    SuggestedDuplicatesSectionComponent,
  ],
  template: `
    <app-suggested-duplicates-section
      titleKey="areas.suggestedDuplicates"
      [loading]="areasResource.isLoading()"
      [empty]="duplicates().length === 0"
    >
      <div class="grid gap-2">
        @for (group of duplicates(); track $index) {
          <app-suggested-duplicate-card
            [items]="group.cardItems"
            (unify)="onUnify(group.areas)"
          />
        }
      </div>
    </app-suggested-duplicates-section>
  `,
})
export class SuggestedUnifiedAreasComponent {
  private readonly areasService = inject(AreasService);

  protected readonly areasResource = resource({
    loader: () => this.areasService.getAllAreasSimple(),
  });

  protected readonly duplicates = computed<AreaDuplicateGroup[]>(() => {
    const areas = this.areasResource.value() ?? [];
    const groups = new Map<string, AreaDto[]>();

    for (const area of areas) {
      const key = normalizeName(area.name);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(area as AreaDto);
    }

    return Array.from(groups.values())
      .filter((g) => g.length > 1)
      .map((group) => ({
        areas: group,
        cardItems: group.map((area) => ({
          id: area.id,
          label: area.name,
          link: area.slug ? ['/area', area.slug] : null,
        })),
      }));
  });

  protected async onUnify(group: AreaDto[]): Promise<void> {
    const success = await this.areasService.openUnifyAreas(group);
    if (success) {
      this.areasResource.reload();
    }
  }
}
