import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideEventPlugins } from '@taiga-ui/event-plugins';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AreaDonationsService } from '../../services/area-donations.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';

import {
  AreaDonationDialogComponent,
  AreaDonationDialogData,
} from './area-donation-dialog';

describe('AreaDonationDialogComponent', () => {
  let completeWith: ReturnType<typeof vi.fn>;
  let mockDonationsService: {
    loading: ReturnType<typeof signal<boolean>>;
    getUserAreaDonationsTotal: ReturnType<typeof vi.fn>;
    claimAccessFromDonations: ReturnType<typeof vi.fn>;
    donate: ReturnType<typeof vi.fn>;
  };

  async function setup(data: AreaDonationDialogData) {
    completeWith = vi.fn();
    mockDonationsService = {
      loading: signal(false),
      getUserAreaDonationsTotal: vi.fn().mockResolvedValue(0),
      claimAccessFromDonations: vi.fn().mockResolvedValue(true),
      donate: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [AreaDonationDialogComponent, TranslateModule.forRoot()],
      providers: [
        provideEventPlugins(),
        { provide: AreaDonationsService, useValue: mockDonationsService },
        {
          provide: OutdoorDataService,
          useValue: { areaTopos: signal([]) },
        },
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: { data, completeWith },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AreaDonationDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders scrollable body with tui-scrollbar.lw-form-sheet-body', async () => {
    const fixture = await setup({
      areaId: 42,
      areaName: 'La Pedriza',
      areaPrice: 10,
      isPurchased: false,
      initialAmount: 10,
    });

    const el: HTMLElement = fixture.nativeElement;
    const sheet = el.querySelector('.lw-form-sheet');
    const body = sheet?.querySelector('tui-scrollbar.lw-form-sheet-body');

    expect(sheet).not.toBeNull();
    expect(body).not.toBeNull();
  });

  it('renders native Taiga accent size-m donate CTA without Tailwind radius or inline background overrides', async () => {
    const fixture = await setup({
      areaId: 42,
      areaName: 'La Pedriza',
      areaPrice: 10,
      isPurchased: false,
      initialAmount: 10,
    });

    const el: HTMLElement = fixture.nativeElement;
    const footerBtn = el.querySelector<HTMLButtonElement>(
      '.lw-form-sheet-footer button[tuiButton]',
    );

    expect(footerBtn).not.toBeNull();
    expect(footerBtn!.getAttribute('data-size')).toBe('m');
    expect(footerBtn!.getAttribute('data-appearance')).toBe('accent');
    expect(footerBtn!.classList.contains('lw-button-wrap')).toBe(true);
    expect(footerBtn!.classList.contains('w-full')).toBe(true);
    expect(footerBtn!.className).not.toMatch(/rounded-(?:xl|2xl)/);
    expect(footerBtn!.getAttribute('style') ?? '').not.toContain('background');
  });

  it('renders preset buttons at size-m without typography overrides', async () => {
    const fixture = await setup({
      areaId: 42,
      areaName: 'La Pedriza',
      areaPrice: 0,
      isPurchased: false,
    });

    const el: HTMLElement = fixture.nativeElement;
    const presetButtons = Array.from(
      el.querySelectorAll<HTMLButtonElement>('.grid.grid-cols-4 button'),
    );

    expect(presetButtons).toHaveLength(4);
    presetButtons.forEach((btn) => {
      expect(btn.getAttribute('data-size')).toBe('m');
      expect(btn.className).not.toContain('font-black');
      expect(btn.className).not.toContain('text-base');
    });
  });

  it('submits donation when clicking footer CTA', async () => {
    const fixture = await setup({
      areaId: 42,
      areaName: 'La Pedriza',
      areaPrice: 10,
      isPurchased: false,
      initialAmount: 10,
    });

    const footerBtn = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>(
      '.lw-form-sheet-footer button[tuiButton]',
    );

    footerBtn!.click();

    expect(mockDonationsService.donate).toHaveBeenCalledWith(42, 10, false, '');
  });
});
