// Run with: node tests/workshop.test.js
// Checks the Merchandising General Ledger Workshop (Bright Mart) against the numbers in the two videos.
const W = require('../src/gl-workshop/js/engine.js');
const assert = require('assert');

const rowsOf = (lines) => lines.map((l) => ({ a: l.a, p: l.p || '', d: l.dr ? String(l.dr) : '', c: l.cr ? String(l.cr) : '' }));

assert.strictEqual(W.N, 15);

// every entry balances, uses chart accounts, has a party on subsidiary lines, 3 hints and an explanation
W.E.forEach((e, i) => {
  const d = e.lines.reduce((s, l) => s + (l.dr || 0), 0);
  const c = e.lines.reduce((s, l) => s + (l.cr || 0), 0);
  assert.strictEqual(d, c, 'entry ' + e.id + ' balances');
  e.lines.forEach((l) => {
    assert.ok(W.A[l.a], 'entry ' + e.id + ' account exists: ' + l.a);
    assert.strictEqual(!!W.A[l.a].sub, !!l.p, 'entry ' + e.id + ' party only on subsidiary lines');
    if (l.p) assert.ok(W.PARTIES.includes(l.p));
  });
  assert.strictEqual(e.hints.length, 3, 'entry ' + e.id + ' has 3 hints');
  assert.ok(e.why.length > 20);
  assert.ok(W.evaluate(i, rowsOf(e.lines)).ok, 'entry ' + e.id + ' key passes');
  assert.ok(W.evaluate(i, rowsOf(e.lines).reverse().concat([{ a: '', p: '', d: '', c: '' }])).ok, 'entry ' + e.id + ' any order, blank row');
});

// diagnostics
let r = W.evaluate(1, [{ a: 'Merchandise inventory', p: '', d: '10000', c: '' }, { a: 'Accounts payable', p: 'Rosa’s Shop', d: '', c: '10000' }]);
assert.ok(!r.ok && r.counted && /vendor name/.test(r.rowMsg[1]), 'wrong vendor flagged');
r = W.evaluate(1, [{ a: 'Merchandise inventory', p: '', d: '10000', c: '' }, { a: 'Accounts payable', p: '', d: '', c: '10000' }]);
assert.ok(!r.ok && !r.counted, 'missing vendor is structural, not a counted attempt');
r = W.evaluate(6, rowsOf(W.E[6].lines.slice(0, 1).concat(W.E[6].lines.slice(2, 3))));
assert.ok(!r.ok && r.msgs.some((m) => /missing 2 accounts/.test(m)), 'cash sale without the cost part');
r = W.evaluate(8, [{ a: 'Merchandise inventory', p: '', d: '200', c: '' }, { a: 'Cash', p: '', d: '', c: '200' }]);
assert.strictEqual(r.rowMsg[0], 'This account does not belong in this entry.', 'freight-out is not inventory');
r = W.evaluate(10, rowsOf(W.E[9].lines));
assert.ok(!r.ok, 'allowance with a cost entry is wrong');
r = W.evaluate(0, [{ a: 'Merchandise inventory', p: '', d: '5000', c: '' }, { a: 'Cash', p: '', d: '', c: '500' }]);
assert.ok(!r.ok && /do not equal/.test(r.msgs[0]) && /check the amount/.test(r.rowMsg[1]));
r = W.evaluate(0, [{ a: 'Cash', p: '', d: '5000', c: '' }, { a: 'Merchandise inventory', p: '', d: '', c: '5000' }]);
assert.ok(/debit or a credit/.test(r.rowMsg[0]), 'reversed sides flagged');

// scoring
assert.strictEqual(W.creditFor(0, 0), 1);
assert.strictEqual(W.creditFor(1, 1), 0.65);
assert.strictEqual(W.creditFor(5, 3), 0.25, 'minimum 0.25 when solved');
const s = W.scoreInfo(Array.from({ length: 15 }, (_, i) => ({ credit: i < 10 ? 1 : 0.25 })));
assert.strictEqual(s.sum, 11.25);
assert.strictEqual(s.pctAll, 75);

// ledger and statement tie to both videos
const all = W.E.map(() => ({ credit: 1 }));
const L = W.buildLedger(all);
assert.strictEqual(W.bal(L, 'Merchandise inventory'), 7630);
assert.strictEqual(W.bal(W.buildLedger(all.slice(0, 6)), 'Merchandise inventory'), 13630, 'after purchases');
assert.strictEqual(W.bal(L, 'Cost of goods sold'), 6000);
assert.strictEqual(W.bal(L, 'Cash'), 13370);
assert.strictEqual(W.bal(L, 'Accounts payable', 'Ace Supply'), 0);
assert.strictEqual(W.bal(L, 'Accounts receivable', 'Rosa’s Shop'), 0);
let D = 0, C = 0;
Object.keys(L).forEach((n) => { const t = W.totals(L, n); D += t.dr; C += t.cr; });
assert.strictEqual(D, C, 'ledger balances');

const v = W.isValues(L);
assert.deepStrictEqual([v.rev, v.ret, v.dis, v.net, v.cogs, v.gp, v.opx, v.ops, v.int, v.ni], [11000, 1500, 130, 9370, 6000, 3370, 2300, 1070, 70, 1000]);
assert.strictEqual(v.gm, 36);
assert.strictEqual(v.nm, 10.7);

console.log('workshop: all checks passed');
