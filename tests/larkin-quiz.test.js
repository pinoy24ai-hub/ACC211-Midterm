// Run with: node tests/larkin-quiz.test.js
// Checks the Larkin Entry Quiz against the answer key in the Larkin Craft & Hobby Supply GL workshop
// (merchandising_gl_workshop_3_sales_ar.html), and that every wrong choice is distinct, balanced and explained.
const { Q, OPENING, META } = require('../src/larkin-quiz/js/questions.js');
const assert = require('assert');

const parts = (e) => e === null ? [] : Array.isArray(e[0]) ? e : [e];
const sig = (e) => e === null ? 'NO ENTRY' : parts(e).flat().map((l) => l.a + '|' + (l.dr ? 'Dr' : 'Cr') + '|' + (l.dr || l.cr)).sort().join(';');
const balanced = (e) => parts(e).every((p) => p.reduce((s, l) => s + (l.dr || 0), 0) === p.reduce((s, l) => s + (l.cr || 0), 0));

// Workshop answer key: [date, lines as "account|Dr/Cr|amount"]. Subsidiary accounts carry the customer or vendor.
const MI = 'Merchandise Inventory', COGS = 'Cost of goods sold', S = 'Sales revenue';
const AR = (c) => 'Accounts receivable (' + c + ')', AP = (v) => 'Accounts payable (' + v + ')';
const KEY = [
  ['Dec 2', [MI + '|Dr|6000', AP('Brightwater Wholesale') + '|Cr|6000']],
  ['Dec 3', ['Cash|Dr|2000', COGS + '|Dr|1200', S + '|Cr|2000', MI + '|Cr|1200']],
  ['Dec 4', ['Cash|Dr|1500', AR('Delaware Park Gallery') + '|Cr|1500']],
  ['Dec 5', [AR('Hamlin Hobby Club') + '|Dr|5000', COGS + '|Dr|3000', S + '|Cr|5000', MI + '|Cr|3000']],
  ['Dec 6', null],
  ['Dec 8', [AP('Brightwater Wholesale') + '|Dr|6000', 'Cash|Cr|5880', MI + '|Cr|120']],
  ['Dec 9', [AR('Lockport Crafters') + '|Dr|2400', COGS + '|Dr|1440', S + '|Cr|2400', MI + '|Cr|1440']],
  ['Dec 10', ['Sales returns & allowances|Dr|400', MI + '|Dr|240', AR('Hamlin Hobby Club') + '|Cr|400', COGS + '|Cr|240']],
  ['Dec 12', ['Cash|Dr|4508', 'Sales discounts|Dr|92', AR('Hamlin Hobby Club') + '|Cr|4600']],
  ['Dec 14', [AR('Elmwood Art Studio') + '|Dr|3200', COGS + '|Dr|1920', S + '|Cr|3200', MI + '|Cr|1920']],
  ['Dec 16', ['Sales returns & allowances|Dr|200', AR('Elmwood Art Studio') + '|Cr|200']],
  ['Dec 22', ['Cash|Dr|2940', 'Sales discounts|Dr|60', AR('Elmwood Art Studio') + '|Cr|3000']],
  ['Dec 29', [AR('Delaware Park Gallery') + '|Dr|2500', COGS + '|Dr|1500', S + '|Cr|2500', MI + '|Cr|1500']],
  ['Dec 30', ['Rent expense|Dr|1200', 'Cash|Cr|1200']],
  ['Dec 30', ['Salaries expense|Dr|1800', 'Cash|Cr|1800']],
  ['Dec 31', ['Bad debt expense|Dr|170', 'Allowance for Doubtful Accounts|Cr|170']]
];

assert.strictEqual(Q.length, 16);
Q.forEach((q, i) => {
  const [date, lines] = KEY[i];
  assert.strictEqual(q.date, date, 'question ' + (i + 1) + ' date');
  assert.strictEqual(sig(q.correct), lines === null ? 'NO ENTRY' : lines.slice().sort().join(';'), 'question ' + (i + 1) + ' matches the workshop key');
  assert.ok(balanced(q.correct), 'question ' + (i + 1) + ' correct entries balance');
  const twoPart = lines !== null && lines.some((l) => l.startsWith(COGS));
  assert.strictEqual(q.correct !== null && Array.isArray(q.correct[0]), twoPart, 'question ' + (i + 1) + (twoPart ? ' is two separate entries' : ' is one entry'));
  if (twoPart) assert.ok(q.correct[1].some((l) => l.a === COGS), 'question ' + (i + 1) + ' revenue entry first, then cost entry');
  assert.strictEqual(q.wrong.length, 3);
  assert.strictEqual(new Set([q.correct].concat(q.wrong.map((w) => w.e)).map(sig)).size, 4, 'question ' + (i + 1) + ' choices are all different');
  q.wrong.forEach((w, j) => {
    assert.ok(balanced(w.e), 'question ' + (i + 1) + ' wrong choice ' + (j + 1) + ' balances');
    assert.ok(w.why && w.why.length > 30, 'question ' + (i + 1) + ' wrong choice ' + (j + 1) + ' explains the mistake');
  });
  assert.ok(q.hints.length >= 1 && q.why);
});

// Opening balances balance, and the year-end figures follow from the entries themselves.
assert.strictEqual(OPENING.reduce((s, r) => s + r[1], 0), 37200);
assert.strictEqual(OPENING.reduce((s, r) => s + r[2], 0), 37200);
const bal = {};
OPENING.forEach((r) => { bal[r[0]] = (bal[r[0]] || 0) + r[1] - r[2]; });
Q.slice(0, 15).forEach((q) => parts(q.correct).flat().forEach((l) => { bal[l.a] = (bal[l.a] || 0) + (l.dr || 0) - (l.cr || 0); }));
const ar = Object.keys(bal).filter((a) => a.startsWith('Accounts receivable')).reduce((s, a) => s + bal[a], 0);
assert.strictEqual(ar, 7600, 'ending A/R before the adjustment');
assert.strictEqual(-bal['Allowance for Doubtful Accounts'], 210);
assert.strictEqual(ar * 0.05 - 210, 170, 'bad debt adjustment');
assert.match(Q[15].note, /\$7,600/);
assert.strictEqual(META.storeKey !== 'acc211-cobblestone-quiz-v2', true, 'separate saved progress from the Cobblestone quiz');

console.log('larkin-quiz: all checks passed');
