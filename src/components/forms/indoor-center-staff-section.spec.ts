import { ComponentRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppDialogsService } from '../../services/app-dialogs.service';
import { CacheService } from '../../services/cache.service';
import { IndoorService } from '../../services/indoor.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { UserProfilesService } from '../../services/user-profiles.service';

import {
  IndoorCenterRoutesetterRequestWithCenter,
  UserProfileBasicDto,
} from '../../models';

import { CACHE_KEYS } from '../../constants';

import { IS_BROWSER } from '../../app/is-browser';
import { IndoorCenterStaffSectionComponent } from './indoor-center-staff-section';

describe('IndoorCenterStaffSectionComponent', () => {
  let fixture: ComponentFixture<IndoorCenterStaffSectionComponent>;
  let component: IndoorCenterStaffSectionComponent;
  let componentRef: ComponentRef<IndoorCenterStaffSectionComponent>;

  let mockIndoor: {
    approveIndoorCenterRoutesetterRequest: ReturnType<typeof vi.fn>;
    rejectIndoorCenterRoutesetterRequest: ReturnType<typeof vi.fn>;
  };
  let mockToast: {
    success: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let mockAppDialogs: { confirm: ReturnType<typeof vi.fn> };
  let mockCache: { remove: ReturnType<typeof vi.fn> };
  let mockUserProfiles: { searchUsers: ReturnType<typeof vi.fn> };
  let insertResult: { error: { code?: string; message?: string } | null };
  let deleteResult: { error: { code?: string; message?: string } | null };
  let adminReloadSpy: ReturnType<typeof vi.fn>;
  let routesetterReloadSpy: ReturnType<typeof vi.fn>;
  let fromSpy: ReturnType<typeof vi.fn>;

  const sampleRequest: IndoorCenterRoutesetterRequestWithCenter = {
    id: 'req-1',
    created_at: '2026-01-15T10:00:00Z',
    center: { id: 'center-1', name: 'Gym', slug: 'gym' },
    user: { id: 'u-req', name: 'Alice Setter', avatar: null },
  };

  const sampleUser: UserProfileBasicDto = {
    id: 'user-self',
    name: 'Bob Climber',
    avatar: null,
  } as UserProfileBasicDto;

  beforeEach(async () => {
    insertResult = { error: null };
    deleteResult = { error: null };
    adminReloadSpy = vi.fn();
    routesetterReloadSpy = vi.fn();

    mockIndoor = {
      approveIndoorCenterRoutesetterRequest: vi.fn().mockResolvedValue(true),
      rejectIndoorCenterRoutesetterRequest: vi.fn().mockResolvedValue(true),
    };
    mockToast = {
      success: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    };
    mockAppDialogs = { confirm: vi.fn().mockResolvedValue(true) };
    mockCache = { remove: vi.fn() };
    mockUserProfiles = { searchUsers: vi.fn().mockResolvedValue([]) };

    fromSpy = vi.fn((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'u-admin', name: 'Admin One', avatar: null }],
              error: null,
            }),
          }),
        };
      }
      if (table === 'indoor_center_admins') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ user_id: 'u-admin' }],
              error: null,
            }),
          }),
          insert: vi
            .fn()
            .mockImplementation(() => Promise.resolve(insertResult)),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi
                .fn()
                .mockImplementation(() => Promise.resolve(deleteResult)),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        insert: vi.fn().mockImplementation(() => Promise.resolve(insertResult)),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => Promise.resolve(deleteResult)),
          }),
        }),
      };
    });

    await TestBed.configureTestingModule({
      imports: [IndoorCenterStaffSectionComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: IS_BROWSER, useValue: true },
        { provide: IndoorService, useValue: mockIndoor },
        { provide: ToastService, useValue: mockToast },
        { provide: AppDialogsService, useValue: mockAppDialogs },
        { provide: CacheService, useValue: mockCache },
        { provide: UserProfilesService, useValue: mockUserProfiles },
        {
          provide: SupabaseService,
          useValue: {
            whenReady: vi.fn().mockResolvedValue(undefined),
            authUserId: signal('user-self'),
            adminIndoorCentersResource: { reload: adminReloadSpy },
            routesetterIndoorCentersResource: { reload: routesetterReloadSpy },
            getPublicUrl: vi.fn((_b: string, p: string) => p),
            client: { from: fromSpy },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IndoorCenterStaffSectionComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('centerId', 'center-1');
    componentRef.setInput('pendingRequests', [sampleRequest]);
    fixture.detectChanges();
  });

  it('loads center admins and renders pending routesetter requests', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.centerAdmins()).toEqual([
      {
        user_id: 'u-admin',
        user: { id: 'u-admin', name: 'Admin One', avatar: null },
      },
    ]);
    expect(fixture.nativeElement.textContent).toContain('Admin One');
    expect(fixture.nativeElement.textContent).toContain('Alice Setter');
  });

  it('approves and rejects pending routesetter requests and emits pendingRequestsChanged', async () => {
    const changedSpy = vi.fn();
    component.pendingRequestsChanged.subscribe(changedSpy);

    await component.approveRoutesetter(sampleRequest);
    expect(
      mockIndoor.approveIndoorCenterRoutesetterRequest,
    ).toHaveBeenCalledWith('req-1', 'center-1', 'u-req');
    expect(changedSpy).toHaveBeenCalledTimes(1);

    await component.rejectRoutesetter(sampleRequest);
    expect(
      mockIndoor.rejectIndoorCenterRoutesetterRequest,
    ).toHaveBeenCalledWith('req-1');
    expect(changedSpy).toHaveBeenCalledTimes(2);
  });

  it('adds an admin and invalidates self cache when adding current user', async () => {
    await component.addAdmin(sampleUser);

    expect(mockToast.success).toHaveBeenCalledWith(
      'messages.toasts.adminAdded',
    );
    expect(mockCache.remove).toHaveBeenCalledWith(
      CACHE_KEYS.adminIndoorCenters('user-self'),
    );
    expect(adminReloadSpy).toHaveBeenCalled();
  });

  it('shows info toast when adding duplicate admin or routesetter (23505)', async () => {
    insertResult = { error: { code: '23505' } };

    await component.addAdmin(sampleUser);
    expect(mockToast.info).toHaveBeenCalledWith(
      'adminRequests.alreadyRequested',
    );

    await component.addRoutesetter(sampleUser);
    expect(mockToast.info).toHaveBeenCalledTimes(2);
  });

  it('respects confirmation cancellation when removing an admin', async () => {
    mockAppDialogs.confirm.mockResolvedValueOnce(false);
    const callCountBefore = fromSpy.mock.calls.length;

    await component.removeAdmin('user-self', 'Bob Climber');

    expect(mockAppDialogs.confirm).toHaveBeenCalled();
    expect(fromSpy.mock.calls.length).toBe(callCountBefore);
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it('removes admin after confirmation and refreshes self cache', async () => {
    mockAppDialogs.confirm.mockResolvedValueOnce(true);

    await component.removeAdmin('user-self', 'Bob Climber');

    expect(mockToast.success).toHaveBeenCalledWith(
      'messages.toasts.adminRemoved',
    );
    expect(mockCache.remove).toHaveBeenCalledWith(
      CACHE_KEYS.adminIndoorCenters('user-self'),
    );
    expect(adminReloadSpy).toHaveBeenCalled();
  });

  it('adds and removes a routesetter and reloads routesetter centers for current user', async () => {
    await component.addRoutesetter(sampleUser);
    expect(mockToast.success).toHaveBeenCalledWith(
      'messages.toasts.routesetterAdded',
    );
    expect(routesetterReloadSpy).toHaveBeenCalledTimes(1);

    await component.removeRoutesetter('user-self');
    expect(mockToast.success).toHaveBeenCalledWith(
      'messages.toasts.routesetterRemoved',
    );
    expect(routesetterReloadSpy).toHaveBeenCalledTimes(2);
  });
});
