import { calculate } from '../lib/tax';
import { collect } from './form';
import { usd, pct, describeGap } from './format';
import { byId } from './dom';
import { goTo, lastStepIndex } from './steps';

function kv(label: string, value: string): string {
  return `<div class="kv"><span>${label}</span><b>${value}</b></div>`;
}

function outcomeBadge(gap: number): string {
  if (Math.abs(gap) <= 25) return '<span class="badge ok">On track</span>';
  if (gap > 0) return `<span class="badge over">Overpaid by ${usd(gap)}</span>`;
  return `<span class="badge under">Underpaid by ${usd(-gap)}</span>`;
}

function federalLevers(gap: number, periods: number, marginal: number): string {
  if (Math.abs(gap) <= 25) return 'No changes needed — keep withholding as-is.';
  if (gap < 0) {
    const under = Math.ceil(-gap);
    const per = periods > 0 ? Math.ceil(under / periods) : under;
    return `<ul class="levers">
      <li>Add <b>${usd(per)}</b> to W-4 Step 4(c) “Extra withholding” for each of your <b>${periods}</b> remaining paycheck${periods === 1 ? '' : 's'}, or</li>
      <li>Withhold an extra <b>${usd(under)}</b> total before year-end (e.g. on your final paycheck).</li>
    </ul>`;
  }
  const over = Math.round(gap);
  if (marginal <= 0) {
    return `<ul class="levers"><li>Your taxable income is already $0, so deductions can't reduce withholding further. Set any W-4 Step 4(c) “Extra withholding” to $0.</li></ul>`;
  }
  const ded = Math.round(over / marginal);
  return `<ul class="levers">
    <li>Enter about <b>${usd(ded)}</b> in W-4 Step 4(b) “Deductions” — at your ${pct(marginal)} marginal rate this reduces your withholding by roughly <b>${usd(over)}</b> across the year, or</li>
    <li>Reduce any W-4 Step 4(c) “Extra withholding” to $0.</li>
  </ul>`;
}

function stateLevers(gap: number, periods: number, marginal: number): string {
  if (Math.abs(gap) <= 25) return 'No changes needed — keep withholding as-is.';
  if (gap < 0) {
    const under = Math.ceil(-gap);
    const per = periods > 0 ? Math.ceil(under / periods) : under;
    return `<ul class="levers">
      <li>Add <b>${usd(per)}</b> to the “Additional amount, per payroll period” line on your CA DE-4 for each of your <b>${periods}</b> remaining paycheck${periods === 1 ? '' : 's'}, or</li>
      <li>Withhold an extra <b>${usd(under)}</b> total before year-end.</li>
    </ul>`;
  }
  const over = Math.round(gap);
  if (marginal <= 0) {
    return `<ul class="levers"><li>Your CA taxable income is already $0. Reduce any DE-4 “Additional amount” to $0.</li></ul>`;
  }
  const ded = Math.round(over / marginal);
  return `<ul class="levers">
    <li>Claim about <b>${usd(ded)}</b> as “Estimated deductions” on your CA DE-4 — at your ${pct(marginal)} CA marginal rate this reduces withholding by roughly <b>${usd(over)}</b>, or</li>
    <li>Reduce any DE-4 “Additional amount” to $0.</li>
  </ul>`;
}

export function renderResults() {
  const input = collect();
  const r = calculate(input);
  const fedGap = r.base.projectedFederalWithheld - r.base.fed.net;
  const caGap = r.base.projectedCaWithheld - r.base.ca.net;
  const fedLowGap = r.low.projectedFederalWithheld - r.low.fed.net;
  const fedHighGap = r.high.projectedFederalWithheld - r.high.fed.net;
  const caLowGap = r.low.projectedCaWithheld - r.low.ca.net;
  const caHighGap = r.high.projectedCaWithheld - r.high.ca.net;

  const vestLine = r.vestTotal > 0
    ? `${usd(r.vestTotal)} (range ${usd(r.vestLow)}–${usd(r.vestHigh)})`
    : '$0';

  byId('results-content').innerHTML = `
    <h2>Your 2026 Projection</h2>
    <p class="muted">Projected through December 31, 2026, assuming your paycheck stays the same.</p>

    <div class="result-card overview">
      <h3>Overview</h3>
      ${kv('Projected gross income', usd(r.base.grossIncome))}
      ${kv('· from upcoming vests', vestLine)}
      ${r.vestTotal > 0 ? kv('· est. withheld at vests', `${usd(r.base.vestWithheldFederal)} fed · ${usd(r.base.vestWithheldCa)} CA (${pct(r.vestFederalPct)} / ${pct(r.vestCaPct)})`) : ''}
      ${kv('Remaining paychecks this year', String(r.remainingPeriods))}
      ${kv('Projected federal income tax withheld', usd(r.base.projectedFederalWithheld))}
      ${kv('Projected CA income tax withheld', usd(r.base.projectedCaWithheld))}
    </div>

    <div class="result-card">
      <div class="card-head"><h3>Federal</h3>${outcomeBadge(fedGap)}</div>
      ${kv('Projected 2026 federal income tax liability', usd(r.base.fed.net))}
      ${kv('Projected federal withholding', usd(r.base.projectedFederalWithheld))}
      ${kv('Marginal tax rate', pct(r.base.fed.marginal))}
      <div class="lever-box">
        <h4>How to adjust (W-4)</h4>
        ${federalLevers(fedGap, r.remainingPeriods, r.base.fed.marginal)}
      </div>
    </div>

    <div class="result-card">
      <div class="card-head"><h3>California</h3>${outcomeBadge(caGap)}</div>
      ${kv('Projected 2026 CA income tax liability', usd(r.base.ca.net))}
      ${kv('Projected CA withholding', usd(r.base.projectedCaWithheld))}
      ${kv('Marginal tax rate', pct(r.base.ca.marginal))}
      <div class="lever-box">
        <h4>How to adjust (CA DE-4)</h4>
        ${stateLevers(caGap, r.remainingPeriods, r.base.ca.marginal)}
      </div>
    </div>

    ${r.vestTotal > 0 ? `
    <div class="result-card range">
      <h3>Stock variance range (±${input.variancePct}%)</h3>
      <p class="muted">Vest withholding scales with the range too. If your vests come in low: federal ends up <b>${describeGap(fedLowGap)}</b>, CA <b>${describeGap(caLowGap)}</b>.<br/>
      If your vests come in high: federal ends up <b>${describeGap(fedHighGap)}</b>, CA <b>${describeGap(caHighGap)}</b>.</p>
    </div>` : ''}

    <details class="assumptions">
      <summary>Assumptions &amp; methodology</summary>
      <ul>
        <li>Uses the 2026 federal and CA brackets, standard deductions, CTC ($2,200/child, $1,700 refundable, phase-outs at $200k/$400k MAGI), $500 other-dependent credit, and the 1% CA mental health tax over $1M.</li>
        <li>Senior bonus deduction of $6,000/person (phased out 6% above $75k/$150k MAGI) and $1,600 ($800 MFS) additional standard deduction per 65+/blind condition are included.</li>
        <li>Head of Household is taxed on the Single schedule and Qualified Surviving Spouse on the MFJ schedule; CA exemption credits (personal/dependent/senior/blind) are estimates pending FTB 2026 figures.</li>
        <li>Withholding is assumed constant at your current per-paycheck amounts; remaining paychecks are counted forward from your last pay date through December 31, 2026.</li>
        <li>Vests are treated as ordinary compensation in 2026. We assume 40% of each vest is withheld at vesting (split by your paycheck federal/CA ratio, or your custom last-vest percentages), and that withholding scales with the ±variance range.</li>
        <li>Social Security wage base ($184,500) affects FICA, not income-tax withholding, so it's excluded from the over/under comparison. Itemized deductions (incl. the $40,400 SALT cap) aren't modeled — the standard deduction is used.</li>
      </ul>
    </details>

    <div class="nav">
      <button type="button" class="btn" id="restart-btn">Start over</button>
    </div>
    <p class="muted small disclaimer">Estimates only, not tax advice.</p>
  `;

  byId('restart-btn').addEventListener('click', () => location.reload());
  goTo(lastStepIndex());
}
