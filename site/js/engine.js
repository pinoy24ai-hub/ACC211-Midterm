/*
 * ACC 211 Midterm exam engine.
 * Pure logic (no DOM): builds a randomized exam from a version code and grades answers.
 * The same version code always rebuilds the same exam, which lets the instructor
 * answer-key tool reproduce any student's version from the code on their report.
 */
(function (root) {
  'use strict';

  // ---------- Seeded random numbers ----------

  function hashString(str) {
    // cyrb53: small, fast, well-distributed string hash
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
    const rng = {
      next: next,
      int: function (min, max) { return min + Math.floor(next() * (max - min + 1)); },
      pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
      // random multiple of step between min and max (inclusive)
      amt: function (min, max, step) {
        step = step || 1;
        const lo = Math.ceil(min / step), hi = Math.floor(max / step);
        return rng.int(lo, hi) * step;
      },
      shuffle: function (arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
      },
      chance: function (p) { return next() < p; }
    };
    return rng;
  }

  const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  function newVersionCode() {
    const bytes = new Uint32Array(8);
    if (root.crypto && root.crypto.getRandomValues) {
      root.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 4294967296);
    }
    let s = '';
    for (let i = 0; i < 8; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    return s.slice(0, 4) + '-' + s.slice(4);
  }

  function normalizeCode(code) {
    const s = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return s.length === 8 ? s.slice(0, 4) + '-' + s.slice(4) : s;
  }

  // ---------- Formatting helpers ----------

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  const YEAR = 2026;

  function daysIn(month) { return new Date(YEAR, month + 1, 0).getDate(); }
  function fmtDate(month, day) { return MONTHS[month] + ' ' + day + ', ' + YEAR; }
  function money(n) {
    const neg = n < 0;
    const v = Math.abs(Math.round(n * 100) / 100);
    const s = v.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
      maximumFractionDigits: 2
    });
    return (neg ? '-$' : '$') + s;
  }

  // ---------- Business profiles ----------

  const BUSINESSES = [
    { name: 'GreenLeaf Landscaping', service: 'landscaping services', equip: 'a commercial riding mower', supplies: 'fertilizer and gardening supplies', client: 'a homeowner' },
    { name: 'Bright Path Tutoring', service: 'tutoring services', equip: 'laptops and a projector', supplies: 'workbooks and classroom supplies', client: 'a family' },
    { name: 'Pixel Perfect Web Design', service: 'web design services', equip: 'a computer workstation', supplies: 'office supplies', client: 'a local bakery' },
    { name: 'Sparkle Clean Services', service: 'cleaning services', equip: 'a commercial floor scrubber', supplies: 'cleaning supplies', client: 'an office building manager' },
    { name: 'Summit Consulting', service: 'consulting services', equip: 'office furniture and computers', supplies: 'office supplies', client: 'a small manufacturer' },
    { name: 'FitLife Personal Training', service: 'personal training services', equip: 'fitness equipment', supplies: 'training supplies', client: 'a fitness client' },
    { name: 'QuickFix Repair Services', service: 'repair services', equip: 'diagnostic tools', supplies: 'repair supplies', client: 'a customer' },
    { name: 'Lens & Light Photography', service: 'photography services', equip: 'camera and lighting equipment', supplies: 'printing supplies', client: 'a wedding couple' }
  ];

  const OWNERS = ['Maria Santos', 'James Carter', 'Aisha Bello', 'Daniel Kim', 'Sofia Reyes',
    'Ethan Brooks', 'Priya Patel', 'Lucas Moreau', 'Grace Nakamura', 'Omar Haddad',
    'Hannah Novak', 'Miguel Torres', 'Chloe Bennett', 'Kwame Mensah', 'Elena Petrova'];

  // ---------- Chart of accounts ----------

  function buildChart(owner) {
    // type: A asset, XA contra asset, L liability, E equity, D drawing, IS income summary, R revenue, X expense
    return [
      { no: '101', name: 'Cash', type: 'A' },
      { no: '112', name: 'Accounts Receivable', type: 'A' },
      { no: '126', name: 'Supplies', type: 'A' },
      { no: '130', name: 'Prepaid Insurance', type: 'A' },
      { no: '131', name: 'Prepaid Rent', type: 'A' },
      { no: '140', name: 'Land', type: 'A' },
      { no: '157', name: 'Equipment', type: 'A' },
      { no: '158', name: 'Accumulated Depreciation - Equipment', type: 'XA' },
      { no: '200', name: 'Notes Payable', type: 'L' },
      { no: '201', name: 'Accounts Payable', type: 'L' },
      { no: '209', name: 'Unearned Service Revenue', type: 'L' },
      { no: '212', name: 'Salaries and Wages Payable', type: 'L' },
      { no: '230', name: 'Interest Payable', type: 'L' },
      { no: '301', name: owner + ', Capital', type: 'E' },
      { no: '306', name: owner + ', Drawing', type: 'D' },
      { no: '350', name: 'Income Summary', type: 'IS' },
      { no: '400', name: 'Service Revenue', type: 'R' },
      { no: '405', name: 'Interest Revenue', type: 'R' },
      { no: '610', name: 'Advertising Expense', type: 'X' },
      { no: '615', name: 'Supplies Expense', type: 'X' },
      { no: '631', name: 'Repairs and Maintenance Expense', type: 'X' },
      { no: '711', name: 'Depreciation Expense', type: 'X' },
      { no: '722', name: 'Insurance Expense', type: 'X' },
      { no: '726', name: 'Salaries and Wages Expense', type: 'X' },
      { no: '729', name: 'Rent Expense', type: 'X' },
      { no: '732', name: 'Utilities Expense', type: 'X' },
      { no: '905', name: 'Interest Expense', type: 'X' }
    ];
  }

  function dr(acct, amount) { return { acct: acct, side: 'dr', amount: amount }; }
  function cr(acct, amount) { return { acct: acct, side: 'cr', amount: amount }; }

  // ---------- Phase 1: general journal transactions ----------

  function phase1Generators(b, owner) {
    return {
      invest: function (r) {
        if (r.chance(0.5)) {
          const x = r.amt(15000, 40000, 1000);
          return { text: owner + ', the owner, invested ' + money(x) + ' cash in ' + b.name + '.', lines: [dr('101', x), cr('301', x)] };
        }
        const c = r.amt(10000, 30000, 1000), e = r.amt(3000, 9000, 500);
        return {
          text: owner + ', the owner, invested ' + money(c) + ' cash and equipment valued at ' + money(e) + ' in ' + b.name + '.',
          lines: [dr('101', c), dr('157', e), cr('301', c + e)]
        };
      },
      servicesCash: function (r) {
        const x = r.amt(800, 4500, 50);
        return { text: 'Performed ' + b.service + ' for ' + b.client + ' and received ' + money(x) + ' in cash.', lines: [dr('101', x), cr('400', x)] };
      },
      servicesAccount: function (r) {
        const x = r.amt(900, 5000, 50);
        return { text: 'Performed ' + b.service + ' and billed the customer ' + money(x) + ', due in 30 days.', lines: [dr('112', x), cr('400', x)] };
      },
      withdraw: function (r) {
        const x = r.amt(500, 2500, 100);
        return { text: owner + ' withdrew ' + money(x) + ' cash from the business for personal use.', lines: [dr('306', x), cr('101', x)] };
      },
      equipCash: function (r) {
        const x = r.amt(3000, 12000, 100);
        return { text: 'Purchased ' + b.equip + ' for ' + money(x) + ', paying cash.', lines: [dr('157', x), cr('101', x)] };
      },
      equipNote: function (r) {
        const t = r.amt(8000, 20000, 500);
        const d = Math.round(t * (0.2 + r.next() * 0.2) / 100) * 100;
        return {
          text: 'Purchased ' + b.equip + ' costing ' + money(t) + ' by paying ' + money(d) + ' in cash and signing a note payable for the balance.',
          lines: [dr('157', t), cr('101', d), cr('200', t - d)]
        };
      },
      suppliesOnAccount: function (r) {
        const x = r.amt(300, 1800, 25);
        return { text: 'Purchased ' + b.supplies + ' on account for ' + money(x) + '.', lines: [dr('126', x), cr('201', x)] };
      },
      prepaidInsurance: function (r) {
        const x = r.amt(1200, 4800, 120);
        return { text: 'Paid ' + money(x) + ' for a one-year insurance policy with coverage beginning next month.', lines: [dr('130', x), cr('101', x)] };
      },
      prepaidRent: function (r) {
        const n = r.pick([3, 4, 6]);
        const x = n * r.amt(800, 2000, 50);
        return { text: 'Paid ' + money(x) + ' in advance for ' + n + ' months of office rent, starting next month.', lines: [dr('131', x), cr('101', x)] };
      },
      rentMonth: function (r) {
        const x = r.amt(700, 2200, 50);
        return { text: 'Paid ' + money(x) + ' for office rent for the current month.', lines: [dr('729', x), cr('101', x)] };
      },
      salaries: function (r) {
        const x = r.amt(1200, 4500, 50);
        return { text: 'Paid employee salaries of ' + money(x) + ' for work performed this month.', lines: [dr('726', x), cr('101', x)] };
      },
      utilities: function (r) {
        const x = r.amt(150, 700, 5);
        return { text: 'Paid the utility bill for the month, ' + money(x) + '.', lines: [dr('732', x), cr('101', x)] };
      },
      collect: function (r) {
        const x = r.amt(500, 3500, 50);
        return { text: 'Received ' + money(x) + ' cash from customers for services billed last month.', lines: [dr('101', x), cr('112', x)] };
      },
      payAP: function (r) {
        const x = r.amt(250, 1500, 25);
        return { text: 'Paid ' + money(x) + ' to a supplier for a purchase made on account last month.', lines: [dr('201', x), cr('101', x)] };
      },
      unearned: function (r) {
        const x = r.amt(600, 3000, 50);
        return { text: 'Received ' + money(x) + ' cash from ' + b.client + ' for services to be performed next month.', lines: [dr('101', x), cr('209', x)] };
      },
      borrow: function (r) {
        const x = r.amt(5000, 20000, 1000);
        return { text: 'Borrowed ' + money(x) + ' from the bank by signing a note payable.', lines: [dr('101', x), cr('200', x)] };
      },
      advertising: function (r) {
        const x = r.amt(200, 1200, 25);
        return { text: 'Received a bill for ' + money(x) + ' for online advertising run this month. The bill will be paid next month.', lines: [dr('610', x), cr('201', x)] };
      },
      servicesMixed: function (r) {
        const t = r.amt(2000, 6000, 100);
        const c = Math.round(t * (0.3 + r.next() * 0.4) / 50) * 50;
        return {
          text: 'Performed ' + b.service + ' for ' + money(t) + '. The customer paid ' + money(c) + ' in cash and agreed to pay the rest next month.',
          lines: [dr('101', c), dr('112', t - c), cr('400', t)]
        };
      }
    };
  }

  function buildPhase1(r, b, owner) {
    const gens = phase1Generators(b, owner);
    const core = ['invest', 'servicesCash', 'servicesAccount', 'withdraw'];
    let optional = r.shuffle(['equipCash', 'equipNote', 'suppliesOnAccount', 'prepaidInsurance', 'prepaidRent',
      'rentMonth', 'salaries', 'utilities', 'collect', 'payAP', 'unearned', 'borrow', 'advertising', 'servicesMixed']);
    const chosen = [];
    for (const key of optional) {
      if (chosen.length === 6) break;
      if ((key === 'equipCash' && chosen.includes('equipNote')) || (key === 'equipNote' && chosen.includes('equipCash'))) continue;
      chosen.push(key);
    }
    const keys = r.shuffle(core.concat(chosen));
    const month = r.int(0, 11);
    const days = [];
    while (days.length < keys.length) {
      const d = r.int(1, 28);
      if (!days.includes(d)) days.push(d);
    }
    days.sort(function (x, y) { return x - y; });
    const transactions = keys.map(function (k, i) {
      const t = gens[k](r);
      return { id: 'T' + (i + 1), kind: k, date: fmtDate(month, days[i]), text: t.text, lines: t.lines, points: 4 };
    });
    return { month: MONTHS[month], year: YEAR, transactions: transactions };
  }

  // ---------- Phase 2: adjusting entries ----------

  function buildPhase2(r, b, owner) {
    const t = r.int(2, 10); // TB month (March..November)
    const endDay = daysIn(t);
    const tbDate = fmtDate(t, endDay);
    const items = [];
    const bal = {}; // account no -> signed balance (debit +, credit -)
    function setBal(no, v) { bal[no] = v; }

    // Accrued expense: salaries or interest
    if (r.chance(0.5)) {
      const weekly = r.amt(1500, 4500, 250);
      const days = r.int(1, 4);
      const amount = weekly / 5 * days;
      items.push({
        kind: 'accruedSalaries', category: 'Accrued expense',
        text: 'Employees work a five-day week (Monday through Friday) and are paid every Friday. The weekly payroll is ' + money(weekly) +
          '. At the end of ' + MONTHS[t] + ', employees have worked ' + days + ' day' + (days > 1 ? 's' : '') +
          ' since the last payday. These wages have not been paid or recorded.',
        lines: [dr('726', amount), cr('212', amount)]
      });
    } else {
      const note = r.amt(12000, 48000, 6000);
      const rate = r.pick([4, 6, 8, 10, 12]);
      const months = r.int(1, Math.min(3, t + 1));
      const amount = note * rate / 100 * months / 12;
      setBal('200', -note);
      items.push({
        kind: 'accruedInterest', category: 'Accrued expense',
        text: 'On ' + fmtDate(t - months + 1, 1) + ', the business signed a ' + money(note) + ', ' + rate +
          '% annual interest note payable with its bank. Interest is due when the note matures. No interest has been paid or recorded.',
        lines: [dr('905', amount), cr('230', amount)]
      });
    }

    // Accrued revenue
    const accRev = r.amt(500, 3000, 50);
    items.push({
      kind: 'accruedRevenue', category: 'Accrued revenue',
      text: 'During the last week of ' + MONTHS[t] + ', the business performed ' + b.service + ' worth ' + money(accRev) +
        ' that have not yet been billed or recorded.',
      lines: [dr('112', accRev), cr('400', accRev)]
    });

    // Two deferred expenses
    const deferred = r.shuffle(['supplies', 'insurance', 'rent']).slice(0, 2);
    deferred.forEach(function (kind) {
      if (kind === 'supplies') {
        const sup = r.amt(900, 3200, 25);
        const onHand = r.amt(150, sup - 400, 25);
        setBal('126', sup);
        items.push({
          kind: 'supplies', category: 'Deferred expense',
          text: 'A physical count on ' + tbDate + ' shows ' + money(onHand) + ' of supplies still on hand.',
          lines: [dr('615', sup - onHand), cr('126', sup - onHand)]
        });
      } else if (kind === 'insurance') {
        const monthly = r.amt(100, 400, 10);
        const k = r.int(1, Math.min(6, t + 1));
        setBal('130', monthly * 12);
        items.push({
          kind: 'insurance', category: 'Deferred expense',
          text: 'The Prepaid Insurance balance is the cost of a one-year policy purchased on ' + fmtDate(t - k + 1, 1) +
            ', with coverage beginning that day. No insurance expense has been recorded since the purchase.',
          lines: [dr('722', monthly * k), cr('130', monthly * k)]
        });
      } else {
        const n = r.pick([3, 4, 6]);
        const monthly = r.amt(800, 2500, 50);
        const k = r.int(1, Math.min(2, t + 1));
        setBal('131', monthly * n);
        items.push({
          kind: 'rent', category: 'Deferred expense',
          text: 'On ' + fmtDate(t - k + 1, 1) + ', the business paid ' + money(monthly * n) + ' for ' + n +
            ' months of rent in advance and debited Prepaid Rent. No rent expense has been recorded since the payment.',
          lines: [dr('729', monthly * k), cr('131', monthly * k)]
        });
      }
    });

    // Deferred revenue
    const unearned = r.amt(1500, 6000, 50);
    setBal('209', -unearned);
    let earned;
    let urText;
    if (r.chance(0.5)) {
      earned = r.amt(400, unearned - 300, 50);
      urText = 'Of the Unearned Service Revenue balance, services worth ' + money(earned) + ' were performed during ' + MONTHS[t] + '.';
    } else {
      const remaining = r.amt(300, unearned - 400, 50);
      earned = unearned - remaining;
      urText = 'A review of customer contracts shows that ' + money(remaining) +
        ' of the Unearned Service Revenue balance is still unearned at the end of ' + MONTHS[t] + '.';
    }
    items.push({ kind: 'unearned', category: 'Deferred revenue', text: urText, lines: [dr('209', earned), cr('400', earned)] });

    // Depreciation
    const life = r.pick([3, 4, 5, 6, 8, 10]);
    const monthlyDep = r.amt(50, 400, 5);
    const cost = monthlyDep * 12 * life;
    const priorMonths = r.int(1, t);
    setBal('157', cost);
    setBal('158', -monthlyDep * priorMonths);
    items.push({
      kind: 'depreciation', category: 'Depreciation',
      text: 'The equipment has an estimated useful life of ' + life + ' years with no salvage value and is depreciated using the straight-line method. ' +
        'Depreciation has been recorded through the end of last month. Record depreciation for ' + MONTHS[t] + '.',
      lines: [dr('711', monthlyDep), cr('158', monthlyDep)]
    });

    // Remaining trial balance accounts
    setBal('101', r.amt(5000, 18000, 5));
    setBal('112', r.amt(1500, 6000, 25));
    setBal('201', -r.amt(500, 3000, 25));
    setBal('306', r.amt(500, 3000, 100));
    setBal('400', -r.amt(9000, 22000, 50));
    setBal('726', r.amt(2500, 8000, 50));
    if (!deferred.includes('rent')) setBal('729', r.amt(800, 2500, 50));
    setBal('732', r.amt(200, 800, 5));
    if (r.chance(0.5)) setBal('610', r.amt(200, 1200, 25));

    // Capital is the balancing figure; keep it comfortably positive
    let sum = 0;
    Object.keys(bal).forEach(function (k) { sum += bal[k]; });
    if (sum < 4000) {
      const bump = 4000 - sum + r.amt(500, 5000, 5);
      bal['101'] += bump;
      sum += bump;
    }
    setBal('301', -sum);

    const tb = Object.keys(bal).sort().map(function (no) {
      return { acct: no, debit: bal[no] > 0 ? bal[no] : 0, credit: bal[no] < 0 ? -bal[no] : 0 };
    });

    const ordered = r.shuffle(items).map(function (it, i) {
      return Object.assign({ id: 'A' + (i + 1), points: 6 }, it);
    });
    return { date: tbDate, month: MONTHS[t], tb: tb, items: ordered };
  }

  // ---------- Phase 3: closing entries ----------

  function buildPhase3(r, chart) {
    const bal = {};
    const revenue = r.amt(48000, 120000, 100);
    bal['400'] = -revenue;
    let totalRev = revenue;
    if (r.chance(0.4)) {
      const ir = r.amt(100, 900, 10);
      bal['405'] = -ir;
      totalRev += ir;
    }
    const hasNote = r.chance(0.5);
    let expenseAccts = ['729', '732', '615', '722', '711', '610', '631'];
    if (hasNote) expenseAccts.push('905');
    expenseAccts = ['726'].concat(r.shuffle(expenseAccts).slice(0, r.int(4, 6)));
    const loss = r.chance(0.2);
    const ratio = loss ? 1.05 + r.next() * 0.2 : 0.55 + r.next() * 0.33;
    const totalExp = Math.round(totalRev * ratio / 10) * 10;
    // typical relative sizes, so (for example) salaries outweigh insurance
    const SIZE = { '726': [4, 6], '729': [1.2, 2], '711': [0.6, 1.2], '610': [0.4, 1], '732': [0.4, 0.8],
      '615': [0.3, 0.7], '722': [0.3, 0.7], '631': [0.3, 0.7], '905': [0.1, 0.3] };
    const weights = expenseAccts.map(function (no) { return SIZE[no][0] + r.next() * (SIZE[no][1] - SIZE[no][0]); });
    const wsum = weights.reduce(function (a, w) { return a + w; }, 0);
    let others = 0;
    expenseAccts.forEach(function (no, i) {
      if (no === '726') return;
      bal[no] = Math.max(50, Math.round(totalExp * weights[i] / wsum / 10) * 10);
      others += bal[no];
    });
    bal['726'] = totalExp - others; // salaries absorb rounding

    bal['101'] = r.amt(8000, 30000, 5);
    bal['112'] = r.amt(3000, 12000, 25);
    bal['126'] = r.amt(300, 1500, 25);
    bal['130'] = r.amt(600, 2400, 10);
    const equip = r.amt(15000, 45000, 500);
    bal['157'] = equip;
    bal['158'] = -Math.round(equip * (0.15 + r.next() * 0.35) / 10) * 10;
    bal['201'] = -r.amt(800, 5000, 25);
    bal['212'] = -r.amt(300, 2000, 10);
    bal['209'] = -r.amt(500, 3000, 50);
    if (hasNote) {
      bal['200'] = -r.amt(10000, 30000, 1000);
      bal['230'] = -r.amt(100, 600, 10);
    }
    bal['306'] = r.amt(6000, 24000, 500);

    let sum = 0;
    Object.keys(bal).forEach(function (k) { sum += bal[k]; });
    if (sum < 10000) {
      const bump = 10000 - sum + r.amt(1000, 8000, 5);
      bal['101'] += bump;
      sum += bump;
    }
    bal['301'] = -sum;

    const atb = Object.keys(bal).sort().map(function (no) {
      return { acct: no, debit: bal[no] > 0 ? bal[no] : 0, credit: bal[no] < 0 ? -bal[no] : 0 };
    });

    const typeOf = {};
    chart.forEach(function (a) { typeOf[a.no] = a.type; });
    const revenues = Object.keys(bal).filter(function (no) { return typeOf[no] === 'R'; }).sort();
    const expenses = Object.keys(bal).filter(function (no) { return typeOf[no] === 'X'; }).sort();
    const sumOf = function (list) { return list.reduce(function (a, no) { return a + Math.abs(bal[no]); }, 0); };
    const netIncome = sumOf(revenues) - sumOf(expenses);
    const capital = -bal['301'];
    const drawing = bal['306'];

    return {
      date: fmtDate(11, 31),
      atb: atb,
      revenues: revenues,
      expenses: expenses,
      netIncome: netIncome,
      beginningCapital: capital,
      drawing: drawing,
      endingCapital: capital + netIncome - drawing,
      // close: accounts zeroed by the entry; target: account receiving the balance.
      // A complete answer selects both sides: close + target.
      steps: [
        { key: 'revenues', close: revenues, target: '350', amount: sumOf(revenues), points: 6 },
        { key: 'expenses', close: expenses, target: '350', amount: sumOf(expenses), points: 6 },
        { key: 'incomeSummary', close: ['350'], target: '301', amount: Math.abs(netIncome), points: 6 },
        { key: 'drawing', close: ['306'], target: '301', amount: drawing, points: 6 }
      ].map(function (st) { st.expected = st.close.concat([st.target]); return st; })
    };
  }

  // ---------- Build a full exam ----------

  function generateExam(code) {
    code = normalizeCode(code);
    const r = makeRng('ACC211|' + code);
    const business = r.pick(BUSINESSES);
    const owner = r.pick(OWNERS);
    const chart = buildChart(owner);
    const accounts = {};
    chart.forEach(function (a) { accounts[a.no] = a; });
    return {
      code: code,
      business: business,
      owner: owner,
      chart: chart,
      accounts: accounts,
      phase1: buildPhase1(makeRng('P1|' + code), business, owner),
      phase2: buildPhase2(makeRng('P2|' + code), business, owner),
      phase3: buildPhase3(makeRng('P3|' + code), chart)
    };
  }

  // ---------- Grading ----------

  function parseAmount(v) {
    if (v === null || v === undefined) return NaN;
    const s = String(v).replace(/[$,\s]/g, '');
    if (s === '') return NaN;
    const n = Number(s);
    return isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  }

  // Turn raw input rows {acct, dr, cr} into clean lines; rows that are blank are dropped,
  // rows that are malformed (no account, both sides, no amount) are kept as invalid.
  function normalizeLines(rows) {
    const out = [];
    (rows || []).forEach(function (row) {
      const d = parseAmount(row.dr), c = parseAmount(row.cr);
      const hasD = !isNaN(d) && d !== 0, hasC = !isNaN(c) && c !== 0;
      if (!row.acct && !hasD && !hasC) return;
      if (!row.acct || hasD === hasC) { out.push({ invalid: true, acct: row.acct || '' }); return; }
      out.push({ acct: row.acct, side: hasD ? 'dr' : 'cr', amount: hasD ? d : c });
    });
    return out;
  }

  // Partial credit: each expected line earns 1 (account, side and amount correct)
  // or 0.5 (account and side correct, wrong amount). Each extra or invalid line costs 0.5.
  function gradeEntry(expected, rows, points) {
    const lines = normalizeLines(rows);
    const used = new Array(lines.length).fill(false);
    let credit = 0;
    expected.forEach(function (e) {
      let best = -1, bestScore = 0;
      lines.forEach(function (l, i) {
        if (used[i] || l.invalid || l.acct !== e.acct || l.side !== e.side) return;
        const s = Math.abs(l.amount - e.amount) < 0.005 ? 1 : 0.5;
        if (s > bestScore) { bestScore = s; best = i; }
      });
      if (best >= 0) { used[best] = true; credit += bestScore; }
    });
    const extras = used.filter(function (u) { return !u; }).length;
    credit = Math.max(0, credit - 0.5 * extras);
    return round2(points * credit / expected.length);
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  function gradeExam(exam, answers) {
    answers = answers || {};
    const p1 = exam.phase1.transactions.map(function (t) {
      return { id: t.id, earned: gradeEntry(t.lines, (answers.p1 || {})[t.id], t.points), points: t.points };
    });
    const p2 = exam.phase2.items.map(function (it) {
      return { id: it.id, earned: gradeEntry(it.lines, (answers.p2 || {})[it.id], it.points), points: it.points };
    });
    const sel = (answers.p3 && answers.p3.selections) || [];
    const amts = (answers.p3 && answers.p3.amounts) || [];
    const bal = atbBalances(exam.phase3);
    const p3 = exam.phase3.steps.map(function (s, i) {
      const g = gradeClosingStep(s, sel[i] || [], amts[i], bal);
      return { id: s.key, earned: g.earned, accountPts: g.accountPts, amountPts: g.amountPts, points: s.points };
    });
    const total = function (list) { return round2(list.reduce(function (a, x) { return a + x.earned; }, 0)); };
    const possible = function (list) { return list.reduce(function (a, x) { return a + x.points; }, 0); };
    const result = {
      phase1: { items: p1, score: total(p1), possible: possible(p1) },
      phase2: { items: p2, score: total(p2), possible: possible(p2) },
      phase3: { items: p3, score: total(p3), possible: possible(p3) }
    };
    result.total = round2(result.phase1.score + result.phase2.score + result.phase3.score);
    result.possible = result.phase1.possible + result.phase2.possible + result.phase3.possible;
    return result;
  }

  // Apply one closing step the way accounting software would: zero out each selected
  // account and post the net to the target account.
  // The receiving account in a selection: owner's capital if chosen (it is never closed),
  // otherwise Income Summary. Without either, the entry has only one side.
  function receiverOf(selected) {
    if (selected.includes('301')) return '301';
    if (selected.includes('350')) return '350';
    return null;
  }

  // Apply one closing entry: zero out each selected account and post the net to the
  // receiving account. If the student keyed an amount for the receiving line, the entry
  // posts with that amount (so a keying error flows through, as it would in a real ledger).
  // Returns the true amount transferred for grading. Mutates balances.
  function applyClosing(balances, selected, keyed) {
    const target = receiverOf(selected);
    const lines = [];
    let net = 0;
    if (!target) return { lines: lines, target: null, amount: 0 };
    selected.forEach(function (no) {
      const b = balances[no] || 0;
      if (no === target || Math.abs(b) < 0.005) return;
      lines.push(b > 0 ? cr(no, b) : dr(no, -b));
      net += b;
      balances[no] = 0;
    });
    const k = parseAmount(keyed);
    const posted = isNaN(k) ? Math.abs(net) : Math.abs(k);
    if (Math.abs(net) >= 0.005 && posted >= 0.005) {
      lines.push(net > 0 ? dr(target, posted) : cr(target, posted));
      balances[target] = (balances[target] || 0) + (net > 0 ? posted : -posted);
    }
    // debits first, then credits
    lines.sort(function (a, b) { return a.side === b.side ? 0 : (a.side === 'dr' ? -1 : 1); });
    return { lines: lines, target: target, amount: round2(Math.abs(net)) };
  }

  // Score one closing entry and advance balances. Account points: each account in the
  // full entry (accounts closed + receiving account) earns credit if selected, but an
  // account being closed earns nothing if its balance was already zero; each wrong
  // account deducts one. Amount points: the typed amount must equal what the entry
  // actually transferred, and only count when some account credit was earned.
  function gradeClosingStep(step, selected, typedAmount, balances) {
    const accountMax = step.points * 2 / 3, amountMax = step.points - accountMax;
    let right = 0, wrong = 0;
    selected.forEach(function (no) {
      if (!step.expected.includes(no)) { wrong++; return; }
      if (no === step.target || Math.abs(balances[no] || 0) >= 0.005) right++;
    });
    const accountPts = round2(accountMax * Math.max(0, right - wrong) / step.expected.length);
    const result = applyClosing(balances, selected, typedAmount);
    const typed = parseAmount(typedAmount);
    const amountPts = accountPts > 0 && result.amount > 0 && Math.abs(typed - result.amount) < 0.005 ? amountMax : 0;
    return { accountPts: accountPts, amountPts: amountPts, earned: round2(accountPts + amountPts), transferred: result.amount, lines: result.lines };
  }

  function atbBalances(phase3) {
    const bal = { '350': 0 };
    phase3.atb.forEach(function (row) { bal[row.acct] = row.debit - row.credit; });
    return bal;
  }

  // Tamper check printed on the report; the instructor tool recomputes it.
  // The attempt number is part of the code from attempt 2 on, so a report can't be
  // relabeled as a different attempt.
  function checkCode(code, name, result, attempt) {
    let s = [normalizeCode(code), String(name || '').trim().toLowerCase(),
      result.phase1.score.toFixed(2), result.phase2.score.toFixed(2),
      result.phase3.score.toFixed(2), result.total.toFixed(2)].join('|');
    if (attempt > 1) s += '|A' + attempt;
    return hashString('ACC211-CHECK|' + s).toString(36).toUpperCase().slice(-8);
  }

  const api = {
    newVersionCode: newVersionCode,
    normalizeCode: normalizeCode,
    generateExam: generateExam,
    gradeExam: gradeExam,
    gradeEntry: gradeEntry,
    normalizeLines: normalizeLines,
    parseAmount: parseAmount,
    applyClosing: applyClosing,
    receiverOf: receiverOf,
    gradeClosingStep: gradeClosingStep,
    atbBalances: atbBalances,
    checkCode: checkCode,
    money: money
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ExamEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
