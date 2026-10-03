import { CommonModule } from '@angular/common';
import { Component, computed, inject, resource } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TuiButton, TuiIcon, TuiScrollbar } from '@taiga-ui/core';
import { TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { MaterialCatalogService } from '../../services/material-catalog.service';

import { MaterialCatalogCardComponent } from '../../components/material/material-catalog-card';
import { EmptyStateComponent } from '../../components/ui/empty-state';

import type { MaterialCatalogItem } from '../../models';

@Component({
  selector: 'app-admin-material-catalog',
  standalone: true,
  imports: [
    CommonModule,
    EmptyStateComponent,
    FormsModule,
    MaterialCatalogCardComponent,
    RouterLink,
    TranslatePipe,
    TuiButton,
    TuiIcon,
    TuiScrollbar,
    TuiSkeleton,
  ],
  template: `
    <tui-scrollbar class="h-full">
      <div class="p-4 pb-24 flex flex-col max-w-7xl mx-auto w-full">
        <!-- Header -->
        <header class="mb-4 flex items-center justify-between gap-2">
          <h1 class="text-2xl font-bold flex items-center gap-2 m-0">
            <a
              routerLink="/admin"
              class="no-underline text-inherit flex items-center gap-2"
            >
              <tui-icon icon="@tui.arrow-left" />
              <div
                class="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"
              >
                <tui-icon icon="@tui.hammer" />
              </div>
              {{ 'admin.materialCatalog.title' | translate }}
            </a>
          </h1>

          <button
            tuiIconButton
            appearance="accent"
            size="s"
            type="button"
            class="rounded-xl! bg-(--tui-background-accent-1)! text-(--tui-background-base)!"
            (click)="openCreateItem()"
            [attr.aria-label]="'admin.materialCatalog.newItem' | translate"
          >
            <tui-icon icon="@tui.plus" />
          </button>
        </header>

        <p class="mb-6 text-tui-text-secondary opacity-60">
          {{ 'admin.materialCatalog.description' | translate }}
        </p>

        <!-- Items Grid -->
        <div
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          @if (catalogResource.isLoading()) {
            @for (_ of [1, 2, 3, 4, 5, 6, 7, 8]; track $index) {
              <div
                [tuiSkeleton]="true"
                class="aspect-[3/4] rounded-[2.5rem]"
              ></div>
            }
          } @else {
            @for (item of allItems(); track item.id) {
              <app-material-catalog-card
                [item]="item"
                (clicked)="openItemDetail($event)"
              />
            } @empty {
              <app-empty-state
                icon="@tui.package-open"
                message="admin.materialCatalog.empty"
                class="col-span-full"
              />
            }
          }
        </div>
      </div>
    </tui-scrollbar>
  `,
})
export class AdminMaterialCatalogComponent {
  private readonly catalogService = inject(MaterialCatalogService);

  readonly catalogResource = resource<MaterialCatalogItem[], void>({
    loader: () => this.catalogService.loadCatalog(true),
  });

  readonly allItems = computed(() => this.catalogResource.value() ?? []);

  async openItemDetail(item: MaterialCatalogItem): Promise<void> {
    const changed = await this.catalogService.openMaterialItem(item);
    if (changed) {
      void this.catalogResource.reload();
    }
  }

  async openCreateItem(): Promise<void> {
    const success = await this.catalogService.openMaterialCatalogItemForm();
    if (success) {
      void this.catalogResource.reload();
    }
  }
}
