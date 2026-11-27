import { Component, computed, input, output } from '@angular/core';

import { TuiIcon } from '@taiga-ui/core';
import { TuiSegmented } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { IndoorCenterPermissions } from '../../models';

export type IndoorPermissionChangeEvent = {
  [K in keyof IndoorCenterPermissions]: {
    key: K;
    value: IndoorCenterPermissions[K];
  };
}[keyof IndoorCenterPermissions];

export type IndoorPermissionRowConfig = {
  [K in keyof IndoorCenterPermissions]: {
    readonly key: K;
    readonly labelKey: string;
    readonly restrictedValue: Exclude<IndoorCenterPermissions[K], 'all'>;
    readonly restrictedLabelKey: string;
  };
}[keyof IndoorCenterPermissions];

export interface IndoorPermissionSectionConfig {
  readonly id: string;
  readonly icon: string;
  readonly titleKey: string;
  readonly rows: readonly IndoorPermissionRowConfig[];
}

export const INDOOR_PERMISSION_SECTIONS: readonly IndoorPermissionSectionConfig[] =
  [
    {
      id: 'routes',
      icon: '@tui.route',
      titleKey: 'indoor.permissions.routesSection',
      rows: [
        {
          key: 'can_create_routes',
          labelKey: 'indoor.permissions.canCreateRoutes',
          restrictedValue: 'routesetters',
          restrictedLabelKey: 'indoor.permissions.options.routesetters',
        },
        {
          key: 'can_edit_routes',
          labelKey: 'indoor.permissions.canEditRoutes',
          restrictedValue: 'routesetters_and_creator',
          restrictedLabelKey:
            'indoor.permissions.options.routesettersAndCreator',
        },
        {
          key: 'can_archive_routes',
          labelKey: 'indoor.permissions.canArchiveRoutes',
          restrictedValue: 'routesetters_and_creator',
          restrictedLabelKey:
            'indoor.permissions.options.routesettersAndCreator',
        },
      ],
    },
    {
      id: 'topos',
      icon: '@tui.image',
      titleKey: 'indoor.permissions.toposSection',
      rows: [
        {
          key: 'can_create_topos',
          labelKey: 'indoor.permissions.canCreateTopos',
          restrictedValue: 'routesetters',
          restrictedLabelKey: 'indoor.permissions.options.routesetters',
        },
        {
          key: 'can_edit_topos',
          labelKey: 'indoor.permissions.canEditTopos',
          restrictedValue: 'routesetters_and_creator',
          restrictedLabelKey:
            'indoor.permissions.options.routesettersAndCreator',
        },
        {
          key: 'can_archive_topos',
          labelKey: 'indoor.permissions.canArchiveTopos',
          restrictedValue: 'routesetters_and_creator',
          restrictedLabelKey:
            'indoor.permissions.options.routesettersAndCreator',
        },
      ],
    },
    {
      id: 'lines',
      icon: '@tui.spline',
      titleKey: 'indoor.permissions.linesSection',
      rows: [
        {
          key: 'can_create_lines',
          labelKey: 'indoor.permissions.canCreateLines',
          restrictedValue: 'routesetters',
          restrictedLabelKey: 'indoor.permissions.options.routesetters',
        },
        {
          key: 'can_edit_lines',
          labelKey: 'indoor.permissions.canEditLines',
          restrictedValue: 'routesetters_and_creator',
          restrictedLabelKey:
            'indoor.permissions.options.routesettersAndLineCreator',
        },
      ],
    },
  ];

@Component({
  selector: 'app-indoor-center-permissions-section',
  imports: [TranslatePipe, TuiIcon, TuiSegmented],
  template: `
    <div class="flex flex-col gap-6 w-full max-w-2xl">
      <p class="text-sm opacity-70 mb-2">
        {{ 'indoor.permissions.description' | translate }}
      </p>

      @for (section of renderedSections(); track section.id) {
        <div
          class="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal)"
        >
          <div class="flex items-center gap-2">
            <tui-icon [icon]="section.icon" class="text-xs" />
            <span
              class="text-xs uppercase font-semibold tracking-wider opacity-75"
            >
              {{ section.titleKey | translate }}
            </span>
          </div>

          @for (row of section.rows; track row.key; let last = $last) {
            <div
              [class]="
                !last
                  ? 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-(--tui-border-normal)/50'
                  : 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2'
              "
            >
              <span class="text-sm font-medium">
                {{ row.labelKey | translate }}
              </span>
              <tui-segmented
                size="s"
                class="shrink-0"
                [attr.data-permission-key]="row.key"
                [activeItemIndex]="row.activeIndex"
                (activeItemIndexChange)="onSegmentChange(row, $event)"
              >
                <button type="button">
                  {{ 'indoor.permissions.options.all' | translate }}
                </button>
                <button type="button">
                  {{ row.restrictedLabelKey | translate }}
                </button>
              </tui-segmented>
            </div>
          }
        </div>
      }
    </div>
  `,
  host: { class: 'block w-full' },
})
export class IndoorCenterPermissionsSectionComponent {
  readonly permissions = input.required<IndoorCenterPermissions>();
  readonly permissionChange = output<IndoorPermissionChangeEvent>();

  protected readonly renderedSections = computed(() => {
    const perms = this.permissions();
    return INDOOR_PERMISSION_SECTIONS.map((section) => ({
      ...section,
      rows: section.rows.map((row) => ({
        ...row,
        activeIndex: perms[row.key] === 'all' ? 0 : 1,
      })),
    }));
  });

  protected onSegmentChange(
    row: IndoorPermissionRowConfig,
    index: number,
  ): void {
    const event = (
      index === 0
        ? { key: row.key, value: 'all' }
        : { key: row.key, value: row.restrictedValue }
    ) as IndoorPermissionChangeEvent;
    this.permissionChange.emit(event);
  }
}
