import { TestBed } from '@angular/core/testing';

import { provideEventPlugins } from '@taiga-ui/event-plugins';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  IndoorTopoFilterDialogComponent,
  IndoorTopoFilterDialogData,
} from './indoor-topo-filter-dialog';

describe('IndoorTopoFilterDialogComponent', () => {
  let completeWith: ReturnType<typeof vi.fn>;

  async function setup(data: IndoorTopoFilterDialogData) {
    completeWith = vi.fn();

    await TestBed.configureTestingModule({
      imports: [IndoorTopoFilterDialogComponent, TranslateModule.forRoot()],
      providers: [
        provideEventPlugins(),
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: { data, completeWith },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(IndoorTopoFilterDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders lw-form-sheet form with scrollable body and sticky footer', async () => {
    const fixture = await setup({
      gradeRange: [1, 8],
      movesRange: [2, 12],
      maxPossibleMoves: 20,
      showClimbed: true,
    });

    const el: HTMLElement = fixture.nativeElement;
    const form = el.querySelector('form.lw-form-sheet');
    const body = form?.querySelector('.lw-form-sheet-body');
    const footer = form?.querySelector('.lw-form-sheet-footer');
    const buttons = footer?.querySelectorAll('button');

    expect(form).not.toBeNull();
    expect(body).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(buttons?.length).toBe(2);
    expect(buttons?.[0].getAttribute('type')).toBe('button');
    expect(buttons?.[1].getAttribute('type')).toBe('submit');
    buttons?.forEach((button) => {
      expect(button.getAttribute('data-size')).toBe('m');
    });
  });

  it('clears filters when clicking clear button', async () => {
    const fixture = await setup({
      gradeRange: [2, 6],
      movesRange: [3, 10],
      maxPossibleMoves: 15,
      showClimbed: false,
    });

    const clearBtn = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>(
      '.lw-form-sheet-footer button[type="button"]',
    );

    expect(clearBtn).not.toBeNull();
    clearBtn!.click();
    fixture.detectChanges();

    expect(completeWith).toHaveBeenCalledWith(
      expect.objectContaining({
        showClimbed: true,
        cleared: true,
      }),
    );
  });

  it('applies current filters when submitting the form', async () => {
    const fixture = await setup({
      gradeRange: [2, 6],
      movesRange: [3, 10],
      maxPossibleMoves: 15,
      showClimbed: false,
    });

    const form = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLFormElement>('form.lw-form-sheet');

    expect(form).not.toBeNull();
    form!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();

    expect(completeWith).toHaveBeenCalledWith({
      gradeRange: [2, 6],
      movesRange: [3, 10],
      showClimbed: false,
    });
  });
});
