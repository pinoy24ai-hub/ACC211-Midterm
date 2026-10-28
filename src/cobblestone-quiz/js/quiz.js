/* Journal entry quiz (shared by the Cobblestone and Larkin quizzes): one question per transaction, retry until correct, free hints. Progress is saved in the browser. */
(function () {
  'use strict';

  const Q = window.QuizData.Q, OPENING = window.QuizData.OPENING, META = window.QuizData.META, N = Q.length;
  const STORE_KEY = META.storeKey;
  const LETTERS = ['A', 'B'];
  const $ = function (id) { return document.getElementById(id); };
  const esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  const num = function (n) { return n.toLocaleString('en-US'); };
  // Escape text, then make the FOB terms stand out: destination in red, shipping point in blue.
  const hl = function (s) {
    return esc(s).replace(/FOB destination/g, '<strong class="fob-d">FOB destination</strong>')
      .replace(/FOB shipping point/g, '<strong class="fob-s">FOB shipping point</strong>');
  };

  let S = load() || fresh();
  let shakeK = null; // the wrong choice just picked, so only it animates
  let shown = null;  // the question or summary on screen, so the card animates only when it changes
  if (location.hash === '#reset') { S = fresh(); save(); history.replaceState(null, '', location.pathname); }

  // Choice 0 is the correct entry; 1 to 3 are the prepared wrong ones. Each attempt shows the correct entry and
  // one randomly chosen wrong entry, in random order.
  function pair() {
    const wrong = 1 + Math.floor(Math.random() * 3);
    return Math.random() < 0.5 ? [0, wrong] : [wrong, 0];
  }
  function fresh() {
    return { v: 2, cur: 0, order: Q.map(pair), tries: Q.map(function () { return []; }), hints: Q.map(function () { return 0; }), summary: false };
  }
  function load() { try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); return s && s.v === 2 && s.order.length === N ? s : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }

  const solved = function (i) { return S.tries[i].indexOf(0) >= 0; };
  const firstTry = function (i) { return S.tries[i][0] === 0; };

  // ---------- Header stats ----------

  function renderStats() {
    const done = Q.filter(function (_, i) { return solved(i); }).length;
    const ft = Q.filter(function (_, i) { return firstTry(i); }).length;
    // Streak: first-try answers in a row, counting back from the latest solved question in date order.
    let streak = 0;
    for (let i = N - 1; i >= 0; i--) { if (!solved(i)) continue; if (firstTry(i)) streak++; else break; }
    const r = 26, c = 2 * Math.PI * r, frac = done / N;
    $('ring').innerHTML = '<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">' +
      '<circle cx="32" cy="32" r="' + r + '" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="7"/>' +
      '<circle cx="32" cy="32" r="' + r + '" fill="none" stroke="#7fe0d8" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + (c * frac) + ' ' + c + '" transform="rotate(-90 32 32)"/>' +
      '<text x="32" y="37" text-anchor="middle" font-size="15" font-weight="700" fill="#fff" font-family="Georgia,serif">' + done + '/' + N + '</text></svg>';
    $('ring').setAttribute('aria-label', done + ' of ' + N + ' questions answered');
    $('firstTry').textContent = ft;
    $('streak').textContent = streak;

    $('strip').innerHTML = Q.map(function (q, i) {
      const cls = (solved(i) ? (firstTry(i) ? 'first' : 'later') : '') + (i === S.cur && !S.summary ? ' cur' : '');
      return '<button type="button" class="' + cls + '" data-go="' + i + '" title="' + esc(q.date) + '" aria-label="Question ' + (i + 1) + (solved(i) ? ', answered' : '') + '">' + (i + 1) + '</button>';
    }).join('');
    $('strip').querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { go(Number(b.dataset.go)); }; });
  }

  // ---------- Question ----------

  // An entry is a list of lines, null (no entry required) or a list of separate entries shown one under the other.
  function entryHtml(e) {
    if (e === null) return '<span class="noentry">No entry required</span>';
    const parts = Array.isArray(e[0]) ? e : [e];
    return parts.map(function (lines, p) {
      const ordered = lines.filter(function (l) { return l.dr; }).concat(lines.filter(function (l) { return l.cr; }));
      return '<table class="entry' + (p ? ' next' : '') + '">' + (p ? '' : '<tr class="hd"><td>Account</td><td class="n">Debit</td><td class="n">Credit</td></tr>') +
        ordered.map(function (l) {
          return '<tr><td class="' + (l.cr ? 'cr' : '') + '">' + esc(l.a) + '</td><td class="n">' + (l.dr ? num(l.dr) : '') + '</td><td class="n">' + (l.cr ? num(l.cr) : '') + '</td></tr>';
        }).join('') + '</table>';
    }).join('');
  }
  function choiceEntry(q, k) { return k === 0 ? q.correct : q.wrong[k - 1].e; }

  function renderQuestion() {
    const i = S.cur, q = Q[i], tries = S.tries[i], done = solved(i), hints = S.hints[i];
    const lastWrong = !done && tries.length ? tries[tries.length - 1] : null;
    let h = '<article class="qcard' + (shown !== i ? ' enter' : '') + '" aria-labelledby="qask">' +
      '<div class="qmeta"><span class="chip">Question ' + (i + 1) + ' of ' + N + '</span><span class="chip date">' + esc(q.date) + ', ' + META.year + '</span></div>' +
      '<p class="qtext">' + hl(q.text) + '</p>' +
      (q.note ? '<p class="qnote"><b>Note:</b> ' + hl(q.note) + '</p>' : '') +
      '<h2 class="qask" id="qask">Which journal entry correctly records this transaction?</h2>' +
      '<div class="choices">' + S.order[i].map(function (k, pos) {
        const tried = tries.indexOf(k) >= 0;
        const cls = ['choice'];
        if (tried && k !== 0) cls.push('wrong');
        if (done && k === 0) cls.push('right');
        if (done && !tried && k !== 0) cls.push('dim');
        if (k === shakeK) cls.push('shake');
        return '<button type="button" class="' + cls.join(' ') + '" data-k="' + k + '"' + (done || tried ? ' disabled' : '') +
          ' aria-label="Choice ' + LETTERS[pos] + (tried && k !== 0 ? ', incorrect' : '') + (done && k === 0 ? ', correct' : '') + '">' +
          '<span class="letter">' + LETTERS[pos] + '</span>' + entryHtml(choiceEntry(q, k)) +
          (tried && k !== 0 ? '<div class="why-wrong">' + hl(q.wrong[k - 1].why) + '</div>' : '') + '</button>';
      }).join('') + '</div>';

    if (hints) h += '<div class="hintbox">' + q.hints.slice(0, hints).map(function (t, j) { return '<p><b>Hint ' + (j + 1) + ':</b> ' + hl(t) + '</p>'; }).join('') + '</div>';
    if (done) {
      h += '<div class="feedback ok" role="status"><b>' + (firstTry(i) ? 'Correct on the first try!' : 'Correct!') + '</b> ' + hl(q.why) + '</div>';
    } else if (lastWrong !== null) {
      h += '<div class="feedback try" role="status">Not quite. Read why that entry is wrong, then choose the other entry.</div>';
    }
    const allDone = Q.every(function (_, j) { return solved(j); });
    h += '<div class="tools">' +
      '<button type="button" class="btn ghost" id="prev"' + (i === 0 ? ' disabled' : '') + '>← Back</button>' +
      (done ? '' : '<button type="button" class="btn hint" id="hint"' + (hints >= q.hints.length ? ' disabled' : '') + '>' +
        (hints >= q.hints.length ? 'No more hints' : 'Hint' + (q.hints.length > 1 ? ' (' + (hints + 1) + ' of ' + q.hints.length + ')' : '')) + '</button>') +
      '<span class="spacer"></span><span class="keys">Keys: A or B to answer, H for a hint, → next</span>' +
      (i < N - 1 ? '<button type="button" class="btn' + (done ? '' : ' ghost') + '" id="next">Next →</button>'
        : '<button type="button" class="btn" id="finish"' + (allDone ? '' : ' disabled title="Answer every question to see your results"') + '>See my results</button>') +
      '</div></article>';
    $('stage').innerHTML = h;
    shown = i;

    $('stage').querySelectorAll('.choice:not(:disabled)').forEach(function (b) { b.onclick = function () { answer(Number(b.dataset.k)); }; });
    $('prev').onclick = function () { go(i - 1); };
    if ($('next')) $('next').onclick = function () { go(i + 1); };
    if ($('finish')) $('finish').onclick = showSummary;
    if ($('hint')) $('hint').onclick = hint;
  }

  function answer(k) {
    const i = S.cur;
    if (solved(i) || S.tries[i].indexOf(k) >= 0) return;
    S.tries[i].push(k);
    save();
    shakeK = k === 0 ? null : k;
    renderStats();
    renderQuestion();
    shakeK = null;
    const fb = $('stage').querySelector('.feedback');
    if (fb) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function hint() {
    const i = S.cur;
    if (S.hints[i] < Q[i].hints.length) { S.hints[i]++; save(); renderQuestion(); }
  }
  function go(i) {
    if (i < 0 || i >= N) return;
    S.cur = i; S.summary = false; save(); render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- Summary ----------

  function showSummary() { S.summary = true; save(); render(); window.scrollTo({ top: 0 }); }

  function renderSummary() {
    const ft = Q.filter(function (_, i) { return firstTry(i); }).length;
    const missed = Q.map(function (_, i) { return i; }).filter(function (i) { return !firstTry(i); });
    const msg = ft === N ? 'A perfect run. You chose the correct entry for every transaction on the first try.'
      : ft >= 12 ? 'Strong work. Review the questions marked in amber, then try the quiz again.'
      : 'Good practice. Review the questions marked in amber: the explanation on each wrong choice shows the mistake to avoid.';
    const enter = shown !== 'summary' ? ' enter' : '';
    shown = 'summary';
    $('stage').innerHTML = '<article class="qcard summary' + enter + '">' +
      '<div class="big">' + ft + ' / ' + N + '</div><h2>correct on the first try</h2><p>' + msg + '</p>' +
      '<div class="center-tools">' +
      (missed.length ? '<button type="button" class="btn" id="review">Review the ' + missed.length + ' I missed</button>' : '') +
      '<button type="button" class="btn ghost" id="again">Try again (new answer order)</button></div>' +
      '<ul class="reslist">' + Q.map(function (q, i) {
        const extra = S.tries[i].length - 1;
        return '<li><span class="dotk ' + (firstTry(i) ? 'first' : 'later') + '">' + (i + 1) + '</span><span class="t"><b>' + esc(q.date) + '</b> ' + hl(q.text) + '</span>' +
          '<span class="tag">' + (firstTry(i) ? 'First try' : extra + ' wrong choice' + (extra > 1 ? 's' : '')) + (S.hints[i] ? ', ' + S.hints[i] + ' hint' + (S.hints[i] > 1 ? 's' : '') : '') + '</span></li>';
      }).join('') + '</ul>' +
      '<div class="key-top"><div><h3 class="key-title">The correct entries</h3>' +
      '<p class="key-sub">Every ' + META.month + ' transaction, journalized. Sales and sales returns take two entries: revenue first, then cost.</p></div>' +
      '<button type="button" class="btn" id="savePdf">Save the correct entries (PDF)</button></div>' +
      '<div class="keylist">' + Q.map(function (q, i) {
        return '<section class="keyitem"><div class="keyhead"><span class="dotk ' + (firstTry(i) ? 'first' : 'later') + '">' + (i + 1) + '</span><div><b>' + esc(q.date) + ', ' + META.year + '</b> ' + hl(q.text) + (q.note ? ' <i>' + hl(q.note) + '</i>' : '') + '</div></div>' +
          entryHtml(q.correct) + '</section>';
      }).join('') + '</div></article>';
    if ($('review')) $('review').onclick = function () { go(missed[0]); };
    $('savePdf').onclick = function () {
      try { window.QuizPdf.save(Q, OPENING, META); }
      catch (err) { this.insertAdjacentHTML('afterend', '<p class="key-sub">The PDF could not be created in this browser. Try Chrome, Edge, Safari or Firefox.</p>'); }
    };
    $('again').onclick = restart;
  }

  function restart() { S = fresh(); save(); render(); window.scrollTo({ top: 0 }); }

  // ---------- Reference ----------

  function renderRef() {
    const bold = function (t) { return hl(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); };
    $('refBody').innerHTML =
      '<div><table><thead><tr><th>Opening balances, ' + esc(META.openingDate) + '</th><th class="n">Debit</th><th class="n">Credit</th></tr></thead><tbody>' +
      OPENING.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td class="n">' + (r[1] ? num(r[1]) : '') + '</td><td class="n">' + (r[2] ? num(r[2]) : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div>' +
      '<div><b>Reminders</b><ul>' + META.reminders.map(function (t) { return '<li>' + bold(t) + '</li>'; }).join('') + '</ul></div>';
  }

  // ---------- Wiring ----------

  document.addEventListener('keydown', function (ev) {
    if (S.summary || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    const key = ev.key.toUpperCase();
    const pos = LETTERS.indexOf(key) >= 0 ? LETTERS.indexOf(key) : ['1', '2'].indexOf(key);
    if (pos >= 0) { ev.preventDefault(); answer(S.order[S.cur][pos]); }
    else if (key === 'H') { ev.preventDefault(); hint(); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); go(S.cur + 1); }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(S.cur - 1); }
  });
  $('restartAll').onclick = function () {
    if (window.confirm && !window.confirm('Start over? This clears your answers and shuffles the choices again.')) return;
    restart();
  };

  function render() {
    renderStats();
    if (S.summary) renderSummary(); else renderQuestion();
  }

  renderRef();
  render();
})();
