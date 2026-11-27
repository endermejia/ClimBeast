import { TestBed } from '@angular/core/testing';

import { provideEventPlugins } from '@taiga-ui/event-plugins';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ORDERED_GRADE_VALUES } from '../../models';

import { FilterDialog, FilterDialogComponent } from './filter-dialog';

describe('FilterDialogComponent', () => {
  let completeWith: ReturnType<typeof vi.fn>;

  async function setup(data: FilterDialog) {
    completeWith = vi.fn();

    await TestBed.configureTestingModule({
      imports: [FilterDialogComponent, TranslateModule.forRoot()],
      providers: [
        provideEventPlugins(),
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: { data, completeWith },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(FilterDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders lw-form-sheet layout with body and footer inside the form', async () => {
    const fixture = await setup({
      categories: [0],
      gradeRange: [0, 10],
      showCategories: true,
      showGradeRange: true,
      showShade: true,
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

  it('completes with cleared filters when clicking clear button', async () => {
    const fixture = await setup({
      categories: [0, 1],
      gradeRange: [2, 8],
      showCategories: true,
      showGradeRange: true,
      showShade: true,
    });

    const el: HTMLElement = fixture.nativeElement;
    const clearBtn = el.querySelector<HTMLButtonElement>(
      '.lw-form-sheet-footer button[type="button"]',
    );

    expect(clearBtn).not.toBeNull();
    clearBtn!.click();
    fixture.detectChanges();

    expect(completeWith).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: [],
        gradeRange: [0, ORDERED_GRADE_VALUES.length - 1],
        selectedShade: [],
        toposOnly: false,
      }),
    );
  });

  it('completes with current filters when submitting the form', async () => {
    const fixture = await setup({
      categories: [1],
      gradeRange: [3, 9],
      showCategories: true,
      showGradeRange: true,
      showShade: false,
    });

    const el: HTMLElement = fixture.nativeElement;
    const form = el.querySelector<HTMLFormElement>('form.lw-form-sheet');

    expect(form).not.toBeNull();
    form!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();

    expect(completeWith).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: [1],
        gradeRange: [3, 9],
      }),
    );
  });
});
