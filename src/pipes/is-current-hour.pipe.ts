import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'isCurrentHour',
  standalone: true,
  pure: true,
})
export class IsCurrentHourPipe implements PipeTransform {
  transform(value: Date | string | null | undefined): boolean {
    if (!value) return false;

    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return false;

    const now = new Date();
    return (
      date.getHours() === now.getHours() &&
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }
}
