import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  TuiButton,
  TuiDialogService,
  TuiIcon,
  TuiScrollbar,
  TuiTitle,
} from '@taiga-ui/core';
import { TUI_CONFIRM, type TuiConfirmData, TuiSkeleton } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

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
    TuiHeader,
    TuiIcon,
    TuiScrollbar,
    TuiSkeleton,
    TuiTitle,
  ],
  template: `
    <tui-scrollbar class="h-full">
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 flex flex-col gap-8"
      >
        <!-- Header -->
        <header tuiHeader class="flex items-center justify-between">
          <h1
            tuiTitle
            size="xl"
            class="font-black tracking-tight flex items-center gap-2 m-0"
          >
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
                (edit)="openEditItem($event)"
                (delete)="deleteItem($event)"
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMaterialCatalogComponent {
  private readonly catalogService = inject(MaterialCatalogService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  readonly catalogResource = resource<MaterialCatalogItem[], void>({
    loader: () => this.catalogService.loadCatalog(true),
  });

  readonly allItems = computed(() => this.catalogResource.value() ?? []);

  openItemDetail(item: MaterialCatalogItem): void {
    this.catalogService.openMaterialItem(item);
  }

  async openCreateItem(): Promise<void> {
    const success = await this.catalogService.openMaterialCatalogItemForm();
    if (success) {
      void this.catalogResource.reload();
    }
  }

  async openEditItem(item: MaterialCatalogItem): Promise<void> {
    const success = await this.catalogService.openMaterialCatalogItemForm(item);
    if (success) {
      void this.catalogResource.reload();
    }
  }

  async deleteItem(item: MaterialCatalogItem): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('admin.materialCatalog.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant(
            'admin.materialCatalog.deleteConfirm',
            {
              name: item.name,
            },
          ),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'negative',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    );

    if (confirmed) {
      const ok = await this.catalogService.deleteMaterialItem(item.id);
      if (ok) {
        void this.catalogResource.reload();
      }
    }
  }
}
