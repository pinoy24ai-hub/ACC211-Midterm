// Run with: node tests/part2.test.js
// Checks the Part 2 (financial statement analysis) prototype.
const E = require('../part2-site/js/engine.js');
const assert = require('assert');

const ex = E.generateExam('ABCD-EFGH');
assert.strictEqual(ex.stages.length, 7);
assert.strictEqual(ex.stages.reduce((s, st) => s + st.questions.length, 0), 40);
assert.strictEqual(ex.possible, 100);

// statements foot and balance
const { IS, BS } = ex.data;
assert.strictEqual(IS.rev.a1 - IS.te1, IS.ni1);
[1, 2].forEach(y => assert.strictEqual(BS['ta' + y], BS['tl' + y] + BS.item('cap')['a' + y], 'balance sheet balances ' + y));

// perfect answers score 100; nothing answered scores 0
const perfect = {};
ex.stages.forEach(st => st.questions.forEach(q => {
  if (q.kind === 'mc' || q.kind === 'tf') {
    assert.strictEqual(q.options.filter(o => o.ok).length, 1, q.id + ' has one right option');
    assert.strictEqual(new Set(q.options.map(o => o.text)).size, q.options.length, q.id + ' options are distinct');
    perfect[q.id] = q.options.findIndex(o => o.ok);
  } else if (q.kind === 'pick') perfect[q.id] = q.answer;
  else if (q.kind === 'formula') perfect[q.id] = q.answer;
  else { const place = {}; q.items.forEach(x => place[x.key] = x.dest); perfect[q.id] = { place }; }
  assert(q.hint, q.id + ' has a hint');
}));
assert.strictEqual(E.gradeExam(ex, perfect).total, 100);
assert.strictEqual(E.gradeExam(ex, {}).total, 0);

// partial credit on build boards; formulas are all or nothing
const board = ex.stages[3].questions[5];
const half = { place: {} };
board.items.forEach((x, i) => half.place[x.key] = i % 2 ? x.dest : (x.dest === 'ca' ? 'cl' : 'ca'));
const f = E.gradeQuestion(board, half);
assert(f > 0 && f < 1, 'sort board gives partial credit');
const formula = ex.stages[4].questions[1];
assert.strictEqual(E.gradeQuestion(formula, { a: formula.answer.b, op: '/', b: formula.answer.a }), 0, 'reversed division earns nothing');

// key results used in the questions
assert.strictEqual(E.pct(E.share(IS.ni2, IS.rev.a2)), '22.7%');
assert.strictEqual(E.ratio(BS.cr2), '1.39');
assert.strictEqual(E.pct(BS.dr2 * 100), '51.7%');

// same code rebuilds the same exam; option order differs between codes
assert.deepStrictEqual(JSON.stringify(E.generateExam('ABCD-EFGH')), JSON.stringify(ex));
const other = E.generateExam('ZZZZ-2222');
assert(ex.stages.some((st, i) => st.questions.some((q, j) => q.options && JSON.stringify(q.options) !== JSON.stringify(other.stages[i].questions[j].options))));
console.log('OK: Part 2 prototype checks passed');
