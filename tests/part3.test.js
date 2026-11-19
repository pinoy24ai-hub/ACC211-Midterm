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

// Check codes depend on the name and the result.
const c1 = E.checkCode('ABCD-EFGH', 'Pat Lee', 30, 2);
assert.strictEqual(c1, E.checkCode('abcd-efgh', ' pat lee ', 30, 2));
assert.notStrictEqual(c1, E.checkCode('ABCD-EFGH', 'Pat Lee', 31, 2));

// The single-file build is up to date with part3-site/.
const single = require('../tools/build-part3-single.js');
assert.strictEqual(fs.readFileSync(single.OUT, 'utf8'), single.build(),
  'part3-single/ is out of date: run node tools/build-part3-single.js');

console.log('Part 3 tests passed.');
