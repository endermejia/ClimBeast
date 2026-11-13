import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TuiDialogService } from '@taiga-ui/core';

import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FollowsService } from '../../services/follows.service';

import { NewsItem } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';

import { NewsCardComponent } from './news-card';

describe('NewsCardComponent', () => {
  const mockNewsItem: NewsItem = {
    kind: 'news',
    id: 101,
    title: 'Titulo noticia',
    link: 'https://www.desnivel.com/escalada/noticia-101',
    date: '2026-11-05T12:00:00Z',
    excerpt: '<p>Extracto</p>',
    image: 'https://www.desnivel.com/images/2026/11/foto.jpg',
  };

  const followNewsSignal = signal(true);
  const toggleFollowNewsMock = vi.fn().mockResolvedValue(false);
  const dialogOpenMock = vi.fn().mockReturnValue(of(true));

  beforeEach(async () => {
    followNewsSignal.set(true);
    toggleFollowNewsMock.mockClear();
    dialogOpenMock.mockClear().mockReturnValue(of(true));

    await TestBed.configureTestingModule({
      imports: [NewsCardComponent, TranslateModule.forRoot()],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        {
          provide: FollowsService,
          useValue: {
            followNews: followNewsSignal,
            toggleFollowNews: toggleFollowNewsMock,
          },
        },
        {
          provide: TuiDialogService,
          useValue: { open: dialogOpenMock },
        },
      ],
    }).compileComponents();
  });

  it('should create and rewrite image URL to /api/desnivel/', () => {
    const fixture = TestBed.createComponent(NewsCardComponent);
    fixture.componentRef.setInput('item', mockNewsItem);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.imageUrl()).toBe(
      '/api/desnivel/images/2026/11/foto.jpg',
    );
  });

  it('keeps already proxied image URLs', () => {
    const fixture = TestBed.createComponent(NewsCardComponent);
    fixture.componentRef.setInput('item', {
      ...mockNewsItem,
      image: '/api/desnivel/images/photo.jpg',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.imageUrl()).toBe(
      '/api/desnivel/images/photo.jpg',
    );
  });

  it('returns null when news item has no image', () => {
    const fixture = TestBed.createComponent(NewsCardComponent);
    fixture.componentRef.setInput('item', {
      ...mockNewsItem,
      image: undefined,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.imageUrl()).toBeNull();
  });

  it('renders date using AscentDatePipe', () => {
    const fixture = TestBed.createComponent(NewsCardComponent);
    fixture.componentRef.setInput('item', mockNewsItem);
    fixture.detectChanges();

    const dateSpan = fixture.nativeElement.querySelector('header span.text-xs');
    expect(dateSpan?.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('renders avatar image in header', () => {
    const fixture = TestBed.createComponent(NewsCardComponent);
    fixture.componentRef.setInput('item', mockNewsItem);
    fixture.detectChanges();

    const avatarImg = fixture.nativeElement.querySelector(
      'header span[tuiavatar] img',
    ) as HTMLImageElement;
    expect(avatarImg).toBeTruthy();
    expect(avatarImg.getAttribute('src')).toContain('data:image/png;base64');
  });

  it('confirms with dialog before unfollowing news', async () => {
    const fixture = TestBed.createComponent(NewsCardComponent);
    fixture.componentRef.setInput('item', mockNewsItem);
    fixture.detectChanges();

    const followButton = fixture.nativeElement.querySelector(
      'header button[tuibutton]',
    ) as HTMLButtonElement;
    expect(followButton).toBeTruthy();

    followButton.click();
    await fixture.whenStable();
    expect(dialogOpenMock).toHaveBeenCalledTimes(1);
    expect(toggleFollowNewsMock).toHaveBeenCalledTimes(1);
  });

  it('does not unfollow when confirmation is cancelled', async () => {
    dialogOpenMock.mockReturnValue(of(false));
    const fixture = TestBed.createComponent(NewsCardComponent);
    fixture.componentRef.setInput('item', mockNewsItem);
    fixture.detectChanges();

    const followButton = fixture.nativeElement.querySelector(
      'header button[tuibutton]',
    ) as HTMLButtonElement;
    expect(followButton).toBeTruthy();

    followButton.click();
    await fixture.whenStable();
    expect(dialogOpenMock).toHaveBeenCalledTimes(1);
    expect(toggleFollowNewsMock).not.toHaveBeenCalled();
  });

  it('follows news directly without dialog when not followed', async () => {
    followNewsSignal.set(false);
    const fixture = TestBed.createComponent(NewsCardComponent);
    fixture.componentRef.setInput('item', mockNewsItem);
    fixture.detectChanges();

    const followButton = fixture.nativeElement.querySelector(
      'header button[tuibutton]',
    ) as HTMLButtonElement;
    expect(followButton).toBeTruthy();

    followButton.click();
    await fixture.whenStable();
    expect(dialogOpenMock).not.toHaveBeenCalled();
    expect(toggleFollowNewsMock).toHaveBeenCalledTimes(1);
  });

  it('links title and excerpt to the article without external link icon', () => {
    const fixture = TestBed.createComponent(NewsCardComponent);
    fixture.componentRef.setInput('item', mockNewsItem);
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector('tui-icon');
    expect(icon).toBeNull();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll(
        'a',
      ) as NodeListOf<HTMLAnchorElement>,
    );
    const excerptLink = links.find((a) => a.textContent?.includes('Extracto'));
    expect(excerptLink).toBeTruthy();
    expect(excerptLink?.getAttribute('href')).toBe(mockNewsItem.link);
    expect(excerptLink?.getAttribute('target')).toBe('_blank');
  });
});
