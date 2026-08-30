import { byId, choice, num, numOr0, inputValue } from './dom';
import { filingStatus } from './form';

export function setError(step: number, msg: string | null) {
  const el = byId(`err-${step}`);
  el.textContent = msg ?? '';
  el.classList.toggle('hidden', !msg);
}

export function validateStep(n: number): string | null {
  if (n === 1) {
    for (const g of ['age65', 'blind', 'dependents', 'isDependent']) {
      if (!choice(g)) return 'Please answer every required question.';
    }
    const status = filingStatus();
    if (!status) return 'Please choose a filing status.';
    if (choice('dependents') === 'yes') {
      const c = numOr0('children-under17');
      const o = numOr0('other-dependents');
      if (c < 0 || o < 0 || c + o < 1) {
        return 'Enter how many dependents you plan to claim (at least 1 total).';
      }
    }
    if (status === 'mfj') {
      for (const g of ['s_age65', 's_blind', 's_dependent']) {
        if (!choice(g)) return 'Please answer every required question about your spouse.';
      }
    }
    return null;
  }
  if (n === 2) {
    for (const id of ['ytd-gross', 'ytd-ca', 'ytd-fed']) {
      const v = num(id);
      if (!Number.isFinite(v) || v < 0) return 'Enter all three year-to-date amounts (0 or more).';
    }
    return null;
  }
  if (n === 3) {
    const lastPay = inputValue('last-pay-date');
    if (!lastPay) return 'Enter the date you were last paid.';
    const lp = new Date(lastPay + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(lp.getTime()) || lp > today) return 'Last pay date must be today or earlier.';
    const freq = inputValue('pay-freq');
    if (!freq) return 'Choose your pay frequency.';
    const gross = num('gross-per-period');
    if (!Number.isFinite(gross) || gross <= 0) return 'Enter your gross pay per paycheck.';
    for (const id of ['fed-wh-per-period', 'ca-wh-per-period']) {
      const v = num(id);
      if (!Number.isFinite(v) || v < 0) return 'Enter the tax withheld per paycheck (0 or more).';
    }
    return null;
  }
  if (n === 4) {
    for (const row of Array.from(document.querySelectorAll<HTMLElement>('.vest-row'))) {
      const date = (row.querySelector('.vest-date') as HTMLInputElement).value;
      const amount = parseFloat((row.querySelector('.vest-amount') as HTMLInputElement).value);
      const hasDate = date !== '';
      const hasAmount = Number.isFinite(amount) && amount > 0;
      if (hasDate !== hasAmount) return 'Each vest needs both a date and a dollar amount.';
      if (hasAmount && amount < 0) return 'Vest amounts must be 0 or more.';
    }
    const vf = byId('vest-fed-pct') as HTMLInputElement;
    const vc = byId('vest-ca-pct') as HTMLInputElement;
    if ((vf.value.trim() !== '') !== (vc.value.trim() !== '')) {
      return 'Enter both federal and CA percentages from your last vest, or leave both blank.';
    }
    for (const el of [vf, vc]) {
      if (el.value.trim() === '') continue;
      const v = parseFloat(el.value);
      if (!Number.isFinite(v) || v < 0 || v > 100) return 'Vest withholding percentages must be between 0 and 100.';
    }
    return null;
  }
  return null;
}
