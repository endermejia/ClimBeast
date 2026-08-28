import { effect, inject, Injector } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { map, type Observable } from 'rxjs';

/** Bridges an Observable event stream into Angular's signal-based reactive graph. */
export function reactToObservable<T>(
  source: Observable<T>,
  callback: (value: T) => void,
  injector = inject(Injector),
): void {
  const event = toSignal(source.pipe(map((value) => ({ value }))), {
    initialValue: null,
    injector,
  });

  effect(
    () => {
      const emission = event();
      if (emission) callback(emission.value);
    },
    { injector },
  );
}
