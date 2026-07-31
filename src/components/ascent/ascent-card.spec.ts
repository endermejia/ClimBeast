import { PLATFORM_ID } from '@angular/core';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/core';

import { TranslateModule } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AscentsService } from '../../services/ascents.service';

import { FollowsService } from '../../services/follows.service';
import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';

import { RouteAscentWithExtras } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';
import { MockGlobalData } from '../../testing';
import { MockSupabaseService } from '../../testing';
import { AscentCardComponent } from './ascent-card';

function createMockAscent(
  overrides: Partial<RouteAscentWithExtras> = {},
): RouteAscentWithExtras {
  return {
    id: 1,
    user_id: 'user-1',
    route_id: 10,
    date: '2024-06-15',
    type: 'redpoint',
    grade: 25,
    comment: 'Great climb!',
    private_ascent: false,
    user: {
      id: 'user-1',
      name: 'Alice',
      avatar: 'avatar.jpg',
    },
    route: {
      name: 'Silencio',
      slug: 'silencio',
      grade: 25,
      climbing_kind: 'sport',
      area_slug: 'siurana',
      area_name: 'Siurana',
      crag_slug: 'la-rambla',
      crag_name: 'La Rambla',
    },
    ...overrides,
  } as RouteAscentWithExtras;
}

function createMockAscentsService() {
  const ascentCommentsUpdate = new Subject<number>();
  const ascentInfoSignal = signal({
    os: {
      icon: '@tui.eye',
      background: 'green',
      backgroundSubtle: 'lightgreen',
    },
    flash: {
      icon: '@tui.eye',
      background: 'blue',
      backgroundSubtle: 'lightblue',
    },
    redpoint: {
      icon: '@tui.eye',
      background: 'red',
      backgroundSubtle: 'lightpink',
    },
    allfree: {
      icon: '@tui.eye',
      background: 'purple',
      backgroundSubtle: 'lavender',
    },
    project: {
      icon: '@tui.eye',
      background: 'orange',
      backgroundSubtle: 'peachpuff',
    },
    repeat: {
      icon: '@tui.eye',
      background: 'gray',
      backgroundSubtle: 'lightgray',
    },
    default: {
      icon: '@tui.eye',
      background: 'gray',
      backgroundSubtle: 'lightgray',
    },
  });

  return {
    ascentCommentsUpdate,
    ascentInfo: ascentInfoSignal,
    openAscentForm: vi.fn().mockReturnValue(of(false)),
    getCommentsCount: vi.fn().mockResolvedValue(0),
    getLikesInfo: vi.fn().mockResolvedValue({ likes: [], user_liked: false }),
    toggleLike: vi.fn().mockResolvedValue(true),
    refreshResources: vi.fn(),
    getLastComment: vi.fn().mockResolvedValue(null),
    openCommentsDialog: vi.fn(),
  };
}

describe('AscentCardComponent', () => {
  let mockAscentsService: ReturnType<typeof createMockAscentsService>;

  beforeEach(async () => {
    mockAscentsService = createMockAscentsService();

    await TestBed.configureTestingModule({
      imports: [AscentCardComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        MockGlobalData,
        { provide: GlobalData, useExisting: MockGlobalData },
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: AscentsService, useValue: mockAscentsService },
        {
          provide: FollowsService,
          useValue: { follow: vi.fn(), unfollow: vi.fn() },
        },
        {
          provide: TuiDialogService,
          useValue: { open: vi.fn().mockReturnValue(of(false)) },
        },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AscentCardComponent);
    fixture.componentRef.setInput('data', createMockAscent());
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('user id', () => {
    it('includes id in user object', () => {
      const fixture = TestBed.createComponent(AscentCardComponent);
      const ascent = createMockAscent({
        user: { id: 'user-42', name: 'Bob', avatar: null },
      });
      fixture.componentRef.setInput('data', ascent);
      expect(fixture.componentInstance.data().user?.id).toBe('user-42');
    });

    it('has user_id on ascent', () => {
      const fixture = TestBed.createComponent(AscentCardComponent);
      fixture.componentRef.setInput(
        'data',
        createMockAscent({ user_id: 'user-99' }),
      );
      expect(fixture.componentInstance.data().user_id).toBe('user-99');
    });

    it('handles missing user gracefully', () => {
      const fixture = TestBed.createComponent(AscentCardComponent);
      const ascent = createMockAscent({ user: undefined });
      fixture.componentRef.setInput('data', ascent);
      expect(fixture.componentInstance.data().user).toBeUndefined();
    });
  });

  describe('computed properties', () => {
    it('isOwnAscent returns true when user_id matches current profile', async () => {
      const mockGlobal = TestBed.inject(MockGlobalData);
      mockGlobal.userProfile.set({
        id: 'user-1',
        name: 'Alice',
        avatar: null,
      } as never);
      const fixture = TestBed.createComponent(AscentCardComponent);
      fixture.componentRef.setInput(
        'data',
        createMockAscent({ user_id: 'user-1' }),
      );
      await fixture.whenStable();
      expect(fixture.componentInstance['isOwnAscent']()).toBe(true);
    });

    it('isOwnAscent returns false for different user', async () => {
      const mockGlobal = TestBed.inject(MockGlobalData);
      mockGlobal.userProfile.set({
        id: 'other-user',
        name: 'Other',
        avatar: null,
      } as never);
      const fixture = TestBed.createComponent(AscentCardComponent);
      fixture.componentRef.setInput(
        'data',
        createMockAscent({ user_id: 'user-1' }),
      );
      await fixture.whenStable();
      expect(fixture.componentInstance['isOwnAscent']()).toBe(false);
    });

    it('isIndoor returns false for outdoor route', () => {
      const fixture = TestBed.createComponent(AscentCardComponent);
      fixture.componentRef.setInput('data', createMockAscent());
      expect(fixture.componentInstance['isIndoor']()).toBe(false);
    });

    it('isIndoor returns true for indoor route', () => {
      const fixture = TestBed.createComponent(AscentCardComponent);
      const ascent = createMockAscent({
        route: {
          name: 'Route',
          slug: 'route',
          grade: 25,
          climbing_kind: 'sport',
          center_slug: 'boulder-gym',
          center_name: 'Boulder Gym',
        } as never,
      });
      fixture.componentRef.setInput('data', ascent);
      expect(fixture.componentInstance['isIndoor']()).toBe(true);
    });
  });

  describe('ascent data access', () => {
    it('returns correct user_id from data', () => {
      const fixture = TestBed.createComponent(AscentCardComponent);
      fixture.componentRef.setInput(
        'data',
        createMockAscent({ user_id: 'user-42' }),
      );
      expect(fixture.componentInstance.data().user_id).toBe('user-42');
    });

    it('returns correct date from data', () => {
      const fixture = TestBed.createComponent(AscentCardComponent);
      fixture.componentRef.setInput(
        'data',
        createMockAscent({ date: '2024-06-15' }),
      );
      expect(fixture.componentInstance.data().date).toBe('2024-06-15');
    });

    it('returns correct comment from data', () => {
      const fixture = TestBed.createComponent(AscentCardComponent);
      fixture.componentRef.setInput(
        'data',
        createMockAscent({ comment: 'Amazing!' }),
      );
      expect(fixture.componentInstance.data().comment).toBe('Amazing!');
    });

    it('returns correct route name from data', () => {
      const fixture = TestBed.createComponent(AscentCardComponent);
      fixture.componentRef.setInput('data', createMockAscent());
      expect(fixture.componentInstance.data().route?.name).toBe('Silencio');
    });

    it('returns duplicate flag from data', () => {
      const fixture = TestBed.createComponent(AscentCardComponent);
      fixture.componentRef.setInput(
        'data',
        createMockAscent({ is_duplicate: true }),
      );
      expect(fixture.componentInstance.data().is_duplicate).toBe(true);
    });
  });

  describe('inputs', () => {
    it('showUser defaults to true', () => {
      const fixture = TestBed.createComponent(AscentCardComponent);
      fixture.componentRef.setInput('data', createMockAscent());
      expect(fixture.componentInstance.showUser()).toBe(true);
    });

    it('showRoute defaults to true', () => {
      const fixture = TestBed.createComponent(AscentCardComponent);
      fixture.componentRef.setInput('data', createMockAscent());
      expect(fixture.componentInstance.showRoute()).toBe(true);
    });

    it('isFollowed defaults to false', () => {
      const fixture = TestBed.createComponent(AscentCardComponent);
      fixture.componentRef.setInput('data', createMockAscent());
      expect(fixture.componentInstance.isFollowed()).toBe(false);
    });
  });
});
