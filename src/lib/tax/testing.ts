import type { EstimatorInput } from './calculate.ts';

let passed = 0;
const failures: string[] = [];

export function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (e) {
    failures.push(`${name}: ${(e as Error).message}`);
  }
}

export function eq(got: number, want: number, tol = 0.005) {
  if (!Number.isFinite(got) || Math.abs(got - want) > tol) {
    throw new Error(`got ${got}, want ${want}`);
  }
}

export function isTrue(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

export const NO65 = { age65: false, blind: false };
export const NOW = new Date('2026-08-30T12:00:00');

export function mkInput(o: Partial<EstimatorInput> = {}): EstimatorInput {
  return {
    status: 'single',
    flags: { ...NO65 },
    spouseFlags: { ...NO65 },
    claimingDependents: false,
    childrenUnder17: 0,
    otherDependents: 0,
    isDependent: false,
    ytdGross: 0,
    ytdFederalWithheld: 0,
    ytdCaWithheld: 0,
    frequency: 'monthly',
    grossPerPeriod: 0,
    federalWhPerPeriod: 0,
    caWhPerPeriod: 0,
    vests: [],
    variancePct: 0,
    now: NOW,
    ...o,
  };
}

export function finalize() {
  for (const f of failures) console.log(`FAIL ${f}`);
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) process.exit(1);
}
