/* ACC 211 Midterm: user interface and exam flow. */
(function () {
  'use strict';

  const E = window.ExamEngine;
  const STORE_KEY = 'acc211-midterm-state-v1';
  const DEFAULT_ROWS = 3;
  const MAX_ROWS = 6;
  const GROUPS = [
    { label: 'Assets', types: ['A', 'XA'] },
    { label: 'Liabilities', types: ['L'] },
    { label: 'Owner’s Equity', types: ['E', 'D', 'IS'] },
    { label: 'Revenues', types: ['R'] },
    { label: 'Expenses', types: ['X'] }
  ];

  const app = document.getElementById('app');
  let state = load();
  let exam = state ? E.generateExam(state.code) : null;

  // ---------- Storage ----------

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const s = raw ? JSON.parse(raw) : null;
      return s && s.code && s.name ? s : null;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable: exam still works for this visit */ }
  }
  function clearSaved() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
  }

  // ---------- Helpers ----------

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function acctName(no) { return exam.accounts[no] ? exam.accounts[no].name : ''; }
  function fmt(n) { return n ? E.money(n).replace('$', '') : ''; }
  function fmtTotal(n) { return E.money(n); }
  function nowIso() { return new Date().toISOString(); }

  function dialog(title, bodyHtml, okLabel, showCancel) {
    const dlg = document.getElementById('dialog');
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogBody').innerHTML = bodyHtml;
    document.getElementById('dialogOk').textContent = okLabel || 'OK';
    document.getElementById('dialogCancel').hidden = showCancel === false;
    return new Promise(function (resolve) {
      dlg.addEventListener('close', function onClose() {
        dlg.removeEventListener('close', onClose);
        resolve(dlg.returnValue === 'ok');
      });
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else resolve(window.confirm(title));
    });
  }

  function setChrome() {
    const steps = document.querySelectorAll('#phaseSteps li');
    const order = ['p1', 'p2', 'p3', 'done'];
    const cur = state ? order.indexOf(state.phase) : -1;
    steps.forEach(function (li) {
      const idx = order.indexOf(li.dataset.phase);
      li.classList.toggle('active', idx === cur);
      li.classList.toggle('done', cur > idx);
    });
    const chip = document.getElementById('studentChip');
    if (state) {
      chip.hidden = false;
      chip.innerHTML = '<b>' + esc(state.name) + '</b> &middot; Version ' + esc(state.code);
      document.getElementById('brandSub').textContent = exam.business.name + ' (' + exam.owner + ', owner)';
    } else {
      chip.hidden = true;
      document.getElementById('brandSub').textContent = 'Principles of Accounting';
    }
  }

  function render() {
    setChrome();
    if (!state) return renderWelcome();
    if (state.phase === 'p1') return renderJournalPhase('p1');
    if (state.phase === 'p2') return renderJournalPhase('p2');
    if (state.phase === 'p3') return renderClosing();
    return renderResults();
  }

  // ---------- Welcome / student name ----------

  function renderWelcome() {
    app.innerHTML =
      '<section class="card welcome">' +
      '<div class="eyebrow">Midterm Exam</div>' +
      '<h1>ACC 211: The Accounting Cycle</h1>' +
      '<p>This exam has three phases. Each phase gives you its own information, so a mistake in one phase does not carry into the next.</p>' +
      '<div class="points-grid">' +
      '<div><b>40 pts</b>Phase 1: Journalize 10 transactions</div>' +
      '<div><b>36 pts</b>Phase 2: Record 6 adjusting entries</div>' +
      '<div><b>24 pts</b>Phase 3: Run the closing routine</div>' +
      '</div>' +
      '<ul>' +
      '<li>Your exam has its own dollar amounts and question order.</li>' +
      '<li>Once you submit a phase, it is locked and you cannot return to it.</li>' +
      '<li>No feedback is shown during the exam. Your score appears at the end.</li>' +
      '<li>Your work is saved in this browser as you go. If the page reloads, you can resume where you left off.</li>' +
      '<li>At the end, download your PDF score report and upload it to Canvas.</li>' +
      '</ul>' +
      '<form id="startForm" novalidate>' +
        '<div class="field"><label for="studentName">Your full name (first and last, as shown in Canvas)</label>' +
        '<input type="text" id="studentName" autocomplete="name" maxlength="60" required></div>' +
        '<label class="check"><input type="checkbox" id="ack"> <span>I will complete this exam on my own, and I understand that each phase locks once I submit it.</span></label>' +
        '<p class="error" id="startError"></p>' +
        '<button class="btn btn-primary" type="submit">Begin Exam</button>' +
        '</form>' +
      '</section>';

    document.getElementById('startForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      const name = document.getElementById('studentName').value.replace(/\s+/g, ' ').trim();
      const err = document.getElementById('startError');
      if (name.length < 3 || name.indexOf(' ') < 0) { err.textContent = 'Please enter your first and last name.'; return; }
      if (!document.getElementById('ack').checked) { err.textContent = 'Please check the box to confirm before you begin.'; return; }
      const code = E.newVersionCode();
      state = {
        v: 1, code: code, name: name, phase: 'p1', startedAt: nowIso(), submitted: {},
        answers: { p1: {}, p2: {}, p3: { selections: [], current: [] } },
        ui: { p1: 0, p2: 0 }
      };
      exam = E.generateExam(code);
      save();
      window.scrollTo(0, 0);
      render();
    });
  }

  // ---------- Phases 1 and 2: journal entry form ----------

  function accountOptions(selected) {
    let html = '<option value="">Select account</option>';
    GROUPS.forEach(function (g) {
      html += '<optgroup label="' + esc(g.label) + '">';
      exam.chart.filter(function (a) { return g.types.includes(a.type); }).forEach(function (a) {
        html += '<option value="' + a.no + '"' + (a.no === selected ? ' selected' : '') + '>' + a.no + '  ' + esc(a.name) + '</option>';
      });
      html += '</optgroup>';
    });
    return html;
  }

  function chartTable() {
    let rows = '';
    GROUPS.forEach(function (g) {
      rows += '<tr class="grp"><td colspan="2">' + esc(g.label) + '</td></tr>';
      exam.chart.filter(function (a) { return g.types.includes(a.type); }).forEach(function (a) {
        rows += '<tr><td class="no">' + a.no + '</td><td>' + esc(a.name) + '</td></tr>';
      });
    });
    return '<div class="card ref side"><h3>Chart of Accounts</h3><div class="ref-sub">' + esc(exam.business.name) + '</div>' +
      '<table class="tbl"><thead><tr><th>No.</th><th>Account Title</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function trialBalanceTable(title, date, rows) {
    let d = 0, c = 0, body = '';
    rows.forEach(function (r) {
      d += r.debit; c += r.credit;
      body += '<tr><td class="no">' + r.acct + '</td><td>' + esc(acctName(r.acct)) + '</td><td class="num">' + fmt(r.debit) + '</td><td class="num">' + fmt(r.credit) + '</td></tr>';
    });
    return '<div class="header-block"><b>' + esc(exam.business.name) + '</b><b>' + esc(title) + '</b>' + esc(date) + '</div>' +
      '<table class="tbl"><thead><tr><th>No.</th><th>Account Title</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead>' +
      '<tbody>' + body + '</tbody><tfoot><tr><td></td><td>Totals</td><td class="num">' + fmtTotal(d) + '</td><td class="num">' + fmtTotal(c) + '</td></tr></tfoot></table>';
  }

  function itemsFor(phase) { return phase === 'p1' ? exam.phase1.transactions : exam.phase2.items; }

  function rowsFor(phase, id) {
    const store = state.answers[phase];
    if (!store[id]) {
      store[id] = [];
      for (let i = 0; i < DEFAULT_ROWS; i++) store[id].push({ acct: '', dr: '', cr: '' });
    }
    return store[id];
  }

  function isAnswered(phase, id) {
    const rows = state.answers[phase][id];
    return !!rows && rows.some(function (r) { return r.acct || r.dr || r.cr; });
  }

  function isCreditRow(r) { return !String(r.dr || '').trim() && !!String(r.cr || '').trim(); }

  function journalRowsHtml(rows) {
    return rows.map(function (r, i) {
      return '<tr data-row="' + i + '"' + (isCreditRow(r) ? ' class="is-credit"' : '') + '>' +
        '<td class="acct-cell"><select data-field="acct" aria-label="Account, line ' + (i + 1) + '">' + accountOptions(r.acct) + '</select></td>' +
        '<td class="amt-cell" data-label="Debit"><input data-field="dr" inputmode="decimal" autocomplete="off" aria-label="Debit, line ' + (i + 1) + '" value="' + esc(r.dr) + '"></td>' +
        '<td class="amt-cell" data-label="Credit"><input data-field="cr" inputmode="decimal" autocomplete="off" aria-label="Credit, line ' + (i + 1) + '" value="' + esc(r.cr) + '"></td>' +
        '<td><button type="button" class="rm" data-remove="' + i + '" title="Remove line" aria-label="Remove line ' + (i + 1) + '">&times;</button></td>' +
        '</tr>';
    }).join('');
  }

  function renderJournalPhase(phase) {
    const items = itemsFor(phase);
    const idx = Math.min(state.ui[phase] || 0, items.length - 1);
    const item = items[idx];
    const rows = rowsFor(phase, item.id);
    const isP1 = phase === 'p1';

    const head = isP1
      ? '<div class="eyebrow">Phase 1 of 3 &middot; 40 points</div><h1>General Journal Entries</h1>' +
        '<p>' + esc(exam.business.name) + ' is a service business owned by ' + esc(exam.owner) + '. Journalize each of the following ' +
        items.length + ' transactions that occurred during ' + esc(exam.phase1.month) + ' ' + exam.phase1.year +
        '. Choose account titles from the chart of accounts and enter whole-dollar amounts. Explanations are not required.</p>'
      : '<div class="eyebrow">Phase 2 of 3 &middot; 36 points</div><h1>Adjusting Entries</h1>' +
        '<p>Use the unadjusted trial balance of ' + esc(exam.business.name) + ' for ' + esc(exam.phase2.date) +
        ' and the additional information below. Record the adjusting entry required at month end for each item. ' +
        'This trial balance is provided for Phase 2 only and is not based on your Phase 1 entries.</p>';

    const nav = items.map(function (it, i) {
      const cls = ['nav-pill'];
      if (i === idx) cls.push('current');
      if (isAnswered(phase, it.id)) cls.push('answered');
      return '<button type="button" class="' + cls.join(' ') + '" data-goto="' + i + '" aria-label="' + (isP1 ? 'Transaction ' : 'Adjustment ') + (i + 1) + '">' + (i + 1) + '</button>';
    }).join('');

    const meta = isP1
      ? '<span class="item-no">Transaction ' + (idx + 1) + ' of ' + items.length + '</span><span class="item-date">' + esc(item.date) + '</span>'
      : '<span class="item-no">Adjustment ' + (idx + 1) + ' of ' + items.length + '</span><span class="item-date">' + esc(exam.phase2.date) + '</span>';

    const side = isP1
      ? chartTable()
      : '<div class="card ref side"><h3>Unadjusted Trial Balance</h3><div class="ref-sub">Phase 2 data</div>' +
        trialBalanceTable('Unadjusted Trial Balance', exam.phase2.date, exam.phase2.tb) + '</div>';

    app.innerHTML =
      '<div class="phase-head"><div>' + head + '</div></div>' +
      '<div class="layout' + (isP1 ? '' : ' layout-wide-side') + '">' +
      '<div>' +
      '<div class="legend"><span><i></i>has an entry</span></div>' +
      '<nav class="navigator" aria-label="Questions">' + nav + '</nav>' +
      '<section class="card item-card">' +
      '<div class="item-meta">' + meta + '</div>' +
      '<div class="item-text">' + esc(item.text) + '</div>' +
      '<table class="journal" id="journal"><thead><tr><th>Account Title</th><th class="num">Debit</th><th class="num">Credit</th><th></th></tr></thead>' +
      '<tbody>' + journalRowsHtml(rows) + '</tbody></table>' +
      '<div class="journal-tools">' +
      '<button type="button" class="btn btn-small" id="addLine"' + (rows.length >= MAX_ROWS ? ' disabled' : '') + '>+ Add line</button>' +
      '<span class="small muted">Enter each amount in either the Debit or the Credit column.</span>' +
      '</div>' +
      '<div class="item-footer">' +
      '<button type="button" class="btn" id="prevItem"' + (idx === 0 ? ' disabled' : '') + '>&larr; Previous</button>' +
      (idx < items.length - 1
        ? '<button type="button" class="btn btn-primary" id="nextItem">Next &rarr;</button>'
        : '<button type="button" class="btn btn-primary" id="submitPhase">Submit Phase ' + (isP1 ? '1' : '2') + '</button>') +
      '</div>' +
      '</section>' +
      (idx < items.length - 1
        ? '<div class="btn-row" style="margin-top:14px"><span class="spacer"></span><button type="button" class="btn-link" id="submitPhase">Submit Phase ' + (isP1 ? '1' : '2') + ' &rarr;</button></div>'
        : '') +
      '</div>' +
      side +
      '</div>';

    const tbody = app.querySelector('#journal tbody');
    tbody.addEventListener('input', function (ev) { onJournalEdit(ev, phase, item.id); });
    tbody.addEventListener('change', function (ev) { onJournalEdit(ev, phase, item.id); });
    tbody.addEventListener('focusout', function (ev) {
      const el = ev.target;
      if (el.tagName !== 'INPUT') return;
      const n = E.parseAmount(el.value);
      if (!isNaN(n)) {
        el.value = n.toLocaleString('en-US', { maximumFractionDigits: 2 });
        onJournalEdit({ target: el }, phase, item.id);
      }
    });
    tbody.addEventListener('click', function (ev) {
      const btn = ev.target.closest('[data-remove]');
      if (!btn) return;
      const r = rowsFor(phase, item.id);
      const i = Number(btn.dataset.remove);
      if (r.length > 2) r.splice(i, 1);
      else r[i] = { acct: '', dr: '', cr: '' };
      save();
      renderJournalPhase(phase);
    });
    document.getElementById('addLine').addEventListener('click', function () {
      const r = rowsFor(phase, item.id);
      if (r.length < MAX_ROWS) r.push({ acct: '', dr: '', cr: '' });
      save();
      renderJournalPhase(phase);
      const sels = app.querySelectorAll('#journal select');
      if (sels.length) sels[sels.length - 1].focus();
    });
    app.querySelectorAll('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { goTo(phase, Number(b.dataset.goto)); });
    });
    const prev = document.getElementById('prevItem');
    if (prev) prev.addEventListener('click', function () { goTo(phase, idx - 1); });
    const next = document.getElementById('nextItem');
    if (next) next.addEventListener('click', function () { goTo(phase, idx + 1); });
    app.querySelectorAll('#submitPhase').forEach(function (b) {
      b.addEventListener('click', function () { submitJournalPhase(phase); });
    });
  }

  function onJournalEdit(ev, phase, id) {
    const el = ev.target;
    const tr = el.closest('tr[data-row]');
    if (!tr || !el.dataset.field) return;
    const row = rowsFor(phase, id)[Number(tr.dataset.row)];
    row[el.dataset.field] = el.value;
    tr.classList.toggle('is-credit', isCreditRow(row));
    save();
    const pill = app.querySelector('.nav-pill.current');
    if (pill) pill.classList.toggle('answered', isAnswered(phase, id));
  }

  function goTo(phase, i) {
    state.ui[phase] = i;
    save();
    renderJournalPhase(phase);
    const card = app.querySelector('.item-card');
    if (card && card.getBoundingClientRect().top < 70) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitJournalPhase(phase) {
    const items = itemsFor(phase);
    const empty = items.filter(function (it) { return !isAnswered(phase, it.id); }).length;
    const label = phase === 'p1' ? 'Phase 1' : 'Phase 2';
    const body = (empty
      ? '<p><b>' + empty + ' of ' + items.length + '</b> ' + (phase === 'p1' ? 'transactions have' : 'adjustments have') + ' no entry yet.</p>'
      : '<p>You have made an entry for every item.</p>') +
      '<p>After you submit ' + label + ', you will not be able to return to it. Submit now?</p>';
    const ok = await dialog('Submit ' + label + '?', body, 'Submit ' + label);
    if (!ok) return;
    state.submitted[phase] = nowIso();
    state.phase = phase === 'p1' ? 'p2' : 'p3';
    save();
    window.scrollTo(0, 0);
    render();
  }

  // ---------- Phase 3: closing routine ----------

  function closingStepLabel(step) {
    const cap = acctName('301');
    if (step.key === 'revenues') return 'Close revenue account(s) to Income Summary';
    if (step.key === 'expenses') return 'Close expense accounts to Income Summary';
    if (step.key === 'incomeSummary') return 'Close Income Summary to ' + cap;
    return 'Close ' + acctName('306') + ' to ' + cap;
  }

  // Replay posted steps to get current balances and the posted entries.
  function replayClosing() {
    const bal = E.atbBalances(exam.phase3);
    const sel = state.answers.p3.selections;
    const posted = sel.map(function (s, i) {
      return { step: exam.phase3.steps[i], lines: E.applyClosing(bal, s, exam.phase3.steps[i].target), selected: s };
    });
    return { bal: bal, posted: posted };
  }

  function renderClosing() {
    const p3 = exam.phase3;
    const a = state.answers.p3;
    const stepIdx = a.selections.length;
    const complete = stepIdx >= p3.steps.length;
    const replay = replayClosing();
    const bal = replay.bal;
    const current = complete ? [] : a.current;

    const accts = p3.atb.map(function (r) { return r.acct; }).concat(['350']).sort();
    let d = 0, c = 0;
    const ledgerRows = accts.map(function (no) {
      const b = bal[no] || 0;
      if (b > 0) d += b; else c -= b;
      const sel = current.includes(no);
      const cls = ['acct-row'];
      if (sel) cls.push('selected');
      if (complete) cls.push('locked');
      if (Math.abs(b) < 0.005) cls.push('zero');
      return '<tr class="' + cls.join(' ') + '" data-acct="' + no + '" tabindex="' + (complete ? -1 : 0) + '" aria-selected="' + sel + '">' +
        '<td class="chk"><input type="checkbox" tabindex="-1" aria-label="Select ' + esc(acctName(no)) + '"' + (sel ? ' checked' : '') + (complete ? ' disabled' : '') + '></td>' +
        '<td class="no">' + no + '</td><td>' + esc(acctName(no)) + '</td>' +
        '<td class="num">' + (b > 0 ? fmt(b) : '') + '</td><td class="num">' + (b < 0 ? fmt(-b) : '') + '</td></tr>';
    }).join('');

    const stepsHtml = p3.steps.map(function (s, i) {
      const cls = i === stepIdx ? 'current' : (i < stepIdx ? 'posted' : '');
      return '<li class="' + cls + '"><span class="n">' + (i + 1) + '</span><span>' + esc(closingStepLabel(s)) + '</span>' +
        (i < stepIdx ? '<span class="tag">Posted</span>' : '') + '</li>';
    }).join('');

    const consoleHtml = complete
      ? '<div><span class="prompt">&gt;</span> Closing routine complete. All four closing entries have been posted.</div>'
      : '<div><span class="prompt">&gt;</span> Step ' + (stepIdx + 1) + ' of ' + p3.steps.length + ': ' + esc(closingStepLabel(p3.steps[stepIdx])) + '</div>' +
        '<div><span class="prompt">&gt;</span> Click account(s) in the ledger to select them.</div>' +
        '<div><span class="prompt">&gt;</span> Selected: ' + (current.length ? current.map(function (no) { return esc(no + ' ' + acctName(no)); }).join(', ') : 'none') + '</div>';

    const postedHtml = replay.posted.map(function (p, i) {
      const body = p.lines.length
        ? p.lines.map(function (l) {
            return '<tr><td class="' + (l.side === 'cr' ? 'cr-acct' : '') + '">' + esc(acctName(l.acct)) + '</td>' +
              '<td class="num">' + (l.side === 'dr' ? fmt(l.amount) : '') + '</td><td class="num">' + (l.side === 'cr' ? fmt(l.amount) : '') + '</td></tr>';
          }).join('')
        : '<tr><td colspan="3" class="muted">No amounts were transferred.</td></tr>';
      return '<div class="posted-entry"><h4>Entry ' + (i + 1) + ' &middot; ' + esc(p3.date) + '</h4>' +
        '<table class="tbl"><thead><tr><th>Account Title</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>' + body + '</tbody></table></div>';
    }).join('');

    app.innerHTML =
      '<div class="phase-head"><div>' +
      '<div class="eyebrow">Phase 3 of 3 &middot; 24 points</div><h1>Closing Entries</h1>' +
      '<p>The adjusted account balances of ' + esc(exam.business.name) + ' at ' + esc(p3.date) +
      ' are shown in the ledger below. These balances are provided for Phase 3 only. Run the closing routine one step at a time: ' +
      'for each step, click the account(s) to close, then post the entry. The software prepares and posts the closing entry from your selection. Posted entries cannot be changed.</p>' +
      '</div></div>' +
      '<div class="layout layout-wide-side">' +
      '<section class="card">' +
      '<h3>General Ledger Balances</h3><div class="ref-sub muted small">Balances update after each posted closing entry. Starting point: Adjusted Trial Balance, ' + esc(p3.date) + '.</div>' +
      '<table class="tbl ledger"><thead><tr><th></th><th>No.</th><th>Account Title</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead>' +
      '<tbody id="ledger">' + ledgerRows + '</tbody>' +
      '<tfoot><tr><td></td><td></td><td>Totals</td><td class="num">' + fmtTotal(d) + '</td><td class="num">' + fmtTotal(c) + '</td></tr></tfoot></table>' +
      '</section>' +
      '<aside class="card side">' +
      '<h3>Closing Routine</h3>' +
      '<ol class="routine-steps">' + stepsHtml + '</ol>' +
      '<div class="console" role="status">' + consoleHtml + '</div>' +
      (complete
        ? '<button type="button" class="btn btn-primary" id="finishExam" style="width:100%">Finish Exam and Get My Report</button>'
        : '<div class="btn-row"><button type="button" class="btn btn-ghost btn-small" id="clearSel"' + (current.length ? '' : ' disabled') + '>Clear selection</button><span class="spacer"></span>' +
          '<button type="button" class="btn btn-primary" id="postEntry"' + (current.length ? '' : ' disabled') + '>Post Closing Entry</button></div>') +
      '<hr style="border:0;border-top:1px solid var(--line);margin:18px 0 12px">' +
      '<h3>Closing Journal</h3>' +
      (postedHtml || '<p class="muted small">No closing entries posted yet.</p>') +
      '</aside>' +
      '</div>';

    if (!complete) {
      const ledger = document.getElementById('ledger');
      const toggle = function (tr) {
        const no = tr.dataset.acct;
        const i = a.current.indexOf(no);
        if (i >= 0) a.current.splice(i, 1); else a.current.push(no);
        save();
        renderClosing();
        const again = app.querySelector('tr[data-acct="' + no + '"]');
        if (again) again.focus({ preventScroll: true });
      };
      ledger.addEventListener('click', function (ev) {
        const tr = ev.target.closest('tr[data-acct]');
        if (tr) toggle(tr);
      });
      ledger.addEventListener('keydown', function (ev) {
        if (ev.key !== ' ' && ev.key !== 'Enter') return;
        const tr = ev.target.closest('tr[data-acct]');
        if (tr) { ev.preventDefault(); toggle(tr); }
      });
      document.getElementById('clearSel').addEventListener('click', function () { a.current = []; save(); renderClosing(); });
      document.getElementById('postEntry').addEventListener('click', postClosingStep);
    } else {
      document.getElementById('finishExam').addEventListener('click', finishExam);
    }
  }

  async function postClosingStep() {
    const a = state.answers.p3;
    const step = exam.phase3.steps[a.selections.length];
    const list = a.current.slice().sort().map(function (no) { return '<li>' + esc(no + ' ' + acctName(no)) + '</li>'; }).join('');
    const ok = await dialog('Post closing entry?',
      '<p><b>' + esc(closingStepLabel(step)) + '</b></p><p>Selected account(s):</p><ul>' + list + '</ul><p>Posted entries cannot be changed.</p>',
      'Post Entry');
    if (!ok) return;
    a.selections.push(a.current.slice().sort());
    a.current = [];
    save();
    renderClosing();
  }

  async function finishExam() {
    const ok = await dialog('Finish the exam?', '<p>Your exam will be scored and your PDF report will be ready to download. You cannot make changes after this.</p>', 'Finish Exam');
    if (!ok) return;
    state.submitted.p3 = nowIso();
    state.finishedAt = nowIso();
    state.phase = 'done';
    save();
    window.scrollTo(0, 0);
    render();
  }

  // ---------- Results ----------

  function renderResults() {
    const result = E.gradeExam(exam, state.answers);
    const check = E.checkCode(state.code, state.name, result);
    const row = function (label, r) {
      return '<tr><td>' + label + '</td><td class="num">' + r.score.toFixed(2) + '</td><td class="num">' + r.possible + '</td></tr>';
    };
    app.innerHTML =
      '<section class="card results">' +
      '<div class="eyebrow">Exam complete</div>' +
      '<h1>Nice work, ' + esc(state.name.split(' ')[0]) + '.</h1>' +
      '<p>Your exam has been scored. Download your PDF report and upload it to the Canvas assignment.</p>' +
      '<div class="score-big"><b>' + result.total.toFixed(2) + '</b><span>/ ' + result.possible + ' points</span></div>' +
      '<table class="tbl" style="margin-bottom:18px"><thead><tr><th>Phase</th><th class="num">Score</th><th class="num">Possible</th></tr></thead><tbody>' +
      row('Phase 1: General Journal Entries', result.phase1) +
      row('Phase 2: Adjusting Entries', result.phase2) +
      row('Phase 3: Closing Entries', result.phase3) +
      '</tbody><tfoot><tr><td>Total</td><td class="num">' + result.total.toFixed(2) + '</td><td class="num">' + result.possible + '</td></tr></tfoot></table>' +
      '<dl class="meta-grid">' +
      '<dt>Student</dt><dd>' + esc(state.name) + '</dd>' +
      '<dt>Version code</dt><dd>' + esc(state.code) + '</dd>' +
      '<dt>Check code</dt><dd>' + esc(check) + '</dd>' +
      '<dt>Submitted</dt><dd>' + esc(new Date(state.finishedAt).toLocaleString()) + '</dd>' +
      '</dl>' +
      '<div class="btn-row"><button type="button" class="btn btn-primary" id="dlPdf">Download PDF Report</button>' +
      '<span class="small muted" id="dlNote"></span></div>' +
      '</section>';

    document.getElementById('dlPdf').addEventListener('click', function () {
      try {
        window.ExamReport.download(exam, state, result, check);
        document.getElementById('dlNote').textContent = 'Saved as a PDF. Check your Downloads folder.';
      } catch (e) {
        console.error(e);
        document.getElementById('dlNote').textContent = 'The PDF could not be created in this browser. Please try Chrome, Edge, Firefox or Safari.';
      }
    });
  }

  // Lets the instructor reset a lab computer: add #reset to the URL.
  if (location.hash === '#reset') {
    clearSaved();
    state = null; exam = null;
    history.replaceState(null, '', location.pathname);
  }

  render();
})();
