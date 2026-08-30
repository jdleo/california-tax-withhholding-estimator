import { federalStandardDeduction, seniorBonusDeduction, federalTax } from './federal.ts';
import type { FilingStatus } from './brackets.ts';
import { test, eq, isTrue, NO65 } from './testing.ts';

test('federal standard deductions by status', () => {
  eq(federalStandardDeduction('single', NO65, NO65, false, 0), 16100);
  eq(federalStandardDeduction('mfj', NO65, NO65, false, 0), 32200);
  eq(federalStandardDeduction('mfs', NO65, NO65, false, 0), 16100);
  eq(federalStandardDeduction('hoh', NO65, NO65, false, 0), 24150);
  eq(federalStandardDeduction('qss', NO65, NO65, false, 0), 32200);
});

test('additional standard deduction for 65+/blind', () => {
  eq(federalStandardDeduction('single', { age65: true, blind: false }, NO65, false, 0), 17700);
  eq(federalStandardDeduction('single', { age65: false, blind: true }, NO65, false, 0), 17700);
  eq(federalStandardDeduction('single', { age65: true, blind: true }, NO65, false, 0), 19300);
  eq(federalStandardDeduction('mfs', { age65: true, blind: false }, NO65, false, 0), 16900);
  eq(federalStandardDeduction('mfs', { age65: true, blind: true }, NO65, false, 0), 17700);
  eq(federalStandardDeduction('mfj', { age65: true, blind: true }, { age65: true, blind: true }, false, 0), 38600);
  eq(federalStandardDeduction('mfj', { age65: true, blind: false }, { age65: true, blind: true }, false, 0), 37000);
  eq(federalStandardDeduction('mfj', { age65: true, blind: false }, NO65, false, 0), 33800);
  eq(federalStandardDeduction('hoh', { age65: false, blind: true }, NO65, false, 0), 25750);
});

test('dependent standard deduction limitation', () => {
  eq(federalStandardDeduction('single', NO65, NO65, true, 1000), 1450);
  eq(federalStandardDeduction('single', NO65, NO65, true, 10000), 10450);
  eq(federalStandardDeduction('single', NO65, NO65, true, 20000), 16100);
  eq(federalStandardDeduction('mfj', NO65, NO65, true, 5000), 5450);
  eq(federalStandardDeduction('hoh', NO65, NO65, true, 20000), 20450);
});

test('senior bonus deduction full, partial, and fully phased out', () => {
  eq(seniorBonusDeduction('single', NO65, NO65, 100000), 0);
  eq(seniorBonusDeduction('single', { age65: true, blind: false }, NO65, 60000), 6000);
  eq(seniorBonusDeduction('single', { age65: true, blind: false }, NO65, 100000), 4500);
  eq(seniorBonusDeduction('single', { age65: true, blind: false }, NO65, 174999), 0.06);
  eq(seniorBonusDeduction('single', { age65: true, blind: false }, NO65, 175000), 0);
  eq(seniorBonusDeduction('single', { age65: true, blind: false }, NO65, 500000), 0);
  eq(seniorBonusDeduction('mfj', { age65: true, blind: false }, NO65, 100000), 6000);
  eq(seniorBonusDeduction('mfj', { age65: true, blind: false }, { age65: true, blind: false }, 100000), 12000);
  eq(seniorBonusDeduction('mfj', { age65: true, blind: false }, { age65: true, blind: false }, 200000), 9000);
  eq(seniorBonusDeduction('mfj', { age65: true, blind: false }, { age65: true, blind: false }, 320000), 1800);
  eq(seniorBonusDeduction('mfj', { age65: true, blind: false }, { age65: true, blind: false }, 350000), 0);
  eq(seniorBonusDeduction('qss', { age65: true, blind: false }, NO65, 200000), 3000);
  eq(seniorBonusDeduction('mfs', { age65: true, blind: false }, NO65, 200000), 0);
});

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

test('federal liability, single, no credits', () => {
  const f = fed(120000, 'single', 16100);
  eq(f.taxable, 103900);
  eq(f.net, 17570);
  eq(f.marginal, 0.22);
  eq(f.ctcApplied, 0);
  eq(f.refundableCtc, 0);
});

test('CTC applied in full below phase-out threshold', () => {
  const f = fed(120000, 'single', 16100, 0, 2);
  eq(f.ctcApplied, 4400);
  eq(f.net, 17570 - 4400);
});

test('CTC phase-out rounds up per $1,000 of excess MAGI', () => {
  eq(fed(200000, 'single', 16100, 0, 1).ctcApplied, 2200);
  eq(fed(200001, 'single', 16100, 0, 1).ctcApplied, 2150);
  eq(fed(200500, 'single', 16100, 0, 1).ctcApplied, 2150);
  eq(fed(200999, 'single', 16100, 0, 1).ctcApplied, 2150);
  eq(fed(201000, 'single', 16100, 0, 1).ctcApplied, 2150);
  eq(fed(201001, 'single', 16100, 0, 1).ctcApplied, 2100);
  eq(fed(400000, 'mfj', 32200, 0, 2).ctcApplied, 4400);
  eq(fed(400001, 'mfj', 32200, 0, 2).ctcApplied, 4350);
  eq(fed(420000, 'mfj', 32200, 0, 2).ctcApplied, 3400);
});

test('CTC fully phases out at high MAGI', () => {
  const f = fed(250000, 'single', 16100, 0, 1);
  eq(f.ctcApplied, 0);
  eq(f.net, f.taxBeforeCredits);
});

test('refundable CTC offsets below zero and is clipped at zero net', () => {
  const twoKids = fed(30000, 'single', 16100, 0, 2);
  eq(twoKids.taxBeforeCredits, 1420);
  eq(twoKids.ctcApplied, 1420);
  eq(twoKids.refundableCtc, 2980);
  eq(twoKids.net, 0);
  const oneKid = fed(30000, 'single', 16100, 0, 1);
  eq(oneKid.refundableCtc, 780);
  eq(oneKid.net, 0);
});

test('other dependent credit is non-refundable', () => {
  eq(fed(50000, 'single', 16100, 0, 0, 3).net, 2320);
  eq(fed(20000, 'single', 16100, 0, 0, 1).net, 0);
});

test('federal liability per filing status', () => {
  eq(fed(300000, 'mfs', 16100, 0, 1).net, 68134.25);
  eq(fed(500000, 'qss', 32200, 0, 0).net, 102608);
  eq(fed(100000, 'hoh', 24150, 0, 0).net, 11399);
  eq(fed(194000, 'mfj', 32200, 0, 2, 1).net, 20120);
});

test('MFS and QSS use their own CTC phase-out thresholds', () => {
  eq(fed(210000, 'mfs', 16100, 0, 1).ctcApplied, 1700);
  eq(fed(410000, 'qss', 32200, 0, 1).ctcApplied, 1700);
});

test('senior deduction flows into federal taxable income', () => {
  const f = fed(100000, 'single', 17700, 4500);
  eq(f.taxable, 77800);
  eq(f.net, 11828);
  eq(f.marginal, 0.22);
});

test('dependent filer with low income owes nothing', () => {
  const f = fed(10000, 'single', 10450);
  eq(f.taxable, 0);
  eq(f.net, 0);
  eq(f.marginal, 0);
});
