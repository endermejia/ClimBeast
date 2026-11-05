import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';

import { describe, expect, it, vi } from 'vitest';

import { ChatRedirectComponent } from './chat-redirect';

describe('ChatRedirectComponent', () => {
  it('redirects to /home with roomId query param when roomId is present', () => {
    const mockRouter = { navigate: vi.fn() };
    const mockRoute = {
      snapshot: {
        paramMap: convertToParamMap({ roomId: 'room-123' }),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        ChatRedirectComponent,
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
      ],
    });

    TestBed.inject(ChatRedirectComponent);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/home'], {
      queryParams: { roomId: 'room-123' },
      replaceUrl: true,
    });
  });

  it('redirects to /home without query param when roomId is not present', () => {
    const mockRouter = { navigate: vi.fn() };
    const mockRoute = {
      snapshot: {
        paramMap: convertToParamMap({}),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        ChatRedirectComponent,
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
      ],
    });

    TestBed.inject(ChatRedirectComponent);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/home'], {
      queryParams: undefined,
      replaceUrl: true,
    });
  });
});
