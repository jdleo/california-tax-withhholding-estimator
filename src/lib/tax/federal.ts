import { FED_BRACKETS, statusClass, taxFromBrackets, marginalRate } from './brackets.ts';
import type { FilingStatus } from './brackets.ts';
import type { PersonFlags } from './constants.ts';
import {
  CTC,
  FED_STD_DEDUCTION,
  FED_ADDL_STD_PER_CONDITION,
  FED_ADDL_STD_PER_CONDITION_MFS,
  SENIOR_BONUS_DEDUCTION,
  SENIOR_BONUS_PHASEOUT,
  OTHER_DEPENDENT_CREDIT,
  DEPENDENT_STD_FLOOR,
  DEPENDENT_STD_EARNED_ADD,
} from './constants.ts';

export interface FedResult {
  taxable: number;
  taxBeforeCredits: number;
  net: number;
  marginal: number;
  ctcApplied: number;
  refundableCtc: number;
  otherDependentCredit: number;
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
    marginal: taxable <= 0 ? 0 : marginalRate(taxable, brackets),
    ctcApplied,
    refundableCtc,
    otherDependentCredit: otherCredit,
  };
}
