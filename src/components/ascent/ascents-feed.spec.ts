import { PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TuiDay } from '@taiga-ui/cdk';
import { TuiDialogService } from '@taiga-ui/core';

import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AscentsService } from '../../services/ascents.service';
import { FollowsService } from '../../services/follows.service';
import { SupabaseService } from '../../services/supabase.service';

import { FeedItem, RouteAscentWithExtras } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';
import { MockSupabaseService } from '../../testing';
import { AscentsFeedComponent } from './ascents-feed';

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
    getCommentsCount: vi.fn().mockResolvedValue(0),
    getLikesInfo: vi.fn().mockResolvedValue({ likes: [], user_liked: false }),
    toggleLike: vi.fn().mockResolvedValue(true),
    refreshResources: vi.fn(),
    getLastComment: vi.fn().mockResolvedValue(null),
    getLastComments: vi.fn().mockResolvedValue([]),
  };
}

describe('AscentsFeedComponent', () => {
  let fixture: ComponentFixture<AscentsFeedComponent>;

  const mockAscents: FeedItem[] = [
    {
      id: 1,
      kind: 'ascent',
      user_id: 'user-1',
      date: '2024-06-15T10:00:00Z',
      type: 'redpoint',
      grade: 25,
      comment: 'Nice route',
      user: { id: 'user-1', name: 'Alice' },
      route: { name: 'Route 1', slug: 'route-1', grade: 25 },
    } as unknown as FeedItem,
    {
      id: 2,
      kind: 'ascent',
      user_id: 'user-2',
      date: '2024-06-14T10:00:00Z',
      type: 'flash',
      grade: 24,
      comment: 'Great flash',
      user: { id: 'user-2', name: 'Bob' },
      route: { name: 'Route 2', slug: 'route-2', grade: 24 },
    } as unknown as FeedItem,
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AscentsFeedComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: AscentsService,
          useValue: createMockAscentsService(),
        },
        { provide: SupabaseService, useClass: MockSupabaseService },
        {
          provide: FollowsService,
          useValue: {
            followUser: vi.fn(),
            unfollowUser: vi.fn(),
            followedIds: signal(new Set<string>()),
            ensureFollowedIdsLoaded: vi.fn(),
          },
        },
        { provide: TuiDialogService, useValue: { open: vi.fn() } },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AscentsFeedComponent);
  });

  it('should render row break with hidden class on mobile and md:block when columns >= 2', () => {
    fixture.componentRef.setInput('ascents', mockAscents);
    fixture.componentRef.setInput('columns', 2);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const rowBreak = compiled.querySelector('.hidden');
    expect(rowBreak).not.toBeNull();
    expect(rowBreak?.classList.contains('hidden')).toBe(true);
    expect(rowBreak?.classList.contains('md:block')).toBe(true);
    expect(rowBreak?.classList.contains('md:col-span-2')).toBe(true);
  });

  it('should keep row break hidden without md:block when columns is 1', () => {
    fixture.componentRef.setInput('ascents', mockAscents);
    fixture.componentRef.setInput('columns', 1);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const rowBreak = compiled.querySelector('.hidden');
    expect(rowBreak).not.toBeNull();
    expect(rowBreak?.classList.contains('hidden')).toBe(true);
    expect(rowBreak?.classList.contains('md:block')).toBe(false);
  });

  it('should render items in separate sections per date when groupByDate is true', () => {
    fixture.componentRef.setInput('ascents', mockAscents);
    fixture.componentRef.setInput('groupByDate', true);
    fixture.componentRef.setInput('columns', 2);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const sections = compiled.querySelectorAll('section');
    expect(sections.length).toBe(2);

    const stickyHeaders = compiled.querySelectorAll('.sticky.top-0');
    expect(stickyHeaders.length).toBe(2);
    expect(sections[0].contains(stickyHeaders[0])).toBe(true);
    expect(sections[1].contains(stickyHeaders[1])).toBe(true);
  });

  it('should render clickable date buttons when enableDateNavigation is true and emit dateSelected on day click', () => {
    fixture.componentRef.setInput('ascents', mockAscents);
    fixture.componentRef.setInput('groupByDate', true);
    fixture.componentRef.setInput('enableDateNavigation', true);
    fixture.componentRef.setInput('minDate', '2024-01-01');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const dateButtons = compiled.querySelectorAll('.sticky.top-0 button');
    expect(dateButtons.length).toBe(2);

    const emitted: string[] = [];
    fixture.componentInstance.dateSelected.subscribe((d) => emitted.push(d));

    const comp = fixture.componentInstance as unknown as {
      toggleCalendar: (dateKey: string, dateStr: string) => void;
      onCalendarDayClick: (day: TuiDay) => void;
      openCalendarDateKey: () => string | null;
      minCalendarDay: () => TuiDay | null;
    };
    comp.toggleCalendar('2024-01-02', '2024-01-02');
    expect(comp.openCalendarDateKey()).toBe('2024-01-02');
    expect(comp.minCalendarDay()).toEqual(new TuiDay(2024, 0, 1));

    comp.onCalendarDayClick(new TuiDay(2024, 0, 1));
    expect(emitted).toEqual(['2024-01-01']);
    expect(comp.openCalendarDateKey()).toBeNull();
  });

  it('should group ascents by the same user on the same day when groupByDate and groupByUser are true', () => {
    const multiAscents: FeedItem[] = [
      {
        id: 1,
        kind: 'ascent',
        user_id: 'user-1',
        date: '2024-06-15T18:00:00Z',
        type: 'redpoint',
        grade: 25,
        user: { id: 'user-1', name: 'Alice' },
        route: { name: 'Route A', slug: 'route-a', grade: 25 },
      } as unknown as FeedItem,
      {
        id: 2,
        kind: 'ascent',
        user_id: 'user-2',
        date: '2024-06-15T14:00:00Z',
        type: 'flash',
        grade: 24,
        user: { id: 'user-2', name: 'Bob' },
        route: { name: 'Route B', slug: 'route-b', grade: 24 },
      } as unknown as FeedItem,
      {
        id: 1,
        kind: 'ascent',
        user_id: 'user-1',
        date: '2024-06-15T10:00:00Z',
        type: 'os',
        grade: 22,
        user: { id: 'user-1', name: 'Alice' },
        route: {
          name: 'Indoor Route',
          slug: 'indoor-route',
          center_slug: 'gym',
          center_name: 'Gym',
          grade: 22,
        },
      } as unknown as FeedItem,
      {
        id: 3,
        kind: 'ascent',
        user_id: 'user-1',
        date: '2024-06-14T10:00:00Z',
        type: 'redpoint',
        grade: 23,
        user: { id: 'user-1', name: 'Alice' },
        route: { name: 'Route C', slug: 'route-c', grade: 23 },
      } as unknown as FeedItem,
    ];

    fixture.componentRef.setInput('ascents', multiAscents);
    fixture.componentRef.setInput('groupByDate', true);
    fixture.componentRef.setInput('groupByUser', true);
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as {
      dateGroups: () => {
        dateKey: string;
        items: {
          item: FeedItem;
          extraAscents?: RouteAscentWithExtras[];
          trackKey: string;
        }[];
      }[];
    };

    const groups = comp.dateGroups();
    expect(groups.length).toBe(2);
    expect(groups[0].items.length).toBe(2);
    expect(groups[0].items[0].trackKey).toBe('ascent-outdoor-1');
    expect(groups[0].items[0].extraAscents?.length).toBe(1);
    expect(groups[0].items[0].extraAscents?.[0].route?.name).toBe(
      'Indoor Route',
    );
    expect(groups[0].items[1].extraAscents?.length).toBe(0);
    expect(groups[1].items.length).toBe(1);
  });

  it('should not group same-day user ascents when groupByUser is false', () => {
    const sameDayAscents: FeedItem[] = [
      {
        id: 1,
        kind: 'ascent',
        user_id: 'user-1',
        date: '2024-06-15T18:00:00Z',
        user: { id: 'user-1', name: 'Alice' },
        route: { name: 'Route A', slug: 'route-a', grade: 25 },
      } as unknown as FeedItem,
      {
        id: 2,
        kind: 'ascent',
        user_id: 'user-1',
        date: '2024-06-15T10:00:00Z',
        user: { id: 'user-1', name: 'Alice' },
        route: { name: 'Route B', slug: 'route-b', grade: 24 },
      } as unknown as FeedItem,
    ];

    fixture.componentRef.setInput('ascents', sameDayAscents);
    fixture.componentRef.setInput('groupByDate', true);
    fixture.componentRef.setInput('groupByUser', false);
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as {
      dateGroups: () => { items: unknown[] }[];
    };
    const groups = comp.dateGroups();
    expect(groups.length).toBe(1);
    expect(groups[0].items.length).toBe(2);
  });
});
