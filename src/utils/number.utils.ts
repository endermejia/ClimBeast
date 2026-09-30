export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function progressPercent(completed: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, Math.floor((completed / total) * 100));
}

export function formatAscentCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  const num = Number(value);
  if (isNaN(num)) return '0';

  const rounded = Math.round(num);
  const abs = Math.abs(rounded);

  if (abs >= 1_000_000) {
    const v = rounded / 1_000_000;
    const formatted = (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '');
    return `${formatted}M`;
  }
  if (abs >= 1_000) {
    const v = rounded / 1_000;
    const numVal = Math.round(v * 10) / 10;
    if (numVal >= 1000) {
      return '1M';
    }
    const formatted = numVal.toFixed(1).replace(/\.0$/, '');
    return `${formatted}K`;
  }
  return rounded.toString();
}
