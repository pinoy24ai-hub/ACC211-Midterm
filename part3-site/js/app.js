/* ACC 211 Part 3 practice: user interface and flow. */
(function () {
  'use strict';

  const E = window.Part3Engine;
  const STORE_KEY = 'acc211-part3-practice-state-v1';
  const app = document.getElementById('app');
  const B = E.BIZ;
  let state = load();
  let flash = null; // one-time message after a Check

  // ---------- Storage and helpers ----------

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      return s && s.name && s.ans ? s : null;
    } catch (e) { return null; }
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  const nowIso = () => new Date().toISOString();
  const fmtPts = n => (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '');
  const stageIdx = () => state.stage;
  const stage = () => E.STAGES[state.stage];

  function newState(name, history, attempt) {
    return {
      v: 1, id: E.newReportId(), name, attempt: attempt || 1, history: history || [],
      startedAt: nowIso(), finishedAt: null, stage: 0, reached: 0, phase: 'work',
      ans: E.blankAnswers(), first: {}, checks: {}, marks: {}, figs: {}
    };
  }

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

  // ---------- Chrome ----------

  function setChrome() {
    const steps = document.getElementById('stageSteps');
    const chip = document.getElementById('studentChip');
    if (!state) { steps.innerHTML = ''; chip.hidden = true; return; }
    steps.innerHTML = E.STAGES.map((st, i) => {
      const done = state.first[st.id] != null;
      const cls = [state.phase === 'work' && i === state.stage ? 'active' : '', done ? 'done' : '', i <= state.reached ? 'reachable' : ''].join(' ').trim();
      return '<li class="' + cls + '" data-goto="' + i + '" title="' + esc(st.title) + '"><span>' + (done ? '&#10003;' : i + 1) + '</span><span class="lbl">' + esc(st.short) + '</span></li>';
    }).join('');
    chip.hidden = false;
    chip.innerHTML = '<b>' + esc(state.name) + '</b> &middot; Attempt ' + state.attempt;
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
      '<div class="eyebrow">Practice &middot; Merchandising business (perpetual)</div>' +
      '<h1>Prepare the Financial Statements</h1>' +
      '<p>' + esc(B.name) + ' is a merchandising business owned by ' + esc(B.owner) + '. It uses the perpetual inventory system. ' +
      'Starting from its adjusted trial balance for ' + B.year + ', you will prepare its three financial statements, one stage at a time.</p>' +
      '<div class="points-grid">' +
      E.STAGES.map((s, i) => '<div><b>' + s.points + ' pts</b>Stage ' + (i + 1) + ': ' + esc(s.title) + '</div>').join('') +
      '</div>' +
      '<ul>' +
      '<li>When you finish a stage, click <b>Check my work</b>. Your <b>first check</b> sets your score for that stage.</li>' +
      '<li>After that, every line is marked right or wrong with a short explanation. Fix your work and check again as often as you like, and reveal the check figures if you want them.</li>' +
      '<li>Mistakes do not carry over: subtotals are graded on your own numbers, and each statement uses what you carried forward from the one before.</li>' +
      '<li>At the end, download your PDF report and upload it to Canvas. You can start a new attempt any time; your highest first-try score counts.</li>' +
      '<li>Your work is saved in this browser as you go.</li>' +
      '</ul>' +
      '<form id="startForm" novalidate>' +
      '<div class="field"><label for="studentName">Your full name (first and last, as shown in Canvas)</label>' +
      '<input type="text" id="studentName" autocomplete="name" maxlength="60" required></div>' +
      '<p class="error" id="startError"></p>' +
      '<button class="btn btn-primary" type="submit">Start practicing</button>' +
      '</form></section>';
    document.getElementById('startForm').addEventListener('submit', ev => {
      ev.preventDefault();
      const name = document.getElementById('studentName').value.replace(/\s+/g, ' ').trim();
      if (name.length < 3 || name.indexOf(' ') < 0) { document.getElementById('startError').textContent = 'Please enter your first and last name.'; return; }
      state = newState(name);
      save();
      window.scrollTo(0, 0);
      render();
    });
  }

  // ---------- Shared pieces ----------

  function tbTable(compact) {
    let dr = 0, cr = 0;
    const body = E.ACCOUNTS.map(a => {
      if (a.side === 'dr') dr += a.bal; else cr += a.bal;
      return '<tr><td class="no">' + a.no + '</td><td>' + esc(a.name) + '</td><td class="num">' + (a.side === 'dr' ? E.plain(a.bal) : '') +
        '</td><td class="num">' + (a.side === 'cr' ? E.plain(a.bal) : '') + '</td></tr>';
    }).join('');
    return '<div class="header-block"><b>' + esc(B.name) + '</b><b>Adjusted Trial Balance</b>December 31, ' + B.year + '</div>' +
      '<table class="tbl' + (compact ? ' tb-tbl' : '') + '"><thead><tr><th>No.</th><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead>' +
      '<tbody>' + body + '</tbody><tfoot><tr><td></td><td>Totals</td><td class="num">' + E.plain(dr) + '</td><td class="num">' + E.plain(cr) + '</td></tr></tfoot></table>';
  }

  const REFRESH = {
    classify: '<p>Each account on the adjusted trial balance appears on exactly one statement.</p><ul>' +
      '<li><b>Income statement:</b> Sales, the deductions from sales (contra revenues), Cost of Goods Sold, operating expenses (selling or administrative), and other income or expense.</li>' +
      '<li><b>Statement of owner\'s equity:</b> beginning Capital and Drawing (withdrawals). Net income comes from the income statement.</li>' +
      '<li><b>Balance sheet:</b> assets (current, or property, plant, and equipment) and liabilities (current or long-term). Ending capital comes from the statement of owner\'s equity.</li>' +
      '<li><b>Current</b> means used up, collected, or paid within one year.</li>' +
      '<li><b>Selling</b> expenses relate to selling and delivering merchandise. <b>Administrative</b> expenses relate to running the office and the business as a whole.</li></ul>',
    is: '<p>A multiple-step income statement reaches net income in steps:</p>' +
      '<span class="formula">Sales − Sales returns and allowances − Sales discounts = Net sales\nNet sales − Cost of goods sold = Gross profit\nGross profit − Total operating expenses = Income from operations\nIncome from operations + Other income − Other expense = Net income</span>' +
      '<ul><li>Under the <b>perpetual</b> system, Cost of Goods Sold is a single account balance. You do not compute it from purchases.</li>' +
      '<li>Operating expenses are split into selling expenses and administrative expenses, each with its own total.</li>' +
      '<li>Detail amounts go in the inner column; totals go in the outer column.</li></ul>',
    soe: '<span class="formula">Capital, January 1\n+ Net income\n− Withdrawals\n= Capital, December 31</span>' +
      '<ul><li>Beginning capital is the Capital balance on the adjusted trial balance (the owner made no new investments this year).</li>' +
      '<li>Net income comes from your income statement. Withdrawals are the Drawing balance.</li></ul>',
    bs: '<p>A classified balance sheet groups assets and liabilities into useful categories:</p><ul>' +
      '<li><b>Current assets</b>, then <b>property, plant, and equipment</b>. Show each equipment account at cost, subtract its accumulated depreciation, and show the book value.</li>' +
      '<li><b>Current liabilities</b>, then <b>long-term liabilities</b>.</li>' +
      '<li><b>Owner\'s equity</b> is the <b>ending</b> capital from the statement of owner\'s equity.</li></ul>' +
      '<span class="formula">Total assets = Total liabilities + Owner\'s equity</span>'
  };

  const HOWTO = {
    classify: 'For each account on the adjusted trial balance, choose the statement and category where it belongs.',
    is: 'Choose the account for each line and type its balance. Then type each subtotal yourself. You do not need minus signs on "Less:" lines.',
    soe: 'Type the amount for each line. Use the adjusted trial balance and your income statement.',
    bs: 'Choose the account for each line and type its balance, then type each subtotal. For equipment, choose the equipment account, then its accumulated depreciation on the "Less:" line.'
  };

  function statusStrip(id, st) {
    const parts = [];
    if (state.first[id] != null) {
      parts.push('<div class="pill first">First-try score (counts): <b>' + fmtPts(state.first[id]) + ' / ' + st.points + '</b></div>');
      const g = state.marks[id];
      if (g) parts.push('<div class="pill">Latest check: <b>' + fmtPts(E.stageScore(id, g)) + ' / ' + st.points + '</b> &middot; checks: ' + (state.checks[id] || 0) + '</div>');
    } else {
      parts.push('<div class="pill">Not checked yet. Your first check sets your score for this stage.</div>');
    }
    if (flash) {
      parts.push('<div class="pill ' + (flash.ok ? 'msg-ok' : 'msg-bad') + '">' + flash.text + '</div>');
      flash = null;
    }
    return '<div class="status">' + parts.join('') + '</div>';
  }

  function actions(id) {
    const checked = state.first[id] != null;
    const i = stageIdx();
    const last = i === E.STAGES.length - 1;
    return '<div class="btn-row" style="margin-top:16px">' +
      (i > 0 ? '<button class="btn btn-ghost" data-act="prev">&larr; Back</button>' : '') +
      '<span class="spacer"></span>' +
      (checked && !state.figs[id] ? '<button class="btn" data-act="figs">Show check figures</button>' : '') +
      '<button class="btn ' + (checked ? '' : 'btn-primary') + '" data-act="check">Check my work</button>' +
      (checked ? '<button class="btn btn-primary" data-act="' + (last ? 'finish' : 'next') + '">' + (last ? 'See my results' : 'Next stage &rarr;') + '</button>' : '') +
      '</div>';
  }

  function figsCard(id) {
    if (!state.figs[id]) return '';
    return '<div class="figs"><h3>Check figures</h3><table class="tbl"><tbody>' +
      E.checkFigures(id).map(r => '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>').join('') + '</tbody></table></div>';
  }

  // ---------- Stage screen ----------

  function renderStage() {
    const st = stage(), id = st.id;
    const head =
      '<div class="phase-head"><div><div class="eyebrow">Stage ' + (stageIdx() + 1) + ' of ' + E.STAGES.length + ' &middot; ' + st.points + ' points</div>' +
      '<h1>' + esc(st.title) + '</h1><p>' + esc(HOWTO[id]) + '</p></div></div>' +
      '<details class="refresher"><summary>Quick refresher</summary>' + REFRESH[id] + '</details>' +
      statusStrip(id, st);

    let main, side;
    if (id === 'classify') {
      main = classifyTable();
      side = '<section class="card ref guide"><h3>The thirteen categories</h3><p class="small muted">Grouped by the statement they appear on.</p>' + categoryGuide() + figsCard(id) + '</section>';
    } else {
      main = statementForm(id);
      side = '<section class="card ref">' + carryBox(id) + tbTable(true) + figsCard(id) + '</section>';
    }
    app.innerHTML = '<div class="layout layout-wide-side"><div><section class="card">' + head + main + actions(id) + '</section></div><aside class="side">' + side + '</aside></div>';
  }

  function categoryGuide() {
    let out = '', cur = '';
    E.CATS.forEach(c => {
      if (c.stmt !== cur) { if (cur) out += '</ul>'; cur = c.stmt; out += '<dt>' + esc(c.stmt) + '</dt><ul class="small">'; }
      out += '<li>' + esc(c.label) + '</li>';
    });
    return '<dl>' + out + '</ul></dl>';
  }

  function catSelect(no, val) {
    let html = '<select data-cls="' + no + '" aria-label="Category for account ' + no + '"><option value="">Choose a category</option>';
    let cur = '';
    E.CATS.forEach(c => {
      if (c.stmt !== cur) { if (cur) html += '</optgroup>'; cur = c.stmt; html += '<optgroup label="' + esc(c.stmt) + '">'; }
      html += '<option value="' + c.id + '"' + (val === c.id ? ' selected' : '') + '>' + esc(c.label) + '</option>';
    });
    return html + '</optgroup></select>';
  }

  function classifyTable() {
    const g = state.marks.classify;
    const ans = state.ans.classify;
    const rows = E.ACCOUNTS.map(a => {
      const m = g && g.items[a.no];
      const cls = m ? m.st : '';
      let r = '<tr class="' + cls + '" data-row="' + a.no + '"><td class="mk">' + (m ? (m.st === 'ok' ? '&#10003;' : '&#10007;') : '') + '</td>' +
        '<td class="no">' + a.no + '</td><td>' + esc(a.name) + '</td>' +
        '<td class="num">' + (a.side === 'dr' ? E.plain(a.bal) : '') + '</td><td class="num">' + (a.side === 'cr' ? E.plain(a.bal) : '') + '</td>' +
        '<td>' + catSelect(a.no, ans[a.no]) + '</td></tr>';
      if (m && m.note) r += '<tr class="note-row" data-note="' + a.no + '"><td></td><td colspan="5">' + esc(m.note) + '</td></tr>';
      return r;
    }).join('');
    return '<div class="header-block"><b>' + esc(B.name) + '</b><b>Adjusted Trial Balance</b>December 31, ' + B.year + '</div>' +
      '<table class="tbl cls-tbl"><thead><tr><th></th><th>No.</th><th>Account</th><th class="num">Debit</th><th class="num">Credit</th><th>Statement and category</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function acctSelect(lineId, val) {
    return '<select data-acct="' + lineId + '" aria-label="Account"><option value="">Choose an account</option>' +
      E.ACCOUNTS.map(a => '<option value="' + a.no + '"' + (String(val) === String(a.no) ? ' selected' : '') + '>' + esc(a.name) + '</option>').join('') + '</select>';
  }

  function headSelect(key, val, opts, mark) {
    return '<div class="hd ' + (mark ? mark.st : '') + '"><select data-head="' + key + '" aria-label="Statement ' + key + '">' +
      '<option value="">' + (key === 'title' ? 'Choose the statement title' : 'Choose the date line') + '</option>' +
      opts.map(o => '<option' + (val === o ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></div>' +
      (mark && mark.note ? '<div class="sl-note">' + esc(mark.note) + '</div>' : '');
  }

  function statementForm(kind) {
    const S = E.STATEMENTS[kind], A = state.ans[kind], g = state.marks[kind];
    let html = '<div class="stmt"><div class="stmt-head"><div class="biz">' + esc(B.name) + '</div>' +
      headSelect('title', A.head.title, E.TITLES, g && g.head.title) +
      headSelect('date', A.head.date, E.DATES, g && g.head.date) + '</div>' +
      '<div class="colhead"><span></span><span>Detail</span><span>Total</span></div>';
    S.lines.forEach(L => {
      if (L.t === 'hdr') { html += '<div class="sl hdr ind' + L.ind + (L.big ? ' big' : '') + '"><div class="lab">' + esc(L.label) + '</div></div>'; return; }
      const m = g && g.lines[L.id];
      const cls = ['sl', L.t, 'ind' + L.ind, L.total ? 'total' : '', L.grand ? 'grand' : '', m ? m.st : ''].join(' ');
      const mark = '<span class="mk">' + (m ? (m.st === 'ok' ? '&#10003;' : m.st === 'half' ? '&frac12;' : '&#10007;') : '') + '</span>';
      const label = L.t === 'acct' ? acctSelect(L.id, A.acct[L.id]) : '<span>' + esc(L.label) + '</span>';
      const input = '<input type="text" inputmode="decimal" autocomplete="off" data-amt="' + L.id + '" value="' + esc(A.amt[L.id] || '') + '"' +
        ' aria-label="Amount' + (L.label ? ' for ' + esc(L.label) : '') + '"' + (L.t === 'sub' ? ' class="tot"' : '') + '>';
      html += '<div class="' + cls + '" data-line="' + L.id + '"><div class="lab">' + mark + (L.pre ? '<span class="pre">' + L.pre + '</span>' : '') + label + '</div>' +
        '<div class="c c1">' + (L.col === 1 ? input : '') + '</div><div class="c c2">' + (L.col === 2 ? input : '') + '</div></div>';
      if (m && m.note) html += '<div class="sl-note ' + m.st + '" data-note="' + L.id + '">' + esc(m.note) + '</div>';
    });
    return html + '</div>';
  }

  function carryBox(kind) {
    const ctx = E.carryCtx(state.ans);
    const show = v => v == null ? '<i>not entered yet</i>' : '<b>' + E.plain(v) + '</b>';
    if (kind === 'soe') return '<div class="carry">From your income statement: net income ' + show(ctx.ni) + '</div>';
    if (kind === 'bs') return '<div class="carry">From your statement of owner\'s equity: ending capital ' + show(ctx.end) + '</div>';
    return '';
  }

  // ---------- Input handling ----------

  function clearMark(kind, key) {
    const g = state.marks[kind];
    if (!g) return;
    if (kind === 'classify') {
      delete g.items[key];
      const row = app.querySelector('tr[data-row="' + key + '"]');
      if (row) { row.className = ''; row.querySelector('.mk').innerHTML = ''; }
      const n = app.querySelector('tr[data-note="' + key + '"]');
      if (n) n.remove();
    } else {
      delete g.lines[key];
      const row = app.querySelector('.sl[data-line="' + key + '"]');
      if (row) { row.classList.remove('ok', 'bad', 'half'); row.querySelector('.mk').innerHTML = ''; }
      const n = app.querySelector('.sl-note[data-note="' + key + '"]');
      if (n) n.remove();
    }
  }

  app.addEventListener('input', onEdit);
  app.addEventListener('change', onEdit);
  function onEdit(ev) {
    if (!state || state.phase !== 'work') return;
    const el = ev.target, kind = stage().id;
    if (el.dataset.cls) { state.ans.classify[el.dataset.cls] = el.value; clearMark('classify', el.dataset.cls); }
    else if (el.dataset.head) {
      state.ans[kind].head[el.dataset.head] = el.value;
      const g = state.marks[kind];
      if (g && g.head[el.dataset.head]) { g.head[el.dataset.head] = { st: '' }; const hd = el.closest('.hd'); hd.className = 'hd'; if (hd.nextElementSibling && hd.nextElementSibling.classList.contains('sl-note')) hd.nextElementSibling.remove(); }
    } else if (el.dataset.acct) { state.ans[kind].acct[el.dataset.acct] = el.value; clearMark(kind, el.dataset.acct); }
    else if (el.dataset.amt) { state.ans[kind].amt[el.dataset.amt] = el.value; clearMark(kind, el.dataset.amt); }
    else return;
    save();
  }

  // Tidy amounts on blur: 1800 -> 1,800 and -3000 -> (3,000).
  app.addEventListener('focusout', ev => {
    const el = ev.target;
    if (!el.dataset || !el.dataset.amt || !state) return;
    const n = E.parseAmt(el.value);
    if (n == null) return;
    el.value = E.plain(n);
    state.ans[stage().id].amt[el.dataset.amt] = el.value;
    save();
  });

  // ---------- Buttons ----------

  document.addEventListener('click', async ev => {
    const step = ev.target.closest('[data-goto]');
    if (step && state) {
      const i = Number(step.dataset.goto);
      if (i <= state.reached) { state.stage = i; state.phase = 'work'; save(); window.scrollTo(0, 0); render(); }
      return;
    }
    const btn = ev.target.closest('[data-act]');
    if (!btn || !state) return;
    const act = btn.dataset.act;
    if (act === 'check') return doCheck();
    if (act === 'figs') {
      const ok = await dialog('Show check figures?', '<p>The check figures show the correct key totals for this stage. Your first-try score is already locked in, so this will not change it.</p>', 'Show them');
      if (ok) { state.figs[stage().id] = true; save(); render(); }
      return;
    }
    if (act === 'next') { state.stage += 1; state.reached = Math.max(state.reached, state.stage); save(); window.scrollTo(0, 0); return render(); }
    if (act === 'prev') { state.stage -= 1; save(); window.scrollTo(0, 0); return render(); }
    if (act === 'finish') { state.phase = 'done'; state.finishedAt = nowIso(); save(); window.scrollTo(0, 0); return render(); }
    if (act === 'reopen') { state.phase = 'work'; save(); window.scrollTo(0, 0); return render(); }
    if (act === 'pdf') return downloadPdf();
    if (act === 'retake') {
      const ok = await dialog('Start a new attempt?', '<p>Your current work will be cleared and you will start again at Stage 1 with the same adjusted trial balance. ' +
        'Download the PDF report for this attempt first if you have not already. Your highest first-try score counts.</p>', 'Start new attempt');
      if (!ok) return;
      const hist = state.history.concat([{ attempt: state.attempt, id: state.id, first: firstTotal(), finishedAt: state.finishedAt }]);
      state = newState(state.name, hist, state.attempt + 1);
      save(); window.scrollTo(0, 0); render();
    }
  });

  function doCheck() {
    const id = stage().id, st = stage();
    const g = E.gradeStage(id, state.ans);
    state.marks[id] = g;
    state.checks[id] = (state.checks[id] || 0) + 1;
    const score = E.stageScore(id, g);
    const firstTime = state.first[id] == null;
    if (firstTime) state.first[id] = score;
    const allRight = g.units === g.total;
    flash = allRight
      ? { ok: true, text: 'Everything is correct. Nice work!' + (stageIdx() < E.STAGES.length - 1 ? ' Move on to the next stage.' : ' See your results when ready.') }
      : { ok: false, text: (firstTime ? 'Your first-try score of ' + fmtPts(score) + ' / ' + st.points + ' is locked in. ' : '') + 'Lines marked in red or yellow need another look. Fix them and check again.' };
    save();
    render();
  }

  // ---------- Results ----------

  function firstTotal() { return Math.round(E.STAGES.reduce((s, x) => s + (state.first[x.id] || 0), 0) * 100) / 100; }

  function renderResults() {
    const now = E.gradeAll(state.ans);
    const first = firstTotal();
    const best = Math.max(first, ...state.history.map(h => h.first || 0));
    const check = E.checkCode(state.id, state.name, state.first, state.attempt);
    app.innerHTML =
      '<section class="card results"><div class="eyebrow">Attempt ' + state.attempt + ' complete</div>' +
      '<h1>Your Results</h1>' +
      '<div class="score-big"><b>' + fmtPts(first) + '</b><span>/ ' + E.POSSIBLE + ' first-try score</span></div>' +
      '<table class="tbl res-tbl"><thead><tr><th>Stage</th><th class="num">First try</th><th class="num">After corrections</th><th class="num">Possible</th></tr></thead><tbody>' +
      E.STAGES.map((s, i) => '<tr><td>' + (i + 1) + '. ' + esc(s.title) + '</td><td class="num">' + fmtPts(state.first[s.id] || 0) + '</td><td class="num">' + fmtPts(now.stages[i].score) + '</td><td class="num">' + s.points + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td>Total</td><td class="num">' + fmtPts(first) + '</td><td class="num">' + fmtPts(now.total) + '</td><td class="num">' + E.POSSIBLE + '</td></tr></tfoot></table>' +
      '<dl class="meta-grid" style="margin-top:16px"><dt>Report ID</dt><dd>' + esc(state.id) + '</dd><dt>Check code</dt><dd>' + check + '</dd>' +
      '<dt>Best first-try score</dt><dd>' + fmtPts(best) + ' / ' + E.POSSIBLE + '</dd></dl>' +
      '<p>Download your report and upload it to Canvas. You can still go back and correct your statements; the "after corrections" column and the PDF will update, but your first-try score stays the same.</p>' +
      '<div class="btn-row"><button class="btn btn-primary" data-act="pdf">Download PDF report</button>' +
      '<button class="btn" data-act="reopen">Back to my statements</button><span class="spacer"></span>' +
      '<button class="btn btn-ghost" data-act="retake">Start a new attempt</button></div>' +
      (state.history.length ? '<div class="history"><h3>Earlier attempts</h3><table class="tbl"><thead><tr><th>Attempt</th><th>Report ID</th><th class="num">First-try score</th></tr></thead><tbody>' +
        state.history.map(h => '<tr><td>' + h.attempt + '</td><td>' + esc(h.id) + '</td><td class="num">' + fmtPts(h.first || 0) + '</td></tr>').join('') + '</tbody></table></div>' : '') +
      '</section>';
  }

  function downloadPdf() {
    try {
      window.Part3Report.download(state, E.gradeAll(state.ans), firstTotal(), E.checkCode(state.id, state.name, state.first, state.attempt));
    } catch (e) {
      dialog('Could not create the PDF', '<p>Something went wrong while building your report. Try again, or try another browser.</p>', 'OK', false);
    }
  }

  // Shared lab computers: open with #reset to clear saved work.
  if (location.hash === '#reset') {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    state = null;
    history.replaceState(null, '', location.pathname);
  }
  render();
})();
