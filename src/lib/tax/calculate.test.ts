import { calculate } from './calculate.ts';
import { test, eq, isTrue, mkInput } from './testing.ts';

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
