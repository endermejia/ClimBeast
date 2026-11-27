import { Overlay } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MentionHintDirective } from './mention-hint.directive';

@Component({
  imports: [MentionHintDirective],
  template: `
    <div appMentionHint>
      <a class="mention-link" data-id="user-1" data-name="@Alice">@Alice</a>
      <a class="mention-link" data-id="user-2" data-name="@Bob">@Bob</a>
    </div>
  `,
})
class TestHostComponent {}

interface AbortableTarget {
  contains: (node: Node | null) => boolean;
  addEventListener: (
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions,
  ) => void;
  dispatchEvent: (event: Event) => boolean;
  listenerCount: (type: string) => number;
}

function createAbortableTarget(): AbortableTarget {
  const listeners = new Map<string, Set<EventListener>>();
  return {
    contains: () => false,
    addEventListener(
      type: string,
      listener: EventListener,
      options?: boolean | AddEventListenerOptions,
    ): void {
      const signal = typeof options === 'object' ? options?.signal : undefined;
      if (signal?.aborted) return;
      let set = listeners.get(type);
      if (!set) {
        set = new Set();
        listeners.set(type, set);
      }
      set.add(listener);
      signal?.addEventListener(
        'abort',
        () => {
          listeners.get(type)?.delete(listener);
        },
        { once: true },
      );
    },
    dispatchEvent(event: Event): boolean {
      for (const listener of [...(listeners.get(event.type) ?? [])]) {
        listener(event);
      }
      return true;
    },
    listenerCount(type: string): number {
      return listeners.get(type)?.size ?? 0;
    },
  };
}

interface FakeHintEntry {
  element: AbortableTarget;
  addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  dispose: ReturnType<typeof vi.fn>;
  setInput: ReturnType<typeof vi.fn>;
}

function getCapturedSignals(entry: FakeHintEntry): AbortSignal[] {
  const signals: AbortSignal[] = [];
  for (const call of entry.addEventListenerSpy.mock.calls) {
    const options = call[2];
    if (typeof options === 'object' && options?.signal) {
      signals.push(options.signal);
    }
  }
  return signals;
}

describe('MentionHintDirective', () => {
  let hints: FakeHintEntry[];
  let overlayMock: {
    position: ReturnType<typeof vi.fn>;
    scrollStrategies: { reposition: ReturnType<typeof vi.fn> };
    create: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    hints = [];

    const positionStrategy = {
      flexibleConnectedTo: vi.fn().mockReturnThis(),
      withPositions: vi.fn().mockReturnThis(),
    };

    overlayMock = {
      position: vi.fn(() => positionStrategy),
      scrollStrategies: {
        reposition: vi.fn(() => ({})),
      },
      create: vi.fn(() => {
        const element = createAbortableTarget();
        const addEventListenerSpy = vi.spyOn(element, 'addEventListener');
        const dispose = vi.fn();
        const setInput = vi.fn();
        hints.push({ element, addEventListenerSpy, dispose, setInput });

        return {
          attach: vi.fn(() => ({
            setInput,
            changeDetectorRef: { detectChanges: vi.fn() },
            location: { nativeElement: element },
          })),
          dispose,
          updatePosition: vi.fn(),
        };
      }),
    };

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideRouter([]),
        { provide: Overlay, useValue: overlayMock },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('attaches mouseenter/mouseleave with an AbortSignal and aborts them on close', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const mentionEl = fixture.nativeElement.querySelector(
      'a[data-id="user-1"]',
    ) as HTMLElement;

    mentionEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    expect(hints).toHaveLength(1);
    const hint = hints[0];
    const signals = getCapturedSignals(hint);
    expect(hint.setInput).toHaveBeenCalledWith('userId', 'user-1');
    expect(hint.setInput).toHaveBeenCalledWith('fallbackName', 'Alice');
    expect(signals).toHaveLength(2);
    expect(signals[0]).toBe(signals[1]);
    expect(signals[0].aborted).toBe(false);
    expect(hint.element.listenerCount('mouseenter')).toBe(1);
    expect(hint.element.listenerCount('mouseleave')).toBe(1);

    // Leaving the hint schedules close, entering cancels it
    hint.element.dispatchEvent(new Event('mouseleave'));
    vi.advanceTimersByTime(100);
    hint.element.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(250);
    expect(hint.dispose).not.toHaveBeenCalled();
    expect(signals[0].aborted).toBe(false);

    // Leaving again closes the hint after 200ms and aborts listeners
    hint.element.dispatchEvent(new Event('mouseleave'));
    vi.advanceTimersByTime(200);

    expect(signals[0].aborted).toBe(true);
    expect(hint.element.listenerCount('mouseenter')).toBe(0);
    expect(hint.element.listenerCount('mouseleave')).toBe(0);
    expect(hint.dispose).toHaveBeenCalledTimes(1);

    // Aborted listeners no longer schedule timers after close
    const timersAfterClose = vi.getTimerCount();
    hint.element.dispatchEvent(new Event('mouseleave'));
    expect(vi.getTimerCount()).toBe(timersAfterClose);
  });

  it('aborts listeners from previous hint when switching mentions and on click', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const firstMention = fixture.nativeElement.querySelector(
      'a[data-id="user-1"]',
    ) as HTMLElement;
    const secondMention = fixture.nativeElement.querySelector(
      'a[data-id="user-2"]',
    ) as HTMLElement;

    firstMention.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(hints).toHaveLength(1);
    const firstSignals = getCapturedSignals(hints[0]);
    expect(firstSignals[0].aborted).toBe(false);

    secondMention.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(hints).toHaveLength(2);
    const secondSignals = getCapturedSignals(hints[1]);
    expect(firstSignals[0].aborted).toBe(true);
    expect(hints[0].element.listenerCount('mouseenter')).toBe(0);
    expect(hints[0].element.listenerCount('mouseleave')).toBe(0);
    expect(hints[0].dispose).toHaveBeenCalledTimes(1);
    expect(secondSignals[0].aborted).toBe(false);

    secondMention.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(secondSignals[0].aborted).toBe(true);
    expect(hints[1].element.listenerCount('mouseenter')).toBe(0);
    expect(hints[1].element.listenerCount('mouseleave')).toBe(0);
    expect(hints[1].dispose).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(['/profile', 'user-2']);
  });

  it('aborts hint listeners and disposes overlay on directive destroy', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const mentionEl = fixture.nativeElement.querySelector(
      'a[data-id="user-1"]',
    ) as HTMLElement;
    mentionEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    expect(hints).toHaveLength(1);
    const hint = hints[0];
    const signals = getCapturedSignals(hint);
    expect(signals[0].aborted).toBe(false);

    fixture.destroy();

    expect(signals[0].aborted).toBe(true);
    expect(hint.element.listenerCount('mouseenter')).toBe(0);
    expect(hint.element.listenerCount('mouseleave')).toBe(0);
    expect(hint.dispose).toHaveBeenCalledTimes(1);

    const timersAfterDestroy = vi.getTimerCount();
    hint.element.dispatchEvent(new Event('mouseleave'));
    expect(vi.getTimerCount()).toBe(timersAfterDestroy);
  });
});
