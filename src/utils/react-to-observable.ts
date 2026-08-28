import { DestroyRef, inject, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { Observable } from 'rxjs';

/** Bridges an Observable event stream into Angular's lifecycle-managed subscription. */
export function reactToObservable<T>(
  source: Observable<T>,
  callback: (value: T) => void,
  injector?: Injector,
): void {
  const destroyRef = injector ? injector.get(DestroyRef) : inject(DestroyRef);
  source.pipe(takeUntilDestroyed(destroyRef)).subscribe(callback);
}
