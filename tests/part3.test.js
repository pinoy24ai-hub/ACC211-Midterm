// Run with: node tests/part3.test.js
// Checks the Part 3 practice app (merchandising financial statements, perpetual).
const E = require('../part3-site/js/engine.js');
const assert = require('assert');
const clone = o => JSON.parse(JSON.stringify(o));

// The adjusted trial balance balances.
let dr = 0, cr = 0;
E.ACCOUNTS.forEach(a => { if (a.side === 'dr') dr += a.bal; else cr += a.bal; });
assert.strictEqual(dr, cr, 'adjusted trial balance balances');

// Every account has a category and an explanation; account numbers are unique.
assert.strictEqual(new Set(E.ACCOUNTS.map(a => a.no)).size, E.ACCOUNTS.length);
E.ACCOUNTS.forEach(a => { assert(E.CAT[a.cls], a.name + ' has a category'); assert(E.WHY[a.no], a.name + ' has an explanation'); });

// The statements tie together.
const K = E.KEY;
assert.strictEqual(K.is.ni, 62000);
assert.strictEqual(K.soe.nin, K.is.ni, 'net income flows to the SOE');
assert.strictEqual(K.soe.end, 137100);
assert.strictEqual(K.bs.cap, K.soe.end, 'ending capital flows to the balance sheet');
assert.strictEqual(K.bs.ta, K.bs.tloe, 'balance sheet balances');
// Net income equals revenues minus expenses straight from the trial balance.
const ni = E.ACCOUNTS.reduce((s, a) => {
  if (['rev', 'oi'].includes(a.sec)) return s + a.bal;
  if (['contra', 'cogs', 'sell', 'admin', 'oe'].includes(a.sec)) return s - a.bal;
  return s;
}, 0);
assert.strictEqual(ni, K.is.ni);

// Every account is used exactly once across the three statements (Capital and Drawing via the SOE).
const used = [];
['is', 'bs'].forEach(k => Object.values(E.ANSWER_KEY[k].acct).forEach(no => used.push(Number(no))));
used.push(301, 302);
assert.deepStrictEqual(used.sort(), E.ACCOUNTS.map(a => a.no).sort(), 'each account used once');

// Perfect answers score 100; blank scores 0.
assert.strictEqual(E.gradeAll(E.ANSWER_KEY).total, 100);
assert.strictEqual(E.gradeAll(E.blankAnswers()).total, 0);

// Order of accounts within a section does not matter.
const swapped = clone(E.ANSWER_KEY);
[swapped.is.acct.se1, swapped.is.acct.se5] = [swapped.is.acct.se5, swapped.is.acct.se1];
[swapped.is.amt.se1, swapped.is.amt.se5] = [swapped.is.amt.se5, swapped.is.amt.se1];
assert.strictEqual(E.gradeStatement('is', swapped).units, E.gradeStatement('is', E.ANSWER_KEY).total);

// Carry-forward: a wrong sales amount costs half a line, but every subtotal built on it still earns credit.
const cf = clone(E.ANSWER_KEY);
cf.is.amt.s1 = '610,000';
const shift = -2000;
['ns', 'gp', 'ifo', 'ni'].forEach(id => { cf.is.amt[id] = E.plain(K.is[id] + shift); });
let g = E.gradeStatement('is', cf);
assert.strictEqual(g.lines.s1.st, 'half');
['ns', 'gp', 'ifo', 'ni'].forEach(id => assert.strictEqual(g.lines[id].st, 'ok', id + ' earns carry-forward credit'));
assert.strictEqual(g.total - g.units, 0.5);
// ...and that net income flows into the SOE and balance sheet without further loss.
cf.soe.amt.nin = E.plain(K.is.ni + shift);
cf.soe.amt.inc = E.plain(K.soe.inc + shift);
cf.soe.amt.end = E.plain(K.soe.end + shift);
cf.bs.amt.cap = E.plain(K.bs.cap + shift);
cf.bs.amt.tloe = E.plain(K.bs.tloe + shift);
assert.strictEqual(E.gradeStatement('soe', cf).units, E.gradeStatement('soe', cf).total, 'SOE accepts carried net income');
assert.strictEqual(E.gradeStatement('bs', cf).units, E.gradeStatement('bs', cf).total, 'BS accepts carried ending capital');

// A misplaced account earns nothing and explains why.
const bad = clone(E.ANSWER_KEY);
bad.is.acct.se3 = '711'; // Office Salaries Expense in a selling slot (and duplicated below)
g = E.gradeStatement('is', bad);
assert.strictEqual(g.lines.se3.st, 'bad');
assert(/not a selling expense/.test(g.lines.se3.note));
assert.strictEqual(g.lines.ae1.st, 'bad', 'duplicate account is flagged');

// Accumulated depreciation must match the equipment above it.
const pair = clone(E.ANSWER_KEY);
pair.bs.acct.pc1 = '186'; pair.bs.acct.pc2 = '182';
g = E.gradeStatement('bs', pair);
assert.strictEqual(g.lines.pc1.st, 'bad');
assert.strictEqual(g.lines.pc2.st, 'bad');

// Headings: the balance sheet uses a point-in-time date.
const head = clone(E.ANSWER_KEY);
head.bs.head.date = E.STATEMENTS.is.date;
assert.strictEqual(E.gradeStatement('bs', head).head.date.st, 'bad');

// Net other expense can be typed as 3,000, (3,000) or -3,000.
['3,000', '(3,000)', '-3000'].forEach(v => {
  const x = clone(E.ANSWER_KEY); x.is.amt.noi = v;
  assert.strictEqual(E.gradeStatement('is', x).lines.noi.st, 'ok', v);
});

// Typing 0 in a subtotal with nothing filled in above earns nothing.
const zeros = E.blankAnswers();
zeros.is.amt.ns = '0';
assert.strictEqual(E.gradeStatement('is', zeros).lines.ns.st, 'bad');

// Amount parsing.
assert.strictEqual(E.parseAmt('$1,800'), 1800);
assert.strictEqual(E.parseAmt('(3,000)'), -3000);
assert.strictEqual(E.parseAmt(''), null);
assert.strictEqual(E.parseAmt('abc'), null);

// Check codes depend on the name and scores.
const first = { classify: 20, is: 35, soe: 15, bs: 30 };
const c1 = E.checkCode('ABCD-EFGH', 'Pat Lee', first, 1);
assert.strictEqual(c1, E.checkCode('abcd-efgh', ' pat lee ', first, 1));
assert.notStrictEqual(c1, E.checkCode('ABCD-EFGH', 'Pat Lee', Object.assign({}, first, { bs: 29 }), 1));

console.log('Part 3 tests passed.');
