import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideEventPlugins } from '@taiga-ui/event-plugins';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminItemPriceHeaderComponent } from './admin-item-price-header';

describe('AdminItemPriceHeaderComponent', () => {
  let fixture: ComponentFixture<AdminItemPriceHeaderComponent>;
  let component: AdminItemPriceHeaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminItemPriceHeaderComponent, TranslateModule.forRoot()],
      providers: [
        provideEventPlugins(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminItemPriceHeaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('price', 19.5);
  });

  it('formats price with two decimals and hides admin buttons by default', () => {
    fixture.detectChanges();

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.textContent?.trim()).toBe('19.50€');
    expect(hostEl.querySelectorAll('button')).toHaveLength(0);
  });

  it('shows edit and delete buttons when isAdmin is true and emits events on click', () => {
    fixture.componentRef.setInput('isAdmin', true);
    fixture.componentRef.setInput('price', 12);
    fixture.detectChanges();

    const editSpy = vi.fn();
    const deleteSpy = vi.fn();
    component.editClicked.subscribe(editSpy);
    component.deleteClicked.subscribe(deleteSpy);

    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.textContent).toContain('12.00€');

    const buttons = Array.from(
      hostEl.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    expect(buttons).toHaveLength(2);
    expect(buttons[0].getAttribute('aria-label')).toBe('edit');
    expect(buttons[0].querySelector('tui-icon')?.getAttribute('icon')).toBe(
      '@tui.pencil',
    );
    expect(buttons[1].getAttribute('aria-label')).toBe('delete');
    expect(buttons[1].querySelector('tui-icon')?.getAttribute('icon')).toBe(
      '@tui.trash',
    );

    buttons[0].click();
    expect(editSpy).toHaveBeenCalledOnce();
    expect(deleteSpy).not.toHaveBeenCalled();

    buttons[1].click();
    expect(deleteSpy).toHaveBeenCalledOnce();
  });
});
