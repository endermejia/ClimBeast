import { inject, Pipe, PipeTransform } from '@angular/core';

import { LanguageService } from '../services/language.service';

/** Cache for Intl.DateTimeFormat instances to avoid expensive repeated instantiation in template rendering loops */
const dateTimeFormattersCache = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let formatter = dateTimeFormattersCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateTimeFormattersCache.set(key, formatter);
  }
  return formatter;
}

@Pipe({
  name: 'ascentDate',
  standalone: true,
  pure: true,
})
export class AscentDatePipe implements PipeTransform {
  private readonly languageService = inject(LanguageService);

  transform(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const parts = dateStr.substring(0, 10).split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return dateStr;

    const currentYear = new Date().getFullYear();
    const locale = this.languageService.selectedLanguage() || 'es';

    if (year === currentYear) {
      try {
        const formatter = getDateTimeFormatter(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
        return formatter.format(date).replace(',', '');
      } catch {
        // Fallback
      }
    }

    try {
      const formatter = getDateTimeFormatter(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      return formatter.format(date);
    } catch {
      return dateStr;
    }
  }
}
