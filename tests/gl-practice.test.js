// Run with: node tests/gl-practice.test.js
// Checks the Bright Mart General Ledger practice set against the numbers in the two videos.
const E = require('../gl-practice-site/js/engine.js');
const assert = require('assert');

const rowsOf = (lines) => lines.map((l) => ({ acct: l.acct, dr: l.side === 'dr' ? String(l.amount) : '', cr: l.side === 'cr' ? String(l.amount) : '' }));

assert.strictEqual(E.TRANSACTIONS.length, 15);

// every key entry balances and uses only chart accounts, never the periodic-system ones
const PERIODIC = ['510', '512', '514', '516'];
E.TRANSACTIONS.forEach((t) => {
  const d = t.lines.filter((l) => l.side === 'dr').reduce((s, l) => s + l.amount, 0);
  const c = t.lines.filter((l) => l.side === 'cr').reduce((s, l) => s + l.amount, 0);
  assert.strictEqual(d, c, t.id + ' balances');
  t.lines.forEach((l) => {
    assert.ok(E.ACCOUNTS[l.acct], t.id + ' uses a chart account');
    assert.ok(!PERIODIC.includes(l.acct), t.id + ' uses no periodic account');
  });
});

// the key passes the checker, in any line order, with blank rows and formatted amounts
E.TRANSACTIONS.forEach((t) => {
  const rows = rowsOf(t.lines);
  assert.ok(E.checkEntry(t.id, rows).correct, t.id + ' key is correct');
  const shuffled = rows.slice().reverse().map((r) => ({ acct: r.acct, dr: r.dr && Number(r.dr).toLocaleString('en-US'), cr: r.cr && '$' + r.cr }));
  shuffled.splice(1, 0, { acct: '', dr: '', cr: '' });
  assert.ok(E.checkEntry(t.id, shuffled).correct, t.id + ' accepts any order, blanks and formatting');
});

// wrong answers are caught and explained
let r = E.checkEntry('t7', rowsOf(E.TRANSACTIONS[6].lines.slice(0, 2)));
assert.ok(!r.correct && /needs more lines/.test(r.message), 'cash sale without the cost entry needs more lines');
r = E.checkEntry('t3', [{ acct: '516', dr: '300', cr: '' }, { acct: '101', dr: '', cr: '300' }]);
assert.ok(!r.correct && r.statuses[0] === 'bad' && r.statuses[1] === 'ok', 'Freight-In is wrong under perpetual');
r = E.checkEntry('t1', [{ acct: '120', dr: '5000', cr: '' }, { acct: '101', dr: '', cr: '500' }]);
assert.ok(!r.correct && r.unbalanced && /do not equal/.test(r.message), 'unbalanced entry flagged');
r = E.checkEntry('t1', [{ acct: '120', dr: '5000', cr: '5000' }, { acct: '101', dr: '', cr: '5000' }]);
assert.strictEqual(r.statuses[0], 'incomplete', 'a line with both amounts is incomplete');
r = E.checkEntry('t1', rowsOf(E.TRANSACTIONS[0].lines).concat([{ acct: '640', dr: '10', cr: '' }]));
assert.ok(!r.correct, 'extra line rejected');

// full ledger ties to both videos
const ids = E.TRANSACTIONS.map((t) => t.id);
const L = E.buildLedger(ids);
assert.strictEqual(L['120'].balance, 7630, 'inventory ends at 7,630 (13,630 after purchases)');
assert.strictEqual(E.buildLedger(ids.slice(0, 6))['120'].balance, 13630, 'inventory after purchases is 13,630');
assert.strictEqual(L['505'].balance, 6000, 'COGS 6,000');
assert.strictEqual(L['201'].balance, 0, 'Ace Supply paid in full');
assert.strictEqual(L['112'].balance, 0, "Rosa's Shop paid in full");
assert.strictEqual(L['101'].balance, 13370, 'cash ends at 13,370');

const tb = E.trialBalance(L);
assert.strictEqual(tb.debit, tb.credit, 'trial balance balances');

const s = E.incomeStatement(L);
assert.strictEqual(s.sales, 11000);
assert.strictEqual(s.contraTotal, 1630);
assert.strictEqual(s.netSales, 9370);
assert.strictEqual(s.cogsTotal, 6000);
assert.strictEqual(s.grossProfit, 3370);
assert.strictEqual(s.opexTotal, 2300);
assert.strictEqual(s.incomeFromOps, 1070);
assert.strictEqual(s.otherTotal, 70);
assert.strictEqual(s.netIncome, 1000, 'net income matches the video');

// partial ledgers still balance
for (let n = 0; n <= ids.length; n++) {
  const p = E.trialBalance(E.buildLedger(ids.slice(0, n)));
  assert.strictEqual(p.debit, p.credit, 'partial trial balance balances after ' + n);
}

// certificate IDs are stable and name-sensitive
const when = '2026-11-02T15:00:00.000Z';
assert.strictEqual(E.certificateId('Ana Cruz', when), E.certificateId('  ana   cruz ', when));
assert.notStrictEqual(E.certificateId('Ana Cruz', when), E.certificateId('Ana Cruze', when));
assert.match(E.certificateId('Ana Cruz', when), /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);

console.log('gl-practice: all checks passed');
