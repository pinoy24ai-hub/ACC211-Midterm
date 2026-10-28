// Run with: node tests/cobblestone-quiz.test.js
// The quiz's correct answers must match the Cobblestone ledger's answer key, and every wrong choice must be
// a balanced, distinct entry with an explanation.
const { Q } = require('../src/cobblestone-quiz/js/questions.js');
const C = require('../src/cobblestone/js/engine.js');
const assert = require('assert');

const sig = (e) => e === null ? 'NO ENTRY' : e.map((l) => l.a + '|' + (l.dr ? 'Dr' : 'Cr') + '|' + (l.dr || l.cr)).sort().join(';');
const balanced = (e) => e === null || e.reduce((s, l) => s + (l.dr || 0), 0) === e.reduce((s, l) => s + (l.cr || 0), 0);

assert.strictEqual(Q.length, C.N, 'one question per transaction');
Q.forEach((q, i) => {
  const t = C.T[i];
  assert.strictEqual(q.date, t.date, 'question ' + (i + 1) + ' date');
  assert.strictEqual(sig(q.correct), t.noEntry ? 'NO ENTRY' : sig(t.lines), 'question ' + (i + 1) + ' correct answer matches the ledger key');
  assert.strictEqual(q.wrong.length, 3, 'question ' + (i + 1) + ' has 3 wrong choices');
  const all = [q.correct].concat(q.wrong.map((w) => w.e)).map(sig);
  assert.strictEqual(new Set(all).size, 4, 'question ' + (i + 1) + ' choices are all different');
  q.wrong.forEach((w, j) => {
    assert.ok(balanced(w.e), 'question ' + (i + 1) + ' wrong choice ' + (j + 1) + ' balances (plausible)');
    assert.ok(w.why && w.why.length > 30, 'question ' + (i + 1) + ' wrong choice ' + (j + 1) + ' explains the mistake');
  });
  assert.ok(q.hints.length >= 1 && q.why, 'question ' + (i + 1) + ' has hints and an explanation');
});
// "No entry required" appears as a choice in more than one question, so it is not a giveaway
assert.ok(Q.filter((q) => q.correct === null || q.wrong.some((w) => w.e === null)).length >= 3);

console.log('cobblestone-quiz: all checks passed');
