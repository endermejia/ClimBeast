import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/core';

import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FollowsService } from '../../services/follows.service';
import { SupabaseService } from '../../services/supabase.service';

import { IS_BROWSER } from '../../app/is-browser';
import { MockSupabaseService } from '../../testing';
import { UserInfoHintComponent } from '../ui/user-info-hint';
import { AscentCardHeaderComponent } from './ascent-card-header';

describe('AscentCardHeaderComponent', () => {
  let followedIds: ReturnType<typeof signal<Set<string>>>;

  beforeEach(async () => {
    followedIds = signal(new Set<string>());

    await TestBed.configureTestingModule({
      imports: [AscentCardHeaderComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: SupabaseService, useClass: MockSupabaseService },
        {
          provide: FollowsService,
          useValue: {
            follow: vi.fn().mockResolvedValue(undefined),
            unfollow: vi.fn().mockResolvedValue(undefined),
            followedIds,
            ensureFollowedIdsLoaded: vi.fn(),
          },
        },
        {
          provide: TuiDialogService,
          useValue: { open: vi.fn().mockReturnValue(of(false)) },
        },
      ],
    })
      .overrideComponent(UserInfoHintComponent, {
        set: { template: '', imports: [] },
      })
      .compileComponents();
  });

  function setAuthUser(id: string): void {
    const mockSupabase = TestBed.inject(
      SupabaseService,
    ) as unknown as MockSupabaseService;
    mockSupabase.setSession({ user: { id } } as never);
    mockSupabase.setUserProfile({
      id,
      name: 'Current User',
      avatar: null,
    } as never);
  }

  it('renders edit button and private badge when showUser is true for own ascent', () => {
    setAuthUser('user-1');
    const fixture = TestBed.createComponent(AscentCardHeaderComponent);
    fixture.componentRef.setInput('userId', 'user-1');
    fixture.componentRef.setInput('user', { name: 'Alice', avatar: null });
    fixture.componentRef.setInput('showUser', true);
    fixture.componentRef.setInput('showEdit', true);
    fixture.componentRef.setInput('isPrivate', true);

    const editSpy = vi.fn();
    fixture.componentInstance.editClick.subscribe(editSpy);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain('edit');
    expect(el.querySelector('[tuiBadge]')?.textContent).toContain('private');

    button?.click();
    expect(editSpy).toHaveBeenCalledOnce();
  });

  it('renders edit button and private badge via shared template when showUser is false for own ascent', () => {
    setAuthUser('user-1');
    const fixture = TestBed.createComponent(AscentCardHeaderComponent);
    fixture.componentRef.setInput('userId', 'user-1');
    fixture.componentRef.setInput('date', '2024-06-15');
    fixture.componentRef.setInput('showUser', false);
    fixture.componentRef.setInput('showDate', true);
    fixture.componentRef.setInput('showEdit', true);
    fixture.componentRef.setInput('isPrivate', true);

    const editSpy = vi.fn();
    fixture.componentInstance.editClick.subscribe(editSpy);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain('edit');
    expect(el.querySelector('[tuiBadge]')?.textContent).toContain('private');

    button?.click();
    expect(editSpy).toHaveBeenCalledOnce();
  });

  it('renders follow button when showUser is true for another user', () => {
    setAuthUser('user-1');
    const fixture = TestBed.createComponent(AscentCardHeaderComponent);
    fixture.componentRef.setInput('userId', 'user-2');
    fixture.componentRef.setInput('user', { name: 'Bob', avatar: null });
    fixture.componentRef.setInput('showUser', true);
    fixture.componentRef.setInput('showEdit', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('button')?.textContent).toContain('follow');

    followedIds.set(new Set(['user-2']));
    fixture.detectChanges();
    expect(el.querySelector('button')?.textContent).toContain(
      'followingStatus',
    );
  });

  it('does not render edit button when showUser is false for another user', () => {
    setAuthUser('user-1');
    const fixture = TestBed.createComponent(AscentCardHeaderComponent);
    fixture.componentRef.setInput('userId', 'user-2');
    fixture.componentRef.setInput('showUser', false);
    fixture.componentRef.setInput('showEdit', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('button')).toBeNull();
  });
});
