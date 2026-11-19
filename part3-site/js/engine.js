/*
 * ACC 211 Part 3 engine: financial statements for a merchandising business (perpetual).
 * Pure logic (no DOM). Holds the fixed adjusted trial balance, grades the account
 * classification, and builds the three financial statements from the classification.
 */
(function (root) {
  'use strict';

  // ---------- Fixed data ----------

  const BIZ = { name: 'Ridgeline Outdoor Supply', owner: 'Morgan Cruz', year: 2026 };
  const Y = BIZ.year;

  // cls: the correct category. pair: for accumulated depreciation, the equipment account it reduces.
  const ACCOUNTS = [
    { no: 101, name: 'Cash', bal: 28400, side: 'dr', cls: 'ca' },
    { no: 112, name: 'Accounts Receivable', bal: 36200, side: 'dr', cls: 'ca' },
    { no: 120, name: 'Merchandise Inventory', bal: 84500, side: 'dr', cls: 'ca' },
    { no: 126, name: 'Store Supplies', bal: 2300, side: 'dr', cls: 'ca' },
    { no: 127, name: 'Office Supplies', bal: 1100, side: 'dr', cls: 'ca' },
    { no: 130, name: 'Prepaid Insurance', bal: 3600, side: 'dr', cls: 'ca' },
    { no: 181, name: 'Store Equipment', bal: 96000, side: 'dr', cls: 'pe' },
    { no: 182, name: 'Accumulated Depreciation - Store Equipment', bal: 31200, side: 'cr', cls: 'cpe', pair: 181 },
    { no: 185, name: 'Office Equipment', bal: 42000, side: 'dr', cls: 'pe' },
    { no: 186, name: 'Accumulated Depreciation - Office Equipment', bal: 14700, side: 'cr', cls: 'cpe', pair: 185 },
    { no: 201, name: 'Accounts Payable', bal: 41800, side: 'cr', cls: 'cl' },
    { no: 211, name: 'Salaries Payable', bal: 4600, side: 'cr', cls: 'cl' },
    { no: 212, name: 'Interest Payable', bal: 1500, side: 'cr', cls: 'cl' },
    { no: 216, name: 'Unearned Revenue', bal: 3200, side: 'cr', cls: 'cl' },
    { no: 251, name: 'Notes Payable (due 2030)', bal: 60000, side: 'cr', cls: 'ltl' },
    { no: 301, name: BIZ.owner + ', Capital', bal: 115100, side: 'cr', cls: 'cap' },
    { no: 302, name: BIZ.owner + ', Drawing', bal: 40000, side: 'dr', cls: 'draw' },
    { no: 401, name: 'Sales', bal: 612000, side: 'cr', cls: 'rev' },
    { no: 412, name: 'Sales Returns and Allowances', bal: 14800, side: 'dr', cls: 'contra' },
    { no: 413, name: 'Sales Discounts', bal: 7200, side: 'dr', cls: 'contra' },
    { no: 501, name: 'Cost of Goods Sold', bal: 362500, side: 'dr', cls: 'cogs' },
    { no: 611, name: 'Sales Salaries Expense', bal: 68400, side: 'dr', cls: 'sell' },
    { no: 612, name: 'Advertising Expense', bal: 12600, side: 'dr', cls: 'sell' },
    { no: 613, name: 'Delivery Expense', bal: 8900, side: 'dr', cls: 'sell' },
    { no: 614, name: 'Depreciation Expense - Store Equipment', bal: 9600, side: 'dr', cls: 'sell' },
    { no: 615, name: 'Store Supplies Expense', bal: 3400, side: 'dr', cls: 'sell' },
    { no: 711, name: 'Office Salaries Expense', bal: 41200, side: 'dr', cls: 'admin' },
    { no: 712, name: 'Utilities Expense', bal: 7800, side: 'dr', cls: 'admin' },
    { no: 713, name: 'Insurance Expense', bal: 4200, side: 'dr', cls: 'admin' },
    { no: 714, name: 'Depreciation Expense - Office Equipment', bal: 4900, side: 'dr', cls: 'admin' },
    { no: 715, name: 'Office Supplies Expense', bal: 1500, side: 'dr', cls: 'admin' },
    { no: 811, name: 'Interest Revenue', bal: 1800, side: 'cr', cls: 'oi' },
    { no: 911, name: 'Interest Expense', bal: 4800, side: 'dr', cls: 'oe' }
  ];
  const ACCT = {};
  ACCOUNTS.forEach(a => { ACCT[a.no] = a; });

  // Why each account goes where it goes (shown after a Check when a student misplaces it).
  const WHY = {
    101: 'Cash is spent within a year in normal operations, so it is a current asset.',
    112: 'Customers will pay within a year, so Accounts Receivable is a current asset.',
    120: 'Merchandise on hand will be sold within a year, so it is a current asset.',
    126: 'Supplies on hand will be used within a year, so they are a current asset.',
    127: 'Supplies on hand will be used within a year, so they are a current asset.',
    130: 'Insurance paid in advance will be used up within a year, so it is a current asset.',
    181: 'Equipment is a long-lived asset used in the business, so it belongs in property and equipment.',
    185: 'Equipment is a long-lived asset used in the business, so it belongs in property and equipment.',
    182: 'Accumulated depreciation is a contra asset. It is deducted from Store Equipment in the property and equipment group.',
    186: 'Accumulated depreciation is a contra asset. It is deducted from Office Equipment in the property and equipment group.',
    201: 'Amounts owed to suppliers are due within a year: a current liability.',
    211: 'Salaries owed to employees are due within a year: a current liability.',
    212: 'Interest owed is due within a year: a current liability.',
    216: 'The business owes customers goods within a year: a current liability.',
    251: 'The note is not due until 2030, more than a year away: a long-term liability.',
    301: 'The Capital balance on the adjusted trial balance is the beginning balance. It starts the statement of owner\'s equity.',
    302: 'Withdrawals reduce capital on the statement of owner\'s equity. They are not an expense.',
    401: 'Sales is the revenue from selling merchandise. It is the first line of the income statement.',
    412: 'Sales Returns and Allowances is a contra revenue: it is subtracted from Sales to get net sales.',
    413: 'Sales Discounts is a contra revenue: it is subtracted from Sales to get net sales.',
    501: 'Cost of Goods Sold is the cost of the merchandise sold. Net sales minus Cost of Goods Sold is gross profit.',
    611: 'Salaries of the sales staff are a cost of selling merchandise: a selling expense.',
    612: 'Advertising helps sell merchandise: a selling expense.',
    613: 'Delivering goods to customers is part of selling: a selling expense.',
    614: 'Store equipment is used to sell merchandise, so its depreciation is a selling expense.',
    615: 'Store supplies are used to sell merchandise: a selling expense.',
    711: 'Office salaries support running the business as a whole: an administrative expense.',
    712: 'Utilities support running the business as a whole: an administrative expense.',
    713: 'Insurance protects the business as a whole: an administrative expense.',
    714: 'Office equipment supports running the business, so its depreciation is an administrative expense.',
    715: 'Office supplies support running the business: an administrative expense.',
    811: 'Interest Revenue does not come from selling merchandise, so it is other income.',
    911: 'Interest Expense is a cost of borrowing, not of selling or running operations, so it is other expense.'
  };

  const CATS = [
    { id: 'rev', stmt: 'Income Statement', label: 'Sales revenue', tip: 'Revenue from selling merchandise.' },
    { id: 'contra', stmt: 'Income Statement', label: 'Deduction from sales (contra revenue)', tip: 'Subtracted from Sales to get net sales.' },
    { id: 'cogs', stmt: 'Income Statement', label: 'Cost of goods sold', tip: 'The cost of the merchandise that was sold.' },
    { id: 'sell', stmt: 'Income Statement', label: 'Selling expense', tip: 'Costs of selling and delivering merchandise.' },
    { id: 'admin', stmt: 'Income Statement', label: 'Administrative expense', tip: 'Costs of running the office and the business as a whole.' },
    { id: 'oi', stmt: 'Income Statement', label: 'Other income', tip: 'Income that does not come from selling merchandise.' },
    { id: 'oe', stmt: 'Income Statement', label: 'Other expense', tip: 'Expenses not related to normal operations, such as interest.' },
    { id: 'cap', stmt: 'Statement of Owner\'s Equity', label: 'Beginning capital', tip: 'The owner\'s capital at the start of the year.' },
    { id: 'draw', stmt: 'Statement of Owner\'s Equity', label: 'Withdrawals', tip: 'Cash or assets the owner took out for personal use.' },
    { id: 'ca', stmt: 'Balance Sheet', label: 'Current asset', tip: 'Cash, or assets used up or turned into cash within a year.' },
    { id: 'pe', stmt: 'Balance Sheet', label: 'Property and equipment', tip: 'Long-lived assets used in the business.' },
    { id: 'cpe', stmt: 'Balance Sheet', label: 'Contra asset: deduction from property and equipment', tip: 'Accumulated depreciation, subtracted from its equipment account.' },
    { id: 'cl', stmt: 'Balance Sheet', label: 'Current liability', tip: 'Debts due within a year.' },
    { id: 'ltl', stmt: 'Balance Sheet', label: 'Long-term liability', tip: 'Debts due more than a year from now.' }
  ];
  const CAT = {};
  CATS.forEach(c => { CAT[c.id] = c; });

  // ---------- Helpers ----------

  function money(n) { return (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US'); }
  function plain(n) { const s = Math.abs(Math.round(n)).toLocaleString('en-US'); return n < 0 ? '(' + s + ')' : s; }
  const sum = list => list.reduce((s, a) => s + a.bal, 0);

  // ---------- Grading ----------

  // answers: { [accountNo]: categoryId }
  function gradeClassify(answers) {
    const items = {};
    let right = 0, answered = 0;
    ACCOUNTS.forEach(a => {
      const pick = answers && answers[a.no];
      if (pick) answered += 1;
      if (pick === a.cls) { right += 1; items[a.no] = { ok: true }; }
      else items[a.no] = { ok: false, note: pick && CAT[pick] ? 'Not ' + CAT[pick].label.toLowerCase() + '. ' + WHY[a.no] : 'Choose a category.' };
    });
    return { right, answered, total: ACCOUNTS.length, allRight: right === ACCOUNTS.length, items };
  }

  function answerKey() { const k = {}; ACCOUNTS.forEach(a => { k[a.no] = a.cls; }); return k; }

  // ---------- Statements ----------
  // Each statement is a list of rows: { label, ind, kind, amts: [c1, c2, c3], ul: [..], dbl: [..] }.
  // kind: 'hdr' (caption), 'big' (centered group title), 'item', 'sub' (subtotal), 'grand' (final total).
  // ul / dbl mark a single or double rule under that amount, as on a printed statement.

  function row(label, ind, col, amt, opt) {
    const r = { label, ind, kind: (opt && opt.kind) || 'item', amts: [null, null, null], ul: [false, false, false], dbl: [false, false, false] };
    if (col) r.amts[col - 1] = amt;
    if (opt && opt.ul) r.ul[col - 1] = true;
    if (opt && opt.dbl) r.dbl[col - 1] = true;
    return r;
  }
  const hdr = (label, ind, big) => ({ label, ind, kind: big ? 'big' : 'hdr', amts: [null, null, null], ul: [false, false, false], dbl: [false, false, false] });

  function buildStatements(answers) {
    const cls = answers || answerKey();
    const list = id => ACCOUNTS.filter(a => cls[a.no] === id);

    // Income statement
    const IS = [];
    const rev = list('rev'), contra = list('contra');
    const sales = sum(rev), ded = sum(contra), ns = sales - ded;
    IS.push(hdr('Revenue from sales:', 0));
    rev.forEach(a => IS.push(row(a.name, 1, 2, a.bal)));
    contra.forEach((a, i) => {
      const r = row((i === 0 ? 'Less: ' : '') + a.name, i === 0 ? 1 : 2, 1, a.bal, { ul: i === contra.length - 1 });
      if (i === contra.length - 1) { r.amts[1] = ded; r.ul[1] = true; }
      IS.push(r);
    });
    IS.push(row('Net sales', 1, 3, ns, { kind: 'sub' }));
    const cogs = sum(list('cogs'));
    list('cogs').forEach((a, i, all) => IS.push(row(a.name, 0, 3, a.bal, { ul: i === all.length - 1 })));
    const gp = ns - cogs;
    IS.push(row('Gross profit', 0, 3, gp, { kind: 'sub' }));
    IS.push(hdr('Operating expenses:', 0));
    const opGroup = (id, title, totalLabel, last) => {
      const items = list(id), t = sum(items);
      IS.push(hdr(title, 1));
      items.forEach((a, i) => IS.push(row(a.name, 2, 1, a.bal, { ul: i === items.length - 1 })));
      IS.push(row(totalLabel, 2, 2, t, { kind: 'sub', ul: last }));
      return t;
    };
    const tse = opGroup('sell', 'Selling expenses:', 'Total selling expenses', false);
    const tae = opGroup('admin', 'Administrative expenses:', 'Total administrative expenses', true);
    const toe = tse + tae;
    IS.push(row('Total operating expenses', 1, 3, toe, { kind: 'sub', ul: true }));
    const ifo = gp - toe;
    IS.push(row('Income from operations', 0, 3, ifo, { kind: 'sub' }));
    const oi = list('oi'), oe = list('oe');
    const net = sum(oi) - sum(oe);
    IS.push(hdr('Other income and expense:', 0));
    oi.forEach(a => IS.push(row(a.name, 1, 2, a.bal)));
    oe.forEach((a, i) => IS.push(row((i === 0 ? 'Less: ' : '') + a.name, 1, 2, a.bal, { ul: i === oe.length - 1 })));
    IS.push(row(net < 0 ? 'Net other expense' : 'Net other income', 1, 3, net, { kind: 'sub', ul: true }));
    const ni = ifo + net;
    IS.push(row(ni < 0 ? 'Net loss' : 'Net income', 0, 3, ni, { kind: 'grand', dbl: true }));

    // Statement of owner's equity
    const P = BIZ.owner;
    const beg = sum(list('cap')), wd = sum(list('draw')), inc = ni - wd, end = beg + inc;
    const SOE = [
      row(P + ', Capital, January 1, ' + Y, 0, 3, beg),
      row((ni < 0 ? 'Less: Net loss' : 'Add: Net income') + ' for the year', 1, 2, Math.abs(ni)),
      row('Less: Withdrawals', 1, 2, wd, { ul: true }),
      row((inc < 0 ? 'Decrease' : 'Increase') + ' in owner\'s equity', 1, 3, inc, { kind: 'sub', ul: true }),
      row(P + ', Capital, December 31, ' + Y, 0, 3, end, { kind: 'grand', dbl: true })
    ];

    // Classified balance sheet
    const BS = [];
    const ca = list('ca'), tca = sum(ca);
    BS.push(hdr('Assets', 0, true));
    BS.push(hdr('Current assets:', 0));
    ca.forEach((a, i) => BS.push(row(a.name, 1, 2, a.bal, { ul: i === ca.length - 1 })));
    BS.push(row('Total current assets', 1, 3, tca, { kind: 'sub' }));
    BS.push(hdr('Property and equipment:', 0));
    const pe = list('pe'), cpe = list('cpe');
    let tpe = 0;
    pe.forEach((a, i) => {
      BS.push(row(a.name, 1, 1, a.bal));
      const contras = cpe.filter(c => c.pair === a.no);
      const bv = a.bal - sum(contras);
      tpe += bv;
      contras.forEach((c, j) => {
        const r = row('Less: Accumulated depreciation', 2, 1, c.bal, { ul: true });
        if (j === contras.length - 1) { r.amts[1] = bv; r.ul[1] = i === pe.length - 1; }
        BS.push(r);
      });
      if (!contras.length) { const last = BS[BS.length - 1]; last.amts = [null, a.bal, null]; }
    });
    BS.push(row('Total property and equipment', 1, 3, tpe, { kind: 'sub', ul: true }));
    const ta = tca + tpe;
    BS.push(row('Total assets', 0, 3, ta, { kind: 'grand', dbl: true }));
    BS.push(hdr('Liabilities', 0, true));
    BS.push(hdr('Current liabilities:', 0));
    const cl = list('cl'), tcl = sum(cl);
    cl.forEach((a, i) => BS.push(row(a.name, 1, 2, a.bal, { ul: i === cl.length - 1 })));
    BS.push(row('Total current liabilities', 1, 3, tcl, { kind: 'sub' }));
    BS.push(hdr('Long-term liabilities:', 0));
    const ltl = list('ltl'), tltl = sum(ltl);
    ltl.forEach((a, i) => BS.push(row(a.name, 1, 3, a.bal, { ul: i === ltl.length - 1 })));
    const tl = tcl + tltl;
    BS.push(row('Total liabilities', 0, 3, tl, { kind: 'sub' }));
    BS.push(hdr('Owner\'s Equity', 0, true));
    BS.push(row(P + ', Capital', 1, 3, end, { ul: true }));
    BS.push(row('Total liabilities and owner\'s equity', 0, 3, tl + end, { kind: 'grand', dbl: true }));

    return {
      is: { title: 'Income Statement', date: 'For the Year Ended December 31, ' + Y, rows: IS },
      soe: { title: 'Statement of Owner\'s Equity', date: 'For the Year Ended December 31, ' + Y, rows: SOE },
      bs: { title: 'Balance Sheet', date: 'December 31, ' + Y, rows: BS },
      fig: { sales, ns, gp, toe, ifo, net, ni, beg, wd, end, tca, tpe, ta, tcl, tl, tloe: tl + end }
    };
  }

  // ---------- Certificate codes (same hashing scheme as Parts 1 and 2) ----------

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
  const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  function newCertId() {
    const bytes = new Uint32Array(8);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(bytes);
    else for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 4294967296);
    let s = '';
    for (let i = 0; i < 8; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    return s.slice(0, 4) + '-' + s.slice(4);
  }
  function checkCode(certId, name, firstRight, checks) {
    const s = ['ACC211-P3-CERT', String(certId || '').toUpperCase(), String(name || '').trim().toLowerCase(), firstRight, checks].join('|');
    return hashString(s).toString(36).toUpperCase().slice(-8);
  }

  const api = {
    BIZ, ACCOUNTS, ACCT, CATS, CAT, WHY, money, plain,
    gradeClassify, answerKey, buildStatements, newCertId, checkCode
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Part3Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
