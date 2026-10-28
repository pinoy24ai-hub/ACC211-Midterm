// Run with: node tests/cobblestone-quiz.test.js
// The quiz's correct answers must match the Cobblestone ledger's answer key, and every wrong choice must be
// a balanced, distinct entry with an explanation.
const { Q } = require('../src/cobblestone-quiz/js/questions.js');
const C = require('../src/cobblestone/js/engine.js');
const assert = require('assert');

// An entry is a list of lines, null (no entry) or a list of separate entries (sales and sales returns).
const parts = (e) => e === null ? [] : Array.isArray(e[0]) ? e : [e];
const sig = (e) => e === null ? 'NO ENTRY' : parts(e).flat().map((l) => l.a + '|' + (l.dr ? 'Dr' : 'Cr') + '|' + (l.dr || l.cr)).sort().join(';');
const balanced = (e) => parts(e).every((p) => p.reduce((s, l) => s + (l.dr || 0), 0) === p.reduce((s, l) => s + (l.cr || 0), 0));

assert.strictEqual(Q.length, C.N, 'one question per transaction');
Q.forEach((q, i) => {
  const t = C.T[i];
  assert.strictEqual(q.date, t.date, 'question ' + (i + 1) + ' date');
  assert.strictEqual(sig(q.correct), t.noEntry ? 'NO ENTRY' : sig(t.lines), 'question ' + (i + 1) + ' correct answer matches the ledger key');
  assert.strictEqual(q.wrong.length, 3, 'question ' + (i + 1) + ' has 3 wrong choices');
  const all = [q.correct].concat(q.wrong.map((w) => w.e)).map(sig);
  assert.strictEqual(new Set(all).size, 4, 'question ' + (i + 1) + ' choices are all different');
  assert.ok(balanced(q.correct), 'question ' + (i + 1) + ' correct entries balance');
  const twoPart = ['Nov 15', 'Nov 17', 'Nov 19', 'Nov 28'].includes(q.date);
  assert.strictEqual(q.correct !== null && Array.isArray(q.correct[0]), twoPart, 'question ' + (i + 1) + (twoPart ? ' is two separate entries' : ' is one entry'));
  if (twoPart) assert.deepStrictEqual(q.correct.map((p) => p.length), [2, 2], 'question ' + (i + 1) + ' revenue entry, then cost entry');
  q.wrong.forEach((w, j) => {
    assert.ok(balanced(w.e), 'question ' + (i + 1) + ' wrong choice ' + (j + 1) + ' balances (plausible)');
    assert.ok(w.why && w.why.length > 30, 'question ' + (i + 1) + ' wrong choice ' + (j + 1) + ' explains the mistake');
  });
  assert.ok(q.hints.length >= 1 && q.why, 'question ' + (i + 1) + ' has hints and an explanation');
});
// "No entry required" appears as a choice in more than one question, so it is not a giveaway
assert.ok(Q.filter((q) => q.correct === null || q.wrong.some((w) => w.e === null)).length >= 3);
// notes on the two freight questions name the FOB terms
assert.match(Q[1].note, /FOB destination/);
assert.match(Q[3].note, /FOB shipping point/);

console.log('cobblestone-quiz: all checks passed');
