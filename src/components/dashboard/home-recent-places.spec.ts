import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  HomeRecentPlacesComponent,
  UnifiedActiveItem,
} from './home-recent-places';

describe('HomeRecentPlacesComponent', () => {
  let fixture: ComponentFixture<HomeRecentPlacesComponent>;
  let componentRef: ComponentRef<HomeRecentPlacesComponent>;

  const mockItems: UnifiedActiveItem[] = [
    {
      name: 'Sector Pozo',
      link: ['/area', 'el-chorro', 'sector-pozo'],
      visitedAt: 1000,
      liked: true,
    },
    {
      name: 'Sharma Climbing',
      link: ['/indoor', 'sharma-climbing'],
      visitedAt: 500,
      liked: false,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeRecentPlacesComponent, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeRecentPlacesComponent);
    componentRef = fixture.componentRef;
  });

  it('should render skeleton when followsLoaded is false', () => {
    componentRef.setInput('followsLoaded', false);
    componentRef.setInput('items', mockItems);
    fixture.detectChanges();

    const skeletons = fixture.nativeElement.querySelectorAll('[tuiSkeleton]');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).not.toContain('Sector Pozo');
  });

  it('should render skeleton when isLoading is true', () => {
    componentRef.setInput('followsLoaded', true);
    componentRef.setInput('isLoading', true);
    componentRef.setInput('items', mockItems);
    fixture.detectChanges();

    const skeletons = fixture.nativeElement.querySelectorAll('[tuiSkeleton]');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).not.toContain('Sector Pozo');
  });

  it('should render items with textfield appearance', () => {
    componentRef.setInput('followsLoaded', true);
    componentRef.setInput('isLoading', false);
    componentRef.setInput('items', mockItems);
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('a');
    expect(links.length).toBe(2);

    for (const link of links) {
      expect(link.getAttribute('data-appearance')).toBe('textfield');
    }
  });

  it('should show favorite heart icon only for liked items', () => {
    componentRef.setInput('followsLoaded', true);
    componentRef.setInput('isLoading', false);
    componentRef.setInput('items', mockItems);
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('a');
    expect(links.length).toBe(2);

    // First item is liked
    const firstLink = links[0];
    const heartIcon = firstLink.querySelector('tui-icon[icon="@tui.heart"]');
    expect(heartIcon).toBeTruthy();
    expect(heartIcon?.getAttribute('aria-label')).toBe('favorite');

    // Second item is not liked
    const secondLink = links[1];
    expect(secondLink.querySelector('tui-icon')).toBeNull();
  });
});
