/* Cobblestone November Ledger: guided walkthrough and practice mode. Progress is saved in the browser. */
(function () {
  'use strict';

  const C = window.CobbleEngine;
  const T = C.T, N = C.N, A = C.A;
  const STORE_KEY = 'acc211-cobblestone-v1';
  const $ = function (id) { return document.getElementById(id); };
  const esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  const num = C.num, money = C.money;

  let S = load() || fresh();
  let lastCheck = null;     // practice: { i, res } for the entry on screen
  let prevFS = null;        // statement values before the latest render, for the flash effect
  let lastPosted = null;    // index of the most recently posted transaction, for highlights

  if (location.hash === '#reset') { S = fresh(); save(); history.replaceState(null, '', location.pathname); }

  function fresh() {
    return { v: 1, mode: 'guided', tab: 'journal', speak: false, g: { t: -1, s: 0 }, p: { idx: 0, rows: {}, noEntry: {}, done: {}, hints: {} } };
  }
  function load() { try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); return s && s.v === 1 ? s : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }

  // ---------- Which transactions are posted in the current mode ----------

  function lastStep(t) { return T[t].think.length + 2; } // 0 read, 1..k think, k+1 entry, k+2 posted
  function postedList() {
    if (S.mode === 'practice') return C.range(N).filter(function (i) { return S.p.done[i]; });
    const g = S.g, out = [];
    for (let i = 0; i < g.t; i++) out.push(i);
    if (g.t >= 0 && g.s === lastStep(g.t)) out.push(g.t);
    return out;
  }
  function ledger() { return C.buildLedger(postedList()); }

  // ---------- Header, progress and tabs ----------

  function renderChrome() {
    document.querySelectorAll('.modes button').forEach(function (b) { b.classList.toggle('on', b.dataset.mode === S.mode); b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode)); });
    $('tab1label').textContent = S.mode === 'guided' ? 'Walkthrough' : 'Journal Entry';
    const posted = postedList();
    let h = '<span class="lbl">' + (S.mode === 'guided' ? 'Walkthrough:' : 'Posted:') + '</span>';
    for (let i = 0; i < N; i++) {
      let cls = 'dot';
      if (posted.indexOf(i) >= 0) cls += ' full';
      const cur = S.mode === 'guided' ? S.g.t === i : S.p.idx === i;
      if (cur) cls += ' cur';
      h += '<button type="button" class="' + cls + '" data-jump="' + i + '" title="' + esc(T[i].date + ': ' + T[i].tag) + '" aria-label="Transaction ' + (i + 1) + '">' + (i + 1) + '</button>';
    }
    h += '<span class="lbl" style="margin-left:10px">' + posted.length + ' of ' + N + ' posted</span>';
    $('progress').innerHTML = h;
    $('progress').querySelectorAll('[data-jump]').forEach(function (b) {
      b.onclick = function () {
        const i = Number(b.dataset.jump);
        if (S.mode === 'guided') { S.g = { t: i, s: 0 }; } else { S.p.idx = i; lastCheck = null; }
        save(); renderAll(); speakStep();
      };
    });
    ['journal', 'tacc', 'fs'].forEach(function (k) {
      $('screen-' + k).hidden = k !== S.tab;
      $('tab-' + k).classList.toggle('active', k === S.tab);
    });
    document.body.classList.toggle('tab-fs', S.tab === 'fs');
  }

  // ---------- Intro (walkthrough position -1) ----------

  function introHtml() {
    const o = C.OPENING.lines;
    return '<div class="intro-grid"><div>' +
      '<div class="bizcard"><b>The business:</b> Cobblestone Sports &amp; Outdoor is a Buffalo-area retailer owned by R. Delgado (a sole proprietorship). ' +
      'It uses the <b>perpetual inventory system</b>, so Merchandise Inventory and Cost of goods sold change with every purchase and sale.</div>' +
      '<p>It is the start of November 2026, and the books already carry the balances below from October. The job: journalize each November transaction ' +
      'and watch the T-accounts and the financial statements change.</p>' +
      '<details class="ref"><summary>Quick reference: perpetual system rules</summary><ul>' +
      '<li><b>Buy goods</b>: Debit Merchandise Inventory. <b>Return goods or receive an allowance</b>: Credit Merchandise Inventory.</li>' +
      '<li><b>FOB shipping point</b>: the buyer pays freight and adds it to Merchandise Inventory. <b>FOB destination</b>: the seller pays; the buyer records nothing.</li>' +
      '<li><b>Purchase discount</b>: Credit Merchandise Inventory. <b>Sales discount</b>: Debit Sales discounts (contra-revenue).</li>' +
      '<li><b>Every sale</b> is one entry with two parts: revenue at selling price, and Cost of goods sold / Merchandise Inventory at cost.</li>' +
      '<li><b>Sales returns</b> reverse both parts. Use the vendor or customer account, for example <i>Accounts payable (Ridgeline Wholesale)</i>.</li>' +
      '<li>If a transaction does not change Cobblestone&rsquo;s accounts, choose <b>No entry required</b>.</li></ul></details>' +
      '<div class="choice">' +
      '<div class="card"><h3>Guided walkthrough</h3><p>Each transaction step by step: read it, analyze it, see the entry, then watch it post. Good for class or for review.</p>' +
      '<button type="button" class="btn" id="goGuided">Start the walkthrough →</button></div>' +
      '<div class="card"><h3>Practice</h3><p>Journalize all 15 transactions yourself. Check your entry as often as you like, with free hints. No score, no penalty.</p>' +
      '<button type="button" class="btn sec" id="goPractice">Practice on my own</button></div>' +
      '</div></div><div>' +
      '<table class="opening"><thead><tr><th colspan="3">Opening balances, November 1, 2026 (given)</th></tr><tr><th>Account</th><th class="n">Debit</th><th class="n">Credit</th></tr></thead><tbody>' +
      o.map(function (l) { return '<tr><td>' + esc(l.a) + '</td><td class="n">' + (l.dr ? num(l.dr) : '') + '</td><td class="n">' + (l.cr ? num(l.cr) : '') + '</td></tr>'; }).join('') +
      '</tbody><tfoot><tr><td>Totals</td><td class="n">29,000</td><td class="n">29,000</td></tr></tfoot></table>' +
      '</div></div>';
  }

  // ---------- Guided walkthrough ----------

  function entryTable(t, animate) {
    const rv = animate ? ' reveal' : '';
    if (t.noEntry) return '<div class="noentry' + rv + '">No entry required. None of Cobblestone’s accounts change.</div>';
    const ordered = t.lines.filter(function (l) { return l.dr; }).concat(t.lines.filter(function (l) { return l.cr; }));
    return '<table class="jtab' + rv + '"><thead><tr><th style="width:80px">Date</th><th>Account</th><th class="r" style="width:100px">Debit</th><th class="r" style="width:100px">Credit</th></tr></thead><tbody>' +
      ordered.map(function (l, j) {
        return '<tr><td>' + (j === 0 ? t.date : '') + '</td><td class="' + (l.cr ? 'cr' : '') + '">' + esc(l.a) + '</td><td class="r">' + (l.dr ? num(l.dr) : '') + '</td><td class="r">' + (l.cr ? num(l.cr) : '') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function effectHtml(i) {
    const e = C.effects(i);
    const fmtChange = function (b, a) { const d = C.r2(a - b); return '<span class="' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '+' : '−') + num(d) + '</span>'; };
    if (!e.accounts.length) return '<p class="reveal">Nothing changes in the ledger or on the statements.</p>';
    return '<table class="effect reveal"><thead><tr><th>Account</th><th class="n">Before</th><th class="n">Change</th><th class="n">After</th></tr></thead><tbody>' +
      e.accounts.map(function (x) { return '<tr><td>' + esc(x.n) + '</td><td class="n">' + num(x.before) + '</td><td class="n">' + fmtChange(x.before, x.after) + '</td><td class="n">' + num(x.after) + '</td></tr>'; }).join('') +
      '<tr><td><b>Net income to date</b></td><td class="n">' + money(e.ni[0]) + '</td><td class="n">' + (e.ni[0] === e.ni[1] ? '—' : fmtChange(e.ni[0], e.ni[1])) + '</td><td class="n"><b>' + money(e.ni[1]) + '</b></td></tr>' +
      '<tr><td><b>Total assets</b></td><td class="n">' + money(e.assets[0]) + '</td><td class="n">' + (e.assets[0] === e.assets[1] ? '—' : fmtChange(e.assets[0], e.assets[1])) + '</td><td class="n"><b>' + money(e.assets[1]) + '</b></td></tr>' +
      '</tbody></table>';
  }

  function renderGuided() {
    const g = S.g;
    if (g.t < 0) { $('workArea').innerHTML = introHtml(); wireIntro(); return; }
    const t = T[g.t], k = t.think.length, last = lastStep(g.t);
    const stage = g.s === 0 ? 0 : g.s <= k ? 1 : g.s === k + 1 ? 2 : 3;
    const labels = ['Read', 'Analyze', 'Journalize', 'Post'];
    let h = '<div class="txhead"><h2>Transaction ' + (g.t + 1) + ' of ' + N + '</h2><span class="tno">' + esc(t.tag) + '</span></div>' +
      '<div class="steps-bar">' + labels.map(function (l, i) { return '<span class="' + (i === stage ? 'on' : i < stage ? 'done' : '') + '">' + (i + 1) + '. ' + l + '</span>'; }).join('') + '</div>' +
      '<div class="txbox"><span class="date">' + t.date + ', 2026</span><div class="text">' + esc(t.text) + '</div></div>';
    if (g.s >= 1) {
      h += '<h3 style="margin:6px 0 8px">Analyze</h3><ul class="think">' +
        t.think.slice(0, Math.min(g.s, k)).map(function (q, j) { return '<li class="' + (j === g.s - 1 ? 'reveal' : '') + '"><b>' + esc(q.q) + '</b>' + esc(q.a) + '</li>'; }).join('') + '</ul>';
    }
    if (g.s >= k + 1) h += '<h3 style="margin:6px 0 8px">Journal entry</h3>' + entryTable(t, g.s === k + 1);
    if (g.s === last) {
      h += '<div class="fb ok reveal" style="margin-top:14px"><b class="t">✓ Posted to the ledger.</b>' + esc(t.why) + '</div>' +
        '<h3 style="margin:14px 0 4px">What changed</h3>' + effectHtml(g.t) +
        '<p class="kbd" style="margin-top:8px">See the full T-accounts and statements in tabs 2 and 3.</p>';
    }
    const atEnd = g.t === N - 1 && g.s === last;
    h += '<div class="guide-nav">' +
      '<button type="button" class="btn sec" id="gBack">← Back</button>' +
      '<button type="button" class="btn" id="gNext"' + (atEnd ? ' disabled' : '') + '>' + nextLabel() + '</button>' +
      (g.s < last ? '<button type="button" class="linkbtn" id="gAll">Show all steps</button>' : '') +
      '<span class="spacer"></span>' +
      ('speechSynthesis' in window ? '<button type="button" class="btn sec toggle" id="gSpeak" aria-pressed="' + S.speak + '">🔊 Read aloud</button>' : '') +
      '<span class="kbd">Keys: ← →</span></div>';
    if (atEnd) h += '<div class="done-banner" style="margin-top:14px"><h3>Walkthrough complete</h3>All 15 transactions are posted. Net income for November is <b>$1,830</b>, and the balance sheet balances at <b>$28,330</b>. Try the <b>Practice</b> mode next.</div>';
    $('workArea').innerHTML = h;
    $('gBack').onclick = guidedBack;
    $('gNext').onclick = guidedNext;
    if ($('gAll')) $('gAll').onclick = function () { S.g.s = last; save(); renderAll(); speakStep(); };
    if ($('gSpeak')) $('gSpeak').onclick = function () {
      S.speak = !S.speak; save();
      this.setAttribute('aria-pressed', String(S.speak));
      if (S.speak) speakStep(); else window.speechSynthesis.cancel();
    };
  }

  function nextLabel() {
    const g = S.g;
    if (g.t < 0) return 'Start →';
    const k = T[g.t].think.length;
    if (g.s === 0) return 'Analyze →';
    if (g.s < k) return 'Next question →';
    if (g.s === k) return 'Show the entry →';
    if (g.s === k + 1) return 'Post it →';
    return 'Next transaction →';
  }
  function guidedNext() {
    const g = S.g;
    if (g.t < 0) { S.g = { t: 0, s: 0 }; }
    else if (g.s < lastStep(g.t)) { g.s++; if (g.s === lastStep(g.t)) lastPosted = g.t; }
    else if (g.t < N - 1) { S.g = { t: g.t + 1, s: 0 }; }
    else return;
    save(); renderAll(); speakStep();
  }
  function guidedBack() {
    const g = S.g;
    if (g.t < 0) return;
    if (g.s > 0) g.s--;
    else if (g.t === 0) S.g = { t: -1, s: 0 };
    else S.g = { t: g.t - 1, s: lastStep(g.t - 1) };
    save(); renderAll();
  }

  // Read the newly revealed part of the walkthrough with the browser's built-in voice.
  function speakStep() {
    if (!S.speak || S.mode !== 'guided' || !('speechSynthesis' in window)) return;
    const g = S.g;
    let text;
    if (g.t < 0) text = 'Cobblestone Sports and Outdoor. Opening balances for November first.';
    else {
      const t = T[g.t], k = t.think.length;
      const say = function (s) { return s.replace(/\$/g, '').replace(/−/g, ' minus ').replace(/×/g, ' times ').replace(/2\/10, n\/30/g, 'two ten, net thirty').replace(/n\/30/g, 'net thirty').replace(/FOB/g, 'F O B'); };
      if (g.s === 0) text = t.date + '. ' + t.text;
      else if (g.s <= k) text = t.think[g.s - 1].q + ' ' + t.think[g.s - 1].a;
      else if (g.s === k + 1) text = t.noEntry ? 'No entry required.' : 'The entry. ' + t.lines.map(function (l) { return (l.dr ? 'Debit ' : 'Credit ') + l.a + ', ' + num(l.dr || l.cr) + '.'; }).join(' ');
      else text = 'Posted. ' + t.why;
      text = say(text);
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }

  // ---------- Practice ----------

  function accountOptions(sel) {
    let h = '<option value="">Choose account...</option>';
    C.GROUPS.forEach(function (g) {
      h += '<optgroup label="' + esc(g) + '">' + C.ACCTS.filter(function (a) { return a.grp === g; })
        .map(function (a) { return '<option value="' + esc(a.n) + '"' + (a.n === sel ? ' selected' : '') + '>' + esc(a.n) + '</option>'; }).join('') + '</optgroup>';
    });
    return h;
  }
  function rowsFor(i) {
    if (!S.p.rows[i]) S.p.rows[i] = [{ a: '', d: '', c: '' }, { a: '', d: '', c: '' }];
    return S.p.rows[i];
  }

  function renderPractice() {
    const i = S.p.idx, t = T[i], done = !!S.p.done[i];
    const rows = rowsFor(i), ne = !!S.p.noEntry[i];
    const res = lastCheck && lastCheck.i === i ? lastCheck.res : null;
    const hints = S.p.hints[i] || 0;
    const allDone = C.range(N).every(function (x) { return S.p.done[x]; });
    let h = '';
    if (allDone) {
      h += '<div class="done-banner"><h3>All 15 transactions are posted.</h3>November net income is <b>$1,830</b>, and the balance sheet balances at <b>$28,330</b>. Compare your work with the Financial Statements tab.</div>';
    }
    h += '<p class="lead" style="margin:0 0 6px">Journalize each transaction. Check as often as you like: there is no score. Use the vendor or customer account for payables and receivables.</p>' +
      '<div class="navgrid" aria-label="Transactions">' + T.map(function (x, j) {
        return '<button type="button" class="' + (j === i ? 'cur ' : '') + (S.p.done[j] ? 'done' : '') + '" data-go="' + j + '" aria-label="Transaction ' + (j + 1) + (S.p.done[j] ? ', posted' : '') + '">' + (j + 1) + '</button>';
      }).join('') + '</div>' +
      '<div class="txhead"><h2>Transaction ' + (i + 1) + ' of ' + N + '</h2>' + (done ? '<span class="tno" style="color:var(--ok)">✓ Posted</span>' : '') + '</div>' +
      '<div class="txbox"><span class="date">' + t.date + ', 2026</span><div class="text">' + esc(t.text) + '</div></div>' +
      '<div class="pjgrid head"><div>Account</div><div style="text-align:right">Debit</div><div style="text-align:right">Credit</div><div></div><div></div></div>' +
      '<div id="prows" class="' + (ne ? 'rows-off' : '') + '">' + rows.map(function (r, j) {
        const st = done ? (C.isBlank(r) ? null : { ok: true }) : res ? res.rows[j] : null;
        const iscr = !String(r.d || '').trim() && !!String(r.c || '').trim();
        const dis = done ? ' disabled' : '';
        return '<div class="prow' + (iscr ? ' iscr' : '') + (st ? (st.ok ? ' ok' : ' bad') : '') + '" data-row="' + j + '"><div class="pjgrid">' +
          '<select class="acct" data-f="a" aria-label="Account, line ' + (j + 1) + '"' + dis + '>' + accountOptions(r.a) + '</select>' +
          '<input data-f="d" inputmode="decimal" placeholder="Debit" aria-label="Debit, line ' + (j + 1) + '" value="' + esc(r.d) + '"' + dis + '>' +
          '<input data-f="c" inputmode="decimal" placeholder="Credit" aria-label="Credit, line ' + (j + 1) + '" value="' + esc(r.c) + '"' + dis + '>' +
          '<span>' + (st ? '<span class="mark ' + (st.ok ? 'ok' : 'bad') + '" aria-label="' + (st.ok ? 'Correct' : 'Incorrect') + '">' + (st.ok ? '✓' : '✗') + '</span>' : '') + '</span>' +
          (done ? '<span></span>' : '<button type="button" class="rm" data-rm="' + j + '" aria-label="Remove line ' + (j + 1) + '" title="Remove line">&times;</button>') +
          (st && st.msg ? '<div class="rmsg bad">' + esc(st.msg) + '</div>' : '') +
          '</div></div>';
      }).join('') + '</div>' +
      (done ? '' : '<div class="actions"><button type="button" class="btn sec" id="pAdd"' + (ne ? ' disabled' : '') + '>+ Add a line</button></div>') +
      '<label class="ne-toggle"><input type="checkbox" id="pNe"' + (ne ? ' checked' : '') + (done ? ' disabled' : '') + '> No entry required</label>' +
      (done ? '' : '<div class="actions"><button type="button" class="btn" id="pCheck">Check my entry</button>' +
        '<button type="button" class="btn warn" id="pHint"' + (hints >= t.think.length ? ' disabled' : '') + '>' + (hints >= t.think.length ? 'No more hints' : 'Hint (' + (hints + 1) + ' of ' + t.think.length + ')') + '</button></div>') +
      (hints ? '<div class="fb hint" style="margin-top:12px">' + t.think.slice(0, hints).map(function (q, j) { return '<div style="margin-bottom:6px"><b>Hint ' + (j + 1) + ': ' + esc(q.q) + '</b> ' + esc(q.a) + '</div>'; }).join('') + '<div style="font-size:.82rem">Hints are free.</div></div>' : '') +
      (done ? '<div class="fb ok"><b class="t">✓ Correct! This entry is posted.</b>' + esc(t.why) + '</div>'
        : res ? '<div class="fb bad" role="status"><b class="t">Not quite yet.</b><ul>' + res.msgs.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>' : '') +
      '<div class="guide-nav"><button type="button" class="btn sec" id="pPrev"' + (i === 0 ? ' disabled' : '') + '>← Previous</button>' +
      '<button type="button" class="btn' + (done ? '' : ' sec') + '" id="pNext"' + (i === N - 1 ? ' disabled' : '') + '>Next →</button>' +
      '<span class="spacer"></span><button type="button" class="linkbtn" id="pReset">Clear my practice work</button></div>';
    $('workArea').innerHTML = h;

    $('workArea').querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { goPractice(Number(b.dataset.go)); }; });
    $('pPrev').onclick = function () { goPractice(i - 1); };
    $('pNext').onclick = function () { goPractice(i + 1); };
    $('pReset').onclick = function () {
      if (window.confirm && !window.confirm('Clear all of your practice entries?')) return;
      S.p = fresh().p; lastCheck = null; save(); renderAll();
    };
    if (done) return;
    const host = $('prows');
    host.addEventListener('input', onEdit);
    host.addEventListener('change', onEdit);
    host.addEventListener('click', function (ev) {
      const b = ev.target.closest('[data-rm]');
      if (!b) return;
      const r = rowsFor(i);
      if (r.length > 2) r.splice(Number(b.dataset.rm), 1); else r[Number(b.dataset.rm)] = { a: '', d: '', c: '' };
      lastCheck = null; save(); renderPractice();
    });
    $('pAdd').onclick = function () { rowsFor(i).push({ a: '', d: '', c: '' }); lastCheck = null; save(); renderPractice(); };
    $('pNe').onchange = function () { S.p.noEntry[i] = this.checked; lastCheck = null; save(); renderPractice(); };
    $('pCheck').onclick = function () {
      const r = C.check(i, rowsFor(i), !!S.p.noEntry[i]);
      if (r.ok) {
        S.p.done[i] = true;
        S.p.rows[i] = rowsFor(i).filter(function (x) { return !C.isBlank(x); });
        if (!S.p.rows[i].length) S.p.rows[i] = [{ a: '', d: '', c: '' }];
        lastPosted = i; lastCheck = null;
      } else lastCheck = { i: i, res: r };
      save(); renderAll();
      const fb = $('workArea').querySelector('.fb.ok, .fb.bad');
      if (fb) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    $('pHint').onclick = function () { S.p.hints[i] = Math.min(t.think.length, hints + 1); save(); renderPractice(); };
  }

  function onEdit(ev) {
    const el = ev.target, w = el.closest('.prow');
    if (!w || !el.dataset.f) return;
    const row = rowsFor(S.p.idx)[Number(w.dataset.row)];
    row[el.dataset.f] = el.value;
    w.classList.toggle('iscr', !String(row.d || '').trim() && !!String(row.c || '').trim());
    if (lastCheck) {
      lastCheck = null;
      $('prows').querySelectorAll('.prow').forEach(function (x) { x.classList.remove('ok', 'bad'); });
      $('prows').querySelectorAll('.mark, .rmsg').forEach(function (x) { x.remove(); });
      const fb = $('workArea').querySelector('.fb.bad');
      if (fb) fb.remove();
    }
    save();
  }
  function goPractice(i) {
    if (i < 0 || i >= N) return;
    S.p.idx = i; lastCheck = null; save(); renderAll();
  }

  // ---------- Posted journal ----------

  function renderPosted() {
    const posted = postedList();
    let h = '<table class="jtab"><thead><tr><th style="width:80px">Date</th><th>Account</th><th style="width:44px">PR</th><th class="r" style="width:100px">Debit</th><th class="r" style="width:100px">Credit</th></tr></thead><tbody>';
    [C.OPENING].concat(posted.map(function (i) { return T[i]; })).forEach(function (t) {
      const isNew = t !== C.OPENING && T.indexOf(t) === lastPosted;
      if (t.noEntry) {
        h += '<tr class="' + (isNew ? 'newrow' : '') + '"><td>' + t.date + '</td><td><i>No entry required</i></td><td></td><td></td><td></td></tr>';
      } else {
        const ordered = t.lines.filter(function (l) { return l.dr; }).concat(t.lines.filter(function (l) { return l.cr; }));
        ordered.forEach(function (l, j) {
          h += '<tr class="' + (isNew ? 'newrow' : '') + '"><td>' + (j === 0 ? t.date : '') + '</td><td class="' + (l.cr ? 'cr' : '') + '">' + esc(l.a) + '</td><td>✓</td><td class="r">' + (l.dr ? num(l.dr) : '') + '</td><td class="r">' + (l.cr ? num(l.cr) : '') + '</td></tr>';
        });
      }
      h += '<tr class="memo"><td></td><td colspan="4">(' + esc(t.text) + ')</td></tr>';
    });
    $('postedJournal').innerHTML = h + '</tbody></table>';
  }

  // ---------- T-accounts ----------

  function tHTML(title, rows, opts) {
    opts = opts || {};
    const L = rows.filter(function (r) { return r.dr; }), R = rows.filter(function (r) { return r.cr; });
    const td = C.r2(L.reduce(function (s, r) { return s + r.dr; }, 0)), tc = C.r2(R.reduce(function (s, r) { return s + r.cr; }, 0));
    const net = C.r2(td - tc);
    const line = function (r, v) {
      const lab = esc(r.d) + ' · ' + esc(r.tag) + (opts.showParty && r.party ? ' (' + esc(r.party.split(' ')[0]) + ')' : '');
      return '<div class="tl ' + (r.e >= 0 && r.e === lastPosted ? 'new' : '') + (r.e < 0 ? ' open' : '') + '"><span class="lab">' + lab + '</span><span>' + num(v) + '</span></div>';
    };
    return '<div class="ta ' + (opts.focus ? 'focus' : '') + '">' +
      '<div class="tt">' + (opts.focus ? '<span class="badge">Focus account</span>' : '') + esc(title) + (opts.type ? '<span class="typ">' + esc(opts.type) + '</span>' : '') + '</div>' +
      '<div class="tbody"><div class="tcol l"><div class="h">Debit</div>' + L.map(function (r) { return line(r, r.dr); }).join('') + '</div>' +
      '<div class="tcol r"><div class="h">Credit</div>' + R.map(function (r) { return line(r, r.cr); }).join('') + '</div></div>' +
      '<div class="tbody" style="min-height:0"><div class="tcol l" style="padding-top:0"><div class="ttot">' + num(td) + '</div></div><div class="tcol r" style="padding-top:0"><div class="ttot">' + num(tc) + '</div></div></div>' +
      '<div class="tbal">' + (net === 0 ? 'Balance: $0' : 'Balance: ' + money(Math.abs(net)) + ' ' + (net > 0 ? 'Dr' : 'Cr')) + '</div></div>';
  }

  function renderTAccounts() {
    const L = ledger();
    const order = [C.MI, C.COGS, C.AP, 'Cash', C.AR, C.CAPITAL, 'Sales revenue', 'Sales returns & allowances', 'Sales discounts', 'Rent expense', 'Salaries expense', 'Delivery expense', 'R. Delgado, Drawing'];
    let h = '<div class="tgrid">';
    order.forEach(function (n) {
      const rows = C.rowsFor(L, n);
      if (!rows.length) return;
      const ctrl = C.CONTROLS[n];
      h += tHTML(n, rows, { focus: ctrl ? ctrl.focus : A[n].focus, type: ctrl ? 'Control account' : A[n].type, showParty: !!ctrl });
      if (ctrl) {
        const subs = C.ACCTS.filter(function (a) { return a.ctrl === n && (L[a.n] || []).length; });
        const subSum = C.r2(subs.reduce(function (s, a) { return s + C.bal(L, a.n); }, 0));
        const okc = subSum === C.bal(L, n);
        h += '<div class="subbox"><h4>' + esc(n) + ' subsidiary ledger by ' + ctrl.sub + '</h4><div class="subgrid">' +
          subs.map(function (a) { return tHTML(a.party, L[a.n], { type: n + ' – ' + ctrl.sub }); }).join('') +
          '</div><div class="recon ' + (okc ? 'ok' : 'bad') + '">' + (okc ? '✓ ' : '') + 'Control account balance ' + money(C.bal(L, n)) + ' = sum of ' + ctrl.sub + ' balances ' + money(subSum) + '</div></div>';
      }
    });
    const tt = C.totals(L);
    h += '</div><div class="tcheck">' + (tt.dr === tt.cr ? '✓ ' : '') + 'Total debits in all ledgers: ' + money(tt.dr) + ' &nbsp;|&nbsp; Total credits: ' + money(tt.cr) + '</div>';
    $('taccArea').innerHTML = h;
  }

  // ---------- Financial statements ----------

  function statementsHtml(compact) {
    const L = ledger();
    const is = C.incomeStatement(L), bs = C.balanceSheet(L);
    const vals = {};
    const row = function (key, label, val, o) {
      o = o || {};
      vals[key] = val;
      const flash = prevFS && prevFS[key] !== undefined && prevFS[key] !== val ? ' flash' : '';
      const shown = val === 0 ? (o.always ? (o.dollar ? '$0' : '0') : '—') : (o.neg ? '(' + num(val) + ')' : (o.dollar ? money(val) : (val < 0 ? '(' + num(val) + ')' : num(val))));
      return '<tr class="' + (o.cls || '') + (val === 0 && !o.always ? ' zero' : '') + flash + '"><td>' + label + '</td><td class="n">' + shown + '</td></tr>';
    };
    const cls = compact ? 'compact' : 'big';
    const isH = '<div class="iscard card ' + cls + '"><h3>Cobblestone Sports &amp; Outdoor <span class="livetag">LIVE</span></h3>' +
      '<div class="cap"><b>Multi-Step Income Statement</b><br>For the Month Ended November 30, 2026</div><table class="is"><tbody>' +
      '<tr class="hd"><td colspan="2">Sales</td></tr>' +
      row('sales', 'Sales revenue', is.sales, { cls: 'ind', dollar: true }) +
      row('ret', 'Less: Sales returns &amp; allowances', is.ret, { cls: 'ind', neg: true }) +
      row('dis', 'Less: Sales discounts', is.dis, { cls: 'ind', neg: true }) +
      row('net', 'Net sales', is.net, { cls: 'sub', always: true, dollar: true }) +
      row('cogs', 'Cost of goods sold', is.cogs, { cls: 'ind', neg: true }) +
      row('gp', 'Gross profit', is.gp, { cls: 'sub', always: true, dollar: true }) +
      '<tr class="hd"><td colspan="2">Operating expenses</td></tr>' +
      is.opex.map(function (x) { return row('op-' + x[0], x[0], x[1], { cls: 'ind' }); }).join('') +
      row('opex', 'Total operating expenses', is.opexTotal, { cls: 'sub', always: true, neg: true }) +
      row('ni', is.ni < 0 ? 'Net loss' : 'Net income', is.ni, { cls: 'grand', always: true, dollar: true }) +
      '</tbody></table></div>';
    const ok = bs.assets === bs.le;
    const bsH = '<div class="iscard card ' + cls + '"><h3>Cobblestone Sports &amp; Outdoor <span class="livetag">LIVE</span></h3>' +
      '<div class="cap"><b>Balance Sheet</b><br>November 30, 2026</div><table class="is"><tbody>' +
      '<tr class="hd"><td colspan="2">Assets</td></tr>' +
      row('cash', 'Cash', bs.cash, { cls: 'ind', always: true }) +
      row('ar', 'Accounts receivable', bs.ar, { cls: 'ind' }) +
      row('mi', 'Merchandise Inventory', bs.mi, { cls: 'ind', always: true }) +
      row('ta', 'Total assets', bs.assets, { cls: 'grand', always: true, dollar: true }) +
      '<tr class="hd"><td colspan="2">Liabilities</td></tr>' +
      row('ap', 'Accounts payable', bs.ap, { cls: 'ind' }) +
      row('tl', 'Total liabilities', bs.ap, { cls: 'sub', always: true }) +
      '<tr class="hd"><td colspan="2">Owner’s equity</td></tr>' +
      row('cap0', 'R. Delgado, Capital, Nov 1', bs.capBeg, { cls: 'ind', always: true }) +
      row('bsni', 'Add: Net income', bs.ni, { cls: 'ind' }) +
      (bs.drawing ? row('drw', 'Less: Drawing', bs.drawing, { cls: 'ind', neg: true }) : '') +
      row('cap1', 'R. Delgado, Capital, Nov 30', bs.capEnd, { cls: 'sub', always: true }) +
      row('tle', 'Total liabilities and owner’s equity', bs.le, { cls: 'grand', always: true, dollar: true }) +
      '<tr class="chk' + (ok ? '' : ' bad') + '"><td colspan="2">' + (ok ? '✓ Assets = Liabilities + Owner’s equity' : 'Out of balance') + '</td></tr>' +
      '</tbody></table></div>';
    return { html: isH + bsH, vals: vals };
  }

  function renderStatements() {
    const big = statementsHtml(false), side = statementsHtml(true);
    $('fsBig').innerHTML = big.html;
    $('fsSide').innerHTML = '<div class="side-stack">' + side.html + '</div>';
    prevFS = big.vals;
  }

  // ---------- Wiring ----------

  function wireIntro() {
    $('goGuided').onclick = function () { S.mode = 'guided'; S.g = { t: 0, s: 0 }; save(); renderAll(); speakStep(); };
    $('goPractice').onclick = function () { setMode('practice'); };
  }
  function setMode(m) {
    S.mode = m; lastCheck = null; lastPosted = null; prevFS = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    save(); renderAll();
  }
  document.querySelectorAll('.modes button').forEach(function (b) { b.onclick = function () { setMode(b.dataset.mode); }; });
  document.querySelectorAll('nav button').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.tab; save(); renderChrome(); }; });
  document.addEventListener('keydown', function (ev) {
    if (S.mode !== 'guided' || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName)) return;
    if (ev.key === 'ArrowRight') { ev.preventDefault(); guidedNext(); }
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); guidedBack(); }
  });

  function renderAll() {
    renderChrome();
    if (S.mode === 'guided') renderGuided(); else renderPractice();
    renderPosted();
    renderTAccounts();
    renderStatements();
  }

  renderAll();
})();
