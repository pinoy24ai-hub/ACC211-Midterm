// Run with: node tests/elmwood-quiz.test.js
// Checks the Elmwood Entry Quiz against the answer key in the Elmwood Hardware & Supply GL workshop
// (merchandising_gl_workshop.html), and that every wrong choice is distinct, balanced and explained.
const { Q, OPENING, META } = require('../src/elmwood-quiz/js/questions.js');
const assert = require('assert');

const parts = (e) => e === null ? [] : Array.isArray(e[0]) ? e : [e];
const sig = (e) => e === null ? 'NO ENTRY' : parts(e).flat().map((l) => l.a + '|' + (l.dr ? 'Dr' : 'Cr') + '|' + (l.dr || l.cr)).sort().join(';');
const balanced = (e) => parts(e).every((p) => p.reduce((s, l) => s + (l.dr || 0), 0) === p.reduce((s, l) => s + (l.cr || 0), 0));

const MI = 'Merchandise Inventory', COGS = 'Cost of goods sold', S = 'Sales revenue';
const AP = 'Accounts payable (Alpha Co.)', AR = 'Accounts receivable (Beta Co.)';
// Workshop answer key: [date, lines as "account|Dr/Cr|amount"].
const KEY = [
  ['May 2', [MI + '|Dr|5000', 'Cash|Cr|5000']],
  ['May 5', [MI + '|Dr|3000', AP + '|Cr|3000']],
  ['May 8', [AP + '|Dr|500', MI + '|Cr|500']],
  ['May 10', [MI + '|Dr|200', 'Cash|Cr|200']],
  ['May 12', [AP + '|Dr|2500', 'Cash|Cr|2450', MI + '|Cr|50']],
  ['May 15', ['Cash|Dr|4000', COGS + '|Dr|2400', S + '|Cr|4000', MI + '|Cr|2400']],
  ['May 20', [AR + '|Dr|3500', COGS + '|Dr|2100', S + '|Cr|3500', MI + '|Cr|2100']],
  ['May 22', ['Sales returns & allowances|Dr|500', MI + '|Dr|300', AR + '|Cr|500', COGS + '|Cr|300']],
  ['May 29', ['Cash|Dr|2940', 'Sales discounts|Dr|60', AR + '|Cr|3000']],
  ['May 30', ['Rent expense|Dr|900', 'Cash|Cr|900']],
  ['May 31', ['Salaries expense|Dr|1100', 'Cash|Cr|1100']],
  ['May 31', ['Utilities expense|Dr|180', 'Cash|Cr|180']]
];

assert.strictEqual(Q.length, 12);
Q.forEach((q, i) => {
  const [date, lines] = KEY[i];
  assert.strictEqual(q.date, date, 'question ' + (i + 1) + ' date');
  assert.strictEqual(sig(q.correct), lines.slice().sort().join(';'), 'question ' + (i + 1) + ' matches the workshop key');
  assert.ok(balanced(q.correct), 'question ' + (i + 1) + ' correct entries balance');
  const twoPart = lines.some((l) => l.startsWith(COGS));
  assert.strictEqual(Array.isArray(q.correct[0]), twoPart, 'question ' + (i + 1) + (twoPart ? ' is two separate entries' : ' is one entry'));
  if (twoPart) assert.ok(q.correct[1].some((l) => l.a === COGS), 'question ' + (i + 1) + ' revenue entry first, then cost entry');
  assert.strictEqual(q.wrong.length, 3);
  assert.strictEqual(new Set([q.correct].concat(q.wrong.map((w) => w.e)).map(sig)).size, 4, 'question ' + (i + 1) + ' choices are all different');
  q.wrong.forEach((w, j) => {
    assert.ok(balanced(w.e), 'question ' + (i + 1) + ' wrong choice ' + (j + 1) + ' balances');
    assert.ok(w.why && w.why.length > 30, 'question ' + (i + 1) + ' wrong choice ' + (j + 1) + ' explains the mistake');
  });
  assert.ok(q.hints.length >= 1 && q.why);
});
assert.deepStrictEqual(OPENING, [], 'the workshop starts with empty books');
assert.strictEqual(META.storeKey, 'acc211-elmwood-quiz-v1', 'separate saved progress from the other quizzes');

console.log('elmwood-quiz: all checks passed');
