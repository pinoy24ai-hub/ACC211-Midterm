/*
 * ACC 211 Part 3: built-in calculator.
 * A small panel with a keypad, keyboard support, a history tape, click-to-add amounts
 * from the statements, and a button that puts the result into the student's amount box.
 * Math is done by a tiny parser (no eval) with the usual order of operations.
 */
(function () {
  'use strict';

  const OPS = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  let expr = '';            // internal form: digits, '.', and + - * /
  let justEvaluated = false;
  let history = [];         // [{ expr, result }]
  let target = null;        // the amount box the result goes into
  let panel = null;

  // ---------- Math ----------

  function tokenize(s) {
    const out = [];
    let num = '';
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (/[0-9.]/.test(ch)) { num += ch; continue; }
      if (num) { out.push(num); num = ''; }
      // A minus at the start, or right after another operator, belongs to the number.
      if (ch === '-' && (out.length === 0 || OPS[out[out.length - 1]])) { num = '-'; continue; }
      out.push(ch);
    }
    if (num) out.push(num);
    return out;
  }

  // Returns a number, or null if the expression is incomplete or invalid.
  function evaluate(s) {
    const t = tokenize(s);
    if (!t.length || OPS[t[t.length - 1]]) return null;
    const vals = [], ops = [];
    const prec = o => (o === '+' || o === '-') ? 1 : 2;
    const apply = () => {
      const b = vals.pop(), a = vals.pop(), o = ops.pop();
      if (o === '/' && b === 0) throw new Error('div0');
      vals.push(o === '+' ? a + b : o === '-' ? a - b : o === '*' ? a * b : a / b);
    };
    for (const tok of t) {
      if (OPS[tok]) {
        while (ops.length && prec(ops[ops.length - 1]) >= prec(tok)) apply();
        ops.push(tok);
      } else {
        const n = Number(tok);
        if (!isFinite(n) || tok === '-' || tok === '.') return null;
        vals.push(n);
      }
    }
    try { while (ops.length) apply(); } catch (e) { return NaN; }
    if (vals.length !== 1) return null;
    return Math.round(vals[0] * 100) / 100;
  }

  // ---------- Formatting ----------

  function fmtNum(n) {
    if (n == null) return '';
    if (Number.isNaN(n)) return 'Cannot divide by 0';
    const neg = n < 0, a = Math.abs(n);
    const parts = String(a).split('.');
    const s = Number(parts[0]).toLocaleString('en-US') + (parts[1] ? '.' + parts[1] : '');
    return (neg ? '−' : '') + s;
  }
  function pretty(s) {
    return tokenize(s).map(tok => {
      if (OPS[tok]) return ' ' + OPS[tok] + ' ';
      if (/^-?\d*\.?\d*$/.test(tok) && tok !== '-') {
        const neg = tok.startsWith('-'), body = neg ? tok.slice(1) : tok;
        const [i, d] = body.split('.');
        return (neg ? '−' : '') + (i ? Number(i).toLocaleString('en-US') : '0') + (d !== undefined ? '.' + d : '');
      }
      return tok === '-' ? '−' : tok;
    }).join('');
  }

  // ---------- Input ----------

  const lastChar = () => expr.slice(-1);
  const currentNumber = () => { const m = expr.match(/-?[0-9.]*$/); return m ? m[0] : ''; };

  function press(k) {
    if (k === 'C') { expr = ''; justEvaluated = false; }
    else if (k === 'back') { if (justEvaluated) { expr = ''; justEvaluated = false; } else expr = expr.slice(0, -1); }
    else if (k === '=') {
      const r = evaluate(expr);
      if (r == null || Number.isNaN(r)) { flashError(r); return; }
      if (tokenize(expr).length > 1) { history.unshift({ expr, result: r }); history = history.slice(0, 6); }
      expr = String(r);
      justEvaluated = true;
    } else if (OPS[k]) {
      justEvaluated = false;
      if (!expr) { if (k === '-') expr = '-'; }
      else if (OPS[lastChar()]) expr = expr.slice(0, -1) + k;
      else if (expr !== '-') expr += k;
    } else if (k === '.') {
      if (justEvaluated) { expr = ''; justEvaluated = false; }
      if (!currentNumber().includes('.')) expr += (/[0-9]$/.test(expr) ? '' : '0') + '.';
    } else if (/^\d+$/.test(k)) {
      if (justEvaluated) { expr = ''; justEvaluated = false; }
      expr += k;
    }
    draw();
  }

  // Add an amount clicked on a statement. Between two amounts, assume "+" (handy for adding a column).
  function addAmount(n) {
    if (justEvaluated) { expr = ''; justEvaluated = false; }
    if (expr && /[0-9.]$/.test(expr)) expr += '+';
    expr += String(n);
    draw();
    const disp = panel.querySelector('.calc-expr');
    disp.classList.remove('pulse'); void disp.offsetWidth; disp.classList.add('pulse');
  }

  function flashError(r) {
    const el = panel.querySelector('.calc-result');
    el.textContent = Number.isNaN(r) ? 'Cannot divide by 0' : 'Finish the calculation first';
    el.classList.add('err');
    setTimeout(() => { el.classList.remove('err'); draw(); }, 1200);
  }

  // ---------- Panel ----------

  const KEYS = [
    ['C', 'C', 'fn'], ['back', '⌫', 'fn'], ['/', '÷', 'op'], ['*', '×', 'op'],
    ['7', '7'], ['8', '8'], ['9', '9'], ['-', '−', 'op'],
    ['4', '4'], ['5', '5'], ['6', '6'], ['+', '+', 'op'],
    ['1', '1'], ['2', '2'], ['3', '3'], ['=', '=', 'eq'],
    ['0', '0'], ['00', '00'], ['.', '.']
  ];

  function mount() {
    if (panel) return;
    panel = document.createElement('section');
    panel.className = 'calcpad';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Calculator');
    panel.tabIndex = -1;
    panel.innerHTML =
      '<header class="calc-head"><b>Calculator</b><button type="button" class="calc-x" data-ck="close" aria-label="Close calculator">&times;</button></header>' +
      '<div class="calc-screen" aria-live="polite"><div class="calc-expr"></div><div class="calc-result"></div></div>' +
      '<p class="calc-tip">Tip: click any amount on the statement to add it here.</p>' +
      '<div class="calc-keys">' + KEYS.map(k => '<button type="button" class="ck ' + (k[2] || '') + '" data-ck="' + k[0] + '">' + k[1] + '</button>').join('') + '</div>' +
      '<button type="button" class="btn btn-primary calc-use" data-ck="use"></button>' +
      '<div class="calc-hist"></div>';
    document.body.appendChild(panel);

    panel.addEventListener('mousedown', ev => {
      // Keep focus (and the target box) where it is when pressing keys.
      if (ev.target.closest('.ck, .calc-use, .calc-x, .hist-item')) ev.preventDefault();
    });
    panel.addEventListener('click', ev => {
      const b = ev.target.closest('[data-ck]');
      if (!b) return;
      const k = b.dataset.ck;
      if (k === 'close') return toggle(false);
      if (k === 'use') return useResult();
      if (k === 'hist') { const h = history[Number(b.dataset.i)]; expr = String(h.result); justEvaluated = true; return draw(); }
      if (k === '00') { if (expr && /[0-9]$/.test(expr) && !justEvaluated) { expr += k; draw(); } return; }
      press(k);
    });
    // Keyboard: works whenever focus is not in a text box.
    document.addEventListener('keydown', ev => {
      if (panel.hidden || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const map = { Enter: '=', '=': '=', Backspace: 'back', Escape: 'C', Delete: 'C', x: '*', X: '*' };
      const k = map[ev.key] || ev.key;
      if (/^[0-9]$/.test(k) || OPS[k] || k === '.' || k === '=' || k === 'back' || k === 'C') {
        ev.preventDefault();
        if (ev.key === 'Escape' && !expr) return toggle(false);
        press(k);
      }
    });
    draw();
  }

  function currentValue() {
    if (justEvaluated) return Number(expr);
    const r = evaluate(expr);
    return r == null || Number.isNaN(r) ? null : r;
  }

  function draw() {
    if (!panel) return;
    panel.querySelector('.calc-expr').textContent = expr ? pretty(expr) : '0';
    const r = currentValue();
    const res = panel.querySelector('.calc-result');
    res.textContent = !justEvaluated && r != null && tokenize(expr).length > 1 ? '= ' + fmtNum(r) : '';
    const use = panel.querySelector('.calc-use');
    const tgtOk = target && document.body.contains(target) && !target.disabled;
    const label = tgtOk ? (target.getAttribute('aria-label') || 'the box') : null;
    use.disabled = !tgtOk || r == null;
    use.textContent = !tgtOk ? 'Click an amount box to send the result there' : 'Put ' + (r == null ? 'result' : fmtNum(r)) + ' in “' + label + '”';
    panel.querySelector('.calc-hist').innerHTML = history.length
      ? '<div class="hist-title">Recent</div>' + history.map((h, i) => '<button type="button" class="hist-item" data-ck="hist" data-i="' + i + '"><span>' + pretty(h.expr) + '</span><b>= ' + fmtNum(h.result) + '</b></button>').join('')
      : '';
  }

  function useResult() {
    const r = currentValue();
    if (r == null || !target) return;
    if (!justEvaluated && tokenize(expr).length > 1) { history.unshift({ expr, result: r }); history = history.slice(0, 6); }
    target.value = r < 0 ? '(' + Math.abs(r).toLocaleString('en-US') + ')' : r.toLocaleString('en-US');
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.focus();
    expr = ''; justEvaluated = false;
    draw();
  }

  function toggle(open) {
    mount();
    const show = open == null ? panel.hidden : open;
    panel.hidden = !show;
    document.body.classList.toggle('calc-open', show);
    document.querySelectorAll('[data-act="calc"]').forEach(b => b.setAttribute('aria-pressed', String(show)));
    draw();
  }

  if (typeof window !== 'undefined') window.Part3Calc = {
    toggle, addAmount,
    isOpen: () => !!panel && !panel.hidden,
    setTarget: el => { target = el; draw(); },
    evaluate // exposed for tests
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = { evaluate, tokenize };
})();
