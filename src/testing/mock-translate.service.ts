import { Injectable } from '@angular/core';
import { signal, WritableSignal } from '@angular/core';

import { LangChangeEvent } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';

@Injectable()
export class MockTranslateService {
  currentLang: WritableSignal<string> = signal('es');
  defaultLang = 'es';
  onLangChange = new Subject<LangChangeEvent>();
  onDefaultLangChange = new Subject<LangChangeEvent>();

  instant(key: string, _params?: Record<string, unknown>): string {
    return key;
  }

  get(key: string, _params?: Record<string, unknown>) {
    return of(key);
  }

  setDefaultLang(_lang: string): void {
    // Intentionally empty for mock
  }
  use(_lang: string): void {
    // Intentionally empty for mock
  }
}

export class MockTranslatePipe {
  transform(value: string): string {
    return value;
  }
}
