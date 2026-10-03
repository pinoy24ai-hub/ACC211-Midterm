/*
 * ACC 211 Midterm Part 2 engine: financial statement analysis.
 * Pure logic (no DOM). Builds the exam and grades answers.
 *
 * PROTOTYPE: the statements use FIXED values. The version code only shuffles the
 * order of multiple-choice options. When values are randomized later, only the
 * statement data in buildData() needs to come from the seeded generator; every
 * question below already computes its numbers and distractors from that data.
 */
(function (root) {
  'use strict';

  // ---------- Seeded random numbers and version codes (same scheme as Part 1) ----------

  function hashString(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }
  function makeRng(seedText) {
    let a = hashString(seedText) % 4294967296;
    const next = function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      next: next,
      shuffle: function (arr) {
        const x = arr.slice();
        for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); const t = x[i]; x[i] = x[j]; x[j] = t; }
        return x;
      }
    };
  }
  const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  function newVersionCode() {
    const bytes = new Uint32Array(8);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(bytes);
    else for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 4294967296);
    let s = '';
    for (let i = 0; i < 8; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    return s.slice(0, 4) + '-' + s.slice(4);
  }
  function normalizeCode(code) {
    const s = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return s.length === 8 ? s.slice(0, 4) + '-' + s.slice(4) : s;
  }

  // ---------- Formatting ----------

  function money(n) { return (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US'); }
  function sMoney(n) { return (n > 0 ? '+' : n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US'); }
  function r1(x) { return Math.round(x * 10 + (x >= 0 ? 1e-9 : -1e-9)) / 10; }
  function r2(x) { return Math.round(x * 100 + 1e-9) / 100; }
  function pct(x) { return r1(x).toFixed(1) + '%'; }
  function ratio(x) { return r2(x).toFixed(2); }
  function share(a, b) { return r1(a / b * 100); }
  function chg(a1, a2) { return r1((a2 - a1) / a1 * 100); }
  function chgText(p) { return Math.abs(p).toFixed(1) + '% ' + (p >= 0 ? 'increase' : 'decrease'); }
  function dText(d) { return money(Math.abs(d)) + ' ' + (d >= 0 ? 'increase' : 'decrease'); }

  // ---------- The business and its statements ----------

  const Y1 = 2024, Y2 = 2025;
  const BIZ = { name: 'Blue Harbor Mobile Detailing', owner: 'Camila Reyes', first: 'Camila', service: 'mobile car detailing' };
  const EXP_LABELS = { sal: 'Salaries expense', rent: 'Rent expense', sup: 'Supplies expense', dep: 'Depreciation expense',
    adv: 'Advertising expense', util: 'Utilities expense', ins: 'Insurance expense' };
  const EXP_KEYS = Object.keys(EXP_LABELS);
  const BS_LABELS = { cash: ['Cash', 'ca'], ar: ['Accounts receivable', 'ca'], sup: ['Supplies', 'ca'], pre: ['Prepaid insurance', 'ca'],
    eq: ['Detailing vans and equipment', 'nca'], ad: ['Less: Accumulated depreciation', 'contra'],
    ap: ['Accounts payable', 'cl'], sp: ['Salaries payable', 'cl'], ur: ['Unearned revenue', 'cl'],
    npc: ['Note payable (due within one year)', 'cl'], npl: ['Note payable (due in 2029)', 'ltl'], cap: [BIZ.owner + ', Capital', 'oe'] };

  // The practice version's fixed statements
  function fixedRaw() {
    return {
      rev: [160000, 184000],
      exp: { sal: [68000, 82800], rent: [19200, 20400], sup: [11200, 14720], dep: [8000, 9200], adv: [4800, 7360], util: [4000, 4320], ins: [3200, 3400] },
      bs: { cash: [18400, 11600], ar: [9200, 14800], sup: [2600, 3400], pre: [1800, 1200], eq: [64000, 76000], ad: [16000, 25200],
        ap: [5400, 9800], sp: [1600, 2900], ur: [2200, 3600], npc: [6000, 6000], npl: [22000, 20000] },
      bench: { npm: 24.0, cr: 1.50, dr: 50 },
      bank: { loan: 25000, wc: 8000 }
    };
  }

  // Turns raw amounts into the statement objects every question reads from
  function finalize(raw) {
    const IS = { rev: { key: 'rev', label: 'Detailing fees earned', a1: raw.rev[0], a2: raw.rev[1] },
      exp: EXP_KEYS.map(k => ({ key: k, label: EXP_LABELS[k], a1: raw.exp[k][0], a2: raw.exp[k][1] })) };
    IS.te1 = IS.exp.reduce((s, e) => s + e.a1, 0);
    IS.te2 = IS.exp.reduce((s, e) => s + e.a2, 0);
    IS.ni1 = IS.rev.a1 - IS.te1;
    IS.ni2 = IS.rev.a2 - IS.te2;
    const BS = {
      items: Object.keys(BS_LABELS).map(k => ({ key: k, label: BS_LABELS[k][0], type: BS_LABELS[k][1], a1: k === 'cap' ? 0 : raw.bs[k][0], a2: k === 'cap' ? 0 : raw.bs[k][1] })),
      // the order the bookkeeper typed them in (used where sorting is the task)
      listOrder: ['cash', 'eq', 'ur', 'ar', 'npl', 'ad', 'sp', 'sup', 'npc', 'pre', 'ap', 'cap']
    };
    const item = k => BS.items.find(x => x.key === k);
    const sumType = (t, y) => BS.items.filter(x => x.type === t).reduce((s, x) => s + x['a' + y], 0);
    [1, 2].forEach(y => {
      BS['ca' + y] = sumType('ca', y);
      BS['ta' + y] = BS['ca' + y] + sumType('nca', y) - sumType('contra', y);
      BS['cl' + y] = sumType('cl', y);
      BS['tl' + y] = BS['cl' + y] + sumType('ltl', y);
      item('cap')['a' + y] = BS['ta' + y] - BS['tl' + y];
      BS['wc' + y] = BS['ca' + y] - BS['cl' + y];
      BS['cr' + y] = BS['ca' + y] / BS['cl' + y];
      BS['dr' + y] = BS['tl' + y] / BS['ta' + y];
    });
    BS.item = item;
    const bench = raw.bench;
    const bank = { loan: raw.bank.loan, purpose: 'a second detailing van', wc: raw.bank.wc, cr: bench.cr, dr: bench.dr, npm: bench.npm, name: 'Lakeshore Community Bank' };
    return { biz: BIZ, IS, BS, bench, bank, Y1, Y2 };
  }

  // A displayed value must not sit near a rounding edge (e.g. 22.75% shown as 22.8%),
  // so a student's correctly rounded answer can never disagree with the key.
  function clearOfEdge(x, decimals) {
    const v = Math.abs(x) * Math.pow(10, decimals);
    const f = v - Math.floor(v);
    return Math.abs(f - 0.5) > 0.03;
  }

  // Random statements that always tell the same story: revenue grows, expenses grow
  // faster, the profit margin falls below the industry benchmark, liquidity weakens to
  // below its benchmark, the debt ratio edges past its benchmark, and only working
  // capital meets the bank's rules.
  function randomRaw(rng) {
    const U = (a, b) => a + rng.next() * (b - a);
    const r100 = x => Math.round(x / 100) * 100;
    const amt = (a, b, step) => a + step * Math.floor(rng.next() * (Math.floor((b - a) / step) + 1));
    const pickOne = arr => arr[Math.floor(rng.next() * arr.length)];
    for (let guard = 0; guard < 20000; guard++) {
      // ----- Income statement -----
      const R1 = amt(120000, 220000, 1000), g = U(0.10, 0.18), R2 = r100(R1 * (1 + g));
      const SH = { sal: [0.38, 0.44], rent: [0.10, 0.13], sup: [0.06, 0.08], dep: [0.04, 0.06], adv: [0.025, 0.04], util: [0.02, 0.03], ins: [0.015, 0.025] };
      const GR = { sal: [g + 0.05, g + 0.10], rent: [0.03, 0.08], sup: [g + 0.10, g + 0.20], dep: [0.10, 0.18], adv: [0.35, 0.60], util: [0.04, 0.10], ins: [0.03, 0.08] };
      const exp = {};
      EXP_KEYS.forEach(k => { const a1 = r100(R1 * U(SH[k][0], SH[k][1])); exp[k] = [a1, r100(a1 * (1 + U(GR[k][0], GR[k][1])))]; });
      const te1 = EXP_KEYS.reduce((s, k) => s + exp[k][0], 0), te2 = EXP_KEYS.reduce((s, k) => s + exp[k][1], 0);
      const ni1 = R1 - te1, ni2 = R2 - te2;
      const npm1 = ni1 / R1 * 100, npm2 = ni2 / R2 * 100;
      const revP = (R2 - R1) / R1 * 100, teP = (te2 - te1) / te1 * 100, niP = (ni2 - ni1) / ni1 * 100;
      if (npm1 < 22 || npm1 > 34 || npm1 - npm2 < 3 || Math.abs(niP) > 3 || teP < revP + 3) continue;
      const vals1 = EXP_KEYS.map(k => exp[k][0]), vals2 = EXP_KEYS.map(k => exp[k][1]);
      if (new Set(vals1).size < 7 || new Set(vals2).size < 7 || EXP_KEYS.some(k => exp[k][0] === exp[k][1])) continue;
      const pctVals = [npm1, npm2, revP, teP, niP, te1 / R1 * 100, te2 / R2 * 100]
        .concat(EXP_KEYS.map(k => exp[k][0] / R1 * 100), EXP_KEYS.map(k => exp[k][1] / R2 * 100), EXP_KEYS.map(k => (exp[k][1] - exp[k][0]) / exp[k][0] * 100));
      if (!pctVals.every(v => clearOfEdge(v, 1))) continue;
      const npmBench = [];
      for (let b = 15; b <= 40; b += 0.5) if (b > r1(npm2) + 0.8 && b < r1(npm1) - 0.8) npmBench.push(b);
      if (!npmBench.length) continue;

      // ----- Balance sheet -----
      const npc = amt(4000, 8000, 1000);
      const CL1 = amt(12000, 20000, 100), rest1 = CL1 - npc;
      const ap1 = r100(rest1 * U(0.55, 0.65)), sp1 = r100(rest1 * U(0.15, 0.20)), ur1 = rest1 - ap1 - sp1;
      const CA1 = r100(CL1 * U(1.85, 2.4));
      const ar1 = r100(CA1 * U(0.25, 0.32)), sup1 = r100(CA1 * U(0.07, 0.10)), pre1 = r100(CA1 * U(0.05, 0.08)), cash1 = CA1 - ar1 - sup1 - pre1;
      const ap2 = r100(ap1 * U(1.6, 2.0)), sp2 = r100(sp1 * U(1.3, 1.7)), ur2 = r100(ur1 * U(1.2, 1.6));
      const CL2 = ap2 + sp2 + ur2 + npc;
      const CA2 = r100(CL2 * U(1.15, 1.42));
      const ar2 = r100(ar1 * U(1.3, 1.7)), sup2 = r100(sup1 * U(1.1, 1.4)), pre2 = r100(pre1 * U(0.6, 0.9)), cash2 = CA2 - ar2 - sup2 - pre2;
      if (ur1 < 800 || cash2 < 0.35 * cash1 || cash2 > 0.85 * cash1) continue;
      const clInc = [ap2 - ap1, sp2 - sp1, ur2 - ur1].sort((a, b) => b - a);
      if (clInc[0] !== ap2 - ap1 || clInc[0] - clInc[1] < 400) continue;
      const npl1 = amt(15000, 30000, 1000), npl2 = npl1 - amt(1000, 3000, 1000);
      const TL1 = CL1 + npl1, TL2 = CL2 + npl2;
      const TA1 = r100(TL1 / U(0.40, 0.47)), TA2 = r100(TL2 / U(0.515, 0.56));
      const ad1 = r100(exp.dep[0] * U(1.5, 3)), ad2 = ad1 + exp.dep[1];
      const eq1 = TA1 - CA1 + ad1, eq2 = TA2 - CA2 + ad2;
      if (eq2 - eq1 < 4000) continue;
      const cap1 = TA1 - TL1, cap2 = TA2 - TL2, withdrawals = cap1 + ni2 - cap2;
      if (withdrawals < 0.3 * ni2) continue;
      const cr1 = CA1 / CL1, cr2 = CA2 / CL2, dr1 = TL1 / TA1 * 100, dr2 = TL2 / TA2 * 100;
      if (!clearOfEdge(cr1, 2) || !clearOfEdge(cr2, 2) || !clearOfEdge(dr1, 1) || !clearOfEdge(dr2, 1)) continue;
      const crBench = [1.30, 1.40, 1.50, 1.60, 1.75].filter(b => b > r2(cr2) + 0.05 && b < r2(cr1) - 0.05);
      const drBench = [45, 48, 50, 52].filter(b => b > r1(dr1) + 1 && b < r1(dr2) - 1);
      const WC2 = CA2 - CL2;
      const wcRule = Math.floor(WC2 * U(0.7, 0.92) / 1000) * 1000;
      if (!crBench.length || !drBench.length || wcRule < 2000 || wcRule >= WC2 || CA1 - CL1 <= WC2) continue;
      return {
        rev: [R1, R2], exp: exp,
        bs: { cash: [cash1, cash2], ar: [ar1, ar2], sup: [sup1, sup2], pre: [pre1, pre2], eq: [eq1, eq2], ad: [ad1, ad2],
          ap: [ap1, ap2], sp: [sp1, sp2], ur: [ur1, ur2], npc: [npc, npc], npl: [npl1, npl2] },
        bench: { npm: pickOne(npmBench), cr: pickOne(crBench), dr: pickOne(drBench) },
        bank: { loan: amt(20000, 40000, 5000), wc: wcRule }
      };
    }
    throw new Error('Could not build statements');
  }

  function buildData(rng) { return finalize(rng ? randomRaw(rng) : fixedRaw()); }

  // ---------- Lessons and hints ----------

  const LESSONS = {
    VERT: { big: 'Percent of revenue (vertical analysis) shows how each revenue dollar was used. Every line is divided by total revenue for the SAME year.',
      formula: ['Line % = Line amount / Total revenue x 100', 'Profit margin = Net income / Total revenue x 100'],
      trick: 'Always divide by the same year’s revenue. A 2025 expense goes over 2025 revenue.' },
    HORZ: { big: 'Year-over-year (horizontal) analysis compares the same line across two years: how much it moved in dollars, and how fast in percent.',
      formula: ['Dollar change = This year - Last year', 'Percent change = Dollar change / Last year x 100'],
      trick: 'Last year is the base. Divide by the older amount, never the newer one.' },
    NPM: { big: 'Net profit margin tells you how many cents of each revenue dollar were left as net income. Compare it with last year and with the industry benchmark.',
      formula: ['Net profit margin = Net income / Total revenue x 100'],
      trick: 'A margin can fall even when net income rises in dollars, if revenue grew faster than profit.' },
    SORT: { big: 'Ratios start with a sorted balance sheet. Current assets turn into cash or are used up within one year. Current liabilities are paid or worked off within one year.',
      formula: ['Total current assets = Cash + Receivables + Supplies + Prepaid items', 'Total current liabilities = everything owed within one year'],
      trick: 'Unearned revenue is a liability, not revenue. A note due within a year is current; a note due years from now is long-term.' },
    LIQ: { big: 'Working capital is the dollar cushion. The current ratio says how many dollars of current assets the business has for every $1 it owes soon.',
      formula: ['Working capital = Current assets - Current liabilities', 'Current ratio = Current assets / Current liabilities'],
      trick: 'Working capital is a dollar amount. The current ratio is read as "to 1" and is better for comparing businesses of different sizes.' },
    DEBT: { big: 'The debt ratio shows how much of everything the business owns was paid for with borrowed money instead of the owner’s money.',
      formula: ['Debt ratio = Total liabilities / Total assets x 100'],
      trick: 'For the debt ratio, LOWER is safer. The owner’s capital is not a liability.' },
    FINAL: { big: 'Put both statements together. The owner is asking a bank for a loan, and the bank uses profit margin, working capital, the current ratio and the debt ratio to decide.',
      formula: [],
      trick: 'For profit margin, working capital and the current ratio, higher is better. For the debt ratio, lower is better.' }
  };

  // ---------- Question helpers ----------

  function mc(label, prompt, right, wrongs, extra) {
    // keep wrong options distinct from the answer and from each other
    const seen = {}; seen[right] = true;
    const w = [];
    wrongs.forEach(x => { if (x != null && !seen[x] && w.length < 3) { seen[x] = true; w.push(x); } });
    return Object.assign({ kind: 'mc', label: label, prompt: prompt, options: [{ text: right, ok: true }].concat(w.map(t => ({ text: t, ok: false }))) }, extra || {});
  }
  function tf(prompt, answer, extra) {
    return Object.assign({ kind: 'tf', label: 'True or False', prompt: prompt, options: [{ text: 'True', ok: answer === true }, { text: 'False', ok: answer === false }] }, extra || {});
  }
  function pctAlts(v) { return [pct(v + 1.5), pct(Math.max(0.1, v - 1.5)), pct(v * 2), pct(v / 2)]; }
  function chgAlts(v) { return [chgText(v + 2), chgText(v - 2), chgText(v * 2)]; }
  function tile(id, label, val) { return { id: id, label: label, val: val }; }

  // ---------- Which lines each question asks about ----------

  const FIXED_CHOICES = { v1: 'sal', v2: 'rent', h3: 'sal', h4: 'adv',
    shareKeys: ['sal', 'rent', 'sup', 'util'], dollarKeys: ['rent', 'sup', 'dep', 'adv'], sorts: ['ur', 'npl', 'pre'] };
  const SORT_ANSWERS = { ur: 2, npl: 3, pre: 0, ar: 0, sp: 2, npc: 2, eq: 1, sup: 0 };
  const SORT_HINTS = {
    ur: 'Customers paid in advance, and the business still owes them the work within the year.',
    npl: 'When is this note due? More than one year away?',
    pre: 'Will the insurance coverage be used up within one year?',
    ar: 'Will customers pay what they owe within the year?',
    sp: 'When will the business pay the salaries it owes?',
    npc: 'The due date decides, not the name of the account.',
    eq: 'Will the vans and equipment be used up or turned into cash this year?',
    sup: 'Will the supplies be used up within one year?'
  };
  const ADVICE = {
    sal: 'Whether the higher salaries brought in enough extra work to pay for themselves.',
    sup: 'Whether supplies are being wasted or bought at higher prices.',
    adv: 'Whether the extra advertising brought in enough new customers.',
    rent: 'Whether the higher rent is paying off.',
    dep: 'Delaying new equipment purchases to keep depreciation down.',
    util: 'Ways to lower the utility bills.',
    ins: 'Shopping around for cheaper insurance.'
  };

  // Score helpers shared by the question builder and the random line chooser
  function moves(IS) {
    const line = k => IS.exp.find(e => e.key === k);
    return {
      share: k => share(line(k).a2, IS.rev.a2) - share(line(k).a1, IS.rev.a1),
      dollar: k => Math.abs(line(k).a2 - line(k).a1)
    };
  }
  function topGap(keys, score) {
    const v = keys.map(k => ({ k: k, v: score(k) })).sort((a, b) => b.v - a.v);
    return { top: v[0].k, topV: v[0].v, gap: v[0].v - v[1].v };
  }

  function chooseLines(D, rng) {
    const pickOne = arr => arr[Math.floor(rng.next() * arr.length)];
    const m = moves(D.IS);
    const v1 = pickOne(EXP_KEYS), v2 = pickOne(EXP_KEYS.filter(k => k !== v1));
    const h3 = pickOne(EXP_KEYS), h4 = pickOne(EXP_KEYS.filter(k => k !== h3));
    let shareKeys, dollarKeys;
    for (let i = 0; i < 500 && !shareKeys; i++) {
      const c = rng.shuffle(EXP_KEYS).slice(0, 4), t = topGap(c, m.share);
      if (t.topV > 0 && t.gap >= 0.5) shareKeys = c;
    }
    const shareTop = topGap(shareKeys, m.share).top;
    for (let i = 0; i < 500 && !dollarKeys; i++) {
      const c = rng.shuffle(EXP_KEYS).slice(0, 4), t = topGap(c, m.dollar);
      if (t.top !== shareTop && t.gap >= 500) dollarKeys = c;
    }
    if (!shareKeys || !dollarKeys) return null;
    // keep the statement order inside each list
    const ord = keys => EXP_KEYS.filter(k => keys.includes(k));
    return { v1, v2, h3, h4, shareKeys: ord(shareKeys), dollarKeys: ord(dollarKeys), sorts: rng.shuffle(Object.keys(SORT_ANSWERS)).slice(0, 3) };
  }

  // ---------- Stages ----------

  function buildStages(D, C) {
    const IS = D.IS, BS = D.BS, B = D.biz, it = BS.item;
    const line = k => k === 'rev' ? IS.rev : IS.exp.find(e => e.key === k);
    const v1 = line(C.v1), v2 = line(C.v2), h3 = line(C.h3), h4 = line(C.h4);
    const lname = l => l.label.toLowerCase();
    const npm1 = share(IS.ni1, IS.rev.a1), npm2 = share(IS.ni2, IS.rev.a2);
    const revP = chg(IS.rev.a1, IS.rev.a2), teP = chg(IS.te1, IS.te2), niP = chg(IS.ni1, IS.ni2);
    // expense whose share of revenue rose the most, and expense with the biggest dollar change
    // "Click the line" questions offer a subset of 4 expenses, not all of them.
    // The answer is the top item within that subset.
    const shareMove = e => share(e.a2, IS.rev.a2) - share(e.a1, IS.rev.a1);
    const dollarMove = e => Math.abs(e.a2 - e.a1);
    const topOf = (keys, score) => keys.map(line).sort((a, b) => score(b) - score(a))[0];
    const names = keys => {
      const n = keys.map(k => line(k).label.replace(/ expense$/, '').toLowerCase());
      return n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] + ' expense';
    };
    const shareKeys = C.shareKeys;
    const dollarKeys = C.dollarKeys;
    const shareRise = topOf(shareKeys, shareMove);
    const bigDollar = topOf(dollarKeys, dollarMove);
    const mostChanged = IS.exp.slice().sort((a, b) => Math.abs(b.a2 - b.a1) - Math.abs(a.a2 - a.a1))[0];
    const clKeys = ['ap', 'sp', 'ur', 'npc'];
    const clRise = clKeys.map(it).sort((a, b) => (b.a2 - b.a1) - (a.a2 - a.a1))[0];
    const cr1 = r2(BS.cr1), cr2 = r2(BS.cr2), dr1 = r1(BS.dr1 * 100), dr2 = r1(BS.dr2 * 100);
    const bsItems = (keys, y) => keys.map(k => { const x = it(k); return { key: k, label: x.label, amt: x.type === 'contra' ? -x['a' + y] : x['a' + y], type: x.type }; });

    const stages = [];

    // ===== Section A: Income statement =====
    stages.push({ id: 'VERT', section: 'A', title: 'Percent of Revenue', tag: 'Vertical analysis of the income statement', view: 'is', questions: [
      mc('Percent of Revenue', 'In ' + Y2 + ', ' + lname(v1) + ' was what percent of revenue?', pct(share(v1.a2, IS.rev.a2)),
        [pct(share(v1.a2, IS.te2)), pct(share(v1.a1, IS.rev.a1)), pct(share(v1.a2, IS.rev.a1))].concat(pctAlts(share(v1.a2, IS.rev.a2))),
        { note: 'Rounded to one decimal place.', hint: 'Divide ' + Y2 + ' ' + lname(v1) + ' by ' + Y2 + ' revenue, then multiply by 100.' }),
      mc('Percent of Revenue', 'In ' + Y1 + ', ' + lname(v2) + ' was what percent of revenue?', pct(share(v2.a1, IS.rev.a1)),
        [pct(share(v2.a1, IS.te1)), pct(share(v2.a2, IS.rev.a2)), pct(share(v2.a1, IS.rev.a2))].concat(pctAlts(share(v2.a1, IS.rev.a1))),
        { note: 'Rounded to one decimal place.', hint: 'Use only the ' + Y1 + ' column: ' + lname(v2) + ' divided by revenue, times 100.' }),
      mc('Percent of Revenue', 'In ' + Y2 + ', total expenses were what percent of revenue?', pct(share(IS.te2, IS.rev.a2)),
        [pct(share(IS.ni2, IS.rev.a2)), pct(share(IS.te1, IS.rev.a1)), pct(share(IS.rev.a2, IS.te2))].concat(pctAlts(share(IS.te2, IS.rev.a2))),
        { note: 'Rounded to one decimal place.', hint: 'Total expenses for ' + Y2 + ' divided by revenue for ' + Y2 + ', times 100.' }),
      { kind: 'formula', label: 'Build the Formula', result: 'pct',
        prompt: 'Build the formula for the ' + Y2 + ' profit margin (net income as a percent of revenue). Tap two amounts and one operation.',
        tiles: [tile('ni2', 'Net income, ' + Y2, IS.ni2), tile('te2', 'Total expenses, ' + Y2, IS.te2), tile('rev2', 'Revenue, ' + Y2, IS.rev.a2), tile('rev1', 'Revenue, ' + Y1, IS.rev.a1), tile('ni1', 'Net income, ' + Y1, IS.ni1)],
        answer: { a: 'ni2', op: '/', b: 'rev2' },
        hint: 'Profit margin = Net income / Revenue. Both amounts must come from ' + Y2 + '.' },
      { kind: 'pick', label: 'Find It', view: 'is', pickKeys: shareKeys, answer: shareRise.key,
        prompt: 'Of these four expenses (' + names(shareKeys) + '), click the one whose percent of revenue went UP the most from ' + Y1 + ' to ' + Y2 + '.',
        hint: 'For each of the four expenses, compare its percent of revenue in ' + Y1 + ' with its percent in ' + Y2 + '. Look at the share, not the dollars.' },
      tf('If an expense grew in dollars, its percent of revenue must have grown too.', false,
        { hint: 'Look at rent expense: it grew in dollars. Did its share of revenue grow?' })
    ] });

    stages.push({ id: 'HORZ', section: 'A', title: 'Year-over-Year Changes', tag: 'Horizontal analysis of the income statement', view: 'is', questions: [
      { kind: 'formula', label: 'Build the Formula', result: '$',
        prompt: 'Build the formula for the dollar change in revenue from ' + Y1 + ' to ' + Y2 + '.',
        tiles: [tile('rev1', 'Revenue, ' + Y1, IS.rev.a1), tile('ni2', 'Net income, ' + Y2, IS.ni2), tile('rev2', 'Revenue, ' + Y2, IS.rev.a2), tile('te2', 'Total expenses, ' + Y2, IS.te2)],
        answer: { a: 'rev2', op: '-', b: 'rev1' },
        hint: 'Dollar change = newer year - older year.' },
      mc('Year over Year', 'By what percent did revenue change from ' + Y1 + ' to ' + Y2 + '?', chgText(revP),
        [chgText(r1((IS.rev.a2 - IS.rev.a1) / IS.rev.a2 * 100)), chgText(-revP), chgText(r1(IS.rev.a2 / IS.rev.a1 * 100))].concat(chgAlts(revP)),
        { note: 'Rounded to one decimal place.', hint: '(' + Y2 + ' revenue - ' + Y1 + ' revenue) / ' + Y1 + ' revenue x 100.' }),
      mc('Year over Year', 'By what percent did ' + lname(h3) + ' change from ' + Y1 + ' to ' + Y2 + '?', chgText(chg(h3.a1, h3.a2)),
        [chgText(r1((h3.a2 - h3.a1) / h3.a2 * 100)), chgText(-chg(h3.a1, h3.a2)), chgText(r1(h3.a2 / h3.a1 * 100))].concat(chgAlts(chg(h3.a1, h3.a2))),
        { note: 'Rounded to one decimal place.', hint: 'Find the dollar change, then divide it by the ' + Y1 + ' amount and multiply by 100.' }),
      mc('Year over Year', 'By how many dollars did ' + lname(h4) + ' change from ' + Y1 + ' to ' + Y2 + '?', dText(h4.a2 - h4.a1),
        [dText(h4.a1 - h4.a2), dText(h4.a2), dText(h4.a1 + h4.a2)],
        { hint: 'Subtract: ' + Y2 + ' amount - ' + Y1 + ' amount.' }),
      { kind: 'pick', label: 'Find It', view: 'is', pickKeys: dollarKeys, answer: bigDollar.key,
        prompt: 'Of these four expenses (' + names(dollarKeys) + '), click the one that changed the most in DOLLARS from ' + Y1 + ' to ' + Y2 + '.',
        hint: 'For each of the four expenses, subtract the ' + Y1 + ' amount from the ' + Y2 + ' amount and look for the biggest difference.' },
      mc('What It Means', 'Revenue rose ' + revP.toFixed(1) + '%, total expenses rose ' + teP.toFixed(1) + '%, and net income ' + (niP >= 0 ? 'rose only ' + niP.toFixed(1) + '%' : 'fell ' + Math.abs(niP).toFixed(1) + '%') + '. Which statement explains this?',
        'Expenses grew faster than revenue, so almost none of the extra revenue reached net income.',
        ['Revenue grew faster than expenses, so net income should have doubled.',
          'Net income always grows by the same percent as revenue.',
          'The business must have had a net loss in ' + Y2 + '.'],
        { hint: 'Compare the two growth rates: revenue and total expenses. Which one grew faster?' })
    ] });

    stages.push({ id: 'NPM', section: 'A', title: 'Profit Margin vs Industry', tag: 'Net profit margin over two years, compared with a benchmark', view: 'is', bench: 'npm', questions: [
      { kind: 'formula', label: 'Build the Formula', result: 'pct',
        prompt: 'Build the formula for the ' + Y1 + ' net profit margin.',
        tiles: [tile('rev1', 'Revenue, ' + Y1, IS.rev.a1), tile('te1', 'Total expenses, ' + Y1, IS.te1), tile('ni1', 'Net income, ' + Y1, IS.ni1), tile('rev2', 'Revenue, ' + Y2, IS.rev.a2), tile('ni2', 'Net income, ' + Y2, IS.ni2)],
        answer: { a: 'ni1', op: '/', b: 'rev1' },
        hint: 'Net profit margin = Net income / Revenue, both from ' + Y1 + '.' },
      mc('Profit Margin', 'What was the net profit margin in ' + Y2 + '?', pct(npm2),
        [pct(share(IS.ni2, IS.te2)), pct(npm1), pct(share(IS.ni2, IS.rev.a1))].concat(pctAlts(npm2)),
        { note: 'Rounded to one decimal place.', hint: Y2 + ' net income divided by ' + Y2 + ' revenue, times 100.' }),
      mc('Benchmark', 'The industry average net profit margin for mobile detailing businesses is ' + D.bench.npm.toFixed(1) + '%. How do ' + B.name + '’s margins compare?',
        Y1 + ' was above the industry average, but ' + Y2 + ' fell below it.',
        ['Both years were above the industry average.', 'Both years were below the industry average.', Y1 + ' was below the industry average, but ' + Y2 + ' rose above it.'],
        { hint: 'Compare ' + pct(npm1) + ' and ' + pct(npm2) + ' with ' + D.bench.npm.toFixed(1) + '%.' }),
      mc('Sum It Up', 'Which sentence best describes ' + Y2 + ' compared with ' + Y1 + '?',
        'Revenue grew, but the business kept a smaller share of each dollar as profit.',
        ['Revenue grew, and the business kept a bigger share of each dollar as profit.',
          'Revenue fell, and the business kept a smaller share of each dollar as profit.',
          'Revenue fell, but the business kept a bigger share of each dollar as profit.'],
        { hint: 'Two checks: did revenue go up or down, and did the profit margin go up or down?' }),
      mc('Advise the Owner', 'Net income barely moved even though revenue grew. What should ' + B.first + ' look into first?',
        ADVICE[mostChanged.key],
        IS.exp.slice().sort((a, b) => Math.abs(a.a2 - a.a1) - Math.abs(b.a2 - b.a1)).slice(0, 3).map(e => ADVICE[e.key]),
        { hint: 'Good advice starts with the expense that grew the most in dollars.' }),
      tf('A net profit margin of ' + pct(npm2) + ' means about ' + Math.round(npm2) + ' cents of every revenue dollar was left as net income.', true,
        { hint: 'Net profit margin = net income / revenue. A percent of a dollar is cents per dollar.' })
    ] });

    // ===== Section B: Balance sheet =====
    const CATS = ['Current asset', 'Noncurrent asset', 'Current liability', 'Long-term liability'];
    const sortQ = (key, right, hint) => ({ kind: 'mc', label: 'Sort It', fixedOrder: true, prompt: 'Where does "' + it(key).label + '" belong on a classified balance sheet?',
      options: CATS.map((c, i) => ({ text: c, ok: i === right })), hint: hint });
    stages.push({ id: 'SORT', section: 'B', title: 'Sort and Total', tag: 'Current or noncurrent? Build the totals', view: 'bs-list', questions: [
      ...C.sorts.map(k => sortQ(k, SORT_ANSWERS[k], SORT_HINTS[k])),
      { kind: 'build', label: 'Build the Total', prompt: 'Build total current assets for December 31, ' + Y2 + '. Move every current asset into the box and leave everything else out.',
        items: bsItems(['cash', 'eq', 'ar', 'ad', 'sup', 'pre'], 2).map(x => Object.assign(x, { dest: x.type === 'ca' ? 'ca' : 'out' })),
        buckets: [{ id: 'ca', label: 'Current assets, ' + Y2, total: true }, { id: 'out', label: 'Leave out', total: false }],
        hint: 'Four items belong. The vans, equipment and accumulated depreciation are noncurrent.' },
      { kind: 'build', label: 'Build the Total', prompt: 'Build total current liabilities for December 31, ' + Y2 + '. Move every liability due within one year into the box.',
        items: bsItems(['ap', 'npl', 'sp', 'ur', 'npc'], 2).map(x => Object.assign(x, { dest: x.type === 'cl' ? 'cl' : 'out' })),
        buckets: [{ id: 'cl', label: 'Current liabilities, ' + Y2, total: true }, { id: 'out', label: 'Leave out', total: false }],
        hint: 'Look at the due dates. Four of the five liabilities are due within a year.' },
      { kind: 'build', label: 'Sort Board', prompt: 'Sort every item from the December 31, ' + Y1 + ' balance sheet into the right box. The boxes add up the totals for you.',
        items: bsItems(BS.listOrder, 1).map(x => Object.assign(x, { dest: x.type === 'ca' ? 'ca' : x.type === 'cl' ? 'cl' : 'none' })),
        buckets: [{ id: 'ca', label: 'Current assets', total: true }, { id: 'cl', label: 'Current liabilities', total: true }, { id: 'none', label: 'Neither (noncurrent or owner’s equity)', total: false }],
        mustPlaceAll: true,
        hint: 'Everything that isn’t a current asset or a current liability, including the owner’s capital, goes in Neither.' }
    ] });

    stages.push({ id: 'LIQ', section: 'B', title: 'Working Capital and Current Ratio', tag: 'Can the business pay its bills due soon?', view: 'bs', bench: 'cr', questions: [
      { kind: 'formula', label: 'Build the Formula', result: '$',
        prompt: 'Build the formula for working capital on December 31, ' + Y2 + '.',
        tiles: [tile('ta', 'Total assets', BS.ta2), tile('tca', 'Total current assets', BS.ca2), tile('tl', 'Total liabilities', BS.tl2), tile('cash', 'Cash', it('cash').a2), tile('tcl', 'Total current liabilities', BS.cl2)],
        answer: { a: 'tca', op: '-', b: 'tcl' },
        hint: 'Working capital = Current assets - Current liabilities.' },
      { kind: 'formula', label: 'Build the Formula', result: 'ratio',
        prompt: 'Build the formula for the current ratio on December 31, ' + Y2 + '.',
        tiles: [tile('tcl', 'Total current liabilities', BS.cl2), tile('wc', 'Working capital', BS.wc2), tile('tca', 'Total current assets', BS.ca2), tile('tl', 'Total liabilities', BS.tl2), tile('ta', 'Total assets', BS.ta2)],
        answer: { a: 'tca', op: '/', b: 'tcl' },
        hint: 'Current ratio = Current assets / Current liabilities. Current assets go first.' },
      { kind: 'formula', label: 'Build the Formula', result: 'ratio',
        prompt: 'Build the formula for the current ratio on December 31, ' + Y1 + '. Watch the years on the tiles.',
        tiles: [tile('tca', 'Total current assets, ' + Y1, BS.ca1), tile('tcl2', 'Total current liabilities, ' + Y2, BS.cl2), tile('ta', 'Total assets, ' + Y1, BS.ta1), tile('tcl', 'Total current liabilities, ' + Y1, BS.cl1), tile('tca2', 'Total current assets, ' + Y2, BS.ca2)],
        answer: { a: 'tca', op: '/', b: 'tcl' },
        hint: 'Same formula, with both amounts from ' + Y1 + '.' },
      mc('What It Means', B.name + '’s ' + Y2 + ' current ratio was ' + ratio(cr2) + '. What does that mean?',
        'It had $' + ratio(cr2) + ' of current assets for every $1.00 of current liabilities.',
        ['It earned $' + ratio(cr2) + ' of profit for every $1 of revenue.', 'It had $' + ratio(cr2) + ' of cash for every $1.00 of total liabilities.', 'It will run out of money in ' + ratio(cr2) + ' years.'],
        { hint: 'The current ratio compares current assets with current liabilities.' }),
      { kind: 'pick', label: 'Find the Cause', view: 'bs', pickKeys: clKeys, answer: clRise.key,
        prompt: 'Current liabilities grew from ' + money(BS.cl1) + ' to ' + money(BS.cl2) + '. Click the current liability that increased the most.',
        hint: 'For each current liability, compare the ' + Y2 + ' and ' + Y1 + ' amounts.' },
      mc('Benchmark', 'The current ratio went from ' + ratio(cr1) + ' in ' + Y1 + ' to ' + ratio(cr2) + ' in ' + Y2 + '. The industry benchmark is ' + D.bench.cr.toFixed(2) + '. Which sentence sums it up?',
        'Liquidity weakened, and it is now below the industry benchmark.',
        ['Liquidity improved, and it is above the industry benchmark.', 'Liquidity weakened, but it is still above the industry benchmark.', 'Liquidity improved, but it is still below the industry benchmark.'],
        { hint: 'Two checks: did the ratio go up or down, and is ' + ratio(cr2) + ' above or below ' + D.bench.cr.toFixed(2) + '?' })
    ] });

    stages.push({ id: 'DEBT', section: 'B', title: 'Debt Ratio', tag: 'How much of the business is financed by debt?', view: 'bs', bench: 'dr', questions: [
      { kind: 'build', label: 'Build the Total', prompt: 'The debt ratio uses TOTAL liabilities: current AND long-term. Build total liabilities for December 31, ' + Y2 + '.',
        items: bsItems(['ap', 'sp', 'ur', 'npc', 'npl', 'cap'], 2).map(x => Object.assign(x, { dest: (x.type === 'cl' || x.type === 'ltl') ? 'tl' : 'out' })),
        buckets: [{ id: 'tl', label: 'Total liabilities, ' + Y2, total: true }, { id: 'out', label: 'Leave out', total: false }],
        hint: 'Every liability belongs, including the long-term note. The owner’s capital is not a liability.' },
      { kind: 'formula', label: 'Build the Formula', result: 'pct',
        prompt: 'Build the formula for the debt ratio on December 31, ' + Y2 + '.',
        tiles: [tile('tcl', 'Total current liabilities', BS.cl2), tile('ta', 'Total assets', BS.ta2), tile('cap', B.owner + ', Capital', it('cap').a2), tile('tl', 'Total liabilities', BS.tl2), tile('tca', 'Total current assets', BS.ca2)],
        answer: { a: 'tl', op: '/', b: 'ta' },
        hint: 'Debt ratio = Total liabilities / Total assets.' },
      { kind: 'formula', label: 'Build the Formula', result: 'pct',
        prompt: 'Build the formula for the debt ratio on December 31, ' + Y1 + '. Watch the years on the tiles.',
        tiles: [tile('ta2', 'Total assets, ' + Y2, BS.ta2), tile('tl', 'Total liabilities, ' + Y1, BS.tl1), tile('cap', B.owner + ', Capital, ' + Y1, it('cap').a1), tile('ta', 'Total assets, ' + Y1, BS.ta1), tile('tcl', 'Total current liabilities, ' + Y1, BS.cl1)],
        answer: { a: 'tl', op: '/', b: 'ta' },
        hint: 'Same formula, with both amounts from ' + Y1 + '.' },
      mc('What It Means', 'The ' + Y2 + ' debt ratio was ' + pct(dr2) + '. What does that mean?',
        'About ' + Math.round(dr2) + ' cents of every $1 of assets was paid for with debt; the owner’s money paid for the rest.',
        [B.name + ' will pay off ' + pct(dr2) + ' of its debts this year.', pct(dr2) + ' of revenue went to paying interest.', B.name + ' owes ' + pct(dr2) + ' more than it owns.'],
        { hint: 'The debt ratio compares total liabilities with total assets.' }),
      mc('Benchmark', 'For the debt ratio, LOWER is safer, and the benchmark is ' + D.bench.dr + '% or lower. It went from ' + pct(dr1) + ' to ' + pct(dr2) + '. Which sentence is true?',
        'It moved from within the benchmark to above it, so the business relies more on debt than the guideline.',
        ['It improved, because a higher debt ratio is better.', 'It stayed within the benchmark in both years.', 'It can’t be compared, because the business is small.'],
        { hint: 'Is each year above or below ' + D.bench.dr + '%? Remember that lower is better here.' })
    ] });

    // ===== Finale =====
    const bank = D.bank;
    const passes = { npm: npm2 >= bank.npm, wc: BS.wc2 >= bank.wc, cr: cr2 >= bank.cr, dr: dr2 <= bank.dr };
    const passNames = { npm: 'net profit margin', wc: 'working capital', cr: 'current ratio', dr: 'debt ratio' };
    const passed = Object.keys(passes).filter(k => passes[k]).map(k => passNames[k]);
    const meets = passed.length === 0 ? 'None of the four rules is met.'
      : passed.length === 4 ? 'All four rules are met.'
      : 'Only ' + passed.join(' and ') + (passed.length === 1 ? ' meets its rule.' : ' meet their rules.');
    const cashDrop = it('cash').a1 - it('cash').a2;
    stages.push({ id: 'FINAL', section: 'B', title: 'The Bank’s Decision', tag: 'Use both statements to make the call', view: 'scorecard', boss: true, questions: [
      { kind: 'build', label: 'Look Back', mustPlaceAll: true,
        prompt: 'The bank starts by looking back. From ' + Y1 + ' to ' + Y2 + ', did each indicator improve or get worse?',
        items: [
          { key: 'npm', label: 'Net profit margin', show: pct(npm1) + ' → ' + pct(npm2), dest: npm2 > npm1 ? 'better' : 'worse' },
          { key: 'wc', label: 'Working capital', show: money(BS.wc1) + ' → ' + money(BS.wc2), dest: BS.wc2 > BS.wc1 ? 'better' : 'worse' },
          { key: 'cr', label: 'Current ratio', show: ratio(cr1) + ' → ' + ratio(cr2), dest: cr2 > cr1 ? 'better' : 'worse' },
          { key: 'dr', label: 'Debt ratio', show: pct(dr1) + ' → ' + pct(dr2), dest: dr2 < dr1 ? 'better' : 'worse' }
        ],
        buckets: [{ id: 'better', label: 'Improved', total: false }, { id: 'worse', label: 'Got worse', total: false }],
        write: { id: 'trend', label: 'What happened from ' + Y1 + ' to ' + Y2, prompt: 'In 1 to 2 sentences, describe what happened to the business’s profitability, liquidity and debt from ' + Y1 + ' to ' + Y2 + '. Use numbers from the scorecard.', min: 40 },
        hint: 'Profit margin, working capital and the current ratio: higher is better. The debt ratio: LOWER is better, so a rising debt ratio got worse.' },
      mc('Check the Rules', bank.name + ' requires a net profit margin of at least ' + bank.npm.toFixed(1) + '%, working capital of at least ' + money(bank.wc) + ', a current ratio of at least ' + bank.cr.toFixed(2) + ', and a debt ratio of ' + bank.dr + '% or lower. Using the ' + Y2 + ' numbers, which rules are met?',
        meets,
        ['All four rules are met.', 'None of the four rules is met.', 'Only the debt ratio meets its rule.', 'Only the current ratio meets its rule.'],
        { hint: 'Compare each ' + Y2 + ' result with its rule, one at a time.' }),
      mc('Make the Call', B.owner + ' asks for a ' + money(bank.loan) + ' loan to buy ' + bank.purpose + '. The bank approves only if all four rules are met. What should the bank decide?',
        'Not yet. ' + meets.replace(/\.$/, '') + ', so the request doesn’t meet the bank’s rules.',
        ['Approve it. Revenue grew ' + revP.toFixed(1) + '%, and that is all the bank needs.', 'Approve it. Net income went up, so every indicator must have improved.', 'Not yet, because the business had a net loss in ' + Y2 + '.'],
        { write: { id: 'loan', label: 'The bank’s decision', prompt: 'Would you approve the loan? Say yes or no, and give two reasons that use the ' + Y2 + ' numbers.', min: 60 },
          hint: 'The bank needs all four rules. How many did the ' + Y2 + ' numbers meet?' }),
      mc('Connect the Statements', 'Net income was ' + money(IS.ni2) + ' in ' + Y2 + ', yet cash fell by ' + money(cashDrop) + '. Which explanation fits?',
        'Net income isn’t cash: the business bought equipment, customers owed more at year end, and the owner’s withdrawals took cash out.',
        ['The business must have made a mistake, because net income always equals the change in cash.', 'Depreciation expense used up the cash.', 'Cash fell because revenue fell.'],
        { hint: 'Look at equipment and accounts receivable on the balance sheet. Do withdrawals appear on the income statement?' }),
      mc('Advice for the Owner', 'Which step would raise working capital and the current ratio AND lower the debt ratio, so ' + B.first + ' can reapply?',
        'Invest more personal savings in the business as owner\u2019s capital.',
        ['Buy the new van with cash now.', 'Borrow money that must be repaid within three months.', 'Withdraw cash from the business for personal use.'],
        { hint: 'Look for the action that adds current assets without adding any debt.' })
    ] });

    return stages;
  }

  // ---------- Build an exam for a version code ----------

  // opts.randomize: new statement values, lines asked, benchmarks and question order per
  // version code (the exam). Without it, the fixed practice statements are used and only
  // multiple-choice options are shuffled.
  function generateExam(code, opts) {
    code = normalizeCode(code);
    const randomize = !!(opts && opts.randomize);
    const dataRng = makeRng('ACC211-P2-DATA|' + code);
    let D, C;
    if (randomize) {
      for (let i = 0; i < 50 && !C; i++) { D = buildData(dataRng); C = chooseLines(D, dataRng); }
      if (!C) throw new Error('Could not choose question lines');
    } else {
      D = buildData(null); C = FIXED_CHOICES;
    }
    const rng = makeRng('ACC211-P2|' + code);
    const stages = buildStages(D, C);
    stages.forEach(st => {
      st.lesson = LESSONS[st.id];
      st.questions.forEach((q, i) => {
        q.id = st.id + '-' + (i + 1);
        q.points = 2.5;
        if (!q.view) q.view = st.view;
        if (q.kind === 'mc' && !q.fixedOrder) q.options = rng.shuffle(q.options);
      });
      // The finale builds on itself (look back, check the rules, decide), so it keeps its order.
      if (randomize && !st.boss) st.questions = rng.shuffle(st.questions);
    });
    return { code: code, randomized: randomize, data: D, stages: stages, possible: stages.reduce((s, st) => s + st.questions.length * 2.5, 0) };
  }

  // ---------- Grading ----------

  const OPS = { '+': (a, b) => a + b, '-': (a, b) => a - b, 'x': (a, b) => a * b, '/': (a, b) => a / b };
  function formulaValue(q, ans) {
    if (!ans || !ans.a || !ans.b || !ans.op) return null;
    const ta = q.tiles.find(t => t.id === ans.a), tb = q.tiles.find(t => t.id === ans.b);
    if (!ta || !tb || !OPS[ans.op]) return null;
    if (ans.op === '/' && tb.val === 0) return null;
    return OPS[ans.op](ta.val, tb.val);
  }
  function formatResult(q, v) {
    if (v == null || !isFinite(v)) return '';
    if (q.result === 'pct') return pct(v * 100);
    if (q.result === 'ratio') return ratio(v);
    return money(v);
  }

  // Fraction of the question earned, 0..1
  function gradeQuestion(q, ans) {
    if (ans == null) return 0;
    if (q.kind === 'mc' || q.kind === 'tf') return q.options[ans] && q.options[ans].ok ? 1 : 0;
    if (q.kind === 'pick') return ans === q.answer ? 1 : 0;
    if (q.kind === 'formula') return ans && ans.a === q.answer.a && ans.op === q.answer.op && ans.b === q.answer.b ? 1 : 0;
    if (q.kind === 'build') {
      const place = (ans && ans.place) || {};
      const def = q.mustPlaceAll ? null : 'out';
      const right = q.items.filter(x => (place[x.key] || def) === x.dest).length;
      return right / q.items.length;
    }
    return 0;
  }
  function isAnswered(q, ans) {
    if (ans == null) return false;
    if (q.kind === 'formula') return !!(ans.a && ans.op && ans.b);
    if (q.kind === 'build') {
      const place = (ans && ans.place) || {};
      return q.mustPlaceAll ? q.items.every(x => place[x.key]) : Object.keys(place).some(k => place[k] && place[k] !== 'out');
    }
    return true;
  }

  // Plain-text description of a student's answer, for the PDF report
  function describeAnswer(exam, q, ans) {
    if (!isAnswered(q, ans)) return '(no answer)';
    if (q.kind === 'mc' || q.kind === 'tf') return q.options[ans].text;
    if (q.kind === 'pick') {
      const D = exam.data;
      const l = q.view === 'bs' ? D.BS.item(ans) : (ans === 'rev' ? D.IS.rev : D.IS.exp.find(e => e.key === ans));
      return 'Clicked: ' + (l ? l.label : ans);
    }
    if (q.kind === 'formula') {
      const t = id => (q.tiles.find(x => x.id === id) || {}).label || '?';
      const sym = { '+': '+', '-': '-', 'x': 'x', '/': '/' }[ans.op];
      return t(ans.a) + ' ' + sym + ' ' + t(ans.b) + ' = ' + formatResult(q, formulaValue(q, ans));
    }
    if (q.kind === 'build') {
      const place = ans.place || {};
      const def = q.mustPlaceAll ? null : 'out';
      return q.buckets.map(b => {
        const list = q.items.filter(x => (place[x.key] || def) === b.id).map(x => x.label);
        return b.label + ': ' + (list.length ? list.join('; ') : '(none)');
      }).join('\n');
    }
    return '';
  }

  function r2pts(n) { return Math.round(n * 100) / 100; }
  function gradeExam(exam, answers) {
    answers = answers || {};
    const stages = exam.stages.map(st => {
      const items = st.questions.map(q => {
        const f = gradeQuestion(q, answers[q.id]);
        return { id: q.id, fraction: f, earned: r2pts(q.points * f), points: q.points };
      });
      return { id: st.id, section: st.section, title: st.title, items: items,
        score: r2pts(items.reduce((s, x) => s + x.earned, 0)), possible: items.reduce((s, x) => s + x.points, 0) };
    });
    const sec = id => {
      const list = stages.filter(s => s.section === id);
      return { score: r2pts(list.reduce((s, x) => s + x.score, 0)), possible: list.reduce((s, x) => s + x.possible, 0) };
    };
    const total = r2pts(stages.reduce((s, x) => s + x.score, 0));
    return { stages: stages, sectionA: sec('A'), sectionB: sec('B'), total: total, possible: exam.possible };
  }

  // mode: 'exam' (default) or 'practice'; practice reports can't pass as exam reports.
  function checkCode(code, name, result, attempt, mode) {
    let s = [normalizeCode(code), String(name || '').trim().toLowerCase(), result.sectionA.score.toFixed(2),
      result.sectionB.score.toFixed(2), result.total.toFixed(2)].join('|');
    if (attempt > 1) s += '|A' + attempt;
    return hashString((mode === 'practice' ? 'ACC211-P2-PRACTICE|' : 'ACC211-P2-CHECK|') + s).toString(36).toUpperCase().slice(-8);
  }

  const api = {
    newVersionCode, normalizeCode, generateExam, gradeExam, gradeQuestion, isAnswered,
    formulaValue, formatResult, describeAnswer, checkCode, money, sMoney, pct, ratio, share, chg, Y1, Y2
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Part2Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
