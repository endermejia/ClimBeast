import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_INDOOR_CENTER_PERMISSIONS,
  IndoorCenterPermissions,
} from '../../models';

import {
  INDOOR_PERMISSION_SECTIONS,
  IndoorCenterPermissionsSectionComponent,
  type IndoorPermissionChangeEvent,
} from './indoor-center-permissions-section';

describe('IndoorCenterPermissionsSectionComponent', () => {
  let fixture: ComponentFixture<IndoorCenterPermissionsSectionComponent>;
  let component: IndoorCenterPermissionsSectionComponent;
  let componentRef: ComponentRef<IndoorCenterPermissionsSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        IndoorCenterPermissionsSectionComponent,
        TranslateModule.forRoot(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IndoorCenterPermissionsSectionComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('permissions', {
      ...DEFAULT_INDOOR_CENTER_PERMISSIONS,
    });
    fixture.detectChanges();
  });

  const getSegmentedForKey = (
    key: keyof IndoorCenterPermissions,
  ): HTMLElement => {
    const el = fixture.nativeElement.querySelector(
      `tui-segmented[data-permission-key="${key}"]`,
    ) as HTMLElement | null;
    if (!el) {
      throw new Error(`Missing tui-segmented for ${key}`);
    }
    return el;
  };

  it('renders all 3 sections and all 8 permission segmented controls', () => {
    const segmentedControls =
      fixture.nativeElement.querySelectorAll('tui-segmented');
    expect(INDOOR_PERMISSION_SECTIONS).toHaveLength(3);
    expect(segmentedControls).toHaveLength(8);
  });

  it('uses routesettersAndLineCreator label specifically for can_edit_lines', () => {
    const editLinesSegmented = getSegmentedForKey('can_edit_lines');
    const buttons = editLinesSegmented.querySelectorAll('button');
    expect(buttons[0].textContent?.trim()).toBe(
      'indoor.permissions.options.all',
    );
    expect(buttons[1].textContent?.trim()).toBe(
      'indoor.permissions.options.routesettersAndLineCreator',
    );

    const editRoutesSegmented = getSegmentedForKey('can_edit_routes');
    const routeButtons = editRoutesSegmented.querySelectorAll('button');
    expect(routeButtons[1].textContent?.trim()).toBe(
      'indoor.permissions.options.routesettersAndCreator',
    );
  });

  it('emits binary permission values for can_create_* keys', () => {
    const spy = vi.fn<(event: IndoorPermissionChangeEvent) => void>();
    component.permissionChange.subscribe(spy);

    const segmented = getSegmentedForKey('can_create_routes');
    const [allBtn, restrictedBtn] = Array.from(
      segmented.querySelectorAll('button'),
    ) as HTMLButtonElement[];

    allBtn.click();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith({
      key: 'can_create_routes',
      value: 'all',
    });

    restrictedBtn.click();
    fixture.detectChanges();
    expect(spy).toHaveBeenLastCalledWith({
      key: 'can_create_routes',
      value: 'routesetters',
    });
  });

  it('emits routesetters_and_creator for edit and archive keys', () => {
    const spy = vi.fn<(event: IndoorPermissionChangeEvent) => void>();
    component.permissionChange.subscribe(spy);

    componentRef.setInput('permissions', {
      ...DEFAULT_INDOOR_CENTER_PERMISSIONS,
      can_archive_topos: 'all',
      can_edit_lines: 'all',
    });
    fixture.detectChanges();

    const archiveToposButtons = Array.from(
      getSegmentedForKey('can_archive_topos').querySelectorAll('button'),
    ) as HTMLButtonElement[];
    archiveToposButtons[1].click();
    expect(spy).toHaveBeenCalledWith({
      key: 'can_archive_topos',
      value: 'routesetters_and_creator',
    });

    const editLinesButtons = Array.from(
      getSegmentedForKey('can_edit_lines').querySelectorAll('button'),
    ) as HTMLButtonElement[];
    editLinesButtons[1].click();
    expect(spy).toHaveBeenLastCalledWith({
      key: 'can_edit_lines',
      value: 'routesetters_and_creator',
    });
  });

  it('reflects updated permissions reactively in segmented active indices', () => {
    const allOpen: IndoorCenterPermissions = {
      can_create_routes: 'all',
      can_edit_routes: 'all',
      can_archive_routes: 'all',
      can_create_topos: 'all',
      can_edit_topos: 'all',
      can_archive_topos: 'all',
      can_create_lines: 'all',
      can_edit_lines: 'all',
    };

    componentRef.setInput('permissions', allOpen);
    fixture.detectChanges();

    const firstButtons = Array.from(
      fixture.nativeElement.querySelectorAll(
        'tui-segmented button:first-child',
      ),
    ) as HTMLButtonElement[];
    expect(firstButtons).toHaveLength(8);
    expect(
      firstButtons.every((btn) =>
        btn.classList.contains('tui-segmented_active'),
      ),
    ).toBe(true);
  });
});
