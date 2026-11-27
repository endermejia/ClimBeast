import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildIndoorSchedulePayload,
  buildInitialIndoorSchedule,
  INDOOR_WEEK_DAYS,
  IndoorCenterScheduleSectionComponent,
} from './indoor-center-schedule-section';

describe('IndoorCenterScheduleSectionComponent & helpers', () => {
  describe('schedule helpers', () => {
    it('builds default closed schedule for all 7 weekdays when input is empty', () => {
      const state = buildInitialIndoorSchedule(null);
      expect(Object.keys(state)).toEqual([...INDOOR_WEEK_DAYS]);
      for (const day of INDOOR_WEEK_DAYS) {
        expect(state[day]).toEqual({
          closed: true,
          open: '09:00',
          close: '21:00',
          hasSplit: false,
          open2: '16:00',
          close2: '21:00',
        });
      }
    });

    it('parses open and split-shift days from existing schedule JSON', () => {
      const state = buildInitialIndoorSchedule({
        normal: {
          monday: { open: '10:00', close: '22:00', closed: false },
          tuesday: {
            open: '09:00',
            close: '14:00',
            open2: '17:00',
            close2: '21:30',
            closed: false,
          },
        },
      });

      expect(state['monday']).toEqual({
        closed: false,
        open: '10:00',
        close: '22:00',
        hasSplit: false,
        open2: '16:00',
        close2: '21:00',
      });
      expect(state['tuesday']).toEqual({
        closed: false,
        open: '09:00',
        close: '14:00',
        hasSplit: true,
        open2: '17:00',
        close2: '21:30',
      });
      expect(state['sunday'].closed).toBe(true);
    });

    it('serializes closed, continuous, and split-shift days into payload', () => {
      const state = buildInitialIndoorSchedule({
        normal: {
          monday: { open: '10:00', close: '22:00', closed: false },
          tuesday: {
            open: '09:00',
            close: '14:00',
            open2: '17:00',
            close2: '21:30',
            closed: false,
          },
        },
      });

      const payload = buildIndoorSchedulePayload(state);
      expect(payload.normal['monday']).toEqual({
        closed: false,
        open: '10:00',
        close: '22:00',
        open2: null,
        close2: null,
      });
      expect(payload.normal['tuesday']).toEqual({
        closed: false,
        open: '09:00',
        close: '14:00',
        open2: '17:00',
        close2: '21:30',
      });
      expect(payload.normal['wednesday']).toEqual({
        closed: true,
        open: null,
        close: null,
        open2: null,
        close2: null,
      });
    });
  });

  describe('component rendering & updates', () => {
    let fixture: ComponentFixture<IndoorCenterScheduleSectionComponent>;
    let component: IndoorCenterScheduleSectionComponent;
    let componentRef: ComponentRef<IndoorCenterScheduleSectionComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [
          IndoorCenterScheduleSectionComponent,
          TranslateModule.forRoot(),
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(IndoorCenterScheduleSectionComponent);
      component = fixture.componentInstance;
      componentRef = fixture.componentRef;
      componentRef.setInput('schedule', buildInitialIndoorSchedule(null));
      fixture.detectChanges();
    });

    it('renders all 7 weekday cards and hides time inputs for closed days', () => {
      const dayCards = fixture.nativeElement.querySelectorAll(
        '[data-schedule-day]',
      );
      expect(dayCards).toHaveLength(7);

      const timeInputs =
        fixture.nativeElement.querySelectorAll('input[type="time"]');
      expect(timeInputs).toHaveLength(0);
    });

    it('reveals open/close inputs when unchecking closed and second pair when enabling split shift', () => {
      const mondayCard = fixture.nativeElement.querySelector(
        '[data-schedule-day="monday"]',
      ) as HTMLElement;
      const closedCheckbox = mondayCard.querySelector(
        'input[type="checkbox"]',
      ) as HTMLInputElement;

      closedCheckbox.click();
      fixture.detectChanges();

      expect(component.schedule()['monday'].closed).toBe(false);
      expect(mondayCard.querySelectorAll('input[type="time"]')).toHaveLength(2);

      const checkboxes = mondayCard.querySelectorAll(
        'input[type="checkbox"]',
      ) as NodeListOf<HTMLInputElement>;
      checkboxes[1].click();
      fixture.detectChanges();

      expect(component.schedule()['monday'].hasSplit).toBe(true);
      expect(mondayCard.querySelectorAll('input[type="time"]')).toHaveLength(4);
    });
  });
});
