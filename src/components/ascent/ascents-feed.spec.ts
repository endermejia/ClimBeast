import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/core';

import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AscentsService } from '../../services/ascents.service';
import { FollowsService } from '../../services/follows.service';
import { SupabaseService } from '../../services/supabase.service';

import { RouteAscentWithExtras } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';
import { MockSupabaseService } from '../../testing';
import { AscentsFeedComponent } from './ascents-feed';

describe('AscentsFeedComponent', () => {
  let fixture: ComponentFixture<AscentsFeedComponent>;

  const mockAscents: RouteAscentWithExtras[] = [
    {
      id: 1,
      user_id: 'user-1',
      date: '2024-06-15T10:00:00Z',
      type: 'redpoint',
      grade: 25,
      comment: 'Nice route',
      user: { id: 'user-1', name: 'Alice' },
      route: { name: 'Route 1', slug: 'route-1', grade: 25 },
    } as unknown as RouteAscentWithExtras,
    {
      id: 2,
      user_id: 'user-2',
      date: '2024-06-14T10:00:00Z',
      type: 'flash',
      grade: 24,
      comment: 'Great flash',
      user: { id: 'user-2', name: 'Bob' },
      route: { name: 'Route 2', slug: 'route-2', grade: 24 },
    } as unknown as RouteAscentWithExtras,
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AscentsFeedComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: AscentsService,
          useValue: {
            ascentCommentsUpdate: of(0),
            ascentInfo: () => ({}),
            getCommentsCount: vi.fn().mockResolvedValue(0),
            getLikesInfo: vi
              .fn()
              .mockResolvedValue({ likes: [], user_liked: false }),
            toggleLike: vi.fn().mockResolvedValue(true),
            refreshResources: vi.fn(),
            getLastComment: vi.fn().mockResolvedValue(null),
          },
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
});
