import { Location } from '@angular/common';
import { ComponentRef, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IS_BROWSER } from '../../app/is-browser';

import { AreasService } from '../../services/areas.service';
import { AuthStateService } from '../../services/auth-state.service';
import { SlugService } from '../../services/slug.service';
import { ToastService } from '../../services/toast.service';

import { AreaFormComponent } from './area-form';

describe('AreaFormComponent', () => {
  let fixture: ComponentFixture<AreaFormComponent>;
  let component: AreaFormComponent;
  let componentRef: ComponentRef<AreaFormComponent>;

  const mockIsAdmin = signal(false);
  const mockAreaAdminPermissions = signal<Record<number, boolean>>({});

  const mockAuthState = {
    isAdmin: mockIsAdmin,
    areaAdminPermissions: mockAreaAdminPermissions,
  };

  const mockAreasService = {
    getById: vi.fn().mockResolvedValue({ data: null, error: null }),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
  };

  const mockSlugService = {
    getUniqueSlug: vi.fn().mockResolvedValue('unique-slug'),
  };

  const mockToastService = {
    success: vi.fn(),
    error: vi.fn(),
  };

  const mockLocation = {
    back: vi.fn(),
  };

  beforeEach(async () => {
    mockIsAdmin.set(false);
    mockAreaAdminPermissions.set({});

    await TestBed.configureTestingModule({
      imports: [AreaFormComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: AuthStateService, useValue: mockAuthState },
        { provide: AreasService, useValue: mockAreasService },
        { provide: SlugService, useValue: mockSlugService },
        { provide: ToastService, useValue: mockToastService },
        { provide: Location, useValue: mockLocation },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AreaFormComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should render ONLY the name field when user is not admin and not area admin', () => {
    mockIsAdmin.set(false);
    mockAreaAdminPermissions.set({});
    fixture.detectChanges();

    expect(component.canEditAdminSettings()).toBe(false);

    const el: HTMLElement = fixture.nativeElement;
    const nameInput = el.querySelector('#area-name');
    const slugInput = el.querySelector('#area-slug');
    const visibilityCard = el.querySelector('.visibility-card');

    expect(nameInput).not.toBeNull();
    expect(slugInput).toBeNull();
    expect(visibilityCard).toBeNull();
  });

  it('should render admin settings and slug input when editing as site admin', () => {
    mockIsAdmin.set(true);
    componentRef.setInput('areaData', {
      id: 1,
      name: 'Chorro',
      slug: 'chorro',
    });
    fixture.detectChanges();

    expect(component.canEditAdminSettings()).toBe(true);

    const el: HTMLElement = fixture.nativeElement;
    const nameInput = el.querySelector('#area-name');
    const slugInput = el.querySelector('#area-slug');
    const visibilityCard = el.querySelector('.visibility-card');

    expect(nameInput).not.toBeNull();
    expect(slugInput).not.toBeNull();
    expect(visibilityCard).not.toBeNull();
  });

  it('should render admin settings and slug input when editing as area admin for that area', () => {
    mockIsAdmin.set(false);
    mockAreaAdminPermissions.set({ 10: true });

    componentRef.setInput('areaData', {
      id: 10,
      name: 'Margalef',
      slug: 'margalef',
    });
    fixture.detectChanges();

    expect(component.canEditAdminSettings()).toBe(true);

    const el: HTMLElement = fixture.nativeElement;
    const nameInput = el.querySelector('#area-name');
    const slugInput = el.querySelector('#area-slug');
    const visibilityCard = el.querySelector('.visibility-card');

    expect(nameInput).not.toBeNull();
    expect(slugInput).not.toBeNull();
    expect(visibilityCard).not.toBeNull();
  });
});
