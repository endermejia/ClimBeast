import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTaiga, TuiRoot } from '@taiga-ui/core';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RouteAscentActionMenuComponent } from './route-ascent-action-menu';

@Component({
  standalone: true,
  imports: [RouteAscentActionMenuComponent, TuiRoot],
  template: `
    <tui-root>
      <app-route-ascent-action-menu
        [size]="size()"
        [isAttemptProject]="isAttemptProject()"
        [isProject]="isProject()"
        [hasOwnAscent]="hasOwnAscent()"
        [canToggleProject]="canToggleProject()"
        [(open)]="open"
        (viewAscent)="onViewAscent()"
        (logAscent)="onLogAscent()"
        (toggleProject)="onToggleProject()"
      />
    </tui-root>
  `,
})
class TestHostComponent {
  size = signal<'s' | 'm'>('m');
  isAttemptProject = signal(false);
  isProject = signal(false);
  hasOwnAscent = signal(false);
  canToggleProject = signal(true);
  open = signal(false);

  onViewAscent = vi.fn();
  onLogAscent = vi.fn();
  onToggleProject = vi.fn();
}

describe('RouteAscentActionMenuComponent', () => {
  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: () => false,
      }),
    });

    await TestBed.configureTestingModule({
      imports: [TestHostComponent, TranslateModule.forRoot()],
      providers: [provideTaiga()],
    }).compileComponents();
  });

  it('renders default new-ascent trigger state', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      'app-route-ascent-action-menu button',
    ) as HTMLButtonElement;

    expect(btn).not.toBeNull();
    expect(btn.getAttribute('data-appearance')).toBe('neutral');
    expect(btn.textContent?.trim()).toBe('ascent.new');
    expect(btn.style.background).toBe('');
    expect(btn.getAttribute('style')).toContain('circle-plus');
  });

  it('renders project trigger state when isProject is true', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.isProject.set(true);
    fixture.detectChanges();

    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      'app-route-ascent-action-menu button',
    ) as HTMLButtonElement;

    expect(btn.getAttribute('data-appearance')).toBe('info');
    expect(btn.textContent?.trim()).toBe('project');
    expect(btn.getAttribute('style')).toContain('bookmark');
  });

  it('renders attempt-project trigger state when isAttemptProject is true', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.isProject.set(true);
    fixture.componentInstance.isAttemptProject.set(true);
    fixture.componentInstance.hasOwnAscent.set(true);
    fixture.detectChanges();

    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      'app-route-ascent-action-menu button',
    ) as HTMLButtonElement;

    expect(btn.getAttribute('data-appearance')).toBe('none');
    expect(btn.getAttribute('style')).toContain('var(--tui-status-neutral)');
    expect(btn.getAttribute('style')).toContain('circle-dashed');
    expect(btn.textContent?.trim()).toBe('ascentTypes.attempt');
  });

  it('shows dropdown options and emits viewAscent, logAscent, and toggleProject', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    const host = fixture.componentInstance;
    host.hasOwnAscent.set(true);
    host.isProject.set(true);
    host.isAttemptProject.set(true);
    host.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const getOptions = () =>
      Array.from(
        document.querySelectorAll('tui-data-list button[tuiOption]'),
      ) as HTMLButtonElement[];

    let options = getOptions();
    expect(options.map((o) => o.textContent?.trim())).toEqual([
      'ascent.view',
      'ascent.new',
      'project.remove',
    ]);

    options[0].click();
    fixture.detectChanges();
    expect(host.onViewAscent).toHaveBeenCalledTimes(1);
    expect(host.open()).toBe(false);

    host.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    options = getOptions();
    options[1].click();
    fixture.detectChanges();
    expect(host.onLogAscent).toHaveBeenCalledTimes(1);
    expect(host.open()).toBe(false);

    host.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    options = getOptions();
    options[2].click();
    fixture.detectChanges();
    expect(host.onToggleProject).toHaveBeenCalledTimes(1);
    expect(host.open()).toBe(false);
  });

  it('hides viewAscent when hasOwnAscent is false and hides project option when canToggleProject is false', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    const host = fixture.componentInstance;
    host.hasOwnAscent.set(false);
    host.isProject.set(false);
    host.canToggleProject.set(true);
    host.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    let labels = Array.from(
      document.querySelectorAll('tui-data-list button[tuiOption]'),
    ).map((o) => o.textContent?.trim());
    expect(labels).toEqual(['ascent.new', 'project.add']);

    host.canToggleProject.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    labels = Array.from(
      document.querySelectorAll('tui-data-list button[tuiOption]'),
    ).map((o) => o.textContent?.trim());
    expect(labels).toEqual(['ascent.new']);
  });
});
