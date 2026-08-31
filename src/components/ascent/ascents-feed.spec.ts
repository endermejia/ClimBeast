import { PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/core';

import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AscentsService } from '../../services/ascents.service';
import { FollowsService } from '../../services/follows.service';
import { SupabaseService } from '../../services/supabase.service';

import { FeedItem } from '../../models';

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

  it('should update isFollowed on ascent cards when followedIds changes', () => {
    fixture.componentRef.setInput('ascents', mockAscents);
    fixture.componentRef.setInput('followedIds', new Set(['user-1']));
    fixture.detectChanges();

    expect(fixture.componentInstance['processedItems']()[0].isFollowed).toBe(
      true,
    );
    expect(fixture.componentInstance['processedItems']()[1].isFollowed).toBe(
      false,
    );

    // Update followedIds to include user-2 as well
    fixture.componentRef.setInput('followedIds', new Set(['user-1', 'user-2']));
    fixture.detectChanges();

    // Verify computed re-evaluates with new followedIds
    expect(fixture.componentInstance['followedIds']().has('user-2')).toBe(true);
    expect(fixture.componentInstance['processedItems']()[0].isFollowed).toBe(
      true,
    );
    expect(fixture.componentInstance['processedItems']()[1].isFollowed).toBe(
      true,
    );
  });
});
