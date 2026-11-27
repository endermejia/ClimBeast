import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TuiDialogService } from '@taiga-ui/core';
import { provideEventPlugins } from '@taiga-ui/event-plugins';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AreaDonationsService } from '../../services/area-donations.service';
import { AreaMaterialRequestsService } from '../../services/area-material-requests.service';
import { AreaRevenueService } from '../../services/area-revenue.service';
import { AuthStateService } from '../../services/auth-state.service';

import { IS_BROWSER } from '../../app/is-browser';
import { AreaRevenuePanelComponent } from './area-revenue-panel';

describe('AreaRevenuePanelComponent', () => {
  let mockDonationsService: { openDonationDialog: ReturnType<typeof vi.fn> };

  async function setup() {
    mockDonationsService = { openDonationDialog: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AreaRevenuePanelComponent, TranslateModule.forRoot()],
      providers: [
        provideEventPlugins(),
        { provide: IS_BROWSER, useValue: true },
        {
          provide: AreaRevenueService,
          useValue: {
            getAreaBalance: vi.fn().mockResolvedValue({
              totalPurchasesNet: 50,
              totalDonationsNet: 25,
              totalWithdrawn: 10,
              totalReserved: 0,
              availableBalance: 65,
            }),
            getAreaPublicTimeline: vi.fn().mockResolvedValue({
              donations: [],
              withdrawals: [],
            }),
          },
        },
        { provide: AreaDonationsService, useValue: mockDonationsService },
        {
          provide: AreaMaterialRequestsService,
          useValue: {
            requestsChange: signal(0),
            openMaterialRequestDialog: vi.fn().mockResolvedValue(false),
            openHistoryDialog: vi.fn(),
          },
        },
        {
          provide: AuthStateService,
          useValue: {
            canEditAsAdmin: signal(false),
            areaAdminPermissions: signal<Record<number, boolean>>({}),
          },
        },
        {
          provide: TuiDialogService,
          useValue: { open: vi.fn() },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AreaRevenuePanelComponent);
    fixture.componentRef.setInput('areaId', 7);
    fixture.componentRef.setInput('areaName', 'Siurana');
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders native Taiga accent size-m contribute CTA without Tailwind radius or inline background overrides', async () => {
    const fixture = await setup();

    const el: HTMLElement = fixture.nativeElement;
    const donateBtn = el.querySelector<HTMLButtonElement>(
      'button[tuiButton][iconStart="@tui.hand-heart"]',
    );

    expect(donateBtn).not.toBeNull();
    expect(donateBtn!.getAttribute('data-size')).toBe('m');
    expect(donateBtn!.getAttribute('data-appearance')).toBe('accent');
    expect(donateBtn!.classList.contains('lw-button-wrap')).toBe(true);
    expect(donateBtn!.classList.contains('w-full')).toBe(true);
    expect(donateBtn!.className).not.toMatch(/rounded-(?:xl|2xl)/);
    expect(donateBtn!.getAttribute('style') ?? '').not.toContain('background');

    donateBtn!.click();
    expect(mockDonationsService.openDonationDialog).toHaveBeenCalledWith(
      7,
      'Siurana',
      expect.objectContaining({
        areaPrice: 0,
        isPurchased: false,
        isPaywalled: false,
      }),
    );
  });
});
