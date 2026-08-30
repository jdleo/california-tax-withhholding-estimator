const usdFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function usd(n: number): string {
  return usdFmt.format(Math.round(n));
}

export function pct(rate: number): string {
  const p = rate * 100;
  return p.toFixed(p % 1 === 0 ? 0 : 1) + '%';
}

export function describeGap(gap: number): string {
  if (Math.abs(gap) <= 25) return 'on track';
  if (gap > 0) return `overwithheld by ${usd(gap)}`;
  return `underwithheld by ${usd(-gap)}`;
}
