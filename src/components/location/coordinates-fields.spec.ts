import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideEventPlugins } from '@taiga-ui/event-plugins';

import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MapService } from '../../services/map.service';

import {
  CoordinatesFieldsComponent,
  CoordinatesValue,
} from './coordinates-fields';

describe('CoordinatesFieldsComponent', () => {
  let fixture: ComponentFixture<CoordinatesFieldsComponent>;
  let component: CoordinatesFieldsComponent;
  let mockMapService: {
    pickLocation: ReturnType<typeof vi.fn>;
    parseCoordinates: (text: string) => { lat: number; lng: number } | null;
  };

  beforeEach(async () => {
    mockMapService = {
      pickLocation: vi.fn().mockReturnValue(of(null)),
      parseCoordinates: (text: string) => {
        const match = text.match(/(-?\d+\.?\d*)\s*[\s,]\s*(-?\d+\.?\d*)/);
        if (!match) return null;
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        return {
          lat: parseFloat(lat.toFixed(6)),
          lng: parseFloat(lng.toFixed(6)),
        };
      },
    };

    await TestBed.configureTestingModule({
      imports: [CoordinatesFieldsComponent, TranslateModule.forRoot()],
      providers: [
        provideEventPlugins(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: MapService, useValue: mockMapService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CoordinatesFieldsComponent);
    component = fixture.componentInstance;
  });

  it('should create with null coordinates and render lat/lng inputs and map picker button', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.latitude()).toBeNull();
    expect(component.longitude()).toBeNull();
    expect(fixture.nativeElement.querySelector('#lat')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#lng')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
  });

  it('should parse pasted coordinates, prevent default, update models, and emit coordinatesChange', () => {
    fixture.detectChanges();
    const emitted: CoordinatesValue[] = [];
    component.coordinatesChange.subscribe((v) => emitted.push(v));

    const preventDefault = vi.fn();
    const pasteEvent = {
      clipboardData: {
        getData: vi.fn().mockReturnValue('36.91543219, -4.75812345'),
      },
      preventDefault,
    } as unknown as ClipboardEvent;

    component.onPasteLocation(pasteEvent);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(component.latitude()).toBe(36.915432);
    expect(component.longitude()).toBe(-4.758123);
    expect(emitted).toEqual([{ latitude: 36.915432, longitude: -4.758123 }]);
  });

  it('should ignore pasted text that does not contain valid coordinates', () => {
    fixture.componentRef.setInput('latitude', 40.5);
    fixture.componentRef.setInput('longitude', -3.7);
    fixture.detectChanges();

    const emitted: CoordinatesValue[] = [];
    component.coordinatesChange.subscribe((v) => emitted.push(v));

    const preventDefault = vi.fn();
    const pasteEvent = {
      clipboardData: {
        getData: vi.fn().mockReturnValue('not coordinates'),
      },
      preventDefault,
    } as unknown as ClipboardEvent;

    component.onPasteLocation(pasteEvent);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(component.latitude()).toBe(40.5);
    expect(component.longitude()).toBe(-3.7);
    expect(emitted).toEqual([]);
  });

  it('should sanitize coordinates to 6 decimals on blur and emit changes', () => {
    fixture.componentRef.setInput('latitude', 41.123456789);
    fixture.componentRef.setInput('longitude', 1.987654321);
    fixture.detectChanges();

    const emitted: CoordinatesValue[] = [];
    component.coordinatesChange.subscribe((v) => emitted.push(v));

    const latInput = fixture.nativeElement.querySelector(
      '#lat',
    ) as HTMLInputElement;
    latInput.dispatchEvent(new Event('blur'));

    expect(component.latitude()).toBe(41.123457);
    expect(component.longitude()).toBe(1.987654);
    expect(emitted).toEqual([{ latitude: 41.123457, longitude: 1.987654 }]);
  });

  it('should not emit when sanitizing coordinates already within 6 decimals', () => {
    fixture.componentRef.setInput('latitude', 41.123456);
    fixture.componentRef.setInput('longitude', 1.987654);
    fixture.detectChanges();

    const emitted: CoordinatesValue[] = [];
    component.coordinatesChange.subscribe((v) => emitted.push(v));

    component.sanitizeCoordinates();

    expect(emitted).toEqual([]);
  });

  it('should pick location via MapService when map button is clicked and emit coordinatesChange', async () => {
    fixture.componentRef.setInput('latitude', 40.0);
    fixture.componentRef.setInput('longitude', -3.0);
    fixture.detectChanges();

    mockMapService.pickLocation.mockReturnValue(
      of({ lat: 41.258412, lng: 0.931245 }),
    );

    const emitted: CoordinatesValue[] = [];
    component.coordinatesChange.subscribe((v) => emitted.push(v));

    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    button.click();
    await Promise.resolve();

    expect(mockMapService.pickLocation).toHaveBeenCalledWith(40.0, -3.0);
    expect(component.latitude()).toBe(41.258412);
    expect(component.longitude()).toBe(0.931245);
    expect(emitted).toEqual([{ latitude: 41.258412, longitude: 0.931245 }]);
  });

  it('should preserve existing coordinates when map picker is dismissed with null', async () => {
    fixture.componentRef.setInput('latitude', 40.0);
    fixture.componentRef.setInput('longitude', -3.0);
    fixture.detectChanges();

    mockMapService.pickLocation.mockReturnValue(of(null));

    const emitted: CoordinatesValue[] = [];
    component.coordinatesChange.subscribe((v) => emitted.push(v));

    await component.pickLocation();

    expect(component.latitude()).toBe(40.0);
    expect(component.longitude()).toBe(-3.0);
    expect(emitted).toEqual([]);
  });

  it('should update model and emit coordinatesChange on individual lat/lng edits', () => {
    fixture.detectChanges();
    const emitted: CoordinatesValue[] = [];
    component.coordinatesChange.subscribe((v) => emitted.push(v));

    component.onLatitudeChange(42.5);
    component.onLongitudeChange(-1.25);

    expect(component.latitude()).toBe(42.5);
    expect(component.longitude()).toBe(-1.25);
    expect(emitted).toEqual([
      { latitude: 42.5, longitude: null },
      { latitude: 42.5, longitude: -1.25 },
    ]);
  });
});
