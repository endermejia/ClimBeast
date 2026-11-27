import { Location } from '@angular/common';
import { PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthStateService } from '../../services/auth-state.service';
import { CragsService } from '../../services/crags.service';
import { MapService } from '../../services/map.service';
import { SlugService } from '../../services/slug.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

import { IS_BROWSER } from '../../app/is-browser';
import { CragFormComponent } from './crag-form';

describe('CragFormComponent', () => {
  let fixture: ComponentFixture<CragFormComponent>;

  const mockAuthState = {
    isAdmin: signal(false),
  };

  const mockCragsService = {
    getById: vi.fn().mockResolvedValue({ data: null, error: null }),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
  };

  const mockMapService = {
    pickLocation: vi.fn().mockReturnValue(of(null)),
    parseCoordinates: vi.fn().mockReturnValue(null),
  };

  const mockSlugService = {
    getUniqueSlug: vi.fn().mockResolvedValue('unique-crag-slug'),
  };

  const mockSupabase = {
    whenReady: vi.fn().mockResolvedValue(undefined),
    client: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    },
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CragFormComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: AuthStateService, useValue: mockAuthState },
        { provide: CragsService, useValue: mockCragsService },
        { provide: MapService, useValue: mockMapService },
        { provide: SlugService, useValue: mockSlugService },
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: ToastService, useValue: mockToast },
        { provide: Location, useValue: { back: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CragFormComponent);
  });

  it('uses form-sheet layout with scrollable body, pinned footer actions, and no nested scrollbar', () => {
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const formEl = el.querySelector('form.lw-form-sheet');
    const bodyEl = formEl?.querySelector('.lw-form-sheet-body');
    const footerEl = formEl?.querySelector('.lw-form-sheet-footer');
    const footerButtons = Array.from(
      footerEl?.querySelectorAll('button[tuiButton]') ?? [],
    );

    expect(formEl).not.toBeNull();
    expect(bodyEl).not.toBeNull();
    expect(bodyEl?.querySelector('#crag-name')).not.toBeNull();
    expect(el.querySelector('tui-scrollbar')).toBeNull();
    expect(footerEl).not.toBeNull();
    expect(footerButtons.length).toBe(2);
    expect(
      footerButtons.every((btn) => btn.getAttribute('data-size') === 'm'),
    ).toBe(true);
    expect(footerEl?.querySelector('button[type="submit"]')).not.toBeNull();
  });
});
