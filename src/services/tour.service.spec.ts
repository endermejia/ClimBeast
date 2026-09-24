import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TourService, TourStep } from './tour.service';
import { UserProfilesService } from './user-profiles.service';

describe('TourService', () => {
  let service: TourService;
  let mockRouter: { navigate: ReturnType<typeof vi.fn>; url: string };
  let mockUserProfiles: { updateUserProfile: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
      url: '/home',
    };
    mockUserProfiles = {
      updateUserProfile: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        TourService,
        { provide: Router, useValue: mockRouter },
        { provide: UserProfilesService, useValue: mockUserProfiles },
      ],
    });

    service = TestBed.inject(TourService);
  });

  it('should be created with initial state OFF', () => {
    expect(service.step()).toBe(TourStep.OFF);
    expect(service.isActive()).toBe(false);
  });

  it('should start at WELCOME step and navigate to config', async () => {
    await service.start();
    expect(service.isActive()).toBe(true);
    expect(service.step()).toBe(TourStep.WELCOME);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/profile/config']);
  });

  it('should progress through steps including 2 map steps (EXPLORE_MAP and EXPLORE_LIST)', async () => {
    await service.start();
    expect(service.step()).toBe(TourStep.WELCOME);

    // WELCOME -> HOME
    await service.next();
    expect(service.step()).toBe(TourStep.HOME);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);

    // HOME -> EXPLORE
    await service.next();
    expect(service.step()).toBe(TourStep.EXPLORE);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/area']);

    // EXPLORE -> EXPLORE_MAP (Paso 1: pulsar botón map desde explore)
    await service.next();
    expect(service.step()).toBe(TourStep.EXPLORE_MAP);

    // EXPLORE_MAP -> EXPLORE_LIST (Paso 2: volver a ver listado desde el mapa)
    await service.next();
    expect(service.step()).toBe(TourStep.EXPLORE_LIST);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/explore']);

    // EXPLORE_LIST -> SEARCH
    mockRouter.url = '/explore';
    await service.next();
    expect(service.step()).toBe(TourStep.SEARCH);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/area']);

    // SEARCH -> PROFILE
    await service.next();
    expect(service.step()).toBe(TourStep.PROFILE);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/profile']);

    // PROFILE -> finish (updates profile and stops tour)
    await service.next();
    expect(mockUserProfiles.updateUserProfile).toHaveBeenCalledWith({
      first_steps: false,
    });
    expect(service.isActive()).toBe(false);
    expect(service.step()).toBe(TourStep.OFF);
  });

  it('stop() should turn off tour without saving profile', async () => {
    await service.start();
    expect(service.isActive()).toBe(true);

    await service.stop();
    expect(service.isActive()).toBe(false);
    expect(service.step()).toBe(TourStep.OFF);
    expect(mockUserProfiles.updateUserProfile).not.toHaveBeenCalled();
  });

  it('finish() should save profile and stop tour', async () => {
    await service.start();
    await service.finish();

    expect(mockUserProfiles.updateUserProfile).toHaveBeenCalledWith({
      first_steps: false,
    });
    expect(service.isActive()).toBe(false);
    expect(service.step()).toBe(TourStep.OFF);
  });
});
