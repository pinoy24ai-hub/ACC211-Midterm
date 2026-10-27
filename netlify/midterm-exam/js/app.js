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
  function attemptNo() { return (state && state.attempt) || 1; }

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
      chip.innerHTML = '<b>' + esc(state.name) + '</b> &middot; Attempt ' + attemptNo() + ' &middot; Version ' + esc(state.code);
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
      '<li>After you finish, you may retake the exam as many times as you like. Each retake has new numbers and questions, and your highest score counts. Download and upload the report for every attempt.</li>' +
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
        v: 1, code: code, name: name, attempt: 1, history: [], phase: 'p1', startedAt: nowIso(), submitted: {},
        answers: { p1: {}, p2: {}, p3: { selections: [], amounts: [], current: [], currentAmount: '' } },
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

  function p3State() {
    const a = state.answers.p3;
    if (!a.amounts) a.amounts = [];
    if (a.currentAmount == null) a.currentAmount = '';
    return a;
  }

  // Replay posted entries (as the student keyed them) to get current balances,
  // the posted journal, and the Income Summary T-account postings.
  function replayClosing() {
    const a = p3State();
    const bal = E.atbBalances(exam.phase3);
    const isPostings = [];
    const posted = a.selections.map(function (sel, i) {
      const r = E.applyClosing(bal, sel, a.amounts[i]);
      r.lines.forEach(function (l) { if (l.acct === '350') isPostings.push({ ref: i + 1, side: l.side, amount: l.amount }); });
      return { lines: r.lines, selected: sel };
    });
    return { bal: bal, posted: posted, isPostings: isPostings };
  }

  // Build the entry the routine would post from the current selection, without posting it.
  function previewEntry(bal, selected) {
    const target = E.receiverOf(selected);
    const lines = [];
    let net = 0;
    selected.slice().sort().forEach(function (no) {
      const b = bal[no] || 0;
      if (no === target || Math.abs(b) < 0.005) return;
      lines.push({ acct: no, side: b > 0 ? 'cr' : 'dr', amount: Math.abs(b) });
      net += b;
    });
    return { target: target, lines: lines, receiverSide: net > 0 ? 'dr' : 'cr', hasTransfer: Math.abs(net) >= 0.005 };
  }

  function entryLinesHtml(lines) {
    const sorted = lines.slice().sort(function (x, y) { return x.side === y.side ? 0 : (x.side === 'dr' ? -1 : 1); });
    return sorted.map(function (l) {
      return '<tr><td class="' + (l.side === 'cr' ? 'cr-acct' : '') + '">' + esc(acctName(l.acct)) + '</td>' +
        '<td class="num">' + (l.side === 'dr' ? fmt(l.amount) : '') + '</td><td class="num">' + (l.side === 'cr' ? fmt(l.amount) : '') + '</td></tr>';
    }).join('');
  }

  function tAccountHtml(postings, balance) {
    const drs = postings.filter(function (p) { return p.side === 'dr'; });
    const crs = postings.filter(function (p) { return p.side === 'cr'; });
    const n = Math.max(drs.length, crs.length, 1);
    let rows = '';
    for (let i = 0; i < n; i++) {
      const d = drs[i], c = crs[i];
      rows += '<div class="t-row"><span>' + (d ? '<i>(' + d.ref + ')</i> ' + fmt(d.amount) : '') + '</span><span>' +
        (c ? '<i>(' + c.ref + ')</i> ' + fmt(c.amount) : '') + '</span></div>';
    }
    const balRow = '<div class="t-row t-bal"><span>' + (balance > 0.004 ? 'Bal. ' + fmt(balance) : '') + '</span><span>' +
      (balance < -0.004 ? 'Bal. ' + fmt(-balance) : '') + '</span></div>';
    return '<div class="t-account"><div class="t-title">350 Income Summary</div><div class="t-head"><span>Debit</span><span>Credit</span></div>' +
      rows + balRow + '</div>';
  }

  function renderClosing() {
    const p3 = exam.phase3;
    const a = p3State();
    const total = p3.steps.length;
    const stepIdx = a.selections.length;
    const complete = stepIdx >= total;
    const replay = replayClosing();
    const bal = replay.bal;
    const current = complete ? [] : a.current;

    // Ledger grouped by account type
    const accts = p3.atb.map(function (r) { return r.acct; }).concat(['350']);
    let ledgerRows = '';
    GROUPS.forEach(function (g) {
      const inGroup = exam.chart.filter(function (x) { return g.types.includes(x.type) && accts.includes(x.no); });
      if (!inGroup.length) return;
      ledgerRows += '<tr class="grp"><td colspan="5">' + esc(g.label) + '</td></tr>';
      inGroup.forEach(function (x) {
        const no = x.no, b = bal[no] || 0;
        const sel = current.includes(no);
        const cls = ['acct-row'];
        if (sel) cls.push('selected');
        if (complete) cls.push('locked');
        if (Math.abs(b) < 0.005) cls.push('zero');
        ledgerRows += '<tr class="' + cls.join(' ') + '" data-acct="' + no + '" tabindex="' + (complete ? -1 : 0) + '" aria-selected="' + sel + '">' +
          '<td class="chk"><input type="checkbox" tabindex="-1" aria-label="Select ' + esc(x.name) + '"' + (sel ? ' checked' : '') + (complete ? ' disabled' : '') + '></td>' +
          '<td class="no">' + no + '</td><td>' + esc(x.name) + '</td>' +
          '<td class="num">' + (b > 0.004 ? fmt(b) : '') + '</td><td class="num">' + (b < -0.004 ? fmt(-b) : '') + '</td></tr>';
      });
    });

    const stepsHtml = p3.steps.map(function (s, i) {
      const cls = i === stepIdx ? 'current' : (i < stepIdx ? 'posted' : '');
      return '<li class="' + cls + '"><span class="n">' + (i + 1) + '</span><span>Closing entry ' + (i + 1) + '</span>' +
        (i < stepIdx ? '<span class="tag">Posted</span>' : (i === stepIdx ? '<span class="tag">In progress</span>' : '')) + '</li>';
    }).join('');

    // Preview of the entry being built
    let previewHtml = '';
    let canPost = false;
    if (!complete) {
      const pv = previewEntry(bal, current);
      let body = entryLinesHtml(pv.lines);
      let note = '';
      if (pv.target && pv.hasTransfer) {
        const amtInput = '<input id="p3Amount" class="amt-input" inputmode="decimal" autocomplete="off" placeholder="Amount" aria-label="Amount transferred to ' +
          esc(acctName(pv.target)) + '" value="' + esc(a.currentAmount) + '">';
        const recv = '<tr class="recv"><td class="' + (pv.receiverSide === 'cr' ? 'cr-acct' : '') + '">' + esc(acctName(pv.target)) + '</td>' +
          '<td class="num">' + (pv.receiverSide === 'dr' ? amtInput : '') + '</td><td class="num">' + (pv.receiverSide === 'cr' ? amtInput : '') + '</td></tr>';
        body = pv.receiverSide === 'dr' ? recv + body : body + recv;
        canPost = !isNaN(E.parseAmount(a.currentAmount));
        note = 'Enter the amount transferred to ' + esc(acctName(pv.target)) + '.';
      } else if (pv.target && current.length > 1) {
        body += '<tr class="recv"><td>' + esc(acctName(pv.target)) + '</td><td></td><td></td></tr>';
        canPost = true;
        note = 'No balances will be transferred by this entry.';
      } else if (current.length) {
        if (pv.target) body += '<tr class="recv"><td>' + esc(acctName(pv.target)) + '</td><td></td><td></td></tr>';
        note = 'This entry has only one side so far.';
      } else {
        note = 'Click accounts in the ledger to build the entry.';
      }
      previewHtml =
        '<div class="preview"><div class="preview-title">Entry ' + (stepIdx + 1) + ' preview &middot; ' + esc(p3.date) + '</div>' +
        '<table class="tbl"><thead><tr><th>Account Title</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>' +
        (body || '<tr><td colspan="3" class="muted">No accounts selected.</td></tr>') + '</tbody></table>' +
        '<div class="preview-note">' + note + '</div></div>' +
        '<div class="btn-row"><button type="button" class="btn btn-ghost btn-small" id="clearSel"' + (current.length ? '' : ' disabled') + '>Clear selection</button><span class="spacer"></span>' +
        '<button type="button" class="btn btn-primary" id="postEntry"' + (canPost ? '' : ' disabled') + '>Post Entry ' + (stepIdx + 1) + '</button></div>';
    } else {
      previewHtml = '<div class="preview done-note">All four closing entries have been posted.</div>' +
        '<button type="button" class="btn btn-primary" id="finishExam" style="width:100%">Finish Exam and Get My Report</button>';
    }

    const postedHtml = replay.posted.map(function (p, i) {
      return '<div class="posted-entry"><h4>Entry ' + (i + 1) + ' &middot; ' + esc(p3.date) + '</h4>' +
        '<table class="tbl"><thead><tr><th>Account Title</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>' +
        (p.lines.length ? entryLinesHtml(p.lines) : '<tr><td colspan="3" class="muted">No amounts were transferred.</td></tr>') + '</tbody></table></div>';
    }).join('');

    // Post-closing trial balance once the routine is complete
    let pctbHtml = '';
    if (complete) {
      let d = 0, c = 0, rows = '';
      exam.chart.forEach(function (x) {
        const b = bal[x.no];
        if (!b || Math.abs(b) < 0.005) return;
        if (b > 0) d += b; else c -= b;
        rows += '<tr><td class="no">' + x.no + '</td><td>' + esc(x.name) + '</td><td class="num">' + (b > 0 ? fmt(b) : '') + '</td><td class="num">' + (b < 0 ? fmt(-b) : '') + '</td></tr>';
      });
      pctbHtml = '<section class="card"><div class="header-block"><b>' + esc(exam.business.name) + '</b><b>Post-Closing Trial Balance</b>' + esc(p3.date) + '</div>' +
        '<table class="tbl"><thead><tr><th>No.</th><th>Account Title</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>' + rows +
        '</tbody><tfoot><tr><td></td><td>Totals</td><td class="num">' + fmtTotal(d) + '</td><td class="num">' + fmtTotal(c) + '</td></tr></tfoot></table></section>';
    }

    app.innerHTML =
      '<div class="phase-head"><div>' +
      '<div class="eyebrow">Phase 3 of 3 &middot; 24 points</div><h1>Closing Entries</h1>' +
      '<p>The ledger shows the adjusted balances of ' + esc(exam.business.name) + ' at ' + esc(p3.date) +
      ' (provided for Phase 3 only). Prepare the four closing entries in the proper order. For each entry:</p>' +
      '<ol class="howto"><li>Click <b>every account in the entry</b>: the account(s) being closed and the account that receives the balance.</li>' +
      '<li>Enter the <b>amount transferred</b> to the receiving account.</li>' +
      '<li>Review the preview, then post. Posted entries cannot be changed.</li></ol>' +
      '</div></div>' +
      '<div class="layout layout-wide-side">' +
      '<div>' +
      '<section class="card">' +
      '<h3>General Ledger Balances</h3><div class="ref-sub muted small">Balances update after each posted entry.</div>' +
      '<table class="tbl ledger"><thead><tr><th></th><th>No.</th><th>Account Title</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead>' +
      '<tbody id="ledger">' + ledgerRows + '</tbody></table>' +
      '</section>' + pctbHtml +
      '</div>' +
      '<aside class="card side">' +
      '<h3>Closing Routine</h3>' +
      '<ol class="routine-steps">' + stepsHtml + '</ol>' +
      previewHtml +
      '<hr class="sep">' +
      tAccountHtml(replay.isPostings, bal['350'] || 0) +
      '<hr class="sep">' +
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
      const amt = document.getElementById('p3Amount');
      if (amt) {
        amt.addEventListener('input', function () {
          a.currentAmount = amt.value;
          save();
          document.getElementById('postEntry').disabled = isNaN(E.parseAmount(amt.value));
        });
        amt.addEventListener('focusout', function () {
          const n = E.parseAmount(amt.value);
          if (!isNaN(n)) { amt.value = n.toLocaleString('en-US', { maximumFractionDigits: 2 }); a.currentAmount = amt.value; save(); }
        });
      }
      document.getElementById('clearSel').addEventListener('click', function () { a.current = []; a.currentAmount = ''; save(); renderClosing(); });
      document.getElementById('postEntry').addEventListener('click', postClosingStep);
    } else {
      document.getElementById('finishExam').addEventListener('click', finishExam);
    }
  }

  async function postClosingStep() {
    const a = p3State();
    const n = a.selections.length + 1;
    const ok = await dialog('Post entry ' + n + '?', '<p>The entry will be posted to the ledger exactly as shown in the preview. Posted entries cannot be changed.</p>', 'Post Entry');
    if (!ok) return;
    const pv = previewEntry(replayClosing().bal, a.current);
    a.selections.push(a.current.slice().sort());
    a.amounts.push(pv.target && pv.hasTransfer ? a.currentAmount : '');
    a.current = [];
    a.currentAmount = '';
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
    const check = E.checkCode(state.code, state.name, result, attemptNo());
    const attempts = (state.history || []).concat([{ attempt: attemptNo(), code: state.code, finishedAt: state.finishedAt, total: result.total }]);
    const best = Math.max.apply(null, attempts.map(function (x) { return x.total; }));
    const historyHtml = attempts.length < 2 ? '' :
      '<h3 style="margin-top:6px">Your attempts</h3>' +
      '<table class="tbl" style="margin-bottom:18px"><thead><tr><th>Attempt</th><th>Version</th><th>Submitted</th><th class="num">Score</th></tr></thead><tbody>' +
      attempts.map(function (x) {
        return '<tr><td>' + x.attempt + (x.attempt === attemptNo() ? ' (this one)' : '') + '</td><td>' + esc(x.code) + '</td><td>' + esc(new Date(x.finishedAt).toLocaleString()) + '</td>' +
          '<td class="num">' + x.total.toFixed(2) + (x.total === best ? ' &#9733;' : '') + '</td></tr>';
      }).join('') +
      '</tbody></table><p class="small muted">&#9733; Highest score. Your highest attempt counts, so make sure its PDF is uploaded to Canvas.</p>';
    const row = function (label, r) {
      return '<tr><td>' + label + '</td><td class="num">' + r.score.toFixed(2) + '</td><td class="num">' + r.possible + '</td></tr>';
    };
    app.innerHTML =
      '<section class="card results">' +
      '<div class="eyebrow">Exam complete &middot; Attempt ' + attemptNo() + '</div>' +
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
      '<dt>Attempt</dt><dd>' + attemptNo() + '</dd>' +
      '<dt>Version code</dt><dd>' + esc(state.code) + '</dd>' +
      '<dt>Check code</dt><dd>' + esc(check) + '</dd>' +
      '<dt>Submitted</dt><dd>' + esc(new Date(state.finishedAt).toLocaleString()) + '</dd>' +
      '</dl>' +
      '<div class="btn-row"><button type="button" class="btn btn-primary" id="dlPdf">Download PDF Report</button>' +
      '<span class="small muted" id="dlNote"></span></div>' +
      '</section>' +
      '<section class="card results">' + historyHtml +
      '<h3>Want to try again?</h3>' +
      '<p>You can retake the exam with a new set of numbers and questions. Your highest score counts. Download this attempt\u2019s report before you start a retake, because it will no longer be available here.</p>' +
      '<button type="button" class="btn" id="retake">Retake Exam</button>' +
      '</section>';

    document.getElementById('dlPdf').addEventListener('click', function () {
      try {
        window.ExamReport.download(exam, state, result, check);
        state.downloaded = true;
        save();
        document.getElementById('dlNote').textContent = 'Saved as a PDF. Check your Downloads folder.';
      } catch (e) {
        console.error(e);
        document.getElementById('dlNote').textContent = 'The PDF could not be created in this browser. Please try Chrome, Edge, Firefox or Safari.';
      }
    });    document.getElementById('retake').addEventListener('click', function () { startRetake(result, check); });
  }

  async function startRetake(result, check) {
    const warn = state.downloaded ? '' : '<p><b>You have not downloaded the report for this attempt yet.</b> Cancel and download it first if you want to keep it.</p>';
    const ok = await dialog('Start attempt ' + (attemptNo() + 1) + '?',
      warn + '<p>You will get a new version of the exam with different numbers and questions. This attempt\u2019s score (' + result.total.toFixed(2) +
      ') stays in your attempt list, and your highest score counts.</p>', 'Start Retake');
    if (!ok) return;
    const hist = (state.history || []).concat([{ attempt: attemptNo(), code: state.code, startedAt: state.startedAt, finishedAt: state.finishedAt, total: result.total, check: check }]);
    const code = E.newVersionCode();
    state = {
      v: 1, code: code, name: state.name, attempt: attemptNo() + 1, history: hist, phase: 'p1', startedAt: nowIso(), submitted: {},
      answers: { p1: {}, p2: {}, p3: { selections: [], amounts: [], current: [], currentAmount: '' } },
      ui: { p1: 0, p2: 0 }
    };
    exam = E.generateExam(code);
    save();
    window.scrollTo(0, 0);
    render();
  }

  // Lets the instructor reset a lab computer: add #reset to the URL.
  if (location.hash === '#reset') {
    clearSaved();
    state = null; exam = null;
    history.replaceState(null, '', location.pathname);
  }

  render();
})();
