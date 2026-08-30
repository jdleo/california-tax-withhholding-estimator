export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function choice(name: string): string | null {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

export function num(id: string): number {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el || el.value.trim() === '') return NaN;
  return parseFloat(el.value.replace(/[$,\s]/g, ''));
}

export function numOr0(id: string): number {
  const v = num(id);
  return Number.isFinite(v) ? v : 0;
}

export function optNum(id: string): number | undefined {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el || el.value.trim() === '') return undefined;
  const v = parseFloat(el.value);
  return Number.isFinite(v) ? v : undefined;
}

export function inputValue(id: string): string {
  return (document.getElementById(id) as HTMLInputElement).value;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
