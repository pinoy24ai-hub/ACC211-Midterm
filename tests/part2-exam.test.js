// Run with: node tests/part2-exam.test.js
// Stress-tests the randomized Part 2 exam: every version must tell the same story,
// avoid rounding edges, have one clear answer per question, and score 100 when perfect.
const E = require('../part2-site/js/engine.js');
const assert = require('assert');

const edge = (x, d) => { const v = Math.abs(x) * Math.pow(10, d); const f = v - Math.floor(v); return Math.abs(f - 0.5) > 0.03; };
const N = 3000;
const seen = { v1: new Set(), sorts: new Set(), npmBench: new Set(), rev: new Set() };
let t0 = Date.now();
for (let i = 0; i < N; i++) {
  const code = E.newVersionCode();
  const ex = E.generateExam(code, { randomize: true });
  assert.strictEqual(JSON.stringify(E.generateExam(code, { randomize: true })), JSON.stringify(ex), 'deterministic');
  const { IS, BS, bench, bank } = ex.data;
  seen.rev.add(IS.rev.a1); seen.npmBench.add(bench.npm);

  // statements foot and balance; all amounts are whole hundreds and positive
  [1, 2].forEach(y => {
    assert.strictEqual(BS['ta' + y], BS['tl' + y] + BS.item('cap')['a' + y]);
    BS.items.forEach(x => assert(x['a' + y] > 0 && x['a' + y] % 100 === 0, code + ' ' + x.key));
  });
  // the story
  const npm1 = E.share(IS.ni1, IS.rev.a1), npm2 = E.share(IS.ni2, IS.rev.a2);
  assert(IS.rev.a2 > IS.rev.a1 && npm2 < npm1, code + ' revenue up, margin down');
  assert(npm1 > bench.npm && npm2 < bench.npm, code + ' margin crosses below benchmark');
  assert(BS.cr1 > bench.cr && BS.cr2 < bench.cr, code + ' current ratio crosses below benchmark');
  assert(BS.dr1 * 100 < bench.dr && BS.dr2 * 100 > bench.dr, code + ' debt ratio crosses above benchmark');
  assert(BS.wc2 < BS.wc1 && BS.wc2 >= bank.wc, code + ' working capital falls but meets the rule');
  assert(BS.item('cash').a2 < BS.item('cash').a1 && BS.item('ar').a2 > BS.item('ar').a1 && BS.item('eq').a2 > BS.item('eq').a1, code + ' cash story');
  assert(BS.item('cap').a1 + IS.ni2 - BS.item('cap').a2 > 0, code + ' withdrawals positive');
  assert.strictEqual(BS.item('ad').a2 - BS.item('ad').a1, IS.exp.find(e => e.key === 'dep').a2, code + ' depreciation ties to income statement');
  // rounding edges on displayed ratios
  [BS.cr1, BS.cr2].forEach(v => assert(edge(v, 2), code + ' ratio edge'));
  [BS.dr1 * 100, BS.dr2 * 100, IS.ni1 / IS.rev.a1 * 100, IS.ni2 / IS.rev.a2 * 100].forEach(v => assert(edge(v, 1), code + ' pct edge'));

  // questions
  const perfect = {};
  let count = 0;
  ex.stages.forEach(st => st.questions.forEach(q => {
    count++;
    assert(q.hint && q.prompt, q.id);
    if (q.kind === 'mc' || q.kind === 'tf') {
      assert.strictEqual(q.options.filter(o => o.ok).length, 1, code + ' ' + q.id + ' one right option');
      assert.strictEqual(new Set(q.options.map(o => o.text)).size, q.options.length, code + ' ' + q.id + ' distinct options');
      if (q.kind === 'mc') assert.strictEqual(q.options.length, 4, code + ' ' + q.id + ' four options');
      perfect[q.id] = q.options.findIndex(o => o.ok);
    } else if (q.kind === 'pick') {
      assert(q.pickKeys.includes(q.answer));
      if (q.view === 'is') assert(q.pickKeys.length === 4);
      perfect[q.id] = q.answer;
    } else if (q.kind === 'formula') perfect[q.id] = q.answer;
    else { const place = {}; q.items.forEach(x => place[x.key] = x.dest); perfect[q.id] = { place }; }
  }));
  assert.strictEqual(count, 40);
  assert.strictEqual(E.gradeExam(ex, perfect).total, 100, code + ' perfect = 100');
  // the bank decision: only working capital passes
  const rules = ex.stages.find(s => s.id === 'FINAL').questions[1];
  assert.strictEqual(rules.options.find(o => o.ok).text, 'Only working capital meets its rule.', code);
  // finale keeps its order; other stages are shuffled
  assert.deepStrictEqual(ex.stages.find(s => s.id === 'FINAL').questions.map(q => q.id), ['FINAL-1', 'FINAL-2', 'FINAL-3', 'FINAL-4', 'FINAL-5']);
  const vq = ex.stages[0].questions.find(q => q.id === 'VERT-1');
  seen.v1.add(vq.prompt.split(', ')[1].split(' was')[0]);
  seen.sorts.add(ex.stages[3].questions.filter(q => q.label === 'Sort It').map(q => q.prompt).sort().join('|'));
}
// variety across versions
assert(seen.rev.size > 50, 'revenue varies');
assert(seen.v1.size === 7, 'every expense gets asked about');
assert(seen.sorts.size > 20, 'sorting items vary');
assert(seen.npmBench.size > 5, 'benchmarks vary');
// practice mode is unchanged by the exam features
const practice = E.generateExam('ABCD-EFGH');
assert.strictEqual(practice.randomized, false);
assert.strictEqual(practice.data.IS.rev.a1, 160000);
console.log('OK:', N, 'randomized versions in', ((Date.now() - t0) / 1000).toFixed(1) + 's;', seen.rev.size, 'different revenue figures,', seen.npmBench.size, 'different margin benchmarks');
// part2-exam-site must be an exact build of part2-site plus the exam config
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const list = d => fs.readdirSync(d, { recursive: true }).filter(f => fs.statSync(path.join(d, f)).isFile()).sort();
assert.deepStrictEqual(list(path.join(root, 'part2-exam-site')), list(path.join(root, 'part2-site')), 'same files in both sites');
list(path.join(root, 'part2-site')).filter(f => f !== path.join('js', 'config.js')).forEach(f =>
  assert(fs.readFileSync(path.join(root, 'part2-site', f)).equals(fs.readFileSync(path.join(root, 'part2-exam-site', f))),
    'part2-exam-site/' + f + ' is out of date: run node tools/build-part2-exam.js'));
assert(fs.readFileSync(path.join(root, 'part2-exam-site/js/config.js'), 'utf8').includes("mode: 'exam', randomize: true, hints: false"));
console.log('OK: part2-exam-site is up to date');
const inspector2 = fs.readFileSync(path.join(root, 'instructor/part2-inspector.html'), 'utf8');
assert(inspector2.includes(fs.readFileSync(path.join(root, 'part2-site/js/engine.js'), 'utf8')),
  'instructor/part2-inspector.html is out of date: run node tools/build-instructor.js');
console.log('OK: Part 2 inspector up to date');
