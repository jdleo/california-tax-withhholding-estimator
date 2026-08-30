import { byId, choice, todayISO } from './dom';
import { currentStep, goTo, lastStepIndex } from './steps';
import { validateStep, setError } from './validate';
import { renderResults } from './results';

byId('start-btn').addEventListener('click', () => goTo(1));

document.querySelectorAll('.nav-next').forEach((b) =>
  b.addEventListener('click', () => {
    const step = currentStep();
    setError(step, null);
    const err = validateStep(step);
    if (err) {
      setError(step, err);
      return;
    }
    if (step === lastStepIndex() - 1) renderResults();
    else goTo(step + 1);
  })
);

document.querySelectorAll('.nav-back').forEach((b) =>
  b.addEventListener('click', () => goTo(currentStep() - 1))
);

const statusSelect = byId('filing-status') as HTMLSelectElement;
const toggleSpouse = () => {
  byId('spouse-block').classList.toggle('hidden', statusSelect.value !== 'mfj');
};
statusSelect.addEventListener('change', toggleSpouse);

const toggleDeps = () => {
  byId('dependents-block').classList.toggle('hidden', choice('dependents') !== 'yes');
};
document.querySelectorAll<HTMLInputElement>('input[name="dependents"]').forEach((r) =>
  r.addEventListener('change', toggleDeps)
);

const vestList = byId('vest-list');
const setMinDates = () => {
  const today = todayISO();
  vestList.querySelectorAll<HTMLInputElement>('.vest-date').forEach((d) => (d.min = today));
  const lp = byId('last-pay-date') as HTMLInputElement | null;
  if (lp) lp.max = today;
};
setMinDates();

byId('add-vest').addEventListener('click', () => {
  const row = vestList.querySelector('.vest-row')!.cloneNode(true) as HTMLElement;
  row.querySelectorAll('input').forEach((i) => ((i as HTMLInputElement).value = ''));
  vestList.appendChild(row);
  setMinDates();
});

vestList.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('.remove-vest');
  if (!btn) return;
  const rows = vestList.querySelectorAll('.vest-row');
  if (rows.length > 1) {
    (btn as HTMLElement).closest('.vest-row')!.remove();
  } else {
    rows[0].querySelectorAll('input').forEach((i) => ((i as HTMLInputElement).value = ''));
  }
});

goTo(0);
