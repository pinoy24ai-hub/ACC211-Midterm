/* ACC 211 General Ledger Practice: user interface. */
(function () {
  'use strict';

  const E = window.GLEngine;
  const STORE_KEY = 'acc211-gl-practice-v1';
  const DEFAULT_ROWS = 4;
  const MAX_ROWS = 8;
  const GROUPS = [
    { label: 'Assets', types: ['A'] },
    { label: 'Liabilities', types: ['L'] },
    { label: 'Owner’s Equity', types: ['E', 'D'] },
    { label: 'Revenues', types: ['R', 'CR'] },
    { label: 'Cost of Goods Sold', types: ['C'] },
    { label: 'Expenses', types: ['X', 'OX'] }
  ];
  const VIEWS = [
    { id: 'journal', label: 'Journal' },
    { id: 'ledger', label: 'General Ledger' },
    { id: 'tb', label: 'Trial Balance' },
    { id: 'is', label: 'Income Statement' },
    { id: 'cert', label: 'Certificate' }
  ];
  const TX = E.TRANSACTIONS;

  const app = document.getElementById('app');
  let state = load();
  let lastCheck = null; // { id, result } for the entry on screen; cleared on edit

  if (location.hash === '#reset') {
    clearSaved();
    state = null;
    history.replaceState(null, '', location.pathname);
  }

  // ---------- Storage ----------

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const s = raw ? JSON.parse(raw) : null;
      return s && s.v === 1 ? s : null;
    } catch (e) { return null; }
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ } }
  function clearSaved() { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } }

  // ---------- Helpers ----------

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n) { return n ? Math.abs(n).toLocaleString('en-US') : ''; }
  function doneIds() { return TX.filter(function (t) { return state.done[t.id]; }).map(function (t) { return t.id; }); }
  function doneCount() { return doneIds().length; }
  function allDone() { return doneCount() === TX.length; }

  function dialog(title, bodyHtml, okLabel, showCancel) {
    const dlg = document.getElementById('dialog');
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogBody').innerHTML = bodyHtml;
    document.getElementById('dialogOk').textContent = okLabel || 'OK';
    document.getElementById('dialogCancel').hidden = !showCancel;
    return new Promise(function (resolve) {
      dlg.addEventListener('close', function onClose() {
        dlg.removeEventListener('close', onClose);
        resolve(dlg.returnValue === 'ok');
      });
      dlg.showModal();
    });
  }

  // ---------- Chrome ----------

  function setChrome() {
    const tabs = document.getElementById('viewTabs');
    const chip = document.getElementById('studentChip');
    if (!state) { tabs.hidden = true; chip.hidden = true; return; }
    tabs.hidden = false;
    tabs.innerHTML = VIEWS.map(function (v) {
      const locked = v.id === 'cert' && !allDone();
      return '<button type="button" data-view="' + v.id + '" class="' + (state.ui.view === v.id ? 'active' : '') + '"' +
        (locked ? ' disabled title="Post all 15 transactions to unlock"' : '') + '>' + v.label + (locked ? ' 🔒' : '') + '</button>';
    }).join('');
    tabs.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.dataset.view); });
    });
    chip.hidden = false;
    chip.innerHTML = '<b>' + esc(state.name) + '</b> &middot; ' + doneCount() + '/' + TX.length + ' posted';
  }

  function setView(v) {
    state.ui.view = v;
    save();
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    setChrome();
    if (!state) return renderWelcome();
    const v = state.ui.view;
    if (v === 'ledger') return renderLedger();
    if (v === 'tb') return renderTrialBalance();
    if (v === 'is') return renderIncomeStatement();
    if (v === 'cert' && allDone()) return renderCertificate();
    return renderJournal();
  }

  // ---------- Welcome ----------

  function renderWelcome() {
    app.innerHTML =
      '<section class="card welcome">' +
      '<div class="eyebrow">Practice Set &middot; Merchandising Operations</div>' +
      '<h1>Bright Mart General Ledger</h1>' +
      '<p>Journalize every transaction from the two videos, purchases and sales, plus Bright Mart’s month-end expenses. ' +
      'Bright Mart uses the <b>perpetual inventory system</b>. Each correct entry posts to the general ledger, and the ledger produces the multi-step income statement you saw in the video.</p>' +
      '<div class="points-grid">' +
      '<div><b>15</b>transactions to journalize</div>' +
      '<div><b>Check &amp; retry</b>until each entry is right</div>' +
      '<div><b>Certificate</b>PDF with your income statement</div>' +
      '</div>' +
      '<ul>' +
      '<li>Choose accounts from the chart of accounts and enter whole-dollar amounts. Explanations are not required.</li>' +
      '<li>Click <b>Check entry</b> to see which lines are right. Fix any line marked ✗ and check again. There is no penalty for retrying.</li>' +
      '<li>When an entry is correct, it locks and posts to the general ledger automatically.</li>' +
      '<li>Your work is saved in this browser, so you can stop and come back later.</li>' +
      '<li>When all 15 entries are posted, download your <b>Certificate of Completion</b> and upload it to Canvas.</li>' +
      '</ul>' +
      '<form id="startForm" novalidate>' +
        '<div class="field"><label for="studentName">Your full name (first and last, as shown in Canvas). It will appear on your certificate.</label>' +
        '<input type="text" id="studentName" autocomplete="name" maxlength="60" required></div>' +
        '<p class="error" id="startError"></p>' +
        '<button class="btn btn-primary" type="submit">Start</button>' +
      '</form>' +
      '</section>';

    document.getElementById('startForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      const name = document.getElementById('studentName').value.replace(/\s+/g, ' ').trim();
      if (name.length < 3 || name.indexOf(' ') < 0) {
        document.getElementById('startError').textContent = 'Please enter your first and last name.';
        return;
      }
      state = { v: 1, name: name, startedAt: new Date().toISOString(), completedAt: null, rows: {}, done: {}, checks: {}, ui: { idx: 0, view: 'journal' } };
      save();
      render();
    });
  }

  // ---------- Journal ----------

  function accountOptions(selected) {
    let html = '<option value="">Select account</option>';
    GROUPS.forEach(function (g) {
      html += '<optgroup label="' + esc(g.label) + '">';
      E.CHART.filter(function (a) { return g.types.indexOf(a.type) >= 0; }).forEach(function (a) {
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
      E.CHART.filter(function (a) { return g.types.indexOf(a.type) >= 0; }).forEach(function (a) {
        rows += '<tr><td class="no">' + a.no + '</td><td>' + esc(a.name) + '</td></tr>';
      });
    });
    return '<div class="card ref side"><h3>Chart of Accounts</h3><div class="ref-sub">' + esc(E.BUSINESS) + '</div>' +
      '<div class="opening"><b>Opening balances, Nov 1</b><span>Cash</span><span>$20,000</span><span>Owner’s Capital</span><span>$20,000</span></div>' +
      '<table class="tbl"><thead><tr><th>No.</th><th>Account Title</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function rowsFor(id) {
    if (!state.rows[id]) {
      state.rows[id] = [];
      for (let i = 0; i < DEFAULT_ROWS; i++) state.rows[id].push({ acct: '', dr: '', cr: '' });
    }
    return state.rows[id];
  }

  function isCreditRow(r) { return !String(r.dr || '').trim() && !!String(r.cr || '').trim(); }

  const MARKS = { ok: ['✓', 'Correct line'], bad: ['✗', 'Incorrect line'], incomplete: ['!', 'Needs an account and one amount'] };

  function journalRowsHtml(rows, statuses, locked) {
    return rows.map(function (r, i) {
      if (locked && E.isBlank(r)) return '';
      const st = statuses ? statuses[i] : null;
      const mark = st && MARKS[st] ? '<span class="mark ' + st + '" title="' + MARKS[st][1] + '" aria-label="' + MARKS[st][1] + '">' + MARKS[st][0] + '</span>' : '';
      const dis = locked ? ' disabled' : '';
      return '<tr data-row="' + i + '" class="' + (isCreditRow(r) ? 'is-credit ' : '') + (st ? 'st-' + st : '') + '">' +
        '<td class="acct-cell"><select data-field="acct" aria-label="Account, line ' + (i + 1) + '"' + dis + '>' + accountOptions(r.acct) + '</select></td>' +
        '<td class="amt-cell" data-label="Debit"><input data-field="dr" inputmode="decimal" autocomplete="off" aria-label="Debit, line ' + (i + 1) + '" value="' + esc(r.dr) + '"' + dis + '></td>' +
        '<td class="amt-cell" data-label="Credit"><input data-field="cr" inputmode="decimal" autocomplete="off" aria-label="Credit, line ' + (i + 1) + '" value="' + esc(r.cr) + '"' + dis + '></td>' +
        '<td class="mark-cell">' + (locked ? mark : mark + '<button type="button" class="rm" data-remove="' + i + '" title="Remove line" aria-label="Remove line ' + (i + 1) + '">&times;</button>') + '</td>' +
        '</tr>';
    }).join('');
  }

  function progressBar() {
    const n = doneCount();
    return '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + TX.length + '" aria-valuenow="' + n + '">' +
      '<div class="progress-bar" style="width:' + (n / TX.length * 100) + '%"></div></div>' +
      '<div class="progress-label">' + n + ' of ' + TX.length + ' transactions posted</div>';
  }

  function renderJournal() {
    const idx = Math.min(state.ui.idx || 0, TX.length - 1);
    const t = TX[idx];
    const rows = rowsFor(t.id);
    const locked = !!state.done[t.id];
    const check = lastCheck && lastCheck.id === t.id ? lastCheck.result : null;
    const statuses = locked ? rows.map(function (r) { return E.isBlank(r) ? 'blank' : 'ok'; }) : check ? check.statuses : null;

    const nav = TX.map(function (x, i) {
      const cls = ['nav-pill'];
      if (i === idx) cls.push('current');
      if (state.done[x.id]) cls.push('done');
      return '<button type="button" class="' + cls.join(' ') + '" data-goto="' + i + '" aria-label="Transaction ' + (i + 1) + (state.done[x.id] ? ', posted' : '') + '">' + (i + 1) + '</button>';
    }).join('');

    let feedback = '';
    if (locked) feedback = '<div class="feedback ok">✓ Correct. This entry is posted to the general ledger.</div>';
    else if (check) feedback = '<div class="feedback ' + (check.correct ? 'ok' : 'bad') + '" role="status">' + esc(check.message) + '</div>';

    const nextBtn = idx < TX.length - 1
      ? '<button type="button" class="btn' + (locked ? ' btn-primary' : '') + '" id="nextItem">Next &rarr;</button>'
      : '<span></span>';

    const complete = allDone()
      ? '<section class="card done-card"><div><h2>All 15 transactions are posted.</h2>' +
        '<p>Your general ledger is complete and Bright Mart’s multi-step income statement is ready. Review it, then download your certificate.</p></div>' +
        '<div class="btn-row"><button type="button" class="btn" data-go-view="is">View income statement</button>' +
        '<button type="button" class="btn btn-primary" data-go-view="cert">Get my certificate</button></div></section>'
      : '';

    app.innerHTML =
      '<div class="phase-head"><div>' +
      '<div class="eyebrow">Perpetual Inventory System &middot; November</div><h1>Journalize Bright Mart’s Transactions</h1>' +
      '<p>Record each transaction in the general journal. Correct entries post to the general ledger automatically. Explanations are not required.</p>' +
      '</div></div>' +
      complete +
      '<div class="layout"><div>' +
      progressBar() +
      '<nav class="navigator" aria-label="Transactions">' + nav + '</nav>' +
      '<section class="card item-card">' +
      '<div class="item-meta"><span class="item-no">Transaction ' + (idx + 1) + ' of ' + TX.length + '</span><span class="item-date">' + esc(t.date) + '</span>' +
      (locked ? '<span class="badge-posted">Posted</span>' : '') + '</div>' +
      '<div class="item-text">' + esc(t.text) + '</div>' +
      '<table class="journal' + (locked ? ' locked' : '') + '" id="journal"><thead><tr><th>Account Title</th><th class="num">Debit</th><th class="num">Credit</th><th></th></tr></thead>' +
      '<tbody>' + journalRowsHtml(rows, statuses, locked) + '</tbody></table>' +
      (locked ? '' :
        '<div class="journal-tools">' +
        '<button type="button" class="btn btn-small" id="addLine"' + (rows.length >= MAX_ROWS ? ' disabled' : '') + '>+ Add line</button>' +
        '<span class="small muted">Enter each amount in either the Debit or the Credit column. Leave extra lines blank.</span>' +
        '</div>') +
      feedback +
      '<div class="item-footer">' +
      '<button type="button" class="btn" id="prevItem"' + (idx === 0 ? ' disabled' : '') + '>&larr; Previous</button>' +
      (locked ? '' : '<button type="button" class="btn btn-primary" id="checkEntry">Check entry</button>') +
      nextBtn +
      '</div>' +
      '</section>' +
      '<div class="btn-row restart-row"><span class="spacer"></span><button type="button" class="btn-link" id="restart">Start over</button></div>' +
      '</div>' +
      chartTable() +
      '</div>';

    if (!locked) {
      const tbody = app.querySelector('#journal tbody');
      tbody.addEventListener('input', function (ev) { onEdit(ev, t.id); });
      tbody.addEventListener('change', function (ev) { onEdit(ev, t.id); });
      tbody.addEventListener('focusout', function (ev) {
        const el = ev.target;
        if (el.tagName !== 'INPUT') return;
        const n = E.parseAmount(el.value);
        if (!isNaN(n)) { el.value = n.toLocaleString('en-US', { maximumFractionDigits: 2 }); onEdit({ target: el }, t.id); }
      });
      tbody.addEventListener('click', function (ev) {
        const btn = ev.target.closest('[data-remove]');
        if (!btn) return;
        const r = rowsFor(t.id);
        const i = Number(btn.dataset.remove);
        if (r.length > 2) r.splice(i, 1); else r[i] = { acct: '', dr: '', cr: '' };
        lastCheck = null;
        save();
        renderJournal();
      });
      document.getElementById('addLine').addEventListener('click', function () {
        const r = rowsFor(t.id);
        if (r.length < MAX_ROWS) r.push({ acct: '', dr: '', cr: '' });
        lastCheck = null;
        save();
        renderJournal();
        const sels = app.querySelectorAll('#journal select');
        if (sels.length) sels[sels.length - 1].focus();
      });
      document.getElementById('checkEntry').addEventListener('click', function () { checkCurrent(t.id); });
    }

    app.querySelectorAll('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { goTo(Number(b.dataset.goto)); });
    });
    app.querySelectorAll('[data-go-view]').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.dataset.goView); });
    });
    const prev = document.getElementById('prevItem');
    if (prev) prev.addEventListener('click', function () { goTo(idx - 1); });
    const next = document.getElementById('nextItem');
    if (next) next.addEventListener('click', function () { goTo(idx + 1); });
    document.getElementById('restart').addEventListener('click', restart);
  }

  function onEdit(ev, id) {
    const el = ev.target;
    const tr = el.closest('tr[data-row]');
    if (!tr || !el.dataset.field) return;
    const row = rowsFor(id)[Number(tr.dataset.row)];
    row[el.dataset.field] = el.value;
    tr.classList.toggle('is-credit', isCreditRow(row));
    // Marks from the last check no longer apply once the student edits.
    if (lastCheck && lastCheck.id === id) {
      lastCheck = null;
      app.querySelectorAll('#journal .mark').forEach(function (m) { m.remove(); });
      app.querySelectorAll('#journal tr').forEach(function (r) { r.classList.remove('st-ok', 'st-bad', 'st-incomplete'); });
      const fb = app.querySelector('.feedback');
      if (fb) fb.remove();
    }
    save();
  }

  function checkCurrent(id) {
    const result = E.checkEntry(id, rowsFor(id));
    state.checks[id] = (state.checks[id] || 0) + 1;
    lastCheck = { id: id, result: result };
    if (result.correct) {
      // Keep only the filled lines, in the order entered.
      state.rows[id] = rowsFor(id).filter(function (r) { return !E.isBlank(r); });
      state.done[id] = true;
      lastCheck = null;
      if (allDone() && !state.completedAt) state.completedAt = new Date().toISOString();
    }
    save();
    setChrome();
    renderJournal();
    const fb = app.querySelector('.feedback');
    if (fb) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (result.correct && allDone()) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goTo(i) {
    state.ui.idx = Math.max(0, Math.min(TX.length - 1, i));
    lastCheck = null;
    save();
    renderJournal();
    const card = app.querySelector('.item-card');
    if (card && card.getBoundingClientRect().top < 70) card.scrollIntoView({ block: 'start' });
  }

  async function restart() {
    const ok = await dialog('Start over?', '<p>This clears every entry you have made and your name. You cannot undo this.</p>', 'Start over', true);
    if (!ok) return;
    clearSaved();
    state = null;
    lastCheck = null;
    render();
  }

  // ---------- General ledger ----------

  function pendingNote() {
    const left = TX.length - doneCount();
    return left ? '<div class="pending-note">Showing the opening balances and the ' + doneCount() + ' transaction' + (doneCount() === 1 ? '' : 's') +
      ' posted so far. ' + left + ' still to journalize.</div>' : '';
  }

  function renderLedger() {
    const ledger = E.buildLedger(doneIds());
    let html = '';
    GROUPS.forEach(function (g) {
      const accts = E.CHART.filter(function (c) { return g.types.indexOf(c.type) >= 0 && ledger[c.no].postings.length; });
      if (!accts.length) return;
      html += '<h2 class="ledger-group">' + esc(g.label) + '</h2><div class="ledger-grid">';
      accts.forEach(function (c) {
        const a = ledger[c.no];
        const rows = a.postings.map(function (p) {
          return '<tr><td>' + esc(p.date) + '</td><td class="muted">' + esc(p.ref) + '</td>' +
            '<td class="num">' + (p.side === 'dr' ? num(p.amount) : '') + '</td><td class="num">' + (p.side === 'cr' ? num(p.amount) : '') + '</td>' +
            '<td class="num">' + balText(p.balance) + '</td></tr>';
        }).join('');
        html += '<section class="card ledger-acct"><div class="ledger-head"><span class="no">' + c.no + '</span><b>' + esc(c.name) + '</b>' +
          '<span class="ledger-bal">' + balText(a.balance) + '</span></div>' +
          '<table class="tbl"><thead><tr><th>Date</th><th>Ref.</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead>' +
          '<tbody>' + rows + '</tbody></table></section>';
      });
      html += '</div>';
    });
    app.innerHTML =
      '<div class="phase-head"><div><div class="eyebrow">' + esc(E.BUSINESS) + '</div><h1>General Ledger</h1>' +
      '<p>Every correct journal entry posts here. Ref. J7 means the entry for transaction 7. Balances show Dr (debit) or Cr (credit).</p></div></div>' +
      pendingNote() + html;
  }

  function balText(b) {
    if (!b) return '0';
    return num(b) + ' <span class="drcr">' + (b > 0 ? 'Dr' : 'Cr') + '</span>';
  }

  // ---------- Trial balance ----------

  function renderTrialBalance() {
    const tb = E.trialBalance(E.buildLedger(doneIds()));
    const body = tb.rows.map(function (r) {
      return '<tr><td class="no">' + r.no + '</td><td>' + esc(r.name) + '</td><td class="num">' + num(r.debit) + '</td><td class="num">' + num(r.credit) + '</td></tr>';
    }).join('');
    app.innerHTML =
      '<div class="phase-head"><div><div class="eyebrow">' + esc(E.BUSINESS) + '</div><h1>Trial Balance</h1>' +
      '<p>Debits equal credits because every posted entry balances.</p></div></div>' +
      pendingNote() +
      '<section class="card narrow"><div class="header-block"><b>' + esc(E.BUSINESS) + '</b><b>Trial Balance</b>November 30</div>' +
      '<table class="tbl"><thead><tr><th>No.</th><th>Account Title</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead>' +
      '<tbody>' + body + '</tbody><tfoot><tr><td></td><td>Totals</td><td class="num">' + E.money(tb.debit) + '</td><td class="num">' + E.money(tb.credit) + '</td></tr></tfoot></table></section>';
  }

  // ---------- Income statement ----------

  // Rows as [label, inner amount, outer amount, class]; shared by the screen and the PDF.
  function statementRows(s) {
    const rows = [['Sales revenue', '', s.sales, '']];
    s.contra.forEach(function (c, i) {
      const last = i === s.contra.length - 1;
      rows.push([(i === 0 ? 'Less: ' : '') + c.name, c.amount, last ? s.contraTotal : '', i === 0 ? 'in' : 'in2', last]);
    });
    rows.push(['Net sales', '', s.netSales, 'key']);
    if (s.cogs.length) s.cogs.forEach(function (c) { rows.push([c.name, '', c.amount, '', true]); });
    else rows.push(['Cost of goods sold', '', 0, '', true]);
    rows.push(['Gross profit', '', s.grossProfit, 'key']);
    if (s.opex.length) {
      rows.push(['Operating expenses', '', '', 'head']);
      s.opex.forEach(function (c, i) { rows.push([c.name, c.amount, '', 'in', i === s.opex.length - 1]); });
      rows.push(['Total operating expenses', '', s.opexTotal, 'in2', true]);
    }
    rows.push(['Income from operations', '', s.incomeFromOps, 'key']);
    if (s.other.length) {
      rows.push(['Other expenses', '', '', 'head']);
      s.other.forEach(function (c, i) { rows.push([c.name, '', c.amount, 'in', i === s.other.length - 1]); });
    }
    rows.push([s.netIncome < 0 ? 'Net loss' : 'Net income', '', s.netIncome, 'final']);
    return rows;
  }
  window.GLStatementRows = statementRows;

  function statementHtml(s) {
    const rows = statementRows(s).map(function (r, i) {
      const money = function (v, under) {
        if (v === '') return '<td class="num"></td>';
        const dollar = i === 0 || r[3] === 'final';
        return '<td class="num' + (under ? ' u' : '') + (r[3] === 'final' ? ' dbl' : '') + '">' + (dollar ? E.money(Math.abs(v)) : Math.abs(v).toLocaleString('en-US')) + '</td>';
      };
      return '<tr class="' + r[3] + '"><td>' + esc(r[0]) + '</td>' + money(r[1], r[4] && r[1] !== '') + money(r[2], r[4] && r[2] !== '') + '</tr>';
    }).join('');
    return '<div class="header-block"><b>' + esc(s.business) + '</b><b>Income Statement</b>' + esc(s.period) + '</div>' +
      '<table class="tbl is-table"><tbody>' + rows + '</tbody></table>';
  }

  function renderIncomeStatement() {
    const s = E.incomeStatement(E.buildLedger(doneIds()));
    app.innerHTML =
      '<div class="phase-head"><div><div class="eyebrow">' + esc(E.BUSINESS) + '</div><h1>Multi-Step Income Statement</h1>' +
      '<p>Generated from your general ledger balances. It matches the statement in the sales video once all 15 transactions are posted.</p></div></div>' +
      pendingNote() +
      '<div class="layout"><section class="card">' + statementHtml(s) + '</section>' +
      '<aside class="card ref side"><h3>The three steps</h3>' +
      '<ol class="steps-list"><li><b>Net sales − Cost of goods sold</b> = Gross profit</li>' +
      '<li><b>Gross profit − Operating expenses</b> = Income from operations</li>' +
      '<li><b>± Other revenues and expenses</b> = Net income</li></ol>' +
      '<p class="small muted">Sales Returns and Allowances and Sales Discounts are contra-revenue accounts, so they are subtracted from Sales Revenue. Interest is not part of normal operations, so it appears below income from operations.</p>' +
      '</aside></div>';
  }

  // ---------- Certificate ----------

  function renderCertificate() {
    const s = E.incomeStatement(E.buildLedger(doneIds()));
    const id = E.certificateId(state.name, state.completedAt);
    app.innerHTML =
      '<div class="phase-head"><div><div class="eyebrow">Well done</div><h1>Certificate of Completion</h1>' +
      '<p>Download your certificate and upload the PDF to Canvas.</p></div>' +
      '<button type="button" class="btn btn-primary" id="downloadCert">Download certificate (PDF)</button></div>' +
      '<section class="card cert-preview">' +
      '<div class="cert-kicker">Certificate of Completion</div>' +
      '<div class="cert-name">' + esc(state.name) + '</div>' +
      '<p>has journalized and posted all 15 November transactions of Bright Mart under the perpetual inventory system and generated its multi-step income statement.</p>' +
      '<div class="cert-meta"><span>Completed ' + esc(new Date(state.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })) + '</span><span>Certificate ID ' + id + '</span></div>' +
      '<div class="cert-statement">' + statementHtml(s) + '</div>' +
      '</section>' +
      '<p class="small muted">Wrong name on the certificate? Use <b>Start over</b> on the Journal tab and enter it again.</p>';
    document.getElementById('downloadCert').addEventListener('click', function () {
      try { window.GLReport.download(state, s, id); }
      catch (e) { dialog('Download failed', '<p>The PDF could not be created in this browser. Try another browser such as Chrome or Edge.</p>', 'OK', false); }
    });
  }

  render();
})();
