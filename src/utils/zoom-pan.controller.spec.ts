import { signal } from '@angular/core';

import { describe, expect, it } from 'vitest';

import { ZoomPanController } from './zoom-pan.controller';

describe('ZoomPanController', () => {
  const createController = () => {
    const scale = signal(1);
    const position = signal({ x: 0, y: 0 });
    return new ZoomPanController(
      scale,
      position,
      () => null,
      () => 1,
    );
  };

  it('resets dragState.hasMoved and sets drag cooldown on onMouseUp when moved', () => {
    const controller = createController();
    controller.dragState.isDragging = true;
    controller.dragState.hasMoved = true;

    controller.onMouseUp();

    expect(controller.dragState.isDragging).toBe(false);
    expect(controller.dragState.hasMoved).toBe(false);
    expect(controller.wasRecentlyDragging(300)).toBe(true);
  });

  it('does not set drag cooldown on onMouseUp when hasMoved was false (normal click)', () => {
    const controller = createController();
    controller.dragState.isDragging = true;
    controller.dragState.hasMoved = false;

    controller.onMouseUp();

    expect(controller.dragState.isDragging).toBe(false);
    expect(controller.dragState.hasMoved).toBe(false);
    expect(controller.wasRecentlyDragging(300)).toBe(false);
  });

  it('resets dragState.hasMoved and sets cooldown on onTouchEnd when moved', () => {
    const controller = createController();
    controller.dragState.isDragging = true;
    controller.dragState.hasMoved = true;

    controller.onTouchEnd();

    expect(controller.dragState.isDragging).toBe(false);
    expect(controller.dragState.hasMoved).toBe(false);
    expect(controller.wasRecentlyDragging(300)).toBe(true);
  });
});
