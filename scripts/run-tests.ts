import { finalize } from '../src/lib/tax/testing.ts';
import '../src/lib/tax/brackets.test.ts';
import '../src/lib/tax/federal.test.ts';
import '../src/lib/tax/california.test.ts';
import '../src/lib/tax/periods.test.ts';
import '../src/lib/tax/calculate.test.ts';
import '../src/lib/tax/invariants.test.ts';
finalize();
