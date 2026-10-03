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

  // ---------- The business and its statements (FIXED for the prototype) ----------

  const Y1 = 2024, Y2 = 2025;

  function buildData() {
    const biz = { name: 'Blue Harbor Mobile Detailing', owner: 'Camila Reyes', first: 'Camila', service: 'mobile car detailing' };
    const IS = {
      rev: { key: 'rev', label: 'Detailing fees earned', a1: 160000, a2: 184000 },
      exp: [
        { key: 'sal', label: 'Salaries expense', a1: 68000, a2: 82800 },
        { key: 'rent', label: 'Rent expense', a1: 19200, a2: 20400 },
        { key: 'sup', label: 'Supplies expense', a1: 11200, a2: 14720 },
        { key: 'dep', label: 'Depreciation expense', a1: 8000, a2: 9200 },
        { key: 'adv', label: 'Advertising expense', a1: 4800, a2: 7360 },
        { key: 'util', label: 'Utilities expense', a1: 4000, a2: 4320 },
        { key: 'ins', label: 'Insurance expense', a1: 3200, a2: 3400 }
      ]
    };
    IS.te1 = IS.exp.reduce((s, e) => s + e.a1, 0);
    IS.te2 = IS.exp.reduce((s, e) => s + e.a2, 0);
    IS.ni1 = IS.rev.a1 - IS.te1;
    IS.ni2 = IS.rev.a2 - IS.te2;

    // type: ca current asset, nca noncurrent asset, contra, cl current liability, ltl long-term liability, oe owner's equity
    const BS = {
      items: [
        { key: 'cash', label: 'Cash', type: 'ca', a1: 18400, a2: 11600 },
        { key: 'ar', label: 'Accounts receivable', type: 'ca', a1: 9200, a2: 14800 },
        { key: 'sup', label: 'Supplies', type: 'ca', a1: 2600, a2: 3400 },
        { key: 'pre', label: 'Prepaid insurance', type: 'ca', a1: 1800, a2: 1200 },
        { key: 'eq', label: 'Detailing vans and equipment', type: 'nca', a1: 64000, a2: 76000 },
        { key: 'ad', label: 'Less: Accumulated depreciation', type: 'contra', a1: 16000, a2: 25200 },
        { key: 'ap', label: 'Accounts payable', type: 'cl', a1: 5400, a2: 9800 },
        { key: 'sp', label: 'Salaries payable', type: 'cl', a1: 1600, a2: 2900 },
        { key: 'ur', label: 'Unearned revenue', type: 'cl', a1: 2200, a2: 3600 },
        { key: 'npc', label: 'Note payable (due within one year)', type: 'cl', a1: 6000, a2: 6000 },
        { key: 'npl', label: 'Note payable (due in 2029)', type: 'ltl', a1: 22000, a2: 20000 },
        { key: 'cap', label: biz.owner + ', Capital', type: 'oe', a1: 0, a2: 0 }
      ],
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

    const bench = { npm: 24.0, cr: 1.50, dr: 50 };
    const bank = { loan: 25000, purpose: 'a second detailing van', wc: 8000, cr: 1.50, dr: 50, npm: 24.0, name: 'Lakeshore Community Bank' };
    return { biz, IS, BS, bench, bank, Y1, Y2 };
  }

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

  // ---------- Stages ----------

  function buildStages(D) {
    const IS = D.IS, BS = D.BS, B = D.biz, it = BS.item;
    const line = k => k === 'rev' ? IS.rev : IS.exp.find(e => e.key === k);
    const sal = line('sal'), rent = line('rent'), adv = line('adv');
    const npm1 = share(IS.ni1, IS.rev.a1), npm2 = share(IS.ni2, IS.rev.a2);
    const revP = chg(IS.rev.a1, IS.rev.a2), teP = chg(IS.te1, IS.te2), niP = chg(IS.ni1, IS.ni2);
    // expense whose share of revenue rose the most, and expense with the biggest dollar change
    const shareRise = IS.exp.slice().sort((a, b) => (share(b.a2, IS.rev.a2) - share(b.a1, IS.rev.a1)) - (share(a.a2, IS.rev.a2) - share(a.a1, IS.rev.a1)))[0];
    const bigDollar = IS.exp.slice().sort((a, b) => Math.abs(b.a2 - b.a1) - Math.abs(a.a2 - a.a1))[0];
    const clKeys = ['ap', 'sp', 'ur', 'npc'];
    const clRise = clKeys.map(it).sort((a, b) => (b.a2 - b.a1) - (a.a2 - a.a1))[0];
    const cr1 = r2(BS.cr1), cr2 = r2(BS.cr2), dr1 = r1(BS.dr1 * 100), dr2 = r1(BS.dr2 * 100);
    const bsItems = (keys, y) => keys.map(k => { const x = it(k); return { key: k, label: x.label, amt: x.type === 'contra' ? -x['a' + y] : x['a' + y], type: x.type }; });

    const stages = [];

    // ===== Section A: Income statement =====
    stages.push({ id: 'VERT', section: 'A', title: 'Percent of Revenue', tag: 'Vertical analysis of the income statement', view: 'is', questions: [
      mc('Percent of Revenue', 'In ' + Y2 + ', salaries expense was what percent of revenue?', pct(share(sal.a2, IS.rev.a2)),
        [pct(share(sal.a2, IS.te2)), pct(share(sal.a1, IS.rev.a1)), pct(share(sal.a2, IS.rev.a1))].concat(pctAlts(share(sal.a2, IS.rev.a2))),
        { note: 'Rounded to one decimal place.', hint: 'Divide ' + Y2 + ' salaries expense by ' + Y2 + ' revenue, then multiply by 100.' }),
      mc('Percent of Revenue', 'In ' + Y1 + ', rent expense was what percent of revenue?', pct(share(rent.a1, IS.rev.a1)),
        [pct(share(rent.a1, IS.te1)), pct(share(rent.a2, IS.rev.a2)), pct(share(rent.a1, IS.rev.a2))].concat(pctAlts(share(rent.a1, IS.rev.a1))),
        { note: 'Rounded to one decimal place.', hint: 'Use only the ' + Y1 + ' column: rent expense divided by revenue, times 100.' }),
      mc('Percent of Revenue', 'In ' + Y2 + ', total expenses were what percent of revenue?', pct(share(IS.te2, IS.rev.a2)),
        [pct(share(IS.ni2, IS.rev.a2)), pct(share(IS.te1, IS.rev.a1)), pct(share(IS.rev.a2, IS.te2))].concat(pctAlts(share(IS.te2, IS.rev.a2))),
        { note: 'Rounded to one decimal place.', hint: 'Total expenses for ' + Y2 + ' divided by revenue for ' + Y2 + ', times 100.' }),
      { kind: 'formula', label: 'Build the Formula', result: 'pct',
        prompt: 'Build the formula for the ' + Y2 + ' profit margin (net income as a percent of revenue). Tap two amounts and one operation.',
        tiles: [tile('ni2', 'Net income, ' + Y2, IS.ni2), tile('te2', 'Total expenses, ' + Y2, IS.te2), tile('rev2', 'Revenue, ' + Y2, IS.rev.a2), tile('rev1', 'Revenue, ' + Y1, IS.rev.a1), tile('ni1', 'Net income, ' + Y1, IS.ni1)],
        answer: { a: 'ni2', op: '/', b: 'rev2' },
        hint: 'Profit margin = Net income / Revenue. Both amounts must come from ' + Y2 + '.' },
      { kind: 'pick', label: 'Find It', view: 'is', pickKeys: IS.exp.map(e => e.key), answer: shareRise.key,
        prompt: 'Click the expense whose percent of revenue went UP the most from ' + Y1 + ' to ' + Y2 + '.',
        hint: 'For each expense, compare its percent of revenue in ' + Y1 + ' with its percent in ' + Y2 + '. Look at the share, not the dollars.' },
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
      mc('Year over Year', 'By what percent did salaries expense change from ' + Y1 + ' to ' + Y2 + '?', chgText(chg(sal.a1, sal.a2)),
        [chgText(r1((sal.a2 - sal.a1) / sal.a2 * 100)), chgText(-chg(sal.a1, sal.a2)), chgText(r1(sal.a2 / sal.a1 * 100))].concat(chgAlts(chg(sal.a1, sal.a2))),
        { note: 'Rounded to one decimal place.', hint: 'Find the dollar change, then divide it by the ' + Y1 + ' amount and multiply by 100.' }),
      mc('Year over Year', 'By how many dollars did advertising expense change from ' + Y1 + ' to ' + Y2 + '?', dText(adv.a2 - adv.a1),
        [dText(adv.a1 - adv.a2), dText(adv.a2), dText(adv.a1 + adv.a2)],
        { hint: 'Subtract: ' + Y2 + ' amount - ' + Y1 + ' amount.' }),
      { kind: 'pick', label: 'Find It', view: 'is', pickKeys: IS.exp.map(e => e.key), answer: bigDollar.key,
        prompt: 'Click the expense that changed the most in DOLLARS from ' + Y1 + ' to ' + Y2 + '.',
        hint: 'Subtract the two columns for each expense and look for the biggest difference.' },
      mc('What It Means', 'Revenue rose ' + revP.toFixed(1) + '%, total expenses rose ' + teP.toFixed(1) + '%, and net income rose only ' + niP.toFixed(1) + '%. Which statement explains this?',
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
        'Whether the higher salaries brought in enough extra work to pay for themselves.',
        ['Cutting insurance, which barely changed.', 'Raising the owner’s withdrawals.', 'Lowering utilities, which changed only a little.'],
        { hint: 'Good advice starts with the expense that grew the most in dollars.' }),
      tf('A net profit margin of ' + pct(npm2) + ' means about ' + Math.round(npm2) + ' cents of every revenue dollar was left as net income.', true,
        { hint: 'Net profit margin = net income / revenue. A percent of a dollar is cents per dollar.' })
    ] });

    // ===== Section B: Balance sheet =====
    const CATS = ['Current asset', 'Noncurrent asset', 'Current liability', 'Long-term liability'];
    const sortQ = (key, right, hint) => ({ kind: 'mc', label: 'Sort It', fixedOrder: true, prompt: 'Where does "' + it(key).label + '" belong on a classified balance sheet?',
      options: CATS.map((c, i) => ({ text: c, ok: i === right })), hint: hint });
    stages.push({ id: 'SORT', section: 'B', title: 'Sort and Total', tag: 'Current or noncurrent? Build the totals', view: 'bs-list', questions: [
      sortQ('ur', 2, 'Customers paid in advance, and the business still owes them the work within the year.'),
      sortQ('npl', 3, 'When is this note due? More than one year away?'),
      sortQ('pre', 0, 'Will the insurance coverage be used up within one year?'),
      { kind: 'build', label: 'Build the Total', prompt: 'Build total current assets for December 31, ' + Y2 + '. Move every current asset into the box and leave everything else out.',
        items: bsItems(['cash', 'eq', 'ar', 'ad', 'sup', 'pre'], 2).map(x => Object.assign(x, { dest: x.type === 'ca' ? 'ca' : 'out' })),
        buckets: [{ id: 'ca', label: 'Current assets, ' + Y2, total: true }, { id: 'out', label: 'Leave out', total: false }],
        hint: 'Four items belong. The vans, equipment and accumulated depreciation are noncurrent.' },
      { kind: 'build', label: 'Build the Total', prompt: 'Build total current liabilities for December 31, ' + Y2 + '. Move every liability due within one year into the box.',
        items: bsItems(['ap', 'npl', 'sp', 'ur', 'npc'], 2).map(x => Object.assign(x, { dest: x.type === 'cl' ? 'cl' : 'out' })),
        buckets: [{ id: 'cl', label: 'Current liabilities, ' + Y2, total: true }, { id: 'out', label: 'Leave out', total: false }],
        hint: 'Look at the due dates. Four of the five liabilities are due within a year.' },
      { kind: 'build', label: 'Sort Board', prompt: 'Now ' + Y1 + '. Sort every item from the December 31, ' + Y1 + ' balance sheet into the right box. The boxes add up the totals for you.',
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
        prompt: 'Now build the current ratio for December 31, ' + Y1 + '. Watch the years on the tiles.',
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
        prompt: 'Now build the debt ratio for December 31, ' + Y1 + '. Watch the years on the tiles.',
        tiles: [tile('ta2', 'Total assets, ' + Y2, BS.ta2), tile('tl', 'Total liabilities, ' + Y1, BS.tl1), tile('cap', B.owner + ', Capital, ' + Y1, it('cap').a1), tile('ta', 'Total assets, ' + Y1, BS.ta1), tile('tcl', 'Total current liabilities, ' + Y1, BS.cl1)],
        answer: { a: 'tl', op: '/', b: 'ta' },
        hint: 'Same formula, with both amounts from ' + Y1 + '.' },
      mc('What It Means', 'The ' + Y2 + ' debt ratio was ' + pct(dr2) + '. What does that mean?',
        'About ' + Math.round(dr2) + ' cents of every $1 of assets was paid for with debt; the owner’s money paid for the rest.',
        [B.name + ' will pay off ' + pct(dr2) + ' of its debts this year.', pct(dr2) + ' of revenue went to paying interest.', B.name + ' owes ' + pct(dr2) + ' more than it owns.'],
        { hint: 'The debt ratio compares total liabilities with total assets.' }),
      mc('Benchmark', 'For the debt ratio, LOWER is safer, and the benchmark is ' + D.bench.dr + '% or lower. It went from ' + pct(dr1) + ' to ' + pct(dr2) + '. Which sentence is true?',
        'It moved from within the benchmark to slightly above it, so the business relies more on debt than the guideline.',
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

  function generateExam(code) {
    code = normalizeCode(code);
    const D = buildData();
    const rng = makeRng('ACC211-P2|' + code);
    const stages = buildStages(D);
    stages.forEach(st => {
      st.lesson = LESSONS[st.id];
      st.questions.forEach((q, i) => {
        q.id = st.id + '-' + (i + 1);
        q.points = 2.5;
        if (!q.view) q.view = st.view;
        if (q.kind === 'mc' && !q.fixedOrder) q.options = rng.shuffle(q.options);
      });
    });
    return { code: code, data: D, stages: stages, possible: stages.reduce((s, st) => s + st.questions.length * 2.5, 0) };
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

  function checkCode(code, name, result, attempt) {
    let s = [normalizeCode(code), String(name || '').trim().toLowerCase(), result.sectionA.score.toFixed(2),
      result.sectionB.score.toFixed(2), result.total.toFixed(2)].join('|');
    if (attempt > 1) s += '|A' + attempt;
    return hashString('ACC211-P2-CHECK|' + s).toString(36).toUpperCase().slice(-8);
  }

  const api = {
    newVersionCode, normalizeCode, generateExam, gradeExam, gradeQuestion, isAnswered,
    formulaValue, formatResult, describeAnswer, checkCode, money, sMoney, pct, ratio, share, chg, Y1, Y2
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Part2Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
