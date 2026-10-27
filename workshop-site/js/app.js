/* Merchandising General Ledger Workshop: user interface. Progress is saved in the browser after every action. */
(function () {
  'use strict';

  const W = window.WorkshopEngine;
  const E = W.E, N = W.N, A = W.A;
  const STORE_KEY = 'acc211-gl-workshop-v1';
  const $ = function (id) { return document.getElementById(id); };
  const esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  const money = W.money, num = W.num, r2 = W.r2;

  let S = load();
  let isPrev = null; // income statement values before the latest render, for the flash effect
  let tab = 'journal';

  if (location.hash === '#reset') { clearSaved(); S = null; history.replaceState(null, '', location.pathname); }

  // ---------- State ----------

  function blankRows() { return [{ a: '', p: '', d: '', c: '' }, { a: '', p: '', d: '', c: '' }]; }
  function freshCur() { return { wrong: 0, hints: 0, rows: blankRows(), status: 'open', fb: null }; }
  function freshState(name) {
    return { v: 1, name: name, startedAt: new Date().toISOString(), finishedAt: null, idx: 0, results: [], cur: freshCur(), newEntry: -1, done: false };
  }
  function load() {
    try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); return s && s.v === 1 ? s : null; } catch (e) { return null; }
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
  function clearSaved() { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } }
  function ledger() { return W.buildLedger(S ? S.results : []); }

  // ---------- Header and progress ----------

  function renderHeader() {
    const si = W.scoreInfo(S.results);
    $('hName').textContent = S.name || '-';
    $('hPosted').textContent = si.done;
    $('hTotal').textContent = N;
    $('hScore').textContent = si.done ? si.pctSoFar + '%' : '-';
    let h = '<span class="lbl">Entries:</span>';
    for (let i = 0; i < N; i++) {
      let cls = 'dot', title = 'Entry ' + E[i].id + ', ' + E[i].date;
      const r = S.results[i];
      if (r) { cls += r.credit >= 1 ? ' full' : (r.credit > 0 ? ' part' : ' zero'); title += ': ' + r.credit.toFixed(2) + ' point'; }
      else if (i === S.idx && !S.done) cls += ' cur';
      h += '<div class="' + cls + '" title="' + esc(title) + '">' + E[i].id + '</div>';
    }
    $('progress').innerHTML = h;
  }

  // ---------- Journal screen ----------

  function renderIntro() {
    $('introArea').innerHTML =
      '<div class="bizcard"><b>The business:</b> Bright Mart buys merchandise from suppliers such as Ace Supply and resells it to customers such as Rosa’s Shop. ' +
      'It uses the <b>perpetual inventory system</b>, so Merchandise inventory and Cost of goods sold are updated with every purchase and sale. ' +
      'The ledger opens on November 1 with <b>Cash of $20,000</b> and <b>Owner’s capital of $20,000</b>. These are the same transactions as in the two videos.</div>' +
      '<details class="ref"><summary>Quick reference: perpetual system rules</summary><ul>' +
      '<li><b>Buy goods</b> (cash or credit): Debit Merchandise inventory.</li>' +
      '<li><b>Return goods to the supplier, or receive an allowance</b>: Credit Merchandise inventory.</li>' +
      '<li><b>Freight-in</b> (FOB shipping point, buyer pays): Debit Merchandise inventory.</li>' +
      '<li><b>Purchase discount</b>: Credit Merchandise inventory.</li>' +
      '<li><b>Every sale has two parts, recorded together in one entry</b>: (1) Debit Cash or Accounts receivable, Credit Sales revenue at the selling price. (2) Debit Cost of goods sold, Credit Merchandise inventory at cost.</li>' +
      '<li><b>Freight-out</b> (FOB destination, seller pays): Debit Delivery expense.</li>' +
      '<li><b>Sales returns</b> reverse both parts in one entry. <b>Sales allowances</b> reverse the revenue part only.</li>' +
      '<li><b>Sales discounts</b> and <b>sales returns &amp; allowances</b> are contra-revenue accounts (they reduce sales).</li>' +
      '<li><b>Interest expense</b> is an other (nonoperating) expense.</li>' +
      '<li>Accounts payable and Accounts receivable lines need a <b>vendor / customer</b> name. That is the subsidiary ledger.</li>' +
      '</ul></details>';
  }

  function accountOptions(sel) {
    let h = '<option value="">Choose account...</option>';
    W.GROUPS.forEach(function (g) {
      h += '<optgroup label="' + esc(g) + '">' + W.ACCTS.filter(function (a) { return a.grp === g; })
        .map(function (a) { return '<option value="' + esc(a.n) + '"' + (a.n === sel ? ' selected' : '') + '>' + esc(a.n) + '</option>'; }).join('') + '</optgroup>';
    });
    return h;
  }
  function partyOptions(acct, sel) {
    const sub = acct && A[acct] && A[acct].sub;
    return '<option value="">' + (sub ? sub + '...' : 'Vendor / customer...') + '</option>' +
      W.PARTIES.map(function (p) { return '<option' + (p === sel ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('');
  }

  function rowHtml(r, i, locked, mark) {
    const sub = r.a && A[r.a] && A[r.a].sub;
    const cv = W.parseAmt(r.c), dv = W.parseAmt(r.d);
    const cls = ['jrow'];
    if (sub) cls.push('hasparty');
    if (cv > 0 && !(dv > 0)) cls.push('iscr');
    if (mark && mark.ok === true) cls.push('ok');
    if (mark && mark.ok === false) cls.push('bad');
    const dis = locked ? ' disabled' : '';
    return '<div class="' + cls.join(' ') + '" data-row="' + i + '"><div class="jgrid">' +
      '<select class="acct" data-f="a" aria-label="Account, line ' + (i + 1) + '"' + dis + '>' + accountOptions(r.a) + '</select>' +
      '<select class="party" data-f="p" aria-label="Vendor or customer, line ' + (i + 1) + '"' + dis + '>' + partyOptions(r.a, r.p) + '</select>' +
      '<label class="amt"><span>Debit</span><input class="dr" data-f="d" inputmode="decimal" placeholder="Debit" aria-label="Debit amount, line ' + (i + 1) + '" value="' + esc(r.d) + '"' + dis + '></label>' +
      '<label class="amt"><span>Credit</span><input class="cr" data-f="c" inputmode="decimal" placeholder="Credit" aria-label="Credit amount, line ' + (i + 1) + '" value="' + esc(r.c) + '"' + dis + '></label>' +
      '<button type="button" class="rm" data-rm="' + i + '" title="Remove line" aria-label="Remove line ' + (i + 1) + '"' + dis + '>&times;</button>' +
      '<div class="rmsg' + (mark && mark.msg ? ' bad' : '') + '"' + (mark && mark.msg ? '' : ' hidden') + '>' + esc(mark && mark.msg ? mark.msg : '') + '</div>' +
      '</div></div>';
  }

  function totalsHtml() {
    let d = 0, c = 0;
    S.cur.rows.forEach(function (r) { const x = W.parseAmt(r.d), y = W.parseAmt(r.c); if (!isNaN(x)) d += x; if (!isNaN(y)) c += y; });
    d = r2(d); c = r2(c);
    const ok = d === c && d > 0;
    return 'Total debits: ' + money(d) + ' &nbsp;|&nbsp; Total credits: ' + money(c) + ' &nbsp; <span class="' + (ok ? 'bal' : 'unbal') + '">' + (ok ? '✓ Balanced' : (d || c ? 'Not balanced' : '')) + '</span>';
  }

  function hintsHtml() {
    const e = E[S.idx];
    if (!S.cur.hints) return '';
    let h = '';
    for (let i = 0; i < S.cur.hints; i++) h += '<div style="margin-bottom:6px"><b>Hint ' + (i + 1) + ':</b> ' + esc(e.hints[i]) + '</div>';
    return '<div class="fb hint" style="margin-top:12px">' + h + '<div style="font-size:.82rem;color:var(--amber)">Each hint used lowers this entry’s points by 0.1.</div></div>';
  }

  function feedbackHtml() {
    const cur = S.cur, e = E[S.idx];
    const nextLabel = S.idx === N - 1 ? 'Finish and see my results' : 'Next entry →';
    if (cur.status === 'correct') {
      const r = S.results[S.idx];
      const pts = r.credit === 1 ? 'Full credit: 1 point.'
        : 'You earned ' + r.credit.toFixed(2).replace(/0$/, '') + ' of 1 point (' +
          (r.wrong ? r.wrong + ' wrong attempt' + (r.wrong > 1 ? 's' : '') : '') + (r.wrong && r.hints ? ' and ' : '') +
          (r.hints ? r.hints + ' hint' + (r.hints > 1 ? 's' : '') : '') + ' used).';
      return '<div class="fb ok"><b class="t">✓ Correct! Entry ' + e.id + ' is posted to the ledgers.</b>' + pts + '<br><br><b>Why:</b> ' + esc(e.why) +
        '<br><br><i>Check the T-Accounts tab and the Live Income Statement to see what just changed.</i></div>' +
        '<div class="actions"><button type="button" class="btn" id="nextBtn">' + nextLabel + '</button></div>';
    }
    if (cur.status === 'revealed') {
      return '<div class="fb hint"><b class="t">Here is the correct entry (0 points for this one).</b>' + esc(e.why) + '</div>' +
        '<div class="actions"><button type="button" class="btn" id="nextBtn">' + nextLabel + '</button></div>';
    }
    if (cur.fb) {
      return '<div class="fb bad"><b class="t">Not quite yet.</b><ul>' + cur.fb.msgs.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') +
        '</ul><div style="margin-top:6px;font-size:.88rem;color:var(--mute)">Fix your entry and check again. Each wrong attempt lowers the points for this entry.</div></div>';
    }
    return '';
  }

  function renderEntry() {
    if (S.done) { $('entryArea').innerHTML = ''; return; }
    const e = E[S.idx], cur = S.cur;
    const locked = cur.status !== 'open';
    const marks = cur.fb ? cur.rows.map(function (_, i) { return { ok: cur.fb.rowOk[i], msg: cur.fb.rowMsg[i] }; })
      : locked ? cur.rows.map(function () { return { ok: cur.status === 'correct' ? true : null }; }) : [];
    $('entryArea').innerHTML =
      '<div class="txhead"><h2>Journal entry ' + e.id + '</h2><span class="tno">Transaction ' + (S.idx + 1) + ' of ' + N + '</span></div>' +
      '<div class="txbox"><span class="date">' + e.date + '</span><div class="text">' + esc(e.text) + '</div></div>' +
      '<div class="jgrid head"><div>Account</div><div>Vendor / customer</div><div style="text-align:right">Debit</div><div style="text-align:right">Credit</div><div></div></div>' +
      '<div id="rowsHost">' + cur.rows.map(function (r, i) { return rowHtml(r, i, locked, marks[i]); }).join('') + '</div>' +
      '<div class="actions"><button type="button" class="btn sec" id="addLine"' + (locked ? ' disabled' : '') + '>+ Add a line</button></div>' +
      '<div class="totals" id="totLine">' + totalsHtml() + '</div>' +
      '<div class="actions">' +
        '<button type="button" class="btn" id="checkBtn"' + (locked ? ' disabled' : '') + '>Check my entry</button>' +
        '<button type="button" class="btn warn" id="hintBtn"' + (locked || cur.hints >= 3 ? ' disabled' : '') + '>' + (cur.hints >= 3 ? 'No more hints' : 'Hint (' + (cur.hints + 1) + ' of 3)') + '</button>' +
        (cur.wrong >= 2 && !locked ? '<button type="button" class="btn sec" id="showBtn">Show me the answer (0 points)</button>' : '') +
      '</div>' +
      '<div id="hintBox">' + hintsHtml() + '</div>' +
      '<div id="fbBox">' + feedbackHtml() + '</div>';

    const host = $('rowsHost');
    host.addEventListener('input', onRowEdit);
    host.addEventListener('change', onRowEdit);
    host.addEventListener('click', function (ev) {
      const b = ev.target.closest('[data-rm]');
      if (!b || locked || S.cur.rows.length <= 2) return;
      S.cur.rows.splice(Number(b.dataset.rm), 1);
      S.cur.fb = null;
      save();
      renderEntry();
    });
    if (!locked) {
      $('addLine').onclick = function () { S.cur.rows.push({ a: '', p: '', d: '', c: '' }); S.cur.fb = null; save(); renderEntry(); };
      $('checkBtn').onclick = onCheck;
      if (cur.hints < 3) $('hintBtn').onclick = onHint;
      if ($('showBtn')) $('showBtn').onclick = onShow;
    }
    if ($('nextBtn')) $('nextBtn').onclick = advance;
  }

  function onRowEdit(ev) {
    const el = ev.target, w = el.closest('.jrow');
    if (!w || !el.dataset.f || S.cur.status !== 'open') return;
    const i = Number(w.dataset.row), row = S.cur.rows[i];
    row[el.dataset.f] = el.value;
    if (el.dataset.f === 'a') {
      const sub = A[row.a] && A[row.a].sub;
      if (!sub) row.p = '';
      w.classList.toggle('hasparty', !!sub);
      w.querySelector('.party').innerHTML = partyOptions(row.a, row.p);
    }
    const dv = W.parseAmt(row.d), cv = W.parseAmt(row.c);
    w.classList.toggle('iscr', cv > 0 && !(dv > 0));
    // Marks from the last check no longer apply once the student edits a line.
    if (S.cur.fb) {
      S.cur.fb = null;
      document.querySelectorAll('#rowsHost .jrow').forEach(function (x) {
        x.classList.remove('ok', 'bad');
        const m = x.querySelector('.rmsg'); m.hidden = true; m.textContent = '';
      });
      $('fbBox').innerHTML = '';
    }
    $('totLine').innerHTML = totalsHtml();
    save();
  }

  function onCheck() {
    if (S.cur.status !== 'open') return;
    const res = W.evaluate(S.idx, S.cur.rows);
    if (res.ok) {
      const credit = W.creditFor(S.cur.wrong, S.cur.hints);
      S.results[S.idx] = { credit: credit, wrong: S.cur.wrong, hints: S.cur.hints, revealed: false };
      S.cur.status = 'correct';
      S.cur.fb = null;
      S.newEntry = S.idx;
      save();
      refreshAll();
      $('fbBox').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    if (res.counted) S.cur.wrong++;
    S.cur.fb = { msgs: res.msgs, rowOk: res.rowOk, rowMsg: res.rowMsg };
    save();
    renderEntry();
    renderHeader();
    $('fbBox').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function onHint() {
    if (S.cur.status !== 'open' || S.cur.hints >= 3) return;
    S.cur.hints++;
    save();
    renderEntry();
    $('hintBox').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function onShow() {
    if (S.cur.status !== 'open') return;
    const e = E[S.idx];
    S.cur.rows = e.lines.map(function (l) { return { a: l.a, p: l.p || '', d: l.dr ? String(l.dr) : '', c: l.cr ? String(l.cr) : '' }; });
    S.results[S.idx] = { credit: 0, wrong: S.cur.wrong, hints: S.cur.hints, revealed: true };
    S.cur.status = 'revealed';
    S.cur.fb = null;
    S.newEntry = S.idx;
    save();
    refreshAll();
  }

  function advance() {
    S.idx++;
    S.cur = freshCur();
    if (S.idx >= N) { S.done = true; S.idx = N; S.finishedAt = new Date().toISOString(); }
    save();
    refreshAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- Posted journal ----------

  function renderPosted() {
    if (!S.results.some(Boolean)) {
      $('postedJournal').innerHTML = '<div class="empty">Entries you get right are posted here, exactly as they would appear in a general journal.</div>';
      return;
    }
    let h = '<table class="jtab"><thead><tr><th style="width:80px">Date</th><th>Account</th><th style="width:50px">PR</th><th class="r" style="width:100px">Debit</th><th class="r" style="width:100px">Credit</th></tr></thead><tbody>';
    E.forEach(function (e, i) {
      if (!S.results[i]) return;
      const isNew = i === S.newEntry;
      const ordered = e.lines.filter(function (l) { return l.dr; }).concat(e.lines.filter(function (l) { return l.cr; }));
      ordered.forEach(function (l, j) {
        h += '<tr class="' + (isNew ? 'newrow' : '') + '"><td>' + (j === 0 ? e.date : '') + '</td><td class="' + (l.cr ? 'cr' : '') + '">' + esc(l.a) +
          (l.p ? ' <span style="color:var(--mute)">(' + esc(l.p) + ')</span>' : '') + '</td><td>✓</td><td class="r">' + (l.dr ? num(l.dr) : '') + '</td><td class="r">' + (l.cr ? num(l.cr) : '') + '</td></tr>';
      });
      h += '<tr class="memo"><td></td><td colspan="4">(' + esc(e.text) + ')' + (S.results[i].revealed ? ' &middot; answer shown' : '') + '</td></tr>';
    });
    $('postedJournal').innerHTML = h + '</tbody></table>';
  }

  // ---------- Results and certificate ----------

  function renderResults() {
    const host = $('resultsArea');
    if (!S.done) { host.innerHTML = ''; return; }
    const si = W.scoreInfo(S.results);
    const pass = si.pctAll >= W.PASS;
    const rows = E.map(function (e, i) {
      const r = S.results[i];
      return '<tr><td>' + e.id + '</td><td>' + esc(e.date) + '</td><td>' + esc(e.tag) + '</td><td>' + r.credit.toFixed(2) + ' / 1</td><td>' +
        (r.revealed ? 'Answer shown' : (r.wrong || r.hints ? r.wrong + ' wrong, ' + r.hints + ' hint(s)' : 'First try')) + '</td></tr>';
    }).join('');
    const doneDate = new Date(S.finishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const certId = W.certificateId(S.name, S.finishedAt, si.pctAll);
    host.innerHTML =
      '<div class="results"><h2>Workshop complete</h2>' +
      '<div class="bigscore ' + (pass ? 'pass' : 'fail') + '">' + si.pctAll + '%</div>' +
      '<div>' + si.sum.toFixed(2) + ' of ' + N + ' points &middot; passing score is ' + W.PASS + '%</div>' +
      (pass
        ? '<p style="color:var(--ok);font-weight:600">Congratulations, ' + esc(S.name) + '! You earned your Certificate of Completion.</p>' +
          '<div class="actions"><button type="button" class="btn" id="pdfBtn">Download certificate (PDF)</button><button type="button" class="btn sec" id="redoBtn">Start over</button></div>' +
          '<p class="savehint">Upload the PDF to Canvas. Page 1 is your certificate and income statement. Page 2 lists your points for each entry.</p>'
        : '<p style="color:var(--bad);font-weight:600">You need ' + W.PASS + '% or higher for the certificate. Review the entries below where you lost points, then try again. The T-accounts and income statement tabs are still available for review.</p>' +
          '<div class="actions"><button type="button" class="btn" id="redoBtn">Try again</button></div>') +
      '<table class="rs"><thead><tr><th>Entry</th><th>Date</th><th>Type</th><th>Points</th><th>Notes</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      (pass
        ? '<div id="cert"><div class="org">D’Youville University &middot; Business Department</div><h2>Certificate of Completion</h2>' +
          '<p>This certifies that</p><div class="nm">' + esc(S.name) + '</div><p>has successfully completed the</p>' +
          '<p style="font-size:1.25rem;font-weight:700;color:var(--navy)">Merchandising General Ledger Workshop</p>' +
          '<p>Journalizing merchandising transactions under the perpetual inventory system, posting to T-accounts and subsidiary ledgers, and preparing a multi-step income statement.</p>' +
          '<p class="score">Final score: ' + si.pctAll + '%</p>' +
          '<div class="cert-is">' + isHTML('compact', false) + '</div>' +
          '<div class="sig"><div>Date: ' + doneDate + '</div><div>Prof. Elf, Instructor</div></div>' +
          '<div class="certid">Certificate ID ' + certId + '</div></div>'
        : '');
    if ($('pdfBtn')) $('pdfBtn').onclick = function () {
      try { window.WorkshopReport.download(S, si, certId, doneDate); }
      catch (err) { alertBox('The PDF could not be created in this browser. Try Chrome, Edge, Safari or Firefox.'); }
    };
    $('redoBtn').onclick = function () { restart(false); };
  }

  function alertBox(msg) {
    const fb = document.createElement('div');
    fb.className = 'fb bad';
    fb.textContent = msg;
    $('resultsArea').prepend(fb);
  }

  function restart(askName) {
    const name = S.name;
    S = freshState(name);
    isPrev = null;
    if (askName) { clearSaved(); S = null; showNameModal(); return; }
    save();
    refreshAll();
    switchTab('journal');
    window.scrollTo({ top: 0 });
  }

  // ---------- T-accounts ----------

  function tHTML(title, rows, opts) {
    opts = opts || {};
    const L = rows.filter(function (r) { return r.dr; }), R = rows.filter(function (r) { return r.cr; });
    const td = r2(L.reduce(function (s, r) { return s + r.dr; }, 0)), tc = r2(R.reduce(function (s, r) { return s + r.cr; }, 0));
    const net = r2(td - tc);
    const line = function (r, v) {
      return '<div class="tl ' + (r.e === S.newEntry && r.e >= 0 ? 'new' : '') + '"><span class="lab">' + esc(r.d) + ' · ' + esc(r.tag) + '</span><span>' + num(v) + '</span></div>';
    };
    const balTxt = net === 0 ? 'Balance: $0' : 'Balance: ' + money(net) + ' ' + (net > 0 ? 'Dr' : 'Cr');
    return '<div class="ta ' + (opts.focus ? 'focus' : '') + '">' +
      '<div class="tt">' + (opts.focus ? '<span class="badge">Focus account</span>' : '') + esc(title) + (opts.type ? '<span class="typ">' + esc(opts.type) + '</span>' : '') + '</div>' +
      '<div class="tbody"><div class="tcol l"><div class="h">Debit</div>' + L.map(function (r) { return line(r, r.dr); }).join('') + '</div>' +
      '<div class="tcol r"><div class="h">Credit</div>' + R.map(function (r) { return line(r, r.cr); }).join('') + '</div></div>' +
      '<div class="tbody" style="min-height:0"><div class="tcol l" style="padding-top:0"><div class="ttot">' + num(td) + '</div></div><div class="tcol r" style="padding-top:0"><div class="ttot">' + num(tc) + '</div></div></div>' +
      '<div class="tbal">' + balTxt + '</div>' + (opts.note ? '<div class="tnote">' + opts.note + '</div>' : '') + '</div>';
  }

  function renderTAccounts() {
    const L = ledger();
    const order = ['Merchandise inventory', 'Cost of goods sold', 'Accounts payable', 'Cash', 'Accounts receivable', 'Owner’s capital',
      'Sales revenue', 'Sales returns & allowances', 'Sales discounts', 'Salaries expense', 'Rent expense', 'Delivery expense', 'Utilities expense', 'Interest expense'];
    const has = order.filter(function (n) { return (L[n] || []).length; });
    let h = '<div class="tgrid">';
    has.forEach(function (n) {
      const a = A[n];
      const note = n === 'Merchandise inventory' && S.results[5] && !S.results[6] ? 'All purchase activity is posted. This is the cost of goods on hand before any sales.' : '';
      h += tHTML(n, L[n], { focus: a.focus, type: a.type, note: note });
      if (a.sub) {
        const parties = W.PARTIES.filter(function (p) { return L[n].some(function (x) { return x.p === p; }); });
        const ctrl = W.bal(L, n);
        const subSum = r2(parties.reduce(function (s, p) { return s + W.bal(L, n, p); }, 0));
        const okc = ctrl === subSum;
        h += '<div class="subbox"><h4>' + esc(n) + ' subsidiary ledger by ' + a.sub.toLowerCase() + '</h4><div class="subgrid">' +
          parties.map(function (p) { return tHTML(p, L[n].filter(function (x) { return x.p === p; }), { type: n + ' – ' + a.sub.toLowerCase() }); }).join('') +
          '</div><div class="recon ' + (okc ? 'ok' : 'bad') + '">' + (okc ? '✓ ' : '') + 'Control account balance ' + money(ctrl) + ' = sum of ' + a.sub.toLowerCase() + ' balances ' + money(subSum) + '</div></div>';
      }
    });
    h += '</div>';
    let D = 0, C = 0;
    Object.keys(L).forEach(function (n) { const t = W.totals(L, n); D += t.dr; C += t.cr; });
    D = r2(D); C = r2(C);
    h += '<div class="tcheck">' + (D === C ? '✓ ' : '') + 'Total debits in all ledgers: ' + money(D) + ' &nbsp;|&nbsp; Total credits: ' + money(C) + '</div>';
    if (!S.results.some(Boolean)) h = '<div class="empty" style="margin:14px 0">Only the opening balances are posted so far. Complete the first journal entry and the merchandising accounts will appear.</div>' + h;
    $('taccArea').innerHTML = h;
  }

  // ---------- Income statement ----------

  function signed(v, neg) {
    if (v === 0) return '—';
    return neg || v < 0 ? '(' + num(v) + ')' : num(v);
  }

  function isHTML(cls, flash) {
    const v = W.isValues(ledger());
    const row = function (key, label, val, opt) {
      opt = opt || {};
      const changed = flash && isPrev && isPrev[key] !== undefined && isPrev[key] !== val ? ' flash' : '';
      return '<tr class="' + (opt.cls || '') + (val === 0 && !opt.always ? ' zero' : '') + changed + '"><td>' + label + '</td><td class="n">' + (opt.dollar && val !== 0 ? '$' : '') + signed(val, opt.neg) + '</td></tr>';
    };
    const pct = function (x) { return x === null ? '—' : x + '%'; };
    return '<div class="iscard card ' + cls + '">' +
      '<h3>Bright Mart' + (flash ? ' <span class="livetag">LIVE</span>' : '') + '</h3>' +
      '<div class="cap"><b>Multi-Step Income Statement</b><br>' + W.PERIOD + '</div>' +
      '<table class="is"><tbody>' +
      '<tr class="hd"><td colspan="2">Sales</td></tr>' +
      row('rev', 'Sales revenue', v.rev, { cls: 'ind', dollar: true }) +
      row('ret', 'Less: Sales returns &amp; allowances', v.ret, { cls: 'ind', neg: true }) +
      row('dis', 'Less: Sales discounts', v.dis, { cls: 'ind', neg: true }) +
      row('net', 'Net sales', v.net, { cls: 'sub', always: true, dollar: true }) +
      '<tr class="hd"><td colspan="2">Cost of goods sold</td></tr>' +
      row('cogs', 'Cost of goods sold', v.cogs, { cls: 'ind', neg: true }) +
      row('gp', 'Gross profit', v.gp, { cls: 'sub', always: true, dollar: true }) +
      '<tr class="pct"><td style="padding-left:28px">Gross profit margin (gross profit ÷ net sales)</td><td class="n">' + pct(v.gm) + '</td></tr>' +
      '<tr class="hd"><td colspan="2">Operating expenses</td></tr>' +
      row('sal', 'Salaries expense', v.sal, { cls: 'ind' }) +
      row('rent', 'Rent expense', v.rent, { cls: 'ind' }) +
      row('del', 'Delivery expense', v.del, { cls: 'ind' }) +
      (v.utl ? row('utl', 'Utilities expense', v.utl, { cls: 'ind' }) : '') +
      row('opx', 'Total operating expenses', v.opx, { cls: 'sub', always: true, neg: true }) +
      row('ops', 'Income from operations', v.ops, { cls: 'sub', always: true, dollar: true }) +
      '<tr class="hd"><td colspan="2">Other expenses</td></tr>' +
      row('int', 'Interest expense', v.int, { cls: 'ind', neg: true }) +
      row('ni', v.ni < 0 ? 'Net loss' : 'Net income', v.ni, { cls: 'grand', always: true, dollar: true }) +
      '<tr class="pct"><td style="padding-left:28px">Net profit margin (net income ÷ net sales)</td><td class="n">' + pct(v.nm) + '</td></tr>' +
      '</tbody></table></div>';
  }

  function renderIS() {
    $('isSide').innerHTML = isHTML('compact', true);
    $('isBig').innerHTML = '<h2>Live Multi-Step Income Statement</h2><p class="lead" style="margin-bottom:12px">This statement rebuilds itself after every journal entry you post. Lines that just changed flash yellow. Grey dashes mean nothing has been posted to that line yet.</p>' + isHTML('big', true);
    isPrev = W.isValues(ledger());
  }

  // ---------- Tabs, refresh and start ----------

  function switchTab(t) {
    tab = t;
    ['journal', 'tacc', 'is'].forEach(function (k) {
      $('screen-' + k).hidden = k !== t;
      $('tab-' + k).classList.toggle('active', k === t);
    });
    document.body.classList.toggle('tab-is', t === 'is');
  }
  document.querySelectorAll('nav button').forEach(function (b) { b.addEventListener('click', function () { switchTab(b.dataset.tab); }); });

  function refreshAll() {
    renderHeader();
    renderPosted();
    renderTAccounts();
    renderIS();
    renderResults();
    renderEntry();
    const r = document.querySelector('.restart');
    if (!r) {
      const div = document.createElement('div');
      div.className = 'restart';
      div.innerHTML = '<button type="button" class="linkbtn" id="startOver">Start over with a different name</button>';
      $('screen-journal').appendChild(div);
      div.querySelector('button').onclick = function () {
        if (window.confirm && !window.confirm('Start over? This clears all of your entries and your score.')) return;
        restart(true);
      };
    }
  }

  function showNameModal() {
    $('nameModal').hidden = false;
    $('nameIn').value = '';
    setTimeout(function () { $('nameIn').focus(); }, 50);
  }

  $('nameForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    const v = $('nameIn').value.replace(/\s+/g, ' ').trim();
    if (v.length < 3 || v.indexOf(' ') < 0) { $('nameErr').hidden = false; return; }
    $('nameErr').hidden = true;
    S = freshState(v);
    save();
    $('nameModal').hidden = true;
    refreshAll();
  });

  renderIntro();
  if (S) { refreshAll(); switchTab('journal'); }
  else { S = freshState(''); refreshAll(); S = null; showNameModal(); }
})();
