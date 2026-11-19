/* ACC 211 Part 3 practice: classify the accounts, then see the financial statements. */
(function () {
  'use strict';

  const E = window.Part3Engine;
  const STORE_KEY = 'acc211-part3-practice-state-v2';
  const app = document.getElementById('app');
  const B = E.BIZ;
  let state = load();

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

  function newState(name) {
    return { v: 2, id: E.newCertId(), name, startedAt: nowIso(), finishedAt: null, phase: 'classify', ans: {}, checks: 0, firstRight: null, graded: {} };
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
    const done = state.phase === 'done';
    steps.innerHTML =
      '<li class="' + (done ? 'done reachable' : 'active') + '" data-go="classify"><span>' + (done ? '&#10003;' : '1') + '</span><span class="lbl">Classify the accounts</span></li>' +
      '<li class="' + (done ? 'active reachable' : '') + '" data-go="done"><span>2</span><span class="lbl">Financial statements</span></li>';
    chip.hidden = false;
    chip.innerHTML = '<b>' + esc(state.name) + '</b>';
  }

  function render() {
    setChrome();
    if (!state) return renderWelcome();
    if (state.phase === 'done' && !state.reviewing) return renderStatements();
    return renderClassify();
  }

  // ---------- Welcome ----------

  function renderWelcome() {
    app.innerHTML =
      '<section class="card welcome">' +
      '<div class="eyebrow">Practice &middot; Merchandising business (perpetual)</div>' +
      '<h1>From Trial Balance to Financial Statements</h1>' +
      '<p>' + esc(B.name) + ' is a merchandising business owned by ' + esc(B.owner) + '. Your job is to decide where each account on its adjusted trial balance belongs.</p>' +
      '<ol class="steps-list">' +
      '<li><b>Classify each account.</b> Pick its statement and category from the drop-down list.</li>' +
      '<li><b>Check your answers</b> as often as you like. Correct answers lock in green; anything red comes with a hint.</li>' +
      '<li><b>Get it all right</b> and the app builds the income statement, statement of owner\'s equity, and classified balance sheet for you, with a PDF certificate to upload to Canvas.</li>' +
      '</ol>' +
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

  // ---------- Classify ----------

  function catSelect(no, val, locked) {
    let html = '<select data-cls="' + no + '" aria-label="Category for ' + esc(E.ACCT[no].name) + '"' + (locked ? ' disabled' : '') + '><option value="">Choose&hellip;</option>';
    let cur = '';
    E.CATS.forEach(c => {
      if (c.stmt !== cur) { if (cur) html += '</optgroup>'; cur = c.stmt; html += '<optgroup label="' + esc(c.stmt) + '">'; }
      html += '<option value="' + c.id + '"' + (val === c.id ? ' selected' : '') + '>' + esc(c.label) + '</option>';
    });
    return html + '</optgroup></select>';
  }

  function counts() {
    const answered = E.ACCOUNTS.filter(a => state.ans[a.no]).length;
    const right = E.ACCOUNTS.filter(a => state.graded[a.no] && state.graded[a.no].ok).length;
    return { answered, right, total: E.ACCOUNTS.length };
  }

  function progressHtml() {
    const c = counts();
    const pctA = Math.round(c.answered / c.total * 100), pctR = Math.round(c.right / c.total * 100);
    return '<div class="progress" aria-label="Progress"><div class="bar"><i class="answered" style="width:' + pctA + '%"></i><i class="right" style="width:' + pctR + '%"></i></div>' +
      '<div class="ptext"><span><b>' + c.answered + '</b> of ' + c.total + ' answered</span>' + (state.checks ? '<span class="pr"><b>' + c.right + '</b> correct</span>' : '') + '</div></div>';
  }

  function renderClassify() {
    const done = state.phase === 'done';
    const rows = E.ACCOUNTS.map(a => {
      const g = state.graded[a.no];
      const cls = g ? (g.ok ? 'ok' : 'bad') : '';
      let r = '<tr class="' + cls + '" data-row="' + a.no + '"><td class="mk">' + (g ? (g.ok ? '&#10003;' : '&#10007;') : '') + '</td>' +
        '<td class="acct"><span class="no">' + a.no + '</span> ' + esc(a.name) + '</td>' +
        '<td class="num">' + (a.side === 'dr' ? E.plain(a.bal) : '') + '</td><td class="num">' + (a.side === 'cr' ? E.plain(a.bal) : '') + '</td>' +
        '<td class="pick">' + catSelect(a.no, state.ans[a.no], g && g.ok) + '</td></tr>';
      if (g && !g.ok) r += '<tr class="note-row" data-note="' + a.no + '"><td></td><td colspan="4">&#128161; ' + esc(g.note) + '</td></tr>';
      return r;
    }).join('');
    let dr = 0, cr = 0;
    E.ACCOUNTS.forEach(a => { if (a.side === 'dr') dr += a.bal; else cr += a.bal; });

    app.innerHTML =
      '<div class="layout layout-wide-side"><div><section class="card">' +
      '<div class="eyebrow">Step 1 of 2</div><h1>Classify the Accounts</h1>' +
      '<p class="lead">For each account, choose the financial statement and the category where it belongs. Stuck? The category guide explains each one.</p>' +
      (done ? '<div class="banner ok">All correct. <button class="btn-link" data-act="statements">Back to your financial statements &rarr;</button></div>' : '') +
      '<div id="flash"></div>' +
      '<div class="header-block"><b>' + esc(B.name) + '</b><b>Adjusted Trial Balance</b>December 31, ' + B.year + '</div>' +
      '<div class="tbl-wrap"><table class="tbl cls-tbl"><thead><tr><th></th><th>Account</th><th class="num">Debit</th><th class="num">Credit</th><th>Where does it belong?</th></tr></thead>' +
      '<tbody>' + rows + '</tbody><tfoot><tr><td></td><td>Totals</td><td class="num">' + E.plain(dr) + '</td><td class="num">' + E.plain(cr) + '</td><td></td></tr></tfoot></table></div>' +
      '</section></div>' +
      '<aside class="side"><section class="card guide"><h3>Category guide</h3>' + categoryGuide() + '</section></aside></div>' +
      (done ? '' : '<div class="actionbar"><div class="actionbar-inner">' + '<div id="progress">' + progressHtml() + '</div>' +
        '<button class="btn btn-primary" data-act="check">Check my answers</button></div></div>');
  }

  function categoryGuide() {
    let out = '', cur = '';
    E.CATS.forEach(c => {
      if (c.stmt !== cur) { if (cur) out += '</dl>'; cur = c.stmt; out += '<h4>' + esc(c.stmt) + '</h4><dl>'; }
      out += '<dt>' + esc(c.label) + '</dt><dd>' + esc(c.tip) + '</dd>';
    });
    return out + '</dl><p class="small muted tipnote"><b>Current</b> means used up, collected, or paid within one year.</p>';
  }

  app.addEventListener('change', ev => {
    const el = ev.target;
    if (!state || !el.dataset.cls) return;
    const no = el.dataset.cls;
    state.ans[no] = el.value;
    // A changed answer loses its old mark until the next check.
    if (state.graded[no]) {
      delete state.graded[no];
      const row = app.querySelector('tr[data-row="' + no + '"]');
      if (row) { row.className = ''; row.querySelector('.mk').innerHTML = ''; }
      const n = app.querySelector('tr[data-note="' + no + '"]');
      if (n) n.remove();
    }
    save();
    const p = document.getElementById('progress');
    if (p) p.innerHTML = progressHtml();
  });

  function doCheck() {
    const g = E.gradeClassify(state.ans);
    state.checks += 1;
    if (state.firstRight == null) state.firstRight = g.right;
    state.graded = g.items;
    if (g.allRight) {
      state.phase = 'done';
      state.finishedAt = nowIso();
      state.reviewing = false;
      save();
      window.scrollTo(0, 0);
      render();
      return;
    }
    save();
    render();
    const left = g.total - g.right;
    document.getElementById('flash').innerHTML = '<div class="banner bad"><b>' + g.right + ' of ' + g.total + ' correct.</b> ' +
      (left === 1 ? 'Just one to go! ' : left + ' to go. ') + 'Correct answers are locked in green. Read the hint on each red one, change your answer, and check again.</div>';
    const firstBad = app.querySelector('tr.bad');
    if (firstBad) firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------- Statements ----------

  function stmtTable(S) {
    const cell = (r, i) => {
      const v = r.amts[i];
      const cls = ['num', r.ul[i] ? 'ul' : '', r.dbl[i] ? 'dbl' : ''].join(' ').trim();
      // Final totals get a dollar sign, as on a printed statement.
      return '<td class="' + cls + '">' + (v == null ? '' : (r.kind === 'grand' ? '$' : '') + E.plain(v)) + '</td>';
    };
    return '<div class="stmt-wrap"><table class="fs"><caption><b>' + esc(B.name) + '</b><b>' + esc(S.title) + '</b>' + esc(S.date) + '</caption><tbody>' +
      S.rows.map(r => '<tr class="' + r.kind + ' ind' + r.ind + '">' + (r.kind === 'big' ? '<td class="lbl" colspan="4">' + esc(r.label) + '</td>'
        : '<td class="lbl">' + esc(r.label) + '</td>' + cell(r, 0) + cell(r, 1) + cell(r, 2)) + '</tr>').join('') +
      '</tbody></table></div>';
  }

  function renderStatements() {
    const S = E.buildStatements(state.ans);
    const F = S.fig;
    app.innerHTML =
      '<section class="card done-hero"><div class="eyebrow">Step 2 of 2</div>' +
      '<h1>&#127881; All ' + E.ACCOUNTS.length + ' accounts classified correctly!</h1>' +
      '<p class="lead">Here are ' + esc(B.name) + '\'s financial statements, built from your classifications. Notice how they connect: net income flows into the statement of owner\'s equity, and ending capital flows into the balance sheet.</p>' +
      '<div class="btn-row"><button class="btn btn-primary" data-act="pdf">Download certificate and statements (PDF)</button>' +
      '<button class="btn" data-act="review">Review my classifications</button><span class="spacer"></span>' +
      '<button class="btn btn-ghost" data-act="restart">Start over</button></div></section>' +
      '<section class="card">' + stmtTable(S.is) + '</section>' +
      '<div class="flow">&#8595; Net income of <b>' + E.money(F.ni) + '</b> carries to the statement of owner\'s equity</div>' +
      '<section class="card">' + stmtTable(S.soe) + '</section>' +
      '<div class="flow">&#8595; Ending capital of <b>' + E.money(F.end) + '</b> carries to the balance sheet</div>' +
      '<section class="card">' + stmtTable(S.bs) +
      '<p class="check-line">&#10003; Total assets (' + E.money(F.ta) + ') equal total liabilities and owner\'s equity (' + E.money(F.tloe) + ').</p></section>';
  }

  // ---------- Buttons ----------

  document.addEventListener('click', async ev => {
    if (!state) return;
    const step = ev.target.closest('[data-go]');
    if (step && state.phase === 'done') {
      state.reviewing = step.dataset.go === 'classify';
      save(); window.scrollTo(0, 0); render();
      return;
    }
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'check') {
      const left = E.ACCOUNTS.length - counts().answered;
      if (left > 0 && !(await dialog('Check now?', '<p>You have not answered ' + left + ' account' + (left === 1 ? '' : 's') + ' yet. ' +
        'Blank answers will be marked wrong. Your first check is recorded on your certificate.</p>', 'Check anyway'))) return;
      return doCheck();
    }
    if (act === 'review') { state.reviewing = true; save(); window.scrollTo(0, 0); return render(); }
    if (act === 'statements') { state.reviewing = false; save(); window.scrollTo(0, 0); return render(); }
    if (act === 'pdf') {
      try {
        window.Part3Report.download(state, E.buildStatements(state.ans), E.checkCode(state.id, state.name, state.firstRight, state.checks));
      } catch (e) {
        dialog('Could not create the PDF', '<p>Something went wrong while building your PDF. Try again, or try another browser.</p>', 'OK', false);
      }
      return;
    }
    if (act === 'restart') {
      const ok = await dialog('Start over?', '<p>Your answers will be cleared and you will start again with a blank classification. Download your certificate first if you need it.</p>', 'Start over');
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
