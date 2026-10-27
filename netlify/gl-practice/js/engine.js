/* ACC 211 General Ledger Practice: Bright Mart data, entry checking, ledger posting and the income statement.
   Pure functions only, so the same file runs in the browser and in the Node tests. */
(function (root) {
  'use strict';

  const BUSINESS = 'Bright Mart';
  const PERIOD = 'For the Month Ended November 30';

  // type: A asset, L liability, E equity, D drawing, R revenue, CR contra revenue, C cost of goods sold,
  //       X operating expense, OX other expense. Periodic-system accounts are included on purpose:
  //       a perpetual system never uses them, and choosing one is a common mistake.
  const CHART = [
    { no: '101', name: 'Cash', type: 'A' },
    { no: '112', name: 'Accounts Receivable', type: 'A' },
    { no: '120', name: 'Merchandise Inventory', type: 'A' },
    { no: '126', name: 'Supplies', type: 'A' },
    { no: '201', name: 'Accounts Payable', type: 'L' },
    { no: '230', name: 'Interest Payable', type: 'L' },
    { no: '301', name: 'Owner’s Capital', type: 'E' },
    { no: '306', name: 'Owner’s Drawing', type: 'D' },
    { no: '401', name: 'Sales Revenue', type: 'R' },
    { no: '412', name: 'Sales Returns and Allowances', type: 'CR' },
    { no: '414', name: 'Sales Discounts', type: 'CR' },
    { no: '505', name: 'Cost of Goods Sold', type: 'C' },
    { no: '510', name: 'Purchases', type: 'C' },
    { no: '512', name: 'Purchase Returns and Allowances', type: 'C' },
    { no: '514', name: 'Purchase Discounts', type: 'C' },
    { no: '516', name: 'Freight-In', type: 'C' },
    { no: '610', name: 'Salaries Expense', type: 'X' },
    { no: '620', name: 'Rent Expense', type: 'X' },
    { no: '630', name: 'Delivery Expense', type: 'X' },
    { no: '640', name: 'Utilities Expense', type: 'X' },
    { no: '710', name: 'Interest Expense', type: 'OX' }
  ];
  const ACCOUNTS = {};
  CHART.forEach(function (a) { ACCOUNTS[a.no] = a; });

  const OPENING = { date: 'Nov 1', text: 'Opening balance', lines: [dr('101', 20000), cr('301', 20000)] };

  function dr(acct, amount) { return { acct: acct, side: 'dr', amount: amount }; }
  function cr(acct, amount) { return { acct: acct, side: 'cr', amount: amount }; }

  // The transactions from both videos, in date order, plus the month-end expenses.
  const TRANSACTIONS = [
    { id: 't1', date: 'Nov 1', topic: 'Purchase for cash',
      text: 'Purchased merchandise for $5,000 cash.',
      lines: [dr('120', 5000), cr('101', 5000)] },
    { id: 't2', date: 'Nov 3', topic: 'Purchase on account',
      text: 'Purchased merchandise from Ace Supply on account, $10,000, terms 2/10, n/30, FOB shipping point.',
      lines: [dr('120', 10000), cr('201', 10000)] },
    { id: 't3', date: 'Nov 4', topic: 'Freight-in',
      text: 'Paid $300 cash to the carrier for freight on the November 3 purchase.',
      lines: [dr('120', 300), cr('101', 300)] },
    { id: 't4', date: 'Nov 6', topic: 'Purchase return',
      text: 'Returned $1,000 of the November 3 merchandise to Ace Supply.',
      lines: [dr('201', 1000), cr('120', 1000)] },
    { id: 't5', date: 'Nov 8', topic: 'Purchase allowance',
      text: 'Received a $500 allowance from Ace Supply for slightly damaged goods that Bright Mart kept.',
      lines: [dr('201', 500), cr('120', 500)] },
    { id: 't6', date: 'Nov 13', topic: 'Payment within discount period',
      text: 'Paid Ace Supply the balance due, within the discount period.',
      lines: [dr('201', 8500), cr('120', 170), cr('101', 8330)] },
    { id: 't7', date: 'Nov 15', topic: 'Cash sale',
      text: 'Sold merchandise for $3,000 cash. The cost of the merchandise sold was $1,800.',
      lines: [dr('101', 3000), cr('401', 3000), dr('505', 1800), cr('120', 1800)] },
    { id: 't8', date: 'Nov 18', topic: 'Sale on account',
      text: 'Sold merchandise to Rosa’s Shop on account, $8,000, terms 2/10, n/30, FOB destination. The cost of the merchandise sold was $4,800.',
      lines: [dr('112', 8000), cr('401', 8000), dr('505', 4800), cr('120', 4800)] },
    { id: 't9', date: 'Nov 18', topic: 'Freight-out',
      text: 'Paid $200 cash to the carrier to deliver the November 18 sale to Rosa’s Shop.',
      lines: [dr('630', 200), cr('101', 200)] },
    { id: 't10', date: 'Nov 21', topic: 'Sales return',
      text: 'Rosa’s Shop returned $1,000 of merchandise. The goods cost $600 and are in good condition, so they go back on the shelf.',
      lines: [dr('412', 1000), cr('112', 1000), dr('120', 600), cr('505', 600)] },
    { id: 't11', date: 'Nov 23', topic: 'Sales allowance',
      text: 'Granted Rosa’s Shop a $500 allowance for slightly damaged merchandise that it kept.',
      lines: [dr('412', 500), cr('112', 500)] },
    { id: 't12', date: 'Nov 28', topic: 'Collection within discount period',
      text: 'Collected the balance due from Rosa’s Shop, within the discount period.',
      lines: [dr('101', 6370), dr('414', 130), cr('112', 6500)] },
    { id: 't13', date: 'Nov 30', topic: 'Salaries',
      text: 'Paid $1,200 cash for employee salaries for November.',
      lines: [dr('610', 1200), cr('101', 1200)] },
    { id: 't14', date: 'Nov 30', topic: 'Rent',
      text: 'Paid $900 cash for November store rent.',
      lines: [dr('620', 900), cr('101', 900)] },
    { id: 't15', date: 'Nov 30', topic: 'Interest',
      text: 'Paid $70 cash for interest on the business credit line for November.',
      lines: [dr('710', 70), cr('101', 70)] }
  ];
  const BY_ID = {};
  TRANSACTIONS.forEach(function (t) { BY_ID[t.id] = t; });

  function parseAmount(v) {
    if (v === null || v === undefined) return NaN;
    const s = String(v).replace(/[$,\s]/g, '');
    if (s === '') return NaN;
    const n = Number(s);
    return isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  }

  function money(n) {
    const neg = n < 0;
    const v = Math.abs(Math.round(n * 100) / 100);
    return (neg ? '-$' : '$') + v.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
  }

  function isBlank(r) {
    return !r.acct && !String(r.dr || '').trim() && !String(r.cr || '').trim();
  }

  // Check a student's rows against the key. Lines may be in any order, and a two-entry transaction may be
  // entered as one compound entry. Returns a status per row and an overall verdict.
  function checkEntry(id, rows) {
    const key = BY_ID[id].lines.map(function (l) { return { acct: l.acct, side: l.side, amount: l.amount, used: false }; });
    let dTotal = 0, cTotal = 0, filled = 0, okCount = 0, problems = 0;
    const statuses = rows.map(function (r) {
      if (isBlank(r)) return 'blank';
      filled++;
      const d = parseAmount(r.dr), c = parseAmount(r.cr);
      const hasD = !isNaN(d) && d !== 0, hasC = !isNaN(c) && c !== 0;
      if (hasD) dTotal += d;
      if (hasC) cTotal += c;
      if (!r.acct || hasD === hasC) { problems++; return 'incomplete'; }
      const side = hasD ? 'dr' : 'cr', amount = hasD ? d : c;
      const match = key.find(function (k) { return !k.used && k.acct === r.acct && k.side === side && k.amount === amount; });
      if (match) { match.used = true; okCount++; return 'ok'; }
      problems++;
      return 'bad';
    });
    const missing = key.filter(function (k) { return !k.used; }).length;
    const unbalanced = Math.round((dTotal - cTotal) * 100) !== 0;
    const correct = filled > 0 && problems === 0 && missing === 0;

    let message;
    if (correct) message = 'Correct! This entry has been posted to the general ledger.';
    else if (!filled) message = 'Enter the journal entry, then check it.';
    else {
      const parts = [okCount + ' of ' + filled + ' line' + (filled === 1 ? ' is' : 's are') + ' correct.'];
      if (problems) parts.push('Fix the line' + (problems === 1 ? '' : 's') + ' marked ✗.');
      if (unbalanced) parts.push('Total debits do not equal total credits.');
      if (!problems && missing) parts.push('This entry needs more lines.');
      message = 'Not yet. ' + parts.join(' ');
    }
    return { correct: correct, statuses: statuses, okCount: okCount, filled: filled, missing: missing, unbalanced: unbalanced, message: message };
  }

  // Post the opening balances and every completed transaction. Returns accounts with their postings and balances.
  function buildLedger(completedIds) {
    const done = {};
    (completedIds || []).forEach(function (id) { done[id] = true; });
    const ledger = {};
    CHART.forEach(function (a) { ledger[a.no] = { no: a.no, name: a.name, type: a.type, postings: [], debits: 0, credits: 0 }; });
    const entries = [OPENING].concat(TRANSACTIONS.filter(function (t) { return done[t.id]; }));
    entries.forEach(function (t, i) {
      t.lines.forEach(function (l) {
        const a = ledger[l.acct];
        if (l.side === 'dr') a.debits += l.amount; else a.credits += l.amount;
        a.postings.push({ date: t.date, ref: t.id ? 'J' + t.id.slice(1) : 'Bal.', side: l.side, amount: l.amount, balance: a.debits - a.credits });
      });
    });
    Object.keys(ledger).forEach(function (no) { ledger[no].balance = ledger[no].debits - ledger[no].credits; });
    return ledger;
  }

  // Normal-balance view of an account: positive when it sits on its normal side.
  function normalBalance(a) {
    const creditNormal = a.type === 'L' || a.type === 'E' || a.type === 'R';
    return creditNormal ? -a.balance : a.balance;
  }

  function trialBalance(ledger) {
    const rows = CHART.map(function (c) { return ledger[c.no]; })
      .filter(function (a) { return a.balance !== 0; })
      .map(function (a) { return { no: a.no, name: a.name, debit: a.balance > 0 ? a.balance : 0, credit: a.balance < 0 ? -a.balance : 0 }; });
    const debit = rows.reduce(function (t, r) { return t + r.debit; }, 0);
    const credit = rows.reduce(function (t, r) { return t + r.credit; }, 0);
    return { rows: rows, debit: debit, credit: credit };
  }

  // Multi-step income statement from ledger balances.
  function incomeStatement(ledger) {
    const pick = function (types) {
      return CHART.filter(function (c) { return types.indexOf(c.type) >= 0 && ledger[c.no].balance !== 0; })
        .map(function (c) { return { no: c.no, name: c.name, amount: normalBalance(ledger[c.no]) }; });
    };
    const sum = function (xs) { return xs.reduce(function (t, x) { return t + x.amount; }, 0); };
    const sales = normalBalance(ledger['401']);
    const contra = pick(['CR']);
    const contraTotal = sum(contra);
    const netSales = sales - contraTotal;
    const cogs = pick(['C']);
    const cogsTotal = sum(cogs);
    const grossProfit = netSales - cogsTotal;
    const opex = pick(['X']);
    const opexTotal = sum(opex);
    const incomeFromOps = grossProfit - opexTotal;
    const other = pick(['OX']);
    const otherTotal = sum(other);
    return {
      business: BUSINESS, period: PERIOD,
      sales: sales, contra: contra, contraTotal: contraTotal, netSales: netSales,
      cogs: cogs, cogsTotal: cogsTotal, grossProfit: grossProfit,
      opex: opex, opexTotal: opexTotal, incomeFromOps: incomeFromOps,
      other: other, otherTotal: otherTotal, netIncome: incomeFromOps - otherTotal
    };
  }

  // Short verification code for a certificate, from the name and completion time.
  function certificateId(name, completedAt) {
    const s = String(name).toLowerCase().replace(/\s+/g, ' ').trim() + '|' + completedAt + '|bright-mart-gl';
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < s.length; i++) {
      h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619) >>> 0;
      h2 = Math.imul(h2 + s.charCodeAt(i), 2246822519) >>> 0;
    }
    const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 8; i++) out += ALPHA[((i < 4 ? h1 : h2) >>> ((i % 4) * 7)) & 31];
    return out.slice(0, 4) + '-' + out.slice(4);
  }

  const api = {
    BUSINESS: BUSINESS, PERIOD: PERIOD, CHART: CHART, ACCOUNTS: ACCOUNTS, OPENING: OPENING, TRANSACTIONS: TRANSACTIONS,
    parseAmount: parseAmount, money: money, isBlank: isBlank, checkEntry: checkEntry, buildLedger: buildLedger,
    normalBalance: normalBalance, trialBalance: trialBalance, incomeStatement: incomeStatement, certificateId: certificateId
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GLEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
