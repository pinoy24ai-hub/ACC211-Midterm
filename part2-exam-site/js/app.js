/* ACC 211 Midterm Part 2: user interface and exam flow. */
(function () {
  'use strict';

  const E = window.Part2Engine;
  // Set per site in js/config.js: the practice site uses fixed numbers with hints,
  // the exam site randomizes every version and has no hints.
  const CFG = Object.assign({ mode: 'practice', randomize: false, hints: true, title: 'ACC 211 Midterm: Part 2 Practice' }, window.PART2_CONFIG || {});
  const STORE_KEY = 'acc211-part2-' + CFG.mode + '-state-v1';
  const gen = code => E.generateExam(code, { randomize: CFG.randomize });
  const app = document.getElementById('app');
  let state = load();
  let exam = state ? gen(state.code) : null;
  let stmtTab = null; // which statement the scorecard view shows

  // ---------- Storage and helpers ----------

  function load() {
    try { const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); return s && s.code && s.name ? s : null; } catch (e) { return null; }
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ } }
  function clearSaved() { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  function nowIso() { return new Date().toISOString(); }
  function attemptNo() { return (state && state.attempt) || 1; }
  const money = E.money;
  const fmt = n => n ? money(n).replace('$', '') : '';
  const D = () => exam.data;

  function dialog(title, bodyHtml, okLabel, showCancel) {
    const dlg = document.getElementById('dialog');
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogBody').innerHTML = bodyHtml;
    document.getElementById('dialogOk').textContent = okLabel || 'OK';
    document.getElementById('dialogCancel').hidden = showCancel === false;
    return new Promise(resolve => {
      dlg.addEventListener('close', function onClose() { dlg.removeEventListener('close', onClose); resolve(dlg.returnValue === 'ok'); });
      if (typeof dlg.showModal === 'function') dlg.showModal(); else resolve(window.confirm(title));
    });
  }

  function newState(name, history, attempt) {
    return { v: 1, code: E.newVersionCode(), name: name, attempt: attempt || 1, history: history || [], stage: 0, q: 0,
      answers: {}, hints: {}, writes: {}, submitted: {}, startedAt: nowIso(), phase: 'exam' };
  }

  // ---------- Chrome ----------

  function setChrome() {
    document.title = CFG.title;
    const bt = document.querySelector('.brand-title');
    if (bt) bt.textContent = CFG.title;
    const steps = document.getElementById('stageSteps');
    if (!state || !exam) { steps.innerHTML = ''; }
    else {
      steps.innerHTML = exam.stages.map((st, i) => {
        const cls = state.phase === 'done' || i < state.stage ? 'done' : (i === state.stage ? 'active' : '');
        const tag = st.section + (exam.stages.filter((s, j) => s.section === st.section && j <= i).length);
        return '<li class="' + cls + '" title="' + esc(st.title) + '"><span>' + tag + '</span><span class="lbl">' + esc(st.title) + '</span></li>';
      }).join('');
    }
    const chip = document.getElementById('studentChip');
    if (state) {
      chip.hidden = false;
      chip.innerHTML = '<b>' + esc(state.name) + '</b> &middot; Attempt ' + attemptNo() + ' &middot; Version ' + esc(state.code);
      document.getElementById('brandSub').textContent = D().biz.name + ' (' + D().biz.owner + ', owner)';
    } else {
      chip.hidden = true;
      document.getElementById('brandSub').textContent = 'Financial Statement Analysis';
    }
  }

  function render() {
    setChrome();
    if (!state) return renderWelcome();
    if (state.phase === 'done') return renderResults();
    return renderStage();
  }

  // ---------- Welcome ----------

  function renderWelcome() {
    app.innerHTML =
      '<section class="card welcome">' +
      '<div class="eyebrow">' + (CFG.mode === 'practice' ? 'Practice &middot; Part 2 (fixed numbers)' : 'Midterm Exam &middot; Part 2') + '</div>' +
      '<h1>Financial Statement Analysis</h1>' +
      '<p>You will analyze the comparative income statement and balance sheet of a small service business in seven stages.</p>' +
      '<div class="points-grid">' +
      '<div><b>45 pts</b>Section A: Income statement (percent of revenue, year-over-year changes, profit margin vs industry)</div>' +
      '<div><b>55 pts</b>Section B: Balance sheet (sorting and totals, working capital, current ratio, debt ratio, the bank’s decision)</div>' +
      '<div><b>40</b>questions, 2.5 points each</div>' +
      '</div>' +
      '<ul>' +
      (CFG.hints ? '<li>Hints are free: tap <b>Show hint</b> on any question. Each stage also has a quick refresher.</li>'
        : '<li>Your exam has its own dollar amounts and question order. No hints are available.</li>') +
      '<li>You can move between questions within a stage. Once you submit a stage, it is locked.</li>' +
      '<li>No feedback is shown during the exam. Your score appears at the end.</li>' +
      '<li>The final stage asks for two short written answers. They are not scored, but they appear in your report for your professor.</li>' +
      '<li>You may retake the exam as many times as you like; your highest score counts. Download and upload the report for every attempt.</li>' +
      '<li>Your work is saved in this browser as you go.</li>' +
      '</ul>' +
      '<form id="startForm" novalidate>' +
      '<div class="field"><label for="studentName">Your full name (first and last, as shown in Canvas)</label>' +
      '<input type="text" id="studentName" autocomplete="name" maxlength="60" required></div>' +
      '<label class="check"><input type="checkbox" id="ack"> <span>I will complete this exam on my own, and I understand that each stage locks once I submit it.</span></label>' +
      '<p class="error" id="startError"></p>' +
      '<button class="btn btn-primary" type="submit">Begin Part 2</button>' +
      '</form></section>';
    document.getElementById('startForm').addEventListener('submit', ev => {
      ev.preventDefault();
      const name = document.getElementById('studentName').value.replace(/\s+/g, ' ').trim();
      const err = document.getElementById('startError');
      if (name.length < 3 || name.indexOf(' ') < 0) { err.textContent = 'Please enter your first and last name.'; return; }
      if (!document.getElementById('ack').checked) { err.textContent = 'Please check the box to confirm before you begin.'; return; }
      state = newState(name);
      exam = gen(state.code);
      save();
      window.scrollTo(0, 0);
      render();
    });
  }

  // ---------- Statements ----------

  function isTable(pick) {
    const IS = D().IS, Y1 = E.Y1, Y2 = E.Y2;
    const row = (l, cls, key) => {
      const pickable = pick && pick.keys.includes(key);
      const c = (cls || '') + (pickable ? ' pickable' : '') + (pickable && pick.value === key ? ' picked' : '');
      return '<tr class="' + c.trim() + '" data-line="' + key + '"' + (pickable ? ' data-pick="' + key + '" tabindex="0"' : '') + '><td class="' + (key && key !== 'rev' ? 'ind' : '') + '">' + esc(l.label) + '</td><td class="num">' + fmt(l.a2) + '</td><td class="num">' + fmt(l.a1) + '</td></tr>';
    };
    return '<div class="header-block"><b>' + esc(D().biz.name) + '</b><b>Comparative Income Statement</b>For the Years Ended December 31, ' + Y2 + ' and ' + Y1 + '</div>' +
      '<table class="tbl pick-table' + (pick ? ' has-picks' : '') + '"><thead><tr><th></th><th class="num">' + Y2 + '</th><th class="num">' + Y1 + '</th></tr></thead><tbody>' +
      '<tr class="grp"><td colspan="3">Revenues</td></tr>' + row(IS.rev, '', 'rev') +
      '<tr class="grp"><td colspan="3">Expenses</td></tr>' + IS.exp.map(e => row(e, '', e.key)).join('') +
      '<tr class="sub"><td>Total expenses</td><td class="num">' + fmt(IS.te2) + '</td><td class="num">' + fmt(IS.te1) + '</td></tr>' +
      '<tr class="grand"><td>Net income</td><td class="num">' + money(IS.ni2) + '</td><td class="num">' + money(IS.ni1) + '</td></tr>' +
      '</tbody></table>';
  }

  function bsListTable() {
    const BS = D().BS, Y1 = E.Y1, Y2 = E.Y2;
    return '<div class="header-block"><b>' + esc(D().biz.name) + '</b><b>Balance Sheet Accounts (unsorted)</b>December 31, ' + Y2 + ' and ' + Y1 + '</div>' +
      '<p class="small muted">Listed in the order the bookkeeper typed them in.</p>' +
      '<table class="tbl"><thead><tr><th>Account</th><th class="num">' + Y2 + '</th><th class="num">' + Y1 + '</th></tr></thead><tbody>' +
      BS.listOrder.map(k => { const x = BS.item(k); return '<tr><td>' + esc(x.label) + '</td><td class="num">' + fmt(x.a2) + '</td><td class="num">' + fmt(x.a1) + '</td></tr>'; }).join('') +
      '</tbody></table>';
  }

  function bsTable(pick) {
    const BS = D().BS, Y1 = E.Y1, Y2 = E.Y2, it = BS.item;
    const row = (k, cls) => {
      const x = it(k), pickable = pick && pick.keys.includes(k);
      const c = (pickable ? 'pickable' : '') + (pickable && pick.value === k ? ' picked' : '');
      return '<tr class="' + c + '"' + (pickable ? ' data-pick="' + k + '" tabindex="0"' : '') + '><td class="' + (cls || 'ind') + '">' + esc(x.label) + '</td><td class="num">' + fmt(x.a2) + '</td><td class="num">' + fmt(x.a1) + '</td></tr>';
    };
    const sub = (label, v2, v1, cls) => '<tr class="' + (cls || 'sub') + '"><td>' + label + '</td><td class="num">' + money(v2) + '</td><td class="num">' + money(v1) + '</td></tr>';
    const grp = l => '<tr class="grp"><td colspan="3">' + l + '</td></tr>';
    const nca = k => BS.item(k);
    return '<div class="header-block"><b>' + esc(D().biz.name) + '</b><b>Comparative Balance Sheet</b>December 31, ' + Y2 + ' and ' + Y1 + '</div>' +
      '<table class="tbl pick-table"><thead><tr><th></th><th class="num">' + Y2 + '</th><th class="num">' + Y1 + '</th></tr></thead><tbody>' +
      grp('Current assets') + ['cash', 'ar', 'sup', 'pre'].map(k => row(k)).join('') + sub('Total current assets', BS.ca2, BS.ca1) +
      grp('Property and equipment') + row('eq') + row('ad', 'ind2') +
      sub('Net property and equipment', nca('eq').a2 - nca('ad').a2, nca('eq').a1 - nca('ad').a1) +
      sub('Total assets', BS.ta2, BS.ta1, 'grand') +
      grp('Current liabilities') + ['ap', 'sp', 'ur', 'npc'].map(k => row(k)).join('') + sub('Total current liabilities', BS.cl2, BS.cl1) +
      grp('Long-term liabilities') + row('npl') + sub('Total liabilities', BS.tl2, BS.tl1) +
      grp('Owner’s equity') + row('cap') +
      sub('Total liabilities and owner’s equity', BS.tl2 + it('cap').a2, BS.tl1 + it('cap').a1, 'grand') +
      '</tbody></table>';
  }

  function scorecardTable() {
    const d = D(), BS = d.BS, IS = d.IS, b = d.bank, Y1 = E.Y1, Y2 = E.Y2;
    const rows = [
      ['Net profit margin', E.pct(E.share(IS.ni1, IS.rev.a1)), E.pct(E.share(IS.ni2, IS.rev.a2)), 'At least ' + b.npm.toFixed(1) + '%'],
      ['Working capital', money(BS.wc1), money(BS.wc2), 'At least ' + money(b.wc)],
      ['Current ratio', E.ratio(BS.cr1), E.ratio(BS.cr2), 'At least ' + b.cr.toFixed(2)],
      ['Debt ratio', E.pct(BS.dr1 * 100), E.pct(BS.dr2 * 100), b.dr + '% or lower']
    ];
    return '<div class="scorecard"><div class="header-block"><b>' + esc(d.biz.name) + '</b><b>Analysis Scorecard</b>' + esc(b.name) + ' loan review</div>' +
      '<table class="tbl"><thead><tr><th>Indicator</th><th class="num">' + Y1 + '</th><th class="num">' + Y2 + '</th><th>Bank’s rule</th></tr></thead><tbody>' +
      rows.map(r => '<tr><td>' + r[0] + '</td><td class="num">' + r[1] + '</td><td class="num">' + r[2] + '</td><td>' + r[3] + '</td></tr>').join('') +
      '</tbody></table><p class="small muted" style="margin-top:6px">These results are provided for this stage, so earlier answers don’t carry over.</p></div>';
  }

  function sidePanel(st) {
    let body;
    if (st.view === 'is') body = isTable();
    else if (st.view === 'bs-list') body = bsListTable();
    else if (st.view === 'bs') body = bsTable();
    else {
      const tab = stmtTab || 'score';
      body = '<div class="stmt-tabs">' + [['score', 'Scorecard'], ['is', 'Income statement'], ['bs', 'Balance sheet']].map(t =>
        '<button type="button" data-stab="' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>' +
        (tab === 'is' ? isTable() : tab === 'bs' ? bsTable() : scorecardTable());
    }
    let bench = '';
    if (st.bench === 'npm') bench = '<div class="bench-box"><b>Industry benchmark:</b> net profit margin of ' + D().bench.npm.toFixed(1) + '% for mobile detailing businesses.</div>';
    if (st.bench === 'cr') bench = '<div class="bench-box"><b>Industry benchmark:</b> current ratio of ' + D().bench.cr.toFixed(2) + '.</div>';
    if (st.bench === 'dr') bench = '<div class="bench-box"><b>Benchmark:</b> debt ratio of ' + D().bench.dr + '% or lower (lower is safer).</div>';
    return '<aside class="card side stmt">' + body + bench + '</aside>';
  }

  // ---------- Question widgets ----------

  function ans(q) { return state.answers[q.id]; }
  function setAns(q, v) { state.answers[q.id] = v; save(); }

  function widgetHtml(q) {
    const a = ans(q);
    if (q.kind === 'mc' || q.kind === 'tf') {
      return '<div class="options" role="radiogroup">' + q.options.map((o, i) =>
        '<button type="button" class="opt' + (a === i ? ' on' : '') + '" role="radio" aria-checked="' + (a === i) + '" data-opt="' + i + '"><span class="dot"></span><span>' + esc(o.text) + '</span></button>').join('') + '</div>';
    }
    if (q.kind === 'pick') {
      const pick = { keys: q.pickKeys, value: a };
      return '<p class="small muted">Click one of the ' + q.pickKeys.length + ' marked lines on the statement below.</p><div class="stmt">' + (q.view === 'bs' ? bsTable(pick) : isTable(pick)) + '</div>';
    }
    if (q.kind === 'build') {
      const place = (a && a.place) || {};
      const def = q.mustPlaceAll ? null : 'out';
      const totals = {}, counts = {};
      q.items.forEach(x => { const p = place[x.key] || def; if (p) { counts[p] = (counts[p] || 0) + 1; if (x.amt != null) totals[p] = (totals[p] || 0) + x.amt; } });
      const buckets = q.buckets.map(b => '<div class="bucket"><h4>' + esc(b.label) + '</h4>' +
        (b.total ? '<div class="btotal">' + money(totals[b.id] || 0) + '</div>' : '') +
        '<div class="bcount">' + (counts[b.id] || 0) + ' item' + ((counts[b.id] || 0) === 1 ? '' : 's') + '</div></div>').join('');
      const items = q.items.map(x => {
        const p = place[x.key] || def;
        return '<div class="build-item"><div><div class="bi-label">' + esc(x.label) + '</div><div class="bi-amt">' + esc(x.show != null ? x.show : money(x.amt)) + '</div></div>' +
          '<div class="seg" role="group" aria-label="Place ' + esc(x.label) + '">' + q.buckets.map(b =>
            '<button type="button" data-place="' + x.key + '" data-to="' + b.id + '" class="' + (p === b.id ? 'on' : '') + '">' + esc(b.label.replace(/, \d{4}$/, '')) + '</button>').join('') + '</div></div>';
      }).join('');
      return '<div class="buckets">' + buckets + '</div><div class="build-list">' + items + '</div>';
    }
    if (q.kind === 'formula') {
      const f = a || {};
      const tileOf = id => q.tiles.find(t => t.id === id);
      const slot = (which) => {
        const t = f[which] && tileOf(f[which]);
        return '<button type="button" class="slot' + (t ? ' filled' : '') + '" data-slot="' + which + '">' +
          (t ? esc(t.label) + '<span class="sv">' + money(t.val) + '</span>' : '<small>Tap an amount</small>') + '</button>';
      };
      const v = E.formulaValue(q, f);
      return '<div class="formula-row">' + slot('a') +
        '<button type="button" class="slot op-slot' + (f.op ? ' filled' : '') + '" data-slot="op">' + (f.op ? opSym(f.op) : '<small>op</small>') + '</button>' +
        slot('b') + '<span class="eq">=</span><span class="result">' + (v == null ? '?' : esc(E.formatResult(q, v))) + '</span></div>' +
        '<div class="small muted" style="margin-bottom:6px">Amounts</div><div class="tiles">' + q.tiles.map(t =>
          '<button type="button" class="tile' + (f.a === t.id || f.b === t.id ? ' used' : '') + '" data-tile="' + t.id + '">' + esc(t.label) + '<small>' + money(t.val) + '</small></button>').join('') + '</div>' +
        '<div class="small muted" style="margin-bottom:6px">Operation</div><div class="ops">' + ['+', '-', 'x', '/'].map(o =>
          '<button type="button" data-op="' + o + '" class="' + (f.op === o ? 'on' : '') + '" aria-label="' + ({ '+': 'plus', '-': 'minus', 'x': 'times', '/': 'divided by' })[o] + '">' + opSym(o) + '</button>').join('') + '</div>';
    }
    return '';
  }
  function opSym(o) { return ({ '+': '+', '-': '−', 'x': '×', '/': '÷' })[o]; }

  function bindWidget(q, rerender) {
    const card = app.querySelector('.item-card');
    card.addEventListener('click', ev => {
      const t = ev.target.closest('[data-opt],[data-pick],[data-place],[data-tile],[data-op],[data-slot]');
      if (!t) return;
      if (t.dataset.opt != null) setAns(q, Number(t.dataset.opt));
      else if (t.dataset.pick) setAns(q, t.dataset.pick);
      else if (t.dataset.place) {
        const a = ans(q) || { place: {} };
        a.place[t.dataset.place] = t.dataset.to;
        setAns(q, a);
      } else if (t.dataset.tile) {
        const f = Object.assign({}, ans(q) || {});
        if (f.a === t.dataset.tile) delete f.a;
        else if (f.b === t.dataset.tile) delete f.b;
        else if (!f.a) f.a = t.dataset.tile;
        else if (!f.b) f.b = t.dataset.tile;
        else f.b = t.dataset.tile;
        setAns(q, f);
      } else if (t.dataset.op) {
        setAns(q, Object.assign({}, ans(q) || {}, { op: t.dataset.op }));
      } else if (t.dataset.slot) {
        const f = Object.assign({}, ans(q) || {});
        delete f[t.dataset.slot];
        setAns(q, f);
      }
      rerender();
    });
    card.addEventListener('keydown', ev => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      const t = ev.target.closest('[data-pick]');
      if (t) { ev.preventDefault(); setAns(q, t.dataset.pick); rerender(); }
    });
    const ta = card.querySelector('textarea[data-write]');
    if (ta) {
      ta.addEventListener('input', () => {
        state.writes[ta.dataset.write] = ta.value;
        save();
        const c = card.querySelector('.write-box .count');
        if (c) c.textContent = ta.value.trim().length + ' characters (at least ' + q.write.min + ')';
      });
    }
  }

  // ---------- Stage screen ----------

  function renderStage() {
    const st = exam.stages[state.stage];
    const qi = Math.min(state.q || 0, st.questions.length - 1);
    const q = st.questions[qi];
    const sectionName = st.section === 'A' ? 'Section A: Income Statement' : 'Section B: Balance Sheet';
    const stageNo = state.stage + 1;
    const L = st.lesson;
    const hintShown = !!state.hints[q.id];

    const nav = st.questions.map((x, i) => {
      const cls = ['nav-pill']; if (i === qi) cls.push('current'); if (E.isAnswered(x, ans(x))) cls.push('answered');
      return '<button type="button" class="' + cls.join(' ') + '" data-goto="' + i + '" aria-label="Question ' + (i + 1) + '">' + (i + 1) + '</button>';
    }).join('');

    const writeHtml = q.write ? '<div class="write-box"><label for="w-' + q.write.id + '">' + esc(q.write.label) + ' (written, not scored)</label>' +
      '<p class="small" style="margin:0 0 6px">' + esc(q.write.prompt) + '</p>' +
      '<textarea id="w-' + q.write.id + '" data-write="' + q.write.id + '">' + esc(state.writes[q.write.id] || '') + '</textarea>' +
      '<div class="count">' + (state.writes[q.write.id] || '').trim().length + ' characters (at least ' + q.write.min + ')</div></div>' : '';

    app.innerHTML =
      '<div class="phase-head"><div>' +
      '<div class="eyebrow"><span class="section-tag">' + esc(sectionName) + '</span>Stage ' + stageNo + ' of ' + exam.stages.length + '</div>' +
      '<h1>' + esc(st.title) + '</h1><p>' + esc(st.tag) + '</p></div></div>' +
      '<div class="layout ' + (q.kind === 'pick' ? 'layout-single' : 'layout-wide-side') + '"><div>' +
      (CFG.hints ? '<details class="refresher"><summary>Quick refresher</summary><p>' + esc(L.big) + '</p>' +
        (L.formula.length ? '<ul>' + L.formula.map(f => '<li class="formula">' + esc(f) + '</li>').join('') + '</ul>' : '') +
        '<div class="trick">' + esc(L.trick) + '</div></details>' : '') +
      '<div class="legend"><span><i></i>answered</span></div>' +
      '<nav class="navigator" aria-label="Questions">' + nav + '</nav>' +
      '<section class="card item-card">' +
      '<div class="q-label">Question ' + (qi + 1) + ' of ' + st.questions.length + ' &middot; ' + esc(q.label) + '</div>' +
      '<div class="q-prompt">' + esc(q.prompt) + '</div>' +
      (q.note ? '<div class="q-note">' + esc(q.note) + '</div>' : '') +
      writeHtml + widgetHtml(q) +
      (!CFG.hints ? '' : '<div class="hint-row">' + (hintShown
        ? '<div class="hint-box" role="note"><span class="bulb" aria-hidden="true">&#128161;</span><span><b>Hint:</b> ' + esc(q.hint) + '</span></div>'
        : '<button type="button" class="btn btn-small" id="showHint">Show hint</button>') + '</div>') +
      '<div class="item-footer">' +
      '<button type="button" class="btn" id="prevQ"' + (qi === 0 ? ' disabled' : '') + '>&larr; Previous</button>' +
      (qi < st.questions.length - 1
        ? '<button type="button" class="btn btn-primary" id="nextQ">Next &rarr;</button>'
        : '<button type="button" class="btn btn-primary" id="submitStage">Submit Stage ' + stageNo + '</button>') +
      '</div></section>' +
      (qi < st.questions.length - 1 ? '<div class="btn-row" style="margin-top:14px"><span class="spacer"></span><button type="button" class="btn-link" id="submitStage">Submit Stage ' + stageNo + ' &rarr;</button></div>' : '') +
      '</div>' + (q.kind === 'pick' ? '' : sidePanel(st)) + '</div>';

    const rerender = () => {
      const y = window.scrollY;
      renderStage();
      window.scrollTo(0, y);
    };
    bindWidget(q, rerender);
    app.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => { state.q = Number(b.dataset.goto); save(); renderStage(); }));
    app.querySelectorAll('[data-stab]').forEach(b => b.addEventListener('click', () => { stmtTab = b.dataset.stab; rerender(); }));
    const hb = document.getElementById('showHint');
    if (hb) hb.addEventListener('click', () => { state.hints[q.id] = true; save(); rerender(); });
    const prev = document.getElementById('prevQ');
    if (prev) prev.addEventListener('click', () => { state.q = qi - 1; save(); renderStage(); });
    const next = document.getElementById('nextQ');
    if (next) next.addEventListener('click', () => { state.q = qi + 1; save(); renderStage(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    app.querySelectorAll('#submitStage').forEach(b => b.addEventListener('click', submitStage));
  }

  async function submitStage() {
    const st = exam.stages[state.stage];
    const empty = st.questions.filter(q => !E.isAnswered(q, ans(q))).length;
    const shortWrites = st.questions.filter(q => q.write && (state.writes[q.write.id] || '').trim().length < q.write.min);
    if (shortWrites.length) {
      await dialog('Written answers needed', '<p>Please finish the written answer' + (shortWrites.length > 1 ? 's' : '') + ' before submitting this stage:</p><ul>' +
        shortWrites.map(q => '<li>' + esc(q.write.label) + ' (at least ' + q.write.min + ' characters)</li>').join('') + '</ul>', 'OK', false);
      return;
    }
    const last = state.stage === exam.stages.length - 1;
    const body = (empty ? '<p><b>' + empty + ' of ' + st.questions.length + '</b> questions are not answered yet.</p>' : '<p>You have answered every question in this stage.</p>') +
      '<p>After you submit, you cannot return to this stage.' + (last ? ' This is the last stage, so your exam will be scored.' : '') + '</p>';
    const ok = await dialog('Submit Stage ' + (state.stage + 1) + '?', body, last ? 'Submit and Finish' : 'Submit Stage');
    if (!ok) return;
    state.submitted[st.id] = nowIso();
    if (last) { state.phase = 'done'; state.finishedAt = nowIso(); }
    else { state.stage += 1; state.q = 0; }
    save();
    window.scrollTo(0, 0);
    render();
  }

  // ---------- Results ----------

  function renderResults() {
    const result = E.gradeExam(exam, state.answers);
    const check = E.checkCode(state.code, state.name, result, attemptNo(), CFG.mode);
    const attempts = (state.history || []).concat([{ attempt: attemptNo(), code: state.code, finishedAt: state.finishedAt, total: result.total }]);
    const best = Math.max.apply(null, attempts.map(x => x.total));
    const stageRows = result.stages.map((s, i) => '<tr><td>' + s.section + (exam.stages.filter((x, j) => x.section === s.section && j <= i).length) + '. ' + esc(s.title) + '</td><td class="num">' + s.score.toFixed(2) + '</td><td class="num">' + s.possible + '</td></tr>').join('');
    const hintsUsed = Object.keys(state.hints).length;
    const historyHtml = attempts.length < 2 ? '' :
      '<h3>Your attempts</h3><table class="tbl" style="margin-bottom:12px"><thead><tr><th>Attempt</th><th>Version</th><th>Submitted</th><th class="num">Score</th></tr></thead><tbody>' +
      attempts.map(x => '<tr><td>' + x.attempt + (x.attempt === attemptNo() ? ' (this one)' : '') + '</td><td>' + esc(x.code) + '</td><td>' + esc(new Date(x.finishedAt).toLocaleString()) + '</td><td class="num">' + x.total.toFixed(2) + (x.total === best ? ' &#9733;' : '') + '</td></tr>').join('') +
      '</tbody></table><p class="small muted">&#9733; Highest score. Your highest attempt counts, so make sure its PDF is uploaded to Canvas.</p>';
    app.innerHTML =
      '<section class="card results">' +
      '<div class="eyebrow">Part 2 complete &middot; Attempt ' + attemptNo() + '</div>' +
      '<h1>Well done, ' + esc(state.name.split(' ')[0]) + '.</h1>' +
      '<p>Your exam has been scored. Download your PDF report and upload it to the Canvas assignment.</p>' +
      '<div class="score-big"><b>' + result.total.toFixed(2) + '</b><span>/ ' + result.possible + ' points</span></div>' +
      '<table class="tbl" style="margin-bottom:18px"><thead><tr><th>Stage</th><th class="num">Score</th><th class="num">Possible</th></tr></thead><tbody>' + stageRows + '</tbody>' +
      '<tfoot><tr><td>Section A: Income statement</td><td class="num">' + result.sectionA.score.toFixed(2) + '</td><td class="num">' + result.sectionA.possible + '</td></tr>' +
      '<tr><td>Section B: Balance sheet</td><td class="num">' + result.sectionB.score.toFixed(2) + '</td><td class="num">' + result.sectionB.possible + '</td></tr>' +
      '<tr><td>Total</td><td class="num">' + result.total.toFixed(2) + '</td><td class="num">' + result.possible + '</td></tr></tfoot></table>' +
      '<dl class="meta-grid"><dt>Student</dt><dd>' + esc(state.name) + '</dd><dt>Attempt</dt><dd>' + attemptNo() + '</dd>' +
      '<dt>Version code</dt><dd>' + esc(state.code) + '</dd><dt>Check code</dt><dd>' + esc(check) + '</dd>' +
      (CFG.hints ? '<dt>Hints used</dt><dd>' + hintsUsed + '</dd>' : '') + '<dt>Submitted</dt><dd>' + esc(new Date(state.finishedAt).toLocaleString()) + '</dd></dl>' +
      '<div class="btn-row"><button type="button" class="btn btn-primary" id="dlPdf">Download PDF Report</button><span class="small muted" id="dlNote"></span></div>' +
      '</section>' +
      '<section class="card results">' + historyHtml +
      '<h3>Want to try again?</h3><p>You can retake Part 2. Your highest score counts. Download this attempt’s report first, because it will no longer be available here.</p>' +
      '<button type="button" class="btn" id="retake">Retake Part 2</button></section>';

    document.getElementById('dlPdf').addEventListener('click', () => {
      try {
        window.Part2Report.download(exam, state, result, check, CFG);
        state.downloaded = true; save();
        document.getElementById('dlNote').textContent = 'Saved as a PDF. Check your Downloads folder.';
      } catch (e) {
        console.error(e);
        document.getElementById('dlNote').textContent = 'The PDF could not be created in this browser. Please try Chrome, Edge, Firefox or Safari.';
      }
    });
    document.getElementById('retake').addEventListener('click', async () => {
      const warn = state.downloaded ? '' : '<p><b>You have not downloaded the report for this attempt yet.</b> Cancel and download it first if you want to keep it.</p>';
      const ok = await dialog('Start attempt ' + (attemptNo() + 1) + '?', warn + '<p>This attempt’s score (' + result.total.toFixed(2) + ') stays in your attempt list, and your highest score counts.</p>', 'Start Retake');
      if (!ok) return;
      const hist = (state.history || []).concat([{ attempt: attemptNo(), code: state.code, startedAt: state.startedAt, finishedAt: state.finishedAt, total: result.total, check: check }]);
      state = newState(state.name, hist, attemptNo() + 1);
      exam = gen(state.code);
      stmtTab = null;
      save();
      window.scrollTo(0, 0);
      render();
    });
  }

  if (location.hash === '#reset') {
    clearSaved();
    state = null; exam = null;
    history.replaceState(null, '', location.pathname);
  }
  render();
})();
