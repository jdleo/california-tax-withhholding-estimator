export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh' | 'qss';

export interface Bracket {
  rate: number;
  upTo: number;
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
