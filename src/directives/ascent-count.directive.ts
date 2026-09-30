import {
  Directive,
  ElementRef,
  Renderer2,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';

import { formatAscentCount } from '../utils';

@Directive({
  selector: '[appAscentCount]',
  exportAs: 'appAscentCount',
  standalone: true,
})
export class AscentCountDirective {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  readonly count = input<number | null | undefined>(0, {
    alias: 'appAscentCount',
  });

  readonly formatted = computed(() => formatAscentCount(this.count()));

  constructor() {
    effect(() => {
      const text = this.formatted();
      this.renderer.setProperty(
        this.elementRef.nativeElement,
        'textContent',
        text,
      );
    });
  }
}
