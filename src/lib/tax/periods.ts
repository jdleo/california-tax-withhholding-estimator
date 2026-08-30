export type PayFrequency = 'weekly' | 'biweekly' | 'monthly';

export function remainingPayPeriods(
  frequency: PayFrequency,
  lastPayDate?: string,
  now: Date = new Date()
): number {
  const end = new Date(2026, 11, 31, 23, 59, 59).getTime();
  if (!lastPayDate) {
    const days = Math.max(0, Math.floor((end - now.getTime()) / 86400000) + 1);
    if (frequency === 'weekly') return Math.floor(days / 7);
    if (frequency === 'biweekly') return Math.floor(days / 14);
    const firstOfNext = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    let count = 0;
    for (let t = firstOfNext; t <= end; t = new Date(new Date(t).getFullYear(), new Date(t).getMonth() + 1, 1).getTime()) {
      count++;
    }
    return count;
  }
  const last = new Date(lastPayDate + 'T00:00:00');
  if (frequency === 'weekly' || frequency === 'biweekly') {
    const stepDays = frequency === 'weekly' ? 7 : 14;
    let count = 0;
    const next = new Date(last);
    next.setDate(next.getDate() + stepDays);
    while (next.getTime() <= end) {
      count++;
      next.setDate(next.getDate() + stepDays);
    }
    return count;
  }
  let count = 0;
  for (let k = 1; ; k++) {
    const y = last.getFullYear();
    const m = last.getMonth() + k;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const d = new Date(y, m, Math.min(last.getDate(), lastDay)).getTime();
    if (d > end) break;
    count++;
  }
  return count;
}
