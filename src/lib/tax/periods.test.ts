import { remainingPayPeriods } from './periods.ts';
import { test, eq, NOW } from './testing.ts';

test('remaining pay periods from last pay date', () => {
  eq(remainingPayPeriods('weekly', '2026-08-28', NOW), 17);
  eq(remainingPayPeriods('biweekly', '2026-08-28', NOW), 8);
  eq(remainingPayPeriods('monthly', '2026-08-31', NOW), 4);
  eq(remainingPayPeriods('monthly', '2026-08-15', NOW), 4);
  eq(remainingPayPeriods('monthly', '2026-01-15', NOW), 11);
  eq(remainingPayPeriods('weekly', '2026-01-02', NOW), 51);
  eq(remainingPayPeriods('biweekly', '2026-01-01', NOW), 26);
  eq(remainingPayPeriods('weekly', '2026-12-24', NOW), 1);
  eq(remainingPayPeriods('weekly', '2026-12-25', NOW), 0);
  eq(remainingPayPeriods('monthly', '2026-12-01', NOW), 0);
  eq(remainingPayPeriods('biweekly', '2026-12-18', NOW), 0);
});

test('pay period counting is DST-safe (calendar stepping, not raw ms)', () => {
  eq(remainingPayPeriods('biweekly', '2026-10-16', NOW), 5);
  eq(remainingPayPeriods('biweekly', '2026-10-23', NOW), 4);
  eq(remainingPayPeriods('weekly', '2026-10-30', NOW), 8);
});

test('monthly counting clamps short months (Jan 31 cadence)', () => {
  eq(remainingPayPeriods('monthly', '2026-01-31', NOW), 11);
});

test('fallback counts from today when no last pay date', () => {
  eq(remainingPayPeriods('monthly', undefined, NOW), 4);
  eq(remainingPayPeriods('weekly', undefined, NOW), 17);
  eq(remainingPayPeriods('biweekly', undefined, NOW), 8);
});
