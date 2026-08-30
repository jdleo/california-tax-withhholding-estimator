import { californiaStandardDeduction, californiaTax } from './california.ts';
import { test, eq, NO65 } from './testing.ts';

test('CA standard deductions by status and dependent limit', () => {
  eq(californiaStandardDeduction('single', false, 0), 5706);
  eq(californiaStandardDeduction('mfj', false, 0), 11412);
  eq(californiaStandardDeduction('mfs', false, 0), 5706);
  eq(californiaStandardDeduction('hoh', false, 0), 11412);
  eq(californiaStandardDeduction('qss', false, 0), 11412);
  eq(californiaStandardDeduction('single', true, 1000), 1450);
  eq(californiaStandardDeduction('single', true, 20000), 5706);
});

function ca(
  income: number,
  status: Parameters<typeof californiaTax>[0],
  sd: number,
  flags = NO65,
  spouseFlags = NO65,
  dependents = 0
) {
  return californiaTax(income, { status, standardDeduction: sd, flags, spouseFlags, dependents });
}

test('CA liability, single and MFJ, with exemption credits', () => {
  const s = ca(100000, 'single', 5706);
  eq(s.taxable, 94294);
  eq(s.taxBeforeCredits, 5311.626);
  eq(s.net, 5152.626);
  eq(s.marginal, 0.093);
  eq(ca(100000, 'mfj', 11412).net, 2152.4);
  eq(ca(100000, 'mfj', 11412, NO65, NO65, 2).net, 1228.4);
  eq(ca(120000, 'single', 5706).net, 7012.625);
});

test('CA exemption credits for seniors, blind, and dependents', () => {
  eq(ca(100000, 'single', 5706, { age65: true, blind: false }).net, 5007.626);
  eq(
    ca(100000, 'mfj', 11412, { age65: true, blind: true }, { age65: true, blind: true }, 2).net,
    648.4
  );
});

test('CA mental health tax applies above $1M taxable', () => {
  const c = ca(1010000, 'single', 5706);
  eq(c.mentalHealthTax, 42.94);
  eq(c.net, 104806.786);
  eq(ca(1000000, 'single', 5706).mentalHealthTax, 0);
});
