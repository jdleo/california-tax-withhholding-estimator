import { CA_BRACKETS, statusClass, taxFromBrackets, marginalRate } from './brackets.ts';
import type { FilingStatus } from './brackets.ts';
import type { PersonFlags } from './constants.ts';
import {
  CA_STD_DEDUCTION,
  CA_MENTAL_HEALTH_RATE,
  CA_MENTAL_HEALTH_THRESHOLD,
  CA_EXEMPTION_CREDITS,
  DEPENDENT_STD_FLOOR,
  DEPENDENT_STD_EARNED_ADD,
} from './constants.ts';

export interface CaResult {
  taxable: number;
  taxBeforeCredits: number;
  net: number;
  marginal: number;
  exemptionCredits: number;
  mentalHealthTax: number;
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
    marginal: taxable <= 0 ? 0 : marginalRate(taxable, brackets),
    exemptionCredits: credits,
    mentalHealthTax,
  };
}
