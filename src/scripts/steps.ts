const steps = Array.from(document.querySelectorAll<HTMLElement>('.step'));
const TOTAL_SECTIONS = 4;
let current = 0;

export function currentStep(): number {
  return current;
}

export function lastStepIndex(): number {
  return steps.length - 1;
}

export function goTo(i: number) {
  current = i;
  steps.forEach((s, idx) => s.classList.toggle('hidden', idx !== i));
  const label = document.getElementById('progress-label')!;
  const fill = document.getElementById('progress-fill')!;
  if (i === 0) {
    label.textContent = 'Get started';
    fill.style.width = '0%';
  } else if (i >= steps.length - 1) {
    label.textContent = 'Results';
    fill.style.width = '100%';
  } else {
    label.textContent = `Step ${i} of ${TOTAL_SECTIONS} · ${steps[i].dataset.title}`;
    fill.style.width = `${(i / (TOTAL_SECTIONS + 1)) * 100}%`;
  }
  window.scrollTo({ top: 0 });
}
