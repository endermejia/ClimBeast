import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConsentService } from '../../services/consent.service';
import { ToastService } from '../../services/toast.service';

import { CookieSettingsDialogComponent } from './cookie-settings-dialog';

describe('CookieSettingsDialogComponent', () => {
  let completeWith: ReturnType<typeof vi.fn>;
  let mockConsent: {
    analyticsAllowed: ReturnType<typeof signal<boolean>>;
    externalMediaAllowed: ReturnType<typeof signal<boolean>>;
    updatePreferences: ReturnType<typeof vi.fn>;
    rejectAll: ReturnType<typeof vi.fn>;
    acceptAll: ReturnType<typeof vi.fn>;
  };
  let mockToast: { success: ReturnType<typeof vi.fn> };

  async function setup() {
    completeWith = vi.fn();
    mockConsent = {
      analyticsAllowed: signal(false),
      externalMediaAllowed: signal(false),
      updatePreferences: vi.fn(),
      rejectAll: vi.fn(),
      acceptAll: vi.fn(),
    };
    mockToast = { success: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CookieSettingsDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ConsentService, useValue: mockConsent },
        { provide: ToastService, useValue: mockToast },
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: { completeWith },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CookieSettingsDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders lw-form-sheet layout with body and pinned footer actions', async () => {
    const fixture = await setup();

    const el: HTMLElement = fixture.nativeElement;
    const sheet = el.querySelector('.lw-form-sheet');
    const body = sheet?.querySelector('tui-scrollbar.lw-form-sheet-body');
    const footer = sheet?.querySelector('.lw-form-sheet-footer');
    const buttons = footer?.querySelectorAll('button');

    expect(sheet).not.toBeNull();
    expect(body).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(buttons?.length).toBe(3);
    buttons?.forEach((button) => {
      expect(button.getAttribute('data-size')).toBe('m');
    });
  });

  it('rejects all cookies and closes when clicking reject', async () => {
    const fixture = await setup();

    const buttons = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLButtonElement>('.lw-form-sheet-footer button');

    buttons[0].click();

    expect(mockConsent.rejectAll).toHaveBeenCalledTimes(1);
    expect(mockToast.success).toHaveBeenCalledWith('cookies.settings.saved');
    expect(completeWith).toHaveBeenCalledTimes(1);
  });

  it('accepts all cookies and closes when clicking accept all', async () => {
    const fixture = await setup();

    const buttons = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLButtonElement>('.lw-form-sheet-footer button');

    buttons[1].click();

    expect(mockConsent.acceptAll).toHaveBeenCalledTimes(1);
    expect(mockToast.success).toHaveBeenCalledWith('cookies.settings.saved');
    expect(completeWith).toHaveBeenCalledTimes(1);
  });

  it('closes without changing consent when clicking close', async () => {
    const fixture = await setup();

    const buttons = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLButtonElement>('.lw-form-sheet-footer button');

    buttons[2].click();

    expect(mockConsent.rejectAll).not.toHaveBeenCalled();
    expect(mockConsent.acceptAll).not.toHaveBeenCalled();
    expect(completeWith).toHaveBeenCalledTimes(1);
  });
});
