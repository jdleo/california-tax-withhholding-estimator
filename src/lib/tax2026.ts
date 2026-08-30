export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh' | 'qss';

export interface Bracket {
  rate: number;
  upTo: number;
}

export interface PersonFlags {
  age65: boolean;
  blind: boolean;
}

export interface Vest {
  date: string;
  amount: number;
}

export const FED_BRACKETS: Record<'single' | 'mfj', Bracket[]> = {
  single: [
    { rate: 0.1, upTo: 12400 },
    { rate: 0.12, upTo: 50400 },
    { rate: 0.22, upTo: 105700 },
    { rate: 0.24, upTo: 201775 },
    { rate: 0.32, upTo: 256225 },
    { rate: 0.35, upTo: 640600 },
    { rate: 0.37, upTo: Infinity },
  ],
  mfj: [
    { rate: 0.1, upTo: 24800 },
    { rate: 0.12, upTo: 100800 },
    { rate: 0.22, upTo: 211400 },
    { rate: 0.24, upTo: 403550 },
    { rate: 0.32, upTo: 512450 },
    { rate: 0.35, upTo: 768700 },
    { rate: 0.37, upTo: Infinity },
  ],
};

export const CA_BRACKETS: Record<'single' | 'mfj', Bracket[]> = {
  single: [
    { rate: 0.01, upTo: 10756 },
    { rate: 0.02, upTo: 25499 },
    { rate: 0.04, upTo: 40245 },
    { rate: 0.06, upTo: 55866 },
    { rate: 0.08, upTo: 70612 },
    { rate: 0.093, upTo: 360659 },
    { rate: 0.103, upTo: 432787 },
    { rate: 0.113, upTo: 721314 },
    { rate: 0.123, upTo: Infinity },
  ],
  mfj: [
    { rate: 0.01, upTo: 21512 },
    { rate: 0.02, upTo: 50998 },
    { rate: 0.04, upTo: 80490 },
    { rate: 0.06, upTo: 111732 },
    { rate: 0.08, upTo: 141224 },
    { rate: 0.093, upTo: 721318 },
    { rate: 0.103, upTo: 865574 },
    { rate: 0.113, upTo: 1442628 },
    { rate: 0.123, upTo: Infinity },
  ],
};

export const FED_STD_DEDUCTION: Record<FilingStatus, number> = {
  single: 16100,
  mfj: 32200,
  mfs: 16100,
  hoh: 24150,
  qss: 32200,
};

export const CA_STD_DEDUCTION: Record<FilingStatus, number> = {
  single: 5706,
  mfj: 11412,
  mfs: 5706,
  hoh: 11412,
  qss: 11412,
};

export const FED_ADDL_STD_PER_CONDITION = 1600;
export const FED_ADDL_STD_PER_CONDITION_MFS = 800;
export const SENIOR_BONUS_DEDUCTION = 6000;
export const SENIOR_BONUS_PHASEOUT = { single: 75000, mfj: 150000 } as const;
export const CTC = {
  perChild: 2200,
  refundablePerChild: 1700,
  phaseoutStep: 50,
  per1000: 1000,
  phaseoutStart: { single: 200000, mfj: 400000 },
} as const;
export const OTHER_DEPENDENT_CREDIT = 500;
export const DEPENDENT_STD_FLOOR = 1350;
export const DEPENDENT_STD_EARNED_ADD = 450;
export const CA_MENTAL_HEALTH_RATE = 0.01;
export const CA_MENTAL_HEALTH_THRESHOLD = 1000000;
export const CA_EXEMPTION_CREDITS = { personal: 159, dependent: 462, senior: 145, blind: 145 };
export const DEFAULT_VEST_WITHHOLDING_PCT = 40;

export function statusClass(status: FilingStatus): 'single' | 'mfj' {
  return status === 'mfj' || status === 'qss' ? 'mfj' : 'single';
}

export function taxFromBrackets(taxable: number, brackets: Bracket[]): number {
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    if (taxable <= prev) break;
    tax += (Math.min(taxable, b.upTo) - prev) * b.rate;
    prev = b.upTo;
  }
  return tax;
}

export function marginalRate(taxable: number, brackets: Bracket[]): number {
  for (const b of brackets) {
    if (taxable < b.upTo) return b.rate;
  }
  return brackets[brackets.length - 1].rate;
}

export function remainingPayPeriods(
  frequency: 'weekly' | 'biweekly' | 'monthly',
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

export function federalStandardDeduction(
  status: FilingStatus,
  flags: PersonFlags,
  spouseFlags: PersonFlags,
  isDependent: boolean,
  earnedIncome: number
): number {
  let std = FED_STD_DEDUCTION[status];
  const perCondition = status === 'mfs' ? FED_ADDL_STD_PER_CONDITION_MFS : FED_ADDL_STD_PER_CONDITION;
  let extra = ((flags.age65 ? 1 : 0) + (flags.blind ? 1 : 0)) * perCondition;
  if (status === 'mfj') {
    extra += ((spouseFlags.age65 ? 1 : 0) + (spouseFlags.blind ? 1 : 0)) * FED_ADDL_STD_PER_CONDITION;
  }
  std += extra;
  if (isDependent) {
    std = Math.min(std, Math.max(DEPENDENT_STD_FLOOR, earnedIncome + DEPENDENT_STD_EARNED_ADD));
  }
  return std;
}

export function seniorBonusDeduction(
  status: FilingStatus,
  flags: PersonFlags,
  spouseFlags: PersonFlags,
  magi: number
): number {
  let count = flags.age65 ? 1 : 0;
  if (status === 'mfj' && spouseFlags.age65) count += 1;
  if (count === 0) return 0;
  const start = statusClass(status) === 'mfj' ? SENIOR_BONUS_PHASEOUT.mfj : SENIOR_BONUS_PHASEOUT.single;
  let ded = count * SENIOR_BONUS_DEDUCTION;
  if (magi > start) ded = Math.max(0, ded - (magi - start) * 0.06);
  return ded;
}

export interface FedResult {
  taxable: number;
  taxBeforeCredits: number;
  net: number;
  marginal: number;
  ctcApplied: number;
  refundableCtc: number;
  otherDependentCredit: number;
}

export function federalTax(
  income: number,
  opts: {
    status: FilingStatus;
    standardDeduction: number;
    seniorDeduction: number;
    childrenUnder17: number;
    otherDependents: number;
  }
): FedResult {
  const taxable = Math.max(0, income - opts.standardDeduction - opts.seniorDeduction);
  const brackets = FED_BRACKETS[statusClass(opts.status)];
  const tax = taxFromBrackets(taxable, brackets);

  let ctc = opts.childrenUnder17 * CTC.perChild;
  const start = CTC.phaseoutStart[statusClass(opts.status)];
  if (income > start) {
    const excessUnits = Math.ceil((income - start) / CTC.per1000);
    ctc = Math.max(0, ctc - excessUnits * CTC.phaseoutStep);
  }
  const ctcApplied = Math.min(tax, ctc);
  const refundableCtc = Math.min(Math.max(0, ctc - tax), opts.childrenUnder17 * CTC.refundablePerChild);
  const otherCredit = opts.otherDependents * OTHER_DEPENDENT_CREDIT;
  const net = Math.max(0, tax - ctcApplied - refundableCtc - otherCredit);

  return {
    taxable,
    taxBeforeCredits: tax,
    net,
    marginal: marginalRate(taxable, brackets),
    ctcApplied,
    refundableCtc,
    otherDependentCredit: otherCredit,
  };
}

export function californiaStandardDeduction(
  status: FilingStatus,
  isDependent: boolean,
  earnedIncome: number
): number {
  let std = CA_STD_DEDUCTION[status];
  if (isDependent) {
    std = Math.min(std, Math.max(DEPENDENT_STD_FLOOR, earnedIncome + DEPENDENT_STD_EARNED_ADD));
  }
  return std;
}

export interface CaResult {
  taxable: number;
  taxBeforeCredits: number;
  net: number;
  marginal: number;
  exemptionCredits: number;
  mentalHealthTax: number;
}

export function californiaTax(
  income: number,
  opts: {
    status: FilingStatus;
    standardDeduction: number;
    flags: PersonFlags;
    spouseFlags: PersonFlags;
    dependents: number;
  }
): CaResult {
  const taxable = Math.max(0, income - opts.standardDeduction);
  const brackets = CA_BRACKETS[statusClass(opts.status)];
  const base = taxFromBrackets(taxable, brackets);
  const mentalHealthTax = Math.max(0, taxable - CA_MENTAL_HEALTH_THRESHOLD) * CA_MENTAL_HEALTH_RATE;
  const tax = base + mentalHealthTax;

  const cls = statusClass(opts.status);
  const persons = cls === 'mfj' ? 2 : 1;
  const seniors =
    (opts.flags.age65 ? 1 : 0) + (cls === 'mfj' && opts.spouseFlags.age65 ? 1 : 0);
  const blinds =
    (opts.flags.blind ? 1 : 0) + (cls === 'mfj' && opts.spouseFlags.blind ? 1 : 0);
  const credits =
    persons * CA_EXEMPTION_CREDITS.personal +
    (seniors + blinds) * CA_EXEMPTION_CREDITS.senior +
    opts.dependents * CA_EXEMPTION_CREDITS.dependent;
  const net = Math.max(0, tax - credits);

  return {
    taxable,
    taxBeforeCredits: tax,
    net,
    marginal: marginalRate(taxable, brackets),
    exemptionCredits: credits,
    mentalHealthTax,
  };
}

export interface EstimatorInput {
  status: FilingStatus;
  flags: PersonFlags;
  spouseFlags: PersonFlags;
  claimingDependents: boolean;
  childrenUnder17: number;
  otherDependents: number;
  isDependent: boolean;
  ytdGross: number;
  ytdFederalWithheld: number;
  ytdCaWithheld: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  lastPayDate?: string;
  grossPerPeriod: number;
  federalWhPerPeriod: number;
  caWhPerPeriod: number;
  vests: Vest[];
  variancePct: number;
  vestFederalPct?: number;
  vestCaPct?: number;
  now?: Date;
}

export interface Scenario {
  grossIncome: number;
  vestWithheldFederal: number;
  vestWithheldCa: number;
  projectedFederalWithheld: number;
  projectedCaWithheld: number;
  fed: FedResult;
  ca: CaResult;
}

export interface EstimatorResult {
  remainingPeriods: number;
  projectedWages: number;
  vestTotal: number;
  vestLow: number;
  vestHigh: number;
  vestFederalPct: number;
  vestCaPct: number;
  federalStandardDeduction: number;
  seniorDeduction: number;
  caStandardDeduction: number;
  base: Scenario;
  low: Scenario;
  high: Scenario;
}

export function calculate(input: EstimatorInput): EstimatorResult {
  const now = input.now ?? new Date();
  const periods = remainingPayPeriods(input.frequency, input.lastPayDate, now);
  const projectedWages = input.ytdGross + input.grossPerPeriod * periods;
  const vestTotal = input.vests.reduce((s, v) => s + v.amount, 0);
  const variance = Math.min(Math.max(input.variancePct, 0), 100) / 100;

  let vestFedPct: number;
  let vestCaPct: number;
  const fedIn = input.vestFederalPct;
  const caIn = input.vestCaPct;
  if (fedIn !== undefined && Number.isFinite(fedIn) && caIn !== undefined && Number.isFinite(caIn)) {
    vestFedPct = Math.min(Math.max(fedIn, 0), 100) / 100;
    vestCaPct = Math.min(Math.max(caIn, 0), 100) / 100;
  } else {
    const sum = input.federalWhPerPeriod + input.caWhPerPeriod;
    const fedShare = sum > 0 ? input.federalWhPerPeriod / sum : 0.75;
    vestFedPct = (DEFAULT_VEST_WITHHOLDING_PCT / 100) * fedShare;
    vestCaPct = (DEFAULT_VEST_WITHHOLDING_PCT / 100) * (1 - fedShare);
  }

  const scenario = (vests: number): Scenario => {
    const income = projectedWages + vests;
    const fedSd = federalStandardDeduction(
      input.status,
      input.flags,
      input.spouseFlags,
      input.isDependent,
      income
    );
    const senior = seniorBonusDeduction(input.status, input.flags, input.spouseFlags, income);
    const fedTax = federalTax(income, {
      status: input.status,
      standardDeduction: fedSd,
      seniorDeduction: senior,
      childrenUnder17: input.claimingDependents ? input.childrenUnder17 : 0,
      otherDependents: input.claimingDependents ? input.otherDependents : 0,
    });
    const caSd = californiaStandardDeduction(input.status, input.isDependent, income);
    const ca = californiaTax(income, {
      status: input.status,
      standardDeduction: caSd,
      flags: input.flags,
      spouseFlags: input.spouseFlags,
      dependents: input.claimingDependents ? input.childrenUnder17 + input.otherDependents : 0,
    });
    const vestWhFed = vests * vestFedPct;
    const vestWhCa = vests * vestCaPct;
    return {
      grossIncome: income,
      vestWithheldFederal: vestWhFed,
      vestWithheldCa: vestWhCa,
      projectedFederalWithheld: input.ytdFederalWithheld + input.federalWhPerPeriod * periods + vestWhFed,
      projectedCaWithheld: input.ytdCaWithheld + input.caWhPerPeriod * periods + vestWhCa,
      fed: fedTax,
      ca,
    };
  };

  return {
    remainingPeriods: periods,
    projectedWages,
    vestTotal,
    vestLow: vestTotal * (1 - variance),
    vestHigh: vestTotal * (1 + variance),
    vestFederalPct: vestFedPct,
    vestCaPct: vestCaPct,
    federalStandardDeduction: federalStandardDeduction(
      input.status,
      input.flags,
      input.spouseFlags,
      input.isDependent,
      projectedWages + vestTotal
    ),
    seniorDeduction: seniorBonusDeduction(
      input.status,
      input.flags,
      input.spouseFlags,
      projectedWages + vestTotal
    ),
    caStandardDeduction: californiaStandardDeduction(
      input.status,
      input.isDependent,
      projectedWages + vestTotal
    ),
    base: scenario(vestTotal),
    low: scenario(vestTotal * (1 - variance)),
    high: scenario(vestTotal * (1 + variance)),
  };
}
