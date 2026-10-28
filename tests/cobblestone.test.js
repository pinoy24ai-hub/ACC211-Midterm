// Run with: node tests/cobblestone.test.js
// Checks the Cobblestone Sports & Outdoor guided ledger against the instructor's answer key.
const C = require('../src/cobblestone/js/engine.js');
const assert = require('assert');

const rowsOf = (lines) => lines.map((l) => ({ a: l.a, d: l.dr ? String(l.dr) : '', c: l.cr ? String(l.cr) : '' }));
const blank = { a: '', d: '', c: '' };

assert.strictEqual(C.N, 15);

// opening balances and every entry balance; every account exists; walkthrough content present
[C.OPENING].concat(C.T).forEach((t) => {
  const d = t.lines.reduce((s, l) => s + (l.dr || 0), 0), c = t.lines.reduce((s, l) => s + (l.cr || 0), 0);
  assert.strictEqual(d, c, t.id + ' balances');
  t.lines.forEach((l) => assert.ok(C.A[l.a], t.id + ' account exists: ' + l.a));
});
C.T.forEach((t, i) => {
  assert.ok(t.think.length >= 1 && t.why, t.id + ' has walkthrough content');
  if (t.noEntry) {
    assert.ok(C.check(i, [blank, blank], true).ok, t.id + ' accepts No entry required');
    assert.ok(!C.check(i, [{ a: 'Merchandise Inventory', d: '240', c: '' }, { a: 'Cash', d: '', c: '240' }], false).ok, t.id + ' rejects recording freight');
  } else {
    assert.ok(C.check(i, rowsOf(t.lines), false).ok, t.id + ' key passes');
    assert.ok(C.check(i, rowsOf(t.lines).reverse().concat([blank]), false).ok, t.id + ' any order');
    assert.ok(!C.check(i, [blank, blank], true).ok, t.id + ' needs an entry');
  }
});

// answer key, exactly as given
const key = (i) => C.T[i].lines.map((l) => l.a + ' ' + (l.dr ? 'Dr ' + l.dr : 'Cr ' + l.cr)).sort().join(' | ');
assert.strictEqual(key(6), ['Accounts payable (Ridgeline Wholesale) Dr 5600', 'Cash Cr 5488', 'Merchandise Inventory Cr 112'].sort().join(' | '));
assert.strictEqual(key(10), ['Accounts receivable (Kenmore Rec League) Cr 3500', 'Cash Dr 3430', 'Sales discounts Dr 70'].sort().join(' | '));
assert.strictEqual(key(11), ['Accounts payable (Bayfront Supply Co.) Dr 5200', 'Cash Cr 5200'].sort().join(' | '));

// diagnostics
let r = C.check(0, [{ a: 'Merchandise Inventory', d: '6000', c: '' }, { a: 'Accounts payable (Bayfront Supply Co.)', d: '', c: '6000' }], false);
assert.ok(!r.ok && /check the vendor/.test(r.rows[1].msg), 'wrong vendor');
r = C.check(3, [{ a: 'Delivery expense', d: '180', c: '' }, { a: 'Cash', d: '', c: '180' }], false);
assert.ok(!r.ok && /does not belong/.test(r.rows[0].msg) && r.rows[1].ok, 'freight-in is not an expense');
r = C.check(7, rowsOf(C.T[7].lines.filter((l) => l.a === 'Cash' || l.a === 'Sales revenue')), false);
assert.ok(!r.ok && /needs 2 more lines/.test(r.msgs[0]), 'cash sale without the cost part');
r = C.check(11, [{ a: 'Accounts payable (Bayfront Supply Co.)', d: '5200', c: '' }, { a: 'Cash', d: '', c: '5096' }, { a: 'Merchandise Inventory', d: '', c: '104' }], false);
assert.ok(!r.ok, 'late payment takes no discount');

// ledger and statements after all 15
const L = C.buildLedger(C.range(15));
const tt = C.totals(L);
assert.strictEqual(tt.dr, tt.cr, 'ledger balances');
assert.strictEqual(C.bal(L, 'Cash'), 20262);
assert.strictEqual(C.bal(L, 'Merchandise Inventory'), 6068);
assert.strictEqual(C.bal(L, 'Accounts receivable'), 2000);
assert.strictEqual(C.bal(L, 'Accounts receivable (Parkside Rentals)'), 2000);
assert.strictEqual(C.bal(L, 'Accounts receivable (Kenmore Rec League)'), 0);
assert.strictEqual(C.bal(L, 'Accounts payable'), 0);
assert.strictEqual(C.bal(L, 'Accounts payable (Bayfront Supply Co.)'), 0);
assert.strictEqual(C.bal(L, 'Accounts payable (Ridgeline Wholesale)'), 0);
assert.strictEqual(C.bal(C.buildLedger(C.range(11)), 'Accounts payable (Bayfront Supply Co.)'), 5200, 'Bayfront owed 5,200 before Nov 27');

const is = C.incomeStatement(L);
assert.deepStrictEqual([is.sales, is.ret, is.dis, is.net, is.cogs, is.gp, is.opexTotal, is.ni], [11000, 500, 70, 10430, 6300, 4130, 2300, 1830]);
const bs = C.balanceSheet(L);
assert.deepStrictEqual([bs.assets, bs.ap, bs.capEnd, bs.le], [28330, 0, 28330, 28330]);

// the balance sheet balances at every point in the month
for (let n = 0; n <= 15; n++) {
  const b = C.balanceSheet(C.buildLedger(C.range(n)));
  assert.strictEqual(b.assets, b.le, 'balance sheet balances after ' + n + ' transactions');
}
assert.deepStrictEqual(C.effects(1).accounts, [], 'Nov 3 changes nothing');

console.log('cobblestone: all checks passed');
