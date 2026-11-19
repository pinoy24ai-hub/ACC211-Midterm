// Run with: node tests/part3.test.js
// Checks the Part 3 practice app (classify accounts, then generate merchandising statements).
const E = require('../part3-site/js/engine.js');
const assert = require('assert');
const fs = require('fs');

// The adjusted trial balance balances.
let dr = 0, cr = 0;
E.ACCOUNTS.forEach(a => { if (a.side === 'dr') dr += a.bal; else cr += a.bal; });
assert.strictEqual(dr, cr, 'adjusted trial balance balances');

// Every account has a valid category and an explanation; account numbers are unique.
assert.strictEqual(new Set(E.ACCOUNTS.map(a => a.no)).size, E.ACCOUNTS.length);
E.ACCOUNTS.forEach(a => { assert(E.CAT[a.cls], a.name + ' has a category'); assert(E.WHY[a.no], a.name + ' has an explanation'); });
E.CATS.forEach(c => assert(E.ACCOUNTS.some(a => a.cls === c.id), c.label + ' is used'));

// Accumulated depreciation is its own contra category and points at its equipment.
E.ACCOUNTS.filter(a => /Accumulated Depreciation/.test(a.name)).forEach(a => {
  assert.strictEqual(a.cls, 'cpe');
  assert.strictEqual(E.ACCT[a.pair].cls, 'pe');
});

// Grading.
const key = E.answerKey();
assert(E.gradeClassify(key).allRight);
assert.strictEqual(E.gradeClassify({}).right, 0);
const oneWrong = Object.assign({}, key, { 182: 'pe' });
const g = E.gradeClassify(oneWrong);
assert.strictEqual(g.right, E.ACCOUNTS.length - 1);
assert(!g.allRight && /contra asset/.test(g.items[182].note));

// Statements tie together.
const S = E.buildStatements(key), F = S.fig;
assert.strictEqual(F.ns, 590000);
assert.strictEqual(F.gp, 227500);
assert.strictEqual(F.ifo, 65000);
assert.strictEqual(F.ni, 62000);
assert.strictEqual(F.end, 137100);
assert.strictEqual(F.tpe, 92100, 'accumulated depreciation is deducted from equipment');
assert.strictEqual(F.ta, F.tloe, 'balance sheet balances');
const ni = E.ACCOUNTS.reduce((s, a) => ['rev', 'oi'].includes(a.cls) ? s + a.bal : ['contra', 'cogs', 'sell', 'admin', 'oe'].includes(a.cls) ? s - a.bal : s, 0);
assert.strictEqual(ni, F.ni, 'net income matches the trial balance');

// Every account appears on a statement exactly once (Capital and Drawing on the SOE).
const isNames = S.is.rows.map(r => r.label.replace(/^Less: /, ''));
const bsNames = S.bs.rows.map(r => r.label);
E.ACCOUNTS.forEach(a => {
  if (['cap', 'draw'].includes(a.cls)) return;
  if (a.cls === 'cpe') return; // shown as "Less: Accumulated depreciation" under its equipment
  const n = isNames.filter(x => x === a.name).length + bsNames.filter(x => x === a.name).length;
  assert.strictEqual(n, 1, a.name + ' appears once');
});
assert.strictEqual(bsNames.filter(x => x === 'Less: Accumulated depreciation').length, 2);
// Each accumulated depreciation line sits right under its equipment, with the book value beside it.
const peRows = S.bs.rows.filter(r => r.label === 'Less: Accumulated depreciation');
assert.deepStrictEqual(peRows.map(r => r.amts[1]), [64800, 27300]);

// Tasks 2 to 4: the blanks are exactly the calculated amounts, and each has a hint.
const ids = k => E.blanks(k).map(b => b.id);
assert.deepStrictEqual(ids('is'), ['ded', 'ns', 'gp', 'tse', 'tae', 'toe', 'ifo', 'net', 'ni']);
assert.deepStrictEqual(ids('soe'), ['nin', 'inc', 'end']);
assert.deepStrictEqual(ids('bs'), ['tca', 'bv1', 'bv2', 'tpe', 'ta', 'tcl', 'tl', 'cap', 'tloe']);
['is', 'soe', 'bs'].forEach(k => E.blanks(k).forEach(b => assert(b.hint, b.id + ' has a hint')));
// Account balances are never blanks: every blank value is a computed amount.
['is', 'soe', 'bs'].forEach(k => E.blanks(k).forEach(b => assert(b.label !== 'Sales' && b.label !== 'Cash')));
// Carry-overs line up across statements.
const val = (k, id) => E.blanks(k).find(b => b.id === id).value;
assert.strictEqual(val('soe', 'nin'), val('is', 'ni'));
assert.strictEqual(val('bs', 'cap'), val('soe', 'end'));
assert.strictEqual(val('bs', 'ta'), val('bs', 'tloe'));
// Grading the blanks.
['is', 'soe', 'bs'].forEach(k => assert(E.gradeCalc(k, E.calcKey(k)).allRight, k + ' key is all right'));
assert.strictEqual(E.gradeCalc('is', {}).right, 0);
['3,000', '(3,000)', '-3000', '$3,000'].forEach(v => assert(E.gradeCalc('is', { net: v }).items.net.ok, v));
let gi = E.gradeCalc('is', Object.assign(E.calcKey('is'), { gp: '227,000' }));
assert.strictEqual(gi.right, 8);
assert(/Gross profit = /.test(gi.items.gp.note));
assert(/as a number/.test(E.gradeCalc('is', { ns: 'abc' }).items.ns.note));
assert(/ending capital/.test(E.gradeCalc('bs', { cap: '115,100' }).items.cap.note), 'beginning capital on the balance sheet gets a hint');

// Check codes depend on the name and the results.
const first = { classify: 30, is: 7, soe: 3, bs: 9 };
const c1 = E.checkCode('ABCD-EFGH', 'Pat Lee', first, 6);
assert.strictEqual(c1, E.checkCode('abcd-efgh', ' pat lee ', first, 6));
assert.notStrictEqual(c1, E.checkCode('ABCD-EFGH', 'Pat Lee', Object.assign({}, first, { is: 8 }), 6));

// Built-in calculator math (no eval; usual order of operations).
const C = require('../part3-site/js/calc.js');
assert.strictEqual(C.evaluate('68400+12600+8900+9600+3400'), 102900);
assert.strictEqual(C.evaluate('2+3*4'), 14);
assert.strictEqual(C.evaluate('1800-4800'), -3000);
assert.strictEqual(C.evaluate('-3000+65000'), 62000);
assert.strictEqual(C.evaluate('0.1+0.2'), 0.3);
assert.strictEqual(C.evaluate('5+'), null, 'unfinished expression');
assert(Number.isNaN(C.evaluate('7/0')), 'divide by zero');

// The single-file build is up to date with part3-site/.
const single = require('../tools/build-part3-single.js');
assert.strictEqual(fs.readFileSync(single.OUT, 'utf8'), single.build(),
  'part3-single/ is out of date: run node tools/build-part3-single.js');

console.log('Part 3 tests passed.');
