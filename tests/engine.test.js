// Run with: node tests/engine.test.js
// Checks many random exam versions for balanced entries, balanced trial balances,
// sensible amounts, deterministic rebuilds, and correct grading.
const E = require('../site/js/engine.js');
const assert = require('assert');

function checkBalanced(lines, label) {
  let d = 0, c = 0;
  lines.forEach(l => {
    assert(l.amount > 0, label + ' non-positive amount');
    assert(Number.isInteger(l.amount), label + ' non-integer amount ' + l.amount);
    l.side === 'dr' ? (d += l.amount) : (c += l.amount);
  });
  assert.strictEqual(d, c, label + ' unbalanced');
}
const asRows = lines => lines.map(l => ({ acct: l.acct, dr: l.side === 'dr' ? String(l.amount) : '', cr: l.side === 'cr' ? String(l.amount) : '' }));

const N = 3000;
let losses = 0;
for (let i = 0; i < N; i++) {
  const code = E.newVersionCode();
  const ex = E.generateExam(code);
  assert.deepStrictEqual(JSON.stringify(E.generateExam(code)), JSON.stringify(ex), 'not deterministic');
  assert.strictEqual(ex.phase1.transactions.length, 10);
  ex.phase1.transactions.forEach(t => { checkBalanced(t.lines, code + ' ' + t.kind); t.lines.forEach(l => assert(ex.accounts[l.acct])); });
  assert.strictEqual(ex.phase2.items.length, 6);
  const cats = ex.phase2.items.map(i => i.category).sort().join(',');
  assert.strictEqual(cats, 'Accrued expense,Accrued revenue,Deferred expense,Deferred expense,Deferred revenue,Depreciation');
  ex.phase2.items.forEach(t => checkBalanced(t.lines, code + ' ' + t.kind));
  [ex.phase2.tb, ex.phase3.atb].forEach((tb, k) => {
    const d = tb.reduce((a, r) => a + r.debit, 0), c = tb.reduce((a, r) => a + r.credit, 0);
    assert.strictEqual(d, c, code + ' TB unbalanced ' + k);
    tb.forEach(r => assert(r.debit > 0 || r.credit > 0, 'zero row'));
    const cap = tb.find(r => r.acct === '301');
    assert(cap.credit >= 4000, code + ' low capital');
  });
  // adjustments never exceed the balances they reduce
  ex.phase2.items.forEach(it => it.lines.forEach(l => {
    const row = ex.phase2.tb.find(r => r.acct === l.acct);
    if (row && l.side === 'cr' && row.debit) assert(l.amount < row.debit, code + ' over-adjusted ' + it.kind);
    if (row && l.side === 'dr' && row.credit) assert(l.amount < row.credit, code + ' over-adjusted ' + it.kind);
  }));
  const p3 = ex.phase3;
  if (p3.netIncome < 0) losses++;
  // full marks with perfect answers
  const answers = { p1: {}, p2: {}, p3: { selections: p3.steps.map(s => s.expected.slice().reverse()), amounts: p3.steps.map(s => E.money(s.amount)) } };
  ex.phase1.transactions.forEach(t => answers.p1[t.id] = asRows(t.lines));
  ex.phase2.items.forEach(t => answers.p2[t.id] = asRows(t.lines).reverse());
  const g = E.gradeExam(ex, answers);
  assert.strictEqual(g.total, 100, code + ' perfect != 100');
  // simulate the closing routine: all temporary accounts zero, capital = ending capital
  const bal = E.atbBalances(p3);
  p3.steps.forEach(s => {
    const r = E.applyClosing(bal, s.expected);
    assert.strictEqual(r.target, s.target);
    assert.strictEqual(r.amount, s.amount, code + ' step amount');
  });
  [...p3.revenues, ...p3.expenses, '306', '350'].forEach(no => assert.strictEqual(bal[no], 0));
  assert.strictEqual(-bal['301'], p3.endingCapital);
}
// grading edge cases
const exp = [{ acct: '101', side: 'dr', amount: 500 }, { acct: '400', side: 'cr', amount: 500 }];
assert.strictEqual(E.gradeEntry(exp, [], 4), 0);
assert.strictEqual(E.gradeEntry(exp, [{ acct: '101', dr: '$500', cr: '' }, { acct: '400', dr: '', cr: '500.00' }], 4), 4);
assert.strictEqual(E.gradeEntry(exp, [{ acct: '101', dr: '50', cr: '' }, { acct: '400', dr: '', cr: '500' }], 4), 3);
assert.strictEqual(E.gradeEntry(exp, [{ acct: '400', dr: '500', cr: '' }, { acct: '101', dr: '', cr: '500' }], 4), 0);
assert.strictEqual(E.gradeEntry(exp, [{ acct: '101', dr: '500', cr: '' }, { acct: '112', dr: '', cr: '500' }], 4), 1);
// Phase 3: a closing entry needs both sides plus the amount transferred
const step1 = { close: ['400'], target: '350', expected: ['400', '350'], points: 6 };
const step4 = { close: ['306'], target: '301', expected: ['306', '301'], points: 6 };
const g = (step, sel, amt, bal) => E.gradeClosingStep(step, sel, amt, Object.assign({}, bal)).earned;
const B = { '400': -5000, '350': 0, '306': 800, '301': -9000, '101': 3000 };
assert.strictEqual(g(step1, ['400', '350'], '5,000', B), 6);       // both sides, right amount
assert.strictEqual(g(step1, ['400', '350'], '4,000', B), 4);       // wrong amount
assert.strictEqual(g(step1, ['400'], '5000', B), 2);               // one side only: no entry posts
assert.strictEqual(g(step1, ['400', '350', '101'], '8000', B), 2); // one wrong account
assert.strictEqual(g(step1, ['101', '350'], '3000', B), 0);        // wrong account cancels the right one
assert.strictEqual(g(step4, ['306', '301'], '800', B), 6);
assert.strictEqual(g(step4, ['306', '301'], '0', Object.assign({}, B, { '306': 0 })), 2); // drawing already closed elsewhere
console.log('OK:', N, 'versions checked;', losses, 'with a net loss in Phase 3');
