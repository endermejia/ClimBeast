import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';

import { authGuard } from './auth.guard';
import { adminGuard, areaAdminGuard } from './admin.guard';
import { noAuthGuard } from './no-auth.guard';
import { rootRedirectGuard } from './root-redirect.guard';

import { SupabaseService } from '../services/supabase.service';
import { MockSupabaseService } from '../testing';

function createMockSession(userId = 'user-1', email = 'test@example.com') {
  return {
    user: { id: userId, email },
    access_token: 'mock-token',
  } as any;
}

describe('authGuard', () => {
  let mockSupabase: MockSupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'protected',
            canMatch: [authGuard],
            component: { template: '' } as any,
          },
          {
            path: 'login',
            component: { template: '' } as any,
          },
          {
            path: 'profile/config',
            canMatch: [authGuard],
            component: { template: '' } as any,
          },
        ]),
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    mockSupabase = TestBed.inject(
      SupabaseService,
    ) as unknown as MockSupabaseService;
  });

  it('should redirect to /login when no session', async () => {
    mockSupabase.setSession(null);
    const router = TestBed.inject(Router);
    await router.navigate(['protected']);
    expect(router.url).toBe('/login');
  });

  it('should allow access when session exists and profile name differs from email', async () => {
    const session = createMockSession('user-1', 'different@example.com');
    mockSupabase.setSession(session);
    mockSupabase.setUserProfile({
      name: 'Complete User',
      is_admin: false,
    } as any);
    (mockSupabase.userProfileResource as any)._setValue({
      name: 'Complete User',
      is_admin: false,
    });
    const router = TestBed.inject(Router);
    await router.navigate(['protected']);
    expect(router.url).toBe('/protected');
  });

  it('should redirect to /profile/config when profile name equals email', async () => {
    const session = createMockSession('user-1', 'test@example.com');
    mockSupabase.setSession(session);
    mockSupabase.setUserProfile({
      name: 'test@example.com',
      is_admin: false,
    } as any);
    (mockSupabase.userProfileResource as any)._setValue({
      name: 'test@example.com',
      is_admin: false,
    });
    const router = TestBed.inject(Router);
    await router.navigate(['protected']);
    expect(router.url).toBe('/profile/config');
  });

  it('should allow /profile/config route when profile name equals email (name was just updated)', async () => {
    const session = createMockSession('user-1', 'test@example.com');
    mockSupabase.setSession(session);
    const router = TestBed.inject(Router);
    await router.navigate(['profile/config']);
    expect(router.url).toBe('/profile/config');
  });

  it('should reload profile resource when name differs from email on config route', async () => {
    const session = createMockSession('user-1', 'test@example.com');
    mockSupabase.setSession(session);
    const reloadSpy = vi.fn();
    (mockSupabase.userProfileResource as any).reload = reloadSpy;

    const mockClient = (mockSupabase as any).client;
    const originalFrom = mockClient.from;
    mockClient.from = (table: string) => {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { name: 'Updated Name' },
                  error: null,
                }),
            }),
          }),
        };
      }
      return originalFrom.call(mockClient, table);
    };

    const router = TestBed.inject(Router);
    await router.navigate(['profile/config']);
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should return true on server platform', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'protected',
            canMatch: [authGuard],
            component: { template: '' } as any,
          },
        ]),
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    const router = TestBed.inject(Router);
    await router.navigate(['protected']);
    expect(router.url).toBe('/protected');
  });
});

describe('noAuthGuard', () => {
  let mockSupabase: MockSupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'info',
            canMatch: [noAuthGuard],
            component: { template: '' } as any,
          },
          {
            path: 'home',
            component: { template: '' } as any,
          },
        ]),
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    mockSupabase = TestBed.inject(
      SupabaseService,
    ) as unknown as MockSupabaseService;
  });

  it('should allow unauthenticated users', async () => {
    mockSupabase.setSession(null);
    const router = TestBed.inject(Router);
    await router.navigate(['info']);
    expect(router.url).toBe('/info');
  });

  it('should redirect authenticated users to /home', async () => {
    mockSupabase.setSession(createMockSession());
    const router = TestBed.inject(Router);
    await router.navigate(['info']);
    expect(router.url).toBe('/home');
  });
});

describe('rootRedirectGuard', () => {
  let mockSupabase: MockSupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            canActivate: [rootRedirectGuard],
            component: { template: '' } as any,
          },
          {
            path: 'home',
            component: { template: '' } as any,
          },
          {
            path: 'info',
            component: { template: '' } as any,
          },
        ]),
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    mockSupabase = TestBed.inject(
      SupabaseService,
    ) as unknown as MockSupabaseService;
  });

  it('should redirect authenticated users to /home', async () => {
    mockSupabase.setSession(createMockSession());
    const router = TestBed.inject(Router);
    await router.navigate(['']);
    expect(router.url).toBe('/home');
  });

  it('should redirect unauthenticated users to /info', async () => {
    mockSupabase.setSession(null);
    const router = TestBed.inject(Router);
    await router.navigate(['']);
    expect(router.url).toBe('/info');
  });
});

describe('adminGuard', () => {
  let mockSupabase: MockSupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'admin',
            canMatch: [adminGuard],
            component: { template: '' } as any,
          },
          {
            path: 'login',
            component: { template: '' } as any,
          },
          {
            path: 'page-not-found',
            component: { template: '' } as any,
          },
        ]),
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    mockSupabase = TestBed.inject(
      SupabaseService,
    ) as unknown as MockSupabaseService;
  });

  it('should redirect to /login when no session', async () => {
    mockSupabase.setSession(null);
    const router = TestBed.inject(Router);
    await router.navigate(['admin']);
    expect(router.url).toBe('/login');
  });

  it('should allow admin users', async () => {
    mockSupabase.setSession(createMockSession());
    (mockSupabase.userProfileResource as any)._setValue({
      name: 'Admin',
      is_admin: true,
    });
    const router = TestBed.inject(Router);
    await router.navigate(['admin']);
    expect(router.url).toBe('/admin');
  });

  it('should redirect non-admin to /page-not-found', async () => {
    mockSupabase.setSession(createMockSession());
    (mockSupabase.userProfileResource as any)._setValue({
      name: 'User',
      is_admin: false,
    });
    const router = TestBed.inject(Router);
    await router.navigate(['admin']);
    expect(router.url).toBe('/page-not-found');
  });

  it('should redirect when profile is undefined (timeout)', async () => {
    mockSupabase.setSession(createMockSession());
    (mockSupabase.userProfileResource as any)._setValue(undefined);
    const router = TestBed.inject(Router);
    await router.navigate(['admin']);
    expect(router.url).toBe('/page-not-found');
  });

  it('should return true on server platform', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'admin',
            canMatch: [adminGuard],
            component: { template: '' } as any,
          },
        ]),
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    const router = TestBed.inject(Router);
    await router.navigate(['admin']);
    expect(router.url).toBe('/admin');
  });
});

describe('areaAdminGuard', () => {
  let mockSupabase: MockSupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'area-admin',
            canMatch: [areaAdminGuard],
            component: { template: '' } as any,
          },
          {
            path: 'login',
            component: { template: '' } as any,
          },
          {
            path: 'page-not-found',
            component: { template: '' } as any,
          },
        ]),
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    mockSupabase = TestBed.inject(
      SupabaseService,
    ) as unknown as MockSupabaseService;
  });

  it('should redirect to /login when no session', async () => {
    mockSupabase.setSession(null);
    const router = TestBed.inject(Router);
    await router.navigate(['area-admin']);
    expect(router.url).toBe('/login');
  });

  it('should allow admin users', async () => {
    mockSupabase.setSession(createMockSession());
    (mockSupabase.userProfileResource as any)._setValue({
      name: 'Admin',
      is_admin: true,
    });
    const router = TestBed.inject(Router);
    await router.navigate(['area-admin']);
    expect(router.url).toBe('/area-admin');
  });

  it('should allow area admin users with admin areas', async () => {
    mockSupabase.setSession(createMockSession());
    (mockSupabase.userProfileResource as any)._setValue({
      name: 'User',
      is_admin: false,
    });
    (mockSupabase.adminAreasResource as any)._setValue([1, 2, 3]);
    const router = TestBed.inject(Router);
    await router.navigate(['area-admin']);
    expect(router.url).toBe('/area-admin');
  });

  it('should redirect non-admin without areas to /page-not-found', async () => {
    mockSupabase.setSession(createMockSession());
    (mockSupabase.userProfileResource as any)._setValue({
      name: 'User',
      is_admin: false,
    });
    (mockSupabase.adminAreasResource as any)._setValue([]);
    const router = TestBed.inject(Router);
    await router.navigate(['area-admin']);
    expect(router.url).toBe('/page-not-found');
  });

  it('should redirect when profile is undefined (timeout)', async () => {
    mockSupabase.setSession(createMockSession());
    (mockSupabase.userProfileResource as any)._setValue(undefined);
    const router = TestBed.inject(Router);
    await router.navigate(['area-admin']);
    expect(router.url).toBe('/page-not-found');
  });

  it('should redirect when admin areas is undefined (timeout)', async () => {
    mockSupabase.setSession(createMockSession());
    (mockSupabase.userProfileResource as any)._setValue({
      name: 'User',
      is_admin: false,
    });
    (mockSupabase.adminAreasResource as any)._setValue(undefined);
    const router = TestBed.inject(Router);
    await router.navigate(['area-admin']);
    expect(router.url).toBe('/page-not-found');
  });

  it('should return true on server platform', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'area-admin',
            canMatch: [areaAdminGuard],
            component: { template: '' } as any,
          },
        ]),
        { provide: SupabaseService, useClass: MockSupabaseService },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    const router = TestBed.inject(Router);
    await router.navigate(['area-admin']);
    expect(router.url).toBe('/area-admin');
  });
});
