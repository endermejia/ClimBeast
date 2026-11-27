import { Component, ComponentRef, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IS_BROWSER } from '../../app/is-browser';
import {
  SuggestedDuplicateCardComponent,
  type SuggestedDuplicateItem,
  SuggestedDuplicatesSectionComponent,
} from './suggested-duplicate-card';

@Component({
  imports: [SuggestedDuplicateCardComponent],
  template: `
    <app-suggested-duplicate-card
      eyebrow="8a.nu: route-slug"
      (unify)="onUnify()"
    >
      <div class="custom-body">Custom projected route info</div>
    </app-suggested-duplicate-card>
  `,
})
class CustomCardHostComponent {
  unifyCalls = 0;

  onUnify(): void {
    this.unifyCalls++;
  }
}

@Component({
  imports: [SuggestedDuplicatesSectionComponent],
  template: `
    <app-suggested-duplicates-section
      titleKey="areas.suggestedDuplicates"
      [loading]="loading"
      [empty]="empty"
    >
      <div class="section-body">Duplicate cards list</div>
    </app-suggested-duplicates-section>
  `,
})
class SectionHostComponent {
  loading = false;
  empty = false;
}

describe('SuggestedDuplicateCardComponent', () => {
  let fixture: ComponentFixture<SuggestedDuplicateCardComponent>;
  let component: SuggestedDuplicateCardComponent;
  let componentRef: ComponentRef<SuggestedDuplicateCardComponent>;

  const ITEMS: SuggestedDuplicateItem[] = [
    { id: 1, label: 'El Chorro', link: ['/area', 'el-chorro'] },
    { id: 2, label: 'El Chorro (no slug)', link: null },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SuggestedDuplicateCardComponent,
        CustomCardHostComponent,
        SectionHostComponent,
        TranslateModule.forRoot(),
      ],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SuggestedDuplicateCardComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('renders structured items with links and plain text fallback, plus title and subtitle', () => {
    componentRef.setInput('title', 'La Ceja');
    componentRef.setInput('subtitle', 'El Chorro');
    componentRef.setInput('items', ITEMS);
    componentRef.setInput('mutedItems', true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('La Ceja');
    expect(el.textContent).toContain('(El Chorro)');
    expect(el.textContent).toContain('El Chorro (no slug)');

    const links = Array.from(el.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('/area/el-chorro');
    expect(links[0].getAttribute('target')).toBe('_blank');
  });

  it('emits unify when clicking the unify button', () => {
    const unifySpy = vi.fn();
    component.unify.subscribe(unifySpy);
    componentRef.setInput('items', ITEMS);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    btn.click();

    expect(unifySpy).toHaveBeenCalledTimes(1);
  });

  it('projects custom content when items are empty and displays eyebrow', () => {
    const hostFixture = TestBed.createComponent(CustomCardHostComponent);
    hostFixture.detectChanges();

    const el: HTMLElement = hostFixture.nativeElement;
    expect(el.textContent).toContain('8a.nu: route-slug');
    expect(el.querySelector('.custom-body')?.textContent).toContain(
      'Custom projected route info',
    );

    const btn = el.querySelector('button') as HTMLButtonElement;
    btn.click();
    expect(hostFixture.componentInstance.unifyCalls).toBe(1);
  });
});

describe('SuggestedDuplicatesSectionComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionHostComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
      ],
    }).compileComponents();
  });

  it('renders loading spinner while loading', () => {
    const hostFixture = TestBed.createComponent(SectionHostComponent);
    hostFixture.componentInstance.loading = true;
    hostFixture.detectChanges();

    expect(
      hostFixture.nativeElement.querySelector('tui-loader'),
    ).not.toBeNull();
    expect(hostFixture.nativeElement.querySelector('.section-body')).toBeNull();
  });

  it('renders empty message when not loading and empty is true', () => {
    const hostFixture = TestBed.createComponent(SectionHostComponent);
    hostFixture.componentInstance.loading = false;
    hostFixture.componentInstance.empty = true;
    hostFixture.detectChanges();

    expect(hostFixture.nativeElement.textContent).toContain(
      'admin.noDuplicatesFound',
    );
    expect(hostFixture.nativeElement.querySelector('.section-body')).toBeNull();
  });

  it('projects content when loaded and non-empty', () => {
    const hostFixture = TestBed.createComponent(SectionHostComponent);
    hostFixture.componentInstance.loading = false;
    hostFixture.componentInstance.empty = false;
    hostFixture.detectChanges();

    expect(
      hostFixture.nativeElement.querySelector('.section-body')?.textContent,
    ).toContain('Duplicate cards list');
  });
});
