/* ACC 211 Part 3 practice: classify the accounts, then calculate the totals on each statement. */
(function () {
  'use strict';

  const E = window.Part3Engine;
  const STORE_KEY = 'acc211-part3-practice-state-v3';
  const app = document.getElementById('app');
  const B = E.BIZ;
  const T = E.TASKS;            // classify, is, soe, bs
  const DONE = T.length;        // view index of the finished page
  let state = load();
  let flash = null;             // one-time banner after a Check or a completed task

  // ---------- Storage and helpers ----------

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      return s && s.v === 3 && s.name ? s : null;
    } catch (e) { return null; }
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  const nowIso = () => new Date().toISOString();
  const empty = () => ({ classify: {}, is: {}, soe: {}, bs: {} });

  function newState(name) {
    return { v: 3, id: E.newCertId(), name, startedAt: nowIso(), finishedAt: null, step: 0, view: 0,
      ans: empty(), graded: empty(), checks: {}, first: {} };
  }
  const totalChecks = () => T.reduce((s, t) => s + (state.checks[t.id] || 0), 0);
  const code = () => E.checkCode(state.id, state.name, state.first, totalChecks());

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
    const items = T.map(t => t.short).concat(['Certificate']);
    steps.innerHTML = items.map((label, i) => {
      const done = i < state.step || (i === DONE && state.step === DONE);
      const cls = [i === state.view ? 'active' : '', done ? 'done' : '', i <= state.step ? 'reachable' : ''].join(' ').trim();
      return '<li class="' + cls + '" data-go="' + i + '"><span>' + (done && i !== state.view ? '&#10003;' : (i === DONE ? '&#9733;' : i + 1)) + '</span><span class="lbl">' + esc(label) + '</span></li>';
    }).join('');
    chip.hidden = false;
    chip.innerHTML = '<b>' + esc(state.name) + '</b>';
  }

  function render() {
    setChrome();
    if (!state) return renderWelcome();
    if (state.view === DONE) return renderDone();
    if (state.view === 0) return renderClassify();
    return renderCalc(T[state.view].id);
  }

  function go(i) { state.view = i; save(); window.scrollTo(0, 0); render(); }

  // ---------- Welcome ----------

  function renderWelcome() {
    app.innerHTML =
      '<section class="card welcome">' +
      '<div class="eyebrow">Practice &middot; Merchandising business (perpetual)</div>' +
      '<h1>From Trial Balance to Financial Statements</h1>' +
      '<p>' + esc(B.name) + ' is a merchandising business owned by ' + esc(B.owner) + '. Starting from its adjusted trial balance, you will prepare its financial statements in four tasks:</p>' +
      '<ol class="steps-list">' +
      '<li><b>Classify the accounts.</b> Decide which statement and category each account belongs to.</li>' +
      '<li><b>Income statement.</b> The accounts are placed for you. Calculate each subtotal and net income.</li>' +
      '<li><b>Statement of owner\'s equity.</b> Carry net income over and calculate ending capital.</li>' +
      '<li><b>Balance sheet.</b> Calculate book values, totals, and confirm it balances.</li>' +
      '</ol>' +
      '<ul>' +
      '<li>Check your answers as often as you like. Correct answers lock in green; anything red comes with a hint.</li>' +
      '<li>Each task unlocks when the one before it is fully correct.</li>' +
      '<li>Finish all four and download your <b>PDF certificate with the completed statements</b> to upload to Canvas.</li>' +
      '<li>Your work is saved in this browser as you go.</li>' +
      '</ul>' +
      '<form id="startForm" novalidate>' +
      '<div class="field"><label for="studentName">Your full name (as it should appear on your certificate)</label>' +
      '<input type="text" id="studentName" autocomplete="name" maxlength="60" required></div>' +
      '<p class="error" id="startError"></p>' +
      '<button class="btn btn-primary" type="submit">Let\'s start</button>' +
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

  function taskHead(i, lead) {
    const t = T[i];
    const finished = i < state.step;
    return '<div class="eyebrow">Task ' + (i + 1) + ' of ' + T.length + '</div><h1>' + esc(t.title) + '</h1>' +
      '<p class="lead">' + lead + '</p>' +
      (finished ? '<div class="banner ok">&#10003; Task ' + (i + 1) + ' is complete. <button class="btn-link" data-go="' + state.step + '">Go to ' +
        (state.step === DONE ? 'your certificate' : 'Task ' + (state.step + 1)) + ' &rarr;</button></div>' : '') +
      (flash ? '<div class="banner ' + (flash.ok ? 'ok' : 'bad') + '">' + flash.html + '</div>' : '');
  }

  function counts(id) {
    const total = E.taskTotal(id);
    const keys = id === 'classify' ? E.ACCOUNTS.map(a => String(a.no)) : E.blanks(id).map(b => b.id);
    const answered = keys.filter(k => String(state.ans[id][k] || '').trim()).length;
    const right = keys.filter(k => state.graded[id][k] && state.graded[id][k].ok).length;
    return { answered, right, total };
  }

  function progressHtml(id) {
    const c = counts(id);
    const pctA = Math.round(c.answered / c.total * 100), pctR = Math.round(c.right / c.total * 100);
    return '<div class="progress" aria-label="Progress"><div class="bar"><i class="answered" style="width:' + pctA + '%"></i><i class="right" style="width:' + pctR + '%"></i></div>' +
      '<div class="ptext"><span><b>' + c.answered + '</b> of ' + c.total + ' answered</span>' + (state.checks[id] ? '<span class="pr"><b>' + c.right + '</b> correct</span>' : '') + '</div></div>';
  }

  function actionBar(id, i) {
    if (i < state.step) return '';
    return '<div class="actionbar"><div class="actionbar-inner"><div id="progress">' + progressHtml(id) + '</div>' +
      '<button class="btn btn-primary" data-act="check">Check my answers</button></div></div>';
  }

  // ---------- Task 1: classify ----------

  function catSelect(no, val, locked) {
    let html = '<select data-cls="' + no + '" aria-label="Category for ' + esc(E.ACCT[no].name) + '"' + (locked ? ' disabled' : '') + '><option value="">Choose&hellip;</option>';
    let cur = '';
    E.CATS.forEach(c => {
      if (c.stmt !== cur) { if (cur) html += '</optgroup>'; cur = c.stmt; html += '<optgroup label="' + esc(c.stmt) + '">'; }
      html += '<option value="' + c.id + '"' + (val === c.id ? ' selected' : '') + '>' + esc(c.label) + '</option>';
    });
    return html + '</optgroup></select>';
  }

  function renderClassify() {
    const G = state.graded.classify, A = state.ans.classify;
    const rows = E.ACCOUNTS.map(a => {
      const g = G[a.no];
      let r = '<tr class="' + (g ? (g.ok ? 'ok' : 'bad') : '') + '" data-row="' + a.no + '"><td class="mk">' + (g ? (g.ok ? '&#10003;' : '&#10007;') : '') + '</td>' +
        '<td class="acct"><span class="no">' + a.no + '</span> ' + esc(a.name) + '</td>' +
        '<td class="num">' + (a.side === 'dr' ? E.plain(a.bal) : '') + '</td><td class="num">' + (a.side === 'cr' ? E.plain(a.bal) : '') + '</td>' +
        '<td class="pick">' + catSelect(a.no, A[a.no], g && g.ok) + '</td></tr>';
      if (g && !g.ok) r += '<tr class="note-row" data-note="' + a.no + '"><td></td><td colspan="4">&#128161; ' + esc(g.note) + '</td></tr>';
      return r;
    }).join('');
    let dr = 0, cr = 0;
    E.ACCOUNTS.forEach(a => { if (a.side === 'dr') dr += a.bal; else cr += a.bal; });
    app.innerHTML =
      '<div class="layout layout-wide-side"><div><section class="card">' +
      taskHead(0, 'For each account, choose the financial statement and the category where it belongs. Stuck? The category guide explains each one.') +
      '<div class="header-block"><b>' + esc(B.name) + '</b><b>Adjusted Trial Balance</b>December 31, ' + B.year + '</div>' +
      '<div class="tbl-wrap"><table class="tbl cls-tbl"><thead><tr><th></th><th>Account</th><th class="num">Debit</th><th class="num">Credit</th><th>Where does it belong?</th></tr></thead>' +
      '<tbody>' + rows + '</tbody><tfoot><tr><td></td><td>Totals</td><td class="num">' + E.plain(dr) + '</td><td class="num">' + E.plain(cr) + '</td><td></td></tr></tfoot></table></div>' +
      '</section></div>' +
      '<aside class="side"><section class="card guide"><h3>Category guide</h3>' + categoryGuide() + '</section></aside></div>' +
      actionBar('classify', 0);
    flash = null;
  }

  function categoryGuide() {
    let out = '', cur = '';
    E.CATS.forEach(c => {
      if (c.stmt !== cur) { if (cur) out += '</dl>'; cur = c.stmt; out += '<h4>' + esc(c.stmt) + '</h4><dl>'; }
      out += '<dt>' + esc(c.label) + '</dt><dd>' + esc(c.tip) + '</dd>';
    });
    return out + '</dl><p class="small muted tipnote"><b>Current</b> means used up, collected, or paid within one year.</p>';
  }

  // ---------- Tasks 2 to 4: calculate the totals ----------

  const LEAD = {
    is: 'The accounts are already in place, using the balances from the adjusted trial balance. Calculate every amount in a box: the subtotals and net income.',
    soe: 'Carry net income over from your income statement, then calculate the increase in owner\'s equity and the ending capital.',
    bs: 'Calculate the book value of each equipment account, then every total. Carry ending capital over from the statement of owner\'s equity.'
  };
  const REFRESH = {
    is: '<span class="formula">Sales − Deductions from sales = Net sales\nNet sales − Cost of goods sold = Gross profit\nSelling expenses + Administrative expenses = Total operating expenses\nGross profit − Total operating expenses = Income from operations\nIncome from operations + Other income − Other expense = Net income</span>',
    soe: '<span class="formula">Capital, January 1\n+ Net income\n− Withdrawals\n= Capital, December 31</span>',
    bs: '<span class="formula">Equipment − Accumulated depreciation = Book value\nCurrent assets + Property and equipment = Total assets\nCurrent liabilities + Long-term liabilities = Total liabilities\nTotal liabilities + Ending capital = Total liabilities and owner\'s equity</span>'
  };

  function amountCell(r, i, kind, editable) {
    const v = r.amts[i], id = r.calc[i];
    const cls = ['num', r.ul[i] ? 'ul' : '', r.dbl[i] ? 'dbl' : ''];
    if (v == null) return '<td class="num"></td>';
    if (!id || !editable) return '<td class="' + cls.join(' ').trim() + '">' + (r.kind === 'grand' ? '$' : '') + E.plain(v) + '</td>';
    const g = state.graded[kind][id];
    if (g && g.ok) return '<td class="' + cls.concat(['calc', 'ok']).join(' ').trim() + '" data-cell="' + id + '">' + (r.kind === 'grand' ? '$' : '') + E.plain(v) + '</td>';
    return '<td class="' + cls.concat(['calc', g ? 'bad' : '']).join(' ').trim() + '" data-cell="' + id + '"><input type="text" inputmode="decimal" autocomplete="off" data-calc="' + id + '"' +
      ' aria-label="' + esc(r.label) + '" value="' + esc(state.ans[kind][id] || '') + '" placeholder="?"></td>';
  }

  function stmtTable(S, kind, editable) {
    const notes = [];
    const body = S.rows.map(r => {
      if (r.kind === 'big') return '<tr class="big"><td class="lbl" colspan="4">' + esc(r.label) + '</td></tr>';
      let tr = '<tr class="' + r.kind + ' ind' + r.ind + '"><td class="lbl">' + esc(r.label) + '</td>' +
        [0, 1, 2].map(i => amountCell(r, i, kind, editable)).join('') + '</tr>';
      if (editable) r.calc.forEach(id => {
        const g = id && state.graded[kind][id];
        if (g && !g.ok) tr += '<tr class="note-row" data-note="' + id + '"><td colspan="4">&#128161; ' + esc(g.note) + '</td></tr>';
      });
      return tr;
    }).join('');
    return '<div class="stmt-wrap"><table class="fs' + (editable ? ' editable' : '') + '"><caption><b>' + esc(B.name) + '</b><b>' + esc(S.title) + '</b>' + esc(S.date) + '</caption><tbody>' +
      body + '</tbody></table></div>';
  }

  function renderCalc(kind) {
    const i = T.findIndex(t => t.id === kind);
    const S = E.buildStatements();
    const prev = [];
    if (kind === 'soe' || kind === 'bs') prev.push(['is', 'Your completed income statement']);
    if (kind === 'bs') prev.push(['soe', 'Your completed statement of owner\'s equity']);
    app.innerHTML =
      '<section class="card">' + taskHead(i, LEAD[kind]) +
      '<details class="refresher"><summary>Formulas you need</summary>' + REFRESH[kind] + '</details>' +
      prev.map(p => '<details class="refresher prev"><summary>' + esc(p[1]) + '</summary>' + stmtTable(S[p[0]], p[0], false) + '</details>').join('') +
      stmtTable(S[kind], kind, true) + '</section>' +
      actionBar(kind, i);
    flash = null;
  }

  // ---------- Input handling ----------

  function clearMark(task, key) {
    const g = state.graded[task][key];
    if (!g) return;
    delete state.graded[task][key];
    if (task === 'classify') {
      const row = app.querySelector('tr[data-row="' + key + '"]');
      if (row) { row.className = ''; row.querySelector('.mk').innerHTML = ''; }
    } else {
      const cell = app.querySelector('td[data-cell="' + key + '"]');
      if (cell) cell.classList.remove('bad');
    }
    const n = app.querySelector('tr[data-note="' + key + '"]');
    if (n) n.remove();
  }

  function onEdit(ev) {
    const el = ev.target;
    if (!state) return;
    let task, key;
    if (el.dataset.cls) { task = 'classify'; key = el.dataset.cls; }
    else if (el.dataset.calc) { task = T[state.view].id; key = el.dataset.calc; }
    else return;
    state.ans[task][key] = el.value;
    clearMark(task, key);
    save();
    const p = document.getElementById('progress');
    if (p) p.innerHTML = progressHtml(task);
  }
  app.addEventListener('change', onEdit);
  app.addEventListener('input', onEdit);

  // Tidy amounts on blur: 1800 -> 1,800 and -3000 -> (3,000).
  app.addEventListener('focusout', ev => {
    const el = ev.target;
    if (!state || !el.dataset || !el.dataset.calc) return;
    const n = E.parseAmt(el.value);
    if (n == null) return;
    el.value = E.plain(n);
    state.ans[T[state.view].id][el.dataset.calc] = el.value;
    save();
  });
  // Enter in an amount box moves to the next box.
  app.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' || !ev.target.dataset || !ev.target.dataset.calc) return;
    ev.preventDefault();
    const boxes = Array.from(app.querySelectorAll('input[data-calc]'));
    const next = boxes[boxes.indexOf(ev.target) + 1];
    if (next) next.focus(); else ev.target.blur();
  });

  function doCheck() {
    const i = state.view, id = T[i].id;
    const g = id === 'classify' ? E.gradeClassify(state.ans.classify) : E.gradeCalc(id, state.ans[id]);
    state.checks[id] = (state.checks[id] || 0) + 1;
    if (state.first[id] == null) state.first[id] = g.right;
    state.graded[id] = g.items;
    if (g.allRight) {
      state.step = i + 1;
      state.view = i + 1;
      if (state.step === DONE) state.finishedAt = nowIso();
      else flash = { ok: true, html: '&#127881; <b>Task ' + (i + 1) + ' complete!</b> On to Task ' + (i + 2) + '.' };
      save();
      window.scrollTo(0, 0);
      render();
      return;
    }
    const left = g.total - g.right;
    flash = { ok: false, html: '<b>' + g.right + ' of ' + g.total + ' correct.</b> ' + (left === 1 ? 'Just one to go! ' : left + ' to go. ') +
      'Correct answers are locked in green. Read the hint under each red one, fix it, and check again.' };
    save();
    render();
    const firstBad = app.querySelector('tr.bad, td.bad');
    if (firstBad) firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------- Finished: statements and certificate ----------

  function renderDone() {
    const S = E.buildStatements(), F = S.fig;
    app.innerHTML =
      '<section class="card done-hero"><div class="eyebrow">All four tasks complete</div>' +
      '<h1>&#127881; Your financial statements are finished!</h1>' +
      '<p class="lead">You classified every account and calculated every total. Here are ' + esc(B.name) + '\'s completed statements. Download your certificate, which includes all three statements, and upload it to Canvas.</p>' +
      '<div class="btn-row"><button class="btn btn-primary" data-act="pdf">Download certificate and statements (PDF)</button><span class="spacer"></span>' +
      '<button class="btn btn-ghost" data-act="restart">Start over</button></div></section>' +
      '<section class="card">' + stmtTable(S.is, 'is', false) + '</section>' +
      '<div class="flow">&#8595; Net income of <b>' + E.money(F.ni) + '</b> carries to the statement of owner\'s equity</div>' +
      '<section class="card">' + stmtTable(S.soe, 'soe', false) + '</section>' +
      '<div class="flow">&#8595; Ending capital of <b>' + E.money(F.end) + '</b> carries to the balance sheet</div>' +
      '<section class="card">' + stmtTable(S.bs, 'bs', false) +
      '<p class="check-line">&#10003; Total assets (' + E.money(F.ta) + ') equal total liabilities and owner\'s equity (' + E.money(F.tloe) + ').</p></section>';
  }

  // ---------- Buttons ----------

  document.addEventListener('click', async ev => {
    if (!state) return;
    const step = ev.target.closest('[data-go]');
    if (step) {
      const i = Number(step.dataset.go);
      if (i <= state.step) go(i);
      return;
    }
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'check') {
      const c = counts(T[state.view].id);
      const left = c.total - c.answered;
      if (left > 0 && !(await dialog('Check now?', '<p>You have ' + left + ' blank answer' + (left === 1 ? '' : 's') + '. ' +
        'Blank answers will be marked wrong. Your first check for each task is recorded on your certificate.</p>', 'Check anyway'))) return;
      return doCheck();
    }
    if (act === 'pdf') {
      try {
        window.Part3Report.download(state, E.buildStatements(), code(), totalChecks());
      } catch (e) {
        dialog('Could not create the PDF', '<p>Something went wrong while building your PDF. Try again, or try another browser.</p>', 'OK', false);
      }
      return;
    }
    if (act === 'restart') {
      const ok = await dialog('Start over?', '<p>All your answers will be cleared and you will start again at Task 1. Download your certificate first if you need it.</p>', 'Start over');
      if (!ok) return;
      state = newState(state.name);
      save(); window.scrollTo(0, 0); render();
    }
  });

  // Shared lab computers: open with #reset to clear saved work.
  if (location.hash === '#reset') {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    state = null;
    history.replaceState(null, '', location.pathname);
  }
  render();
})();
