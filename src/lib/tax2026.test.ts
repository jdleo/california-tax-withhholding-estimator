import {
  calculate,
  federalTax,
  californiaTax,
  federalStandardDeduction,
  californiaStandardDeduction,
  seniorBonusDeduction,
  taxFromBrackets,
  marginalRate,
  remainingPayPeriods,
  statusClass,
  FED_BRACKETS,
  CA_BRACKETS,
  type EstimatorInput,
  type FilingStatus,
} from './tax2026.ts';

let passed = 0;
const failures: string[] = [];
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (e) {
    failures.push(`${name}: ${(e as Error).message}`);
  }
}
function eq(got: number, want: number, tol = 0.005) {
  if (!Number.isFinite(got) || Math.abs(got - want) > tol) {
    throw new Error(`got ${got}, want ${want}`);
  }
}
function isTrue(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const NO65 = { age65: false, blind: false };
const NOW = new Date('2026-08-30T12:00:00');
function mkInput(o: Partial<EstimatorInput> = {}): EstimatorInput {
  return {
    status: 'single',
    flags: { ...NO65 },
    spouseFlags: { ...NO65 },
    claimingDependents: false,
    childrenUnder17: 0,
    otherDependents: 0,
    isDependent: false,
    ytdGross: 0,
    ytdFederalWithheld: 0,
    ytdCaWithheld: 0,
    frequency: 'monthly',
    grossPerPeriod: 0,
    federalWhPerPeriod: 0,
    caWhPerPeriod: 0,
    vests: [],
    variancePct: 0,
    now: NOW,
    ...o,
  };
}

test('federal brackets are well-formed', () => {
  for (const table of [FED_BRACKETS.single, FED_BRACKETS.mfj, CA_BRACKETS.single, CA_BRACKETS.mfj]) {
    isTrue(table[table.length - 1].upTo === Infinity, 'last bracket must be open');
    for (let i = 1; i < table.length; i++) {
      isTrue(table[i].upTo > table[i - 1].upTo, 'bracket tops must strictly increase');
    }
  }
  eq(FED_BRACKETS.single[0].upTo, 12400);
  eq(FED_BRACKETS.single[6].rate, 0.37);
  eq(FED_BRACKETS.mfj[0].upTo, 24800);
  eq(CA_BRACKETS.single[7].upTo, 721314);
  eq(CA_BRACKETS.single[8].rate, 0.123);
  eq(CA_BRACKETS.mfj[7].upTo, 1442628);
  eq(CA_BRACKETS.mfj[8].rate, 0.123);
});

test('federal tax, single, every bracket boundary', () => {
  const b = FED_BRACKETS.single;
  eq(taxFromBrackets(0, b), 0);
  eq(taxFromBrackets(12399, b), 1239.9);
  eq(taxFromBrackets(12400, b), 1240);
  eq(taxFromBrackets(50400, b), 5800);
  eq(taxFromBrackets(105700, b), 17966);
  eq(taxFromBrackets(201775, b), 41024);
  eq(taxFromBrackets(256225, b), 58448);
  eq(taxFromBrackets(640600, b), 192979.25);
  eq(taxFromBrackets(640601, b), 192979.62);
  eq(taxFromBrackets(1500000, b), 510957.25);
});

test('federal tax, MFJ, every bracket boundary', () => {
  const b = FED_BRACKETS.mfj;
  eq(taxFromBrackets(24800, b), 2480);
  eq(taxFromBrackets(100800, b), 11600);
  eq(taxFromBrackets(211400, b), 35932);
  eq(taxFromBrackets(403550, b), 82048);
  eq(taxFromBrackets(512450, b), 116896);
  eq(taxFromBrackets(768700, b), 206583.5);
  eq(taxFromBrackets(768701, b), 206583.87);
});

test('CA tax, single, every bracket boundary', () => {
  const b = CA_BRACKETS.single;
  eq(taxFromBrackets(10756, b), 107.56);
  eq(taxFromBrackets(25499, b), 402.42);
  eq(taxFromBrackets(40245, b), 992.26);
  eq(taxFromBrackets(55866, b), 1929.52);
  eq(taxFromBrackets(70612, b), 3109.2);
  eq(taxFromBrackets(360659, b), 30083.571);
  eq(taxFromBrackets(432787, b), 37512.755);
  eq(taxFromBrackets(721314, b), 70116.306);
});

test('CA tax, MFJ, every bracket boundary', () => {
  const b = CA_BRACKETS.mfj;
  eq(taxFromBrackets(21512, b), 215.12);
  eq(taxFromBrackets(50998, b), 804.84);
  eq(taxFromBrackets(80490, b), 1984.52);
  eq(taxFromBrackets(111732, b), 3859.04);
  eq(taxFromBrackets(141224, b), 6218.4);
  eq(taxFromBrackets(721318, b), 60167.142);
  eq(taxFromBrackets(865574, b), 75025.51);
  eq(taxFromBrackets(1442628, b), 140232.612);
});

test('CA mental health services tax 1% over $1M', () => {
  const b = CA_BRACKETS.single;
  eq(taxFromBrackets(1000000, b), 104394.684, 0.01);
  const at = taxFromBrackets(1000000, b);
  const justOver = taxFromBrackets(1000001, b);
  eq(justOver - at, 0.123);
});

test('marginal rate lands in the right bracket', () => {
  eq(marginalRate(0, FED_BRACKETS.single), 0.1);
  eq(marginalRate(12399, FED_BRACKETS.single), 0.1);
  eq(marginalRate(12400, FED_BRACKETS.single), 0.12);
  eq(marginalRate(105700, FED_BRACKETS.single), 0.24);
  eq(marginalRate(640600, FED_BRACKETS.single), 0.37);
  eq(marginalRate(1500000, CA_BRACKETS.mfj), 0.123);
});

test('status class mapping', () => {
  isTrue(statusClass('single') === 'single', 'single');
  isTrue(statusClass('mfs') === 'single', 'mfs');
  isTrue(statusClass('hoh') === 'single', 'hoh');
  isTrue(statusClass('mfj') === 'mfj', 'mfj');
  isTrue(statusClass('qss') === 'mfj', 'qss');
});

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

test('CA standard deductions by status and dependent limit', () => {
  eq(californiaStandardDeduction('single', false, 0), 5706);
  eq(californiaStandardDeduction('mfj', false, 0), 11412);
  eq(californiaStandardDeduction('mfs', false, 0), 5706);
  eq(californiaStandardDeduction('hoh', false, 0), 11412);
  eq(californiaStandardDeduction('qss', false, 0), 11412);
  eq(californiaStandardDeduction('single', true, 1000), 1450);
  eq(californiaStandardDeduction('single', true, 20000), 5706);
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

function ca(
  income: number,
  status: FilingStatus,
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

test('projection: wages, liability, and gap', () => {
  const r = calculate(mkInput({
    ytdGross: 100000,
    ytdFederalWithheld: 15000,
    ytdCaWithheld: 4000,
    frequency: 'monthly',
    lastPayDate: '2026-08-31',
    grossPerPeriod: 5000,
    federalWhPerPeriod: 300,
    caWhPerPeriod: 120,
  }));
  eq(r.remainingPeriods, 4);
  eq(r.base.grossIncome, 120000);
  eq(r.base.fed.net, 17570);
  eq(r.base.ca.net, 7012.625);
  eq(r.base.projectedFederalWithheld, 16200);
  eq(r.base.projectedCaWithheld, 4480);
  eq(r.base.projectedFederalWithheld - r.base.fed.net, -1370);
});

test('vest withholding defaults to 40% split by paycheck ratio', () => {
  const r = calculate(mkInput({
    ytdGross: 100000,
    ytdFederalWithheld: 15000,
    ytdCaWithheld: 4000,
    frequency: 'monthly',
    lastPayDate: '2026-08-31',
    grossPerPeriod: 5000,
    federalWhPerPeriod: 300,
    caWhPerPeriod: 120,
    vests: [{ date: '2026-12-15', amount: 50000 }],
  }));
  eq(r.vestFederalPct, 0.4 * (300 / 420), 0.0001);
  eq(r.vestCaPct, 0.4 * (120 / 420), 0.0001);
  eq(r.base.vestWithheldFederal, 50000 * 0.4 * (300 / 420));
  eq(r.base.vestWithheldCa, 50000 * 0.4 * (120 / 420));
  eq(r.base.projectedFederalWithheld, 16200 + 50000 * 0.4 * (300 / 420));
});

test('vest withholding falls back to 30/10 when paycheck withholding is zero', () => {
  const r = calculate(mkInput({
    vests: [{ date: '2026-12-15', amount: 50000 }],
    federalWhPerPeriod: 0,
    caWhPerPeriod: 0,
  }));
  eq(r.vestFederalPct, 0.3, 0.0001);
  eq(r.vestCaPct, 0.1, 0.0001);
});

test('custom last-vest percentages override the 40% default', () => {
  const r = calculate(mkInput({
    frequency: 'monthly',
    lastPayDate: '2026-08-31',
    federalWhPerPeriod: 300,
    caWhPerPeriod: 120,
    vests: [{ date: '2026-12-15', amount: 50000 }],
    vestFederalPct: 22,
    vestCaPct: 8,
  }));
  eq(r.vestFederalPct, 0.22, 0.0001);
  eq(r.vestCaPct, 0.08, 0.0001);
  eq(r.base.vestWithheldFederal, 11000);
  eq(r.base.vestWithheldCa, 4000);
});

test('variance scenarios scale both vest income and vest withholding', () => {
  const r = calculate(mkInput({
    ytdGross: 100000,
    frequency: 'monthly',
    lastPayDate: '2026-08-31',
    grossPerPeriod: 5000,
    federalWhPerPeriod: 300,
    caWhPerPeriod: 120,
    vests: [{ date: '2026-12-15', amount: 50000 }],
    variancePct: 20,
  }));
  eq(r.vestLow, 40000);
  eq(r.vestHigh, 60000);
  eq(r.low.grossIncome, 160000);
  eq(r.high.grossIncome, 180000);
  eq(r.low.vestWithheldFederal, 40000 * 0.4 * (300 / 420));
  eq(r.high.vestWithheldCa, 60000 * 0.4 * (120 / 420));
  isTrue(r.low.fed.net <= r.base.fed.net && r.base.fed.net <= r.high.fed.net, 'liability must scale with vests');
});

test('zero variance collapses the range onto the base scenario', () => {
  const r = calculate(mkInput({
    vests: [{ date: '2026-12-15', amount: 50000 }],
    variancePct: 0,
  }));
  eq(r.low.grossIncome, r.base.grossIncome);
  eq(r.high.grossIncome, r.base.grossIncome);
  eq(r.low.fed.net, r.base.fed.net);
});

test('no vests means no vest withholding anywhere', () => {
  const r = calculate(mkInput({ ytdGross: 50000, variancePct: 20 }));
  eq(r.vestTotal, 0);
  eq(r.base.vestWithheldFederal, 0);
  eq(r.low.grossIncome, r.base.grossIncome);
});

test('late-in-year cadence yields zero remaining paychecks', () => {
  const r = calculate(mkInput({
    frequency: 'monthly',
    lastPayDate: '2026-12-31',
    ytdGross: 90000,
    grossPerPeriod: 5000,
  }));
  eq(r.remainingPeriods, 0);
  eq(r.base.grossIncome, 90000);
});

test('MFJ projection with CTC end-to-end', () => {
  const r = calculate(mkInput({
    status: 'mfj',
    claimingDependents: true,
    childrenUnder17: 2,
    otherDependents: 1,
    ytdGross: 120000,
    frequency: 'biweekly',
    lastPayDate: '2026-08-28',
    grossPerPeriod: 3000,
    federalWhPerPeriod: 400,
    caWhPerPeriod: 150,
    vests: [{ date: '2026-12-15', amount: 50000 }],
    variancePct: 20,
  }));
  eq(r.remainingPeriods, 8);
  eq(r.base.grossIncome, 194000);
  eq(r.base.fed.taxable, 161800);
  eq(r.base.fed.net, 20120);
  eq(r.base.ca.net, 8361.252);
  eq(r.low.grossIncome, 184000);
  eq(r.high.grossIncome, 204000);
});

test('dependent filer projection owes nothing on low income', () => {
  const r = calculate(mkInput({
    isDependent: true,
    ytdGross: 20000,
    frequency: 'weekly',
    lastPayDate: '2026-08-28',
    grossPerPeriod: 500,
    federalWhPerPeriod: 40,
    caWhPerPeriod: 10,
  }));
  eq(r.remainingPeriods, 17);
  eq(r.base.grossIncome, 28500);
  eq(r.base.fed.taxable, 12400);
  eq(r.base.fed.net, 1240);
});

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

      const c = ca(income, status, californiaStandardDeduction(status, false, income), NO65, NO65, 3);
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

for (const f of failures) console.log(`FAIL ${f}`);
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) process.exit(1);
