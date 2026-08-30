import { federalStandardDeduction, seniorBonusDeduction, federalTax } from './federal.ts';
import { californiaStandardDeduction, californiaTax } from './california.ts';
import { taxFromBrackets, FED_BRACKETS, CA_BRACKETS } from './brackets.ts';
import type { FilingStatus } from './brackets.ts';
import { test, eq, isTrue, NO65 } from './testing.ts';

function fed(
  income: number,
  status: FilingStatus,
  sd: number,
  sen = 0,
  kids = 0,
  others = 0
) {
  return federalTax(income, { status, standardDeduction: sd, seniorDeduction: sen, childrenUnder17: kids, otherDependents: others });
}

function ca(
  income: number,
  status: Parameters<typeof californiaTax>[0],
  sd: number
) {
  return californiaTax(income, { status, standardDeduction: sd, flags: NO65, spouseFlags: NO65, dependents: 3 });
}

test('invariants and monotonicity across income sweep, all statuses', () => {
  const statuses: FilingStatus[] = ['single', 'mfj', 'mfs', 'hoh', 'qss'];
  for (const status of statuses) {
    let prevFed = -1;
    let prevCa = -1;
    for (let income = 0; income <= 2000000; income += 9937) {
      const sd = federalStandardDeduction(status, NO65, NO65, false, income);
      const sen = seniorBonusDeduction(status, NO65, NO65, income);
      const f = fed(income, status, sd, sen, 2, 1);
      isTrue(f.taxable >= 0, `fed taxable negative at ${income} ${status}`);
      isTrue(f.net >= 0, `fed net negative at ${income} ${status}`);
      isTrue(f.net <= f.taxBeforeCredits + 0.005, `fed net exceeds pre-credit tax at ${income} ${status}`);
      isTrue(f.net >= prevFed - 0.005, `fed net decreased at ${income} ${status}`);
      isTrue([0, 0.1, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37].includes(f.marginal), `bad fed marginal at ${income} ${status}`);
      prevFed = f.net;

      const c = ca(income, status, californiaStandardDeduction(status, false, income));
      isTrue(c.taxable >= 0, `ca taxable negative at ${income} ${status}`);
      isTrue(c.net >= 0, `ca net negative at ${income} ${status}`);
      isTrue(c.net <= c.taxBeforeCredits + 0.005, `ca net exceeds pre-credit tax at ${income} ${status}`);
      isTrue(c.net >= prevCa - 0.005, `ca net decreased at ${income} ${status}`);
      isTrue([0, 0.01, 0.02, 0.04, 0.06, 0.08, 0.093, 0.103, 0.113, 0.123].includes(c.marginal), `bad ca marginal at ${income} ${status}`);
      prevCa = c.net;
    }
    isTrue(prevFed > 0 && prevCa > 0, `high income must produce positive tax for ${status}`);
  }
});

test('bracket continuity: tax is continuous across every boundary', () => {
  for (const table of [FED_BRACKETS.single, FED_BRACKETS.mfj, CA_BRACKETS.single, CA_BRACKETS.mfj]) {
    for (const bracket of table) {
      if (!Number.isFinite(bracket.upTo)) continue;
      const below = taxFromBrackets(bracket.upTo - 0.01, table);
      const at = taxFromBrackets(bracket.upTo, table);
      isTrue(at - below <= bracket.rate, `tax discontinuity at ${bracket.upTo}`);
      isTrue(at - below > 0, `tax flat at ${bracket.upTo}`);
    }
  }
});
