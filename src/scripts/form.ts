import type { EstimatorInput, FilingStatus, Vest } from '../lib/tax';
import { choice, num, numOr0, optNum, inputValue } from './dom';

export function filingStatus(): FilingStatus | null {
  const v = inputValue('filing-status');
  return (v || null) as FilingStatus | null;
}

export function collect(): EstimatorInput {
  const status = filingStatus()!;
  const claimingDependents = choice('dependents') === 'yes';
  const vests: Vest[] = Array.from(document.querySelectorAll<HTMLElement>('.vest-row'))
    .map((row) => ({
      date: (row.querySelector('.vest-date') as HTMLInputElement).value,
      amount: parseFloat((row.querySelector('.vest-amount') as HTMLInputElement).value) || 0,
    }))
    .filter((v) => v.date && v.amount > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    status,
    flags: { age65: choice('age65') === 'yes', blind: choice('blind') === 'yes' },
    spouseFlags: { age65: choice('s_age65') === 'yes', blind: choice('s_blind') === 'yes' },
    claimingDependents,
    childrenUnder17: claimingDependents ? numOr0('children-under17') : 0,
    otherDependents: claimingDependents ? numOr0('other-dependents') : 0,
    isDependent: choice('isDependent') === 'yes',
    ytdGross: num('ytd-gross'),
    ytdFederalWithheld: num('ytd-fed'),
    ytdCaWithheld: num('ytd-ca'),
    frequency: inputValue('pay-freq') as EstimatorInput['frequency'],
    lastPayDate: inputValue('last-pay-date'),
    grossPerPeriod: num('gross-per-period'),
    federalWhPerPeriod: num('fed-wh-per-period'),
    caWhPerPeriod: num('ca-wh-per-period'),
    vests,
    variancePct: numOr0('variance-pct'),
    vestFederalPct: optNum('vest-fed-pct'),
    vestCaPct: optNum('vest-ca-pct'),
    now: new Date(),
  };
}
