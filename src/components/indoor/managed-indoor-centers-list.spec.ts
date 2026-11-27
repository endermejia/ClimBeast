import { ComponentRef, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthStateService } from '../../services/auth-state.service';
import { IndoorCentersDataService } from '../../services/indoor-centers-data.service';
import { OnlineStatusService } from '../../services/online-status.service';
import { SupabaseService } from '../../services/supabase.service';

import { MapIndoorCenterItem } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';
import { MockSupabaseService } from '../../testing/mock-supabase.service';
import { ManagedIndoorCentersListComponent } from './managed-indoor-centers-list';

function createCenter(
  id: string,
  name: string,
  slug: string,
  city: string | null,
): MapIndoorCenterItem {
  return {
    id,
    name,
    slug,
    city,
    grades: {},
    routes_count: 10,
    liked: false,
    topos: [],
  } as unknown as MapIndoorCenterItem;
}

describe('ManagedIndoorCentersListComponent', () => {
  let fixture: ComponentFixture<ManagedIndoorCentersListComponent>;
  let component: ManagedIndoorCentersListComponent;
  let componentRef: ComponentRef<ManagedIndoorCentersListComponent>;

  const centersList = signal<MapIndoorCenterItem[]>([
    createCenter('gym-1', 'Boulder Bloc', 'boulder-bloc', 'Madrid'),
    createCenter(
      'gym-2',
      'Sputnik Climbing',
      'sputnik-alcobendas',
      'Alcobendas',
    ),
    createCenter('gym-3', 'Sharma Climbing', 'sharma-bcn', 'Barcelona'),
  ]);
  const centersIsLoading = signal(false);
  const centersValue = signal<MapIndoorCenterItem[] | undefined>(centersList());

  const isAdmin = signal(false);
  const profileIsLoading = signal(false);
  const profileValue = signal<object | undefined>({ id: 'u-1' });

  const isOffline = signal(false);

  beforeEach(async () => {
    centersIsLoading.set(false);
    centersValue.set(centersList());
    isAdmin.set(false);
    profileIsLoading.set(false);
    profileValue.set({ id: 'u-1' });
    isOffline.set(false);

    await TestBed.configureTestingModule({
      imports: [ManagedIndoorCentersListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: SupabaseService, useClass: MockSupabaseService },
        {
          provide: AuthStateService,
          useValue: {
            isAdmin,
            userProfileResource: {
              isLoading: profileIsLoading,
              value: profileValue,
            },
          },
        },
        {
          provide: IndoorCentersDataService,
          useValue: {
            indoorCentersList: centersList,
            indoorCentersResource: {
              isLoading: centersIsLoading,
              value: centersValue,
            },
          },
        },
        {
          provide: OnlineStatusService,
          useValue: {
            isOffline,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManagedIndoorCentersListComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('icon', '@tui.dumbbell');
    componentRef.setInput('titleKey', 'myIndoorCenters.title');
    componentRef.setInput('ariaLabelKey', 'nav.my-indoor-centers');
    componentRef.setInput('notificationKey', 'myIndoorCenters.notification');
    componentRef.setInput('emptyKey', 'myIndoorCenters.empty');
    componentRef.setInput('searchInputId', 'gyms-search');
    componentRef.setInput('centerIds', ['gym-1', 'gym-3']);
    componentRef.setInput('roleLoading', false);
  });

  const renderedCards = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('app-place-card'));

  it('shows all indoor centers for global admins regardless of centerIds', () => {
    isAdmin.set(true);
    componentRef.setInput('centerIds', []);
    fixture.detectChanges();

    expect(component.centers().length).toBe(3);
    expect(renderedCards().length).toBe(3);
    expect(
      fixture.nativeElement
        .querySelector('tui-badge-notification')
        ?.textContent?.trim(),
    ).toBe('3');
  });

  it('filters indoor centers by centerIds for non-admin users', () => {
    isAdmin.set(false);
    componentRef.setInput('centerIds', ['gym-2']);
    fixture.detectChanges();

    expect(component.centers().map((c) => c.id)).toEqual(['gym-2']);
    expect(renderedCards().length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Sputnik Climbing');
    expect(fixture.nativeElement.textContent).not.toContain('Boulder Bloc');
  });

  it('filters centers by search query matching name, slug, or city', () => {
    isAdmin.set(true);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      '#gyms-search',
    ) as HTMLInputElement;
    expect(input).not.toBeNull();

    // Match by name
    input.value = 'Boulder';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.filtered().map((c) => c.id)).toEqual(['gym-1']);

    // Match by slug
    input.value = 'sharma-bcn';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.filtered().map((c) => c.id)).toEqual(['gym-3']);

    // Match by city
    input.value = 'Alcobendas';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.filtered().map((c) => c.id)).toEqual(['gym-2']);
  });

  it('renders loader while centers, profile, or non-admin role is loading', () => {
    componentRef.setInput('roleLoading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tui-loader')).not.toBeNull();
    expect(renderedCards().length).toBe(0);

    // Admins do not wait on roleLoading
    isAdmin.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tui-loader')).toBeNull();
    expect(renderedCards().length).toBe(3);

    // Still loads when indoorCentersResource is loading
    centersIsLoading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tui-loader')).not.toBeNull();
  });

  it('renders offline fallback when offline and no centers are available', () => {
    isOffline.set(true);
    componentRef.setInput('centerIds', []);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('app-offline-not-cached'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
  });

  it('renders empty state when online and filtered list is empty', () => {
    isOffline.set(false);
    componentRef.setInput('centerIds', []);
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('app-empty-state');
    expect(emptyState).not.toBeNull();
    expect(emptyState.textContent).toContain('myIndoorCenters.empty');
    expect(
      fixture.nativeElement.querySelector('app-offline-not-cached'),
    ).toBeNull();
  });
});
