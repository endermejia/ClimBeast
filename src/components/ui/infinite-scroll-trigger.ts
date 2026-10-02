import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  output,
} from '@angular/core';

@Component({
  selector: 'app-infinite-scroll-trigger',
  template: '<div class="h-1 w-full"></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfiniteScrollTriggerComponent
  implements AfterViewInit, OnDestroy
{
  private el = inject(ElementRef);
  private ngZone = inject(NgZone);

  intersect = output<void>();
  private observer?: IntersectionObserver;

  ngAfterViewInit() {
    // Run IntersectionObserver outside Angular's zone to prevent change detection
    // triggers on non-intersecting scroll events or layout updates.
    this.ngZone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          // Re-enter Angular zone only when intersection actually occurs to trigger event handler safely.
          this.ngZone.run(() => {
            this.intersect.emit();
          });
        }
      });
      this.observer.observe(this.el.nativeElement);
    });
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
