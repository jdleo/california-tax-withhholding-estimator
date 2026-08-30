import type { FilingStatus, PersonFlags } from './brackets.ts';
import { DEFAULT_VEST_WITHHOLDING_PCT } from './constants.ts';
import { federalStandardDeduction, seniorBonusDeduction, federalTax } from './federal.ts';
import { californiaStandardDeduction, californiaTax } from './california.ts';
import { remainingPayPeriods } from './periods.ts';
import type { PayFrequency } from './periods.ts';

export interface Vest {
  date: string;
  amount: number;
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
  frequency: PayFrequency;
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
  fed: ReturnType<typeof federalTax>;
  ca: ReturnType<typeof californiaTax>;
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
