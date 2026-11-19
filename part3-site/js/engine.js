/*
 * ACC 211 Part 3 engine: financial statements for a merchandising business (perpetual).
 * Pure logic (no DOM). Holds the fixed adjusted trial balance, the statement templates,
 * the answer key, and the graders. Every student works with the same numbers.
 */
(function (root) {
  'use strict';

  // ---------- Fixed data ----------

  const BIZ = { name: 'Ridgeline Outdoor Supply', owner: 'Morgan Cruz', year: 2026 };
  const Y = BIZ.year;

  // cls: classification category (Stage 1). sec: the statement section the account belongs in.
  // pair: for accumulated depreciation, the equipment account it reduces.
  const ACCOUNTS = [
    { no: 101, name: 'Cash', bal: 28400, side: 'dr', sec: 'ca' },
    { no: 112, name: 'Accounts Receivable', bal: 36200, side: 'dr', sec: 'ca' },
    { no: 120, name: 'Merchandise Inventory', bal: 84500, side: 'dr', sec: 'ca' },
    { no: 126, name: 'Store Supplies', bal: 2300, side: 'dr', sec: 'ca' },
    { no: 127, name: 'Office Supplies', bal: 1100, side: 'dr', sec: 'ca' },
    { no: 130, name: 'Prepaid Insurance', bal: 3600, side: 'dr', sec: 'ca' },
    { no: 181, name: 'Store Equipment', bal: 96000, side: 'dr', sec: 'ppeA' },
    { no: 182, name: 'Accumulated Depreciation - Store Equipment', bal: 31200, side: 'cr', sec: 'ppeC', pair: 181 },
    { no: 185, name: 'Office Equipment', bal: 42000, side: 'dr', sec: 'ppeA' },
    { no: 186, name: 'Accumulated Depreciation - Office Equipment', bal: 14700, side: 'cr', sec: 'ppeC', pair: 185 },
    { no: 201, name: 'Accounts Payable', bal: 41800, side: 'cr', sec: 'cl' },
    { no: 211, name: 'Salaries Payable', bal: 4600, side: 'cr', sec: 'cl' },
    { no: 212, name: 'Interest Payable', bal: 1500, side: 'cr', sec: 'cl' },
    { no: 216, name: 'Unearned Revenue', bal: 3200, side: 'cr', sec: 'cl' },
    { no: 251, name: 'Notes Payable (due 2030)', bal: 60000, side: 'cr', sec: 'ltl' },
    { no: 301, name: BIZ.owner + ', Capital', bal: 115100, side: 'cr', sec: 'cap' },
    { no: 302, name: BIZ.owner + ', Drawing', bal: 40000, side: 'dr', sec: 'draw' },
    { no: 401, name: 'Sales', bal: 612000, side: 'cr', sec: 'rev' },
    { no: 412, name: 'Sales Returns and Allowances', bal: 14800, side: 'dr', sec: 'contra' },
    { no: 413, name: 'Sales Discounts', bal: 7200, side: 'dr', sec: 'contra' },
    { no: 501, name: 'Cost of Goods Sold', bal: 362500, side: 'dr', sec: 'cogs' },
    { no: 611, name: 'Sales Salaries Expense', bal: 68400, side: 'dr', sec: 'sell' },
    { no: 612, name: 'Advertising Expense', bal: 12600, side: 'dr', sec: 'sell' },
    { no: 613, name: 'Delivery Expense', bal: 8900, side: 'dr', sec: 'sell' },
    { no: 614, name: 'Depreciation Expense - Store Equipment', bal: 9600, side: 'dr', sec: 'sell' },
    { no: 615, name: 'Store Supplies Expense', bal: 3400, side: 'dr', sec: 'sell' },
    { no: 711, name: 'Office Salaries Expense', bal: 41200, side: 'dr', sec: 'admin' },
    { no: 712, name: 'Utilities Expense', bal: 7800, side: 'dr', sec: 'admin' },
    { no: 713, name: 'Insurance Expense', bal: 4200, side: 'dr', sec: 'admin' },
    { no: 714, name: 'Depreciation Expense - Office Equipment', bal: 4900, side: 'dr', sec: 'admin' },
    { no: 715, name: 'Office Supplies Expense', bal: 1500, side: 'dr', sec: 'admin' },
    { no: 811, name: 'Interest Revenue', bal: 1800, side: 'cr', sec: 'oi' },
    { no: 911, name: 'Interest Expense', bal: 4800, side: 'dr', sec: 'oe' }
  ];
  const ACCT = {};
  ACCOUNTS.forEach(a => { ACCT[a.no] = a; a.cls = (a.sec === 'ppeA' || a.sec === 'ppeC') ? 'ppe' : a.sec; });

  // Why each account goes where it goes (shown after a Check when a student misplaces it).
  const WHY = {
    101: 'Cash is spent within a year in normal operations, so it is a current asset.',
    112: 'Customers will pay within a year, so Accounts Receivable is a current asset.',
    120: 'Merchandise on hand will be sold within a year, so it is a current asset.',
    126: 'Supplies on hand will be used within a year, so they are a current asset.',
    127: 'Supplies on hand will be used within a year, so they are a current asset.',
    130: 'Insurance paid in advance will be used up within a year, so it is a current asset.',
    181: 'Equipment is a long-lived asset used in operations: property, plant, and equipment.',
    185: 'Equipment is a long-lived asset used in operations: property, plant, and equipment.',
    182: 'Accumulated depreciation is a contra asset. It is subtracted from Store Equipment under property, plant, and equipment.',
    186: 'Accumulated depreciation is a contra asset. It is subtracted from Office Equipment under property, plant, and equipment.',
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
    { id: 'rev', stmt: 'Income Statement', label: 'Sales revenue' },
    { id: 'contra', stmt: 'Income Statement', label: 'Deduction from sales (contra revenue)' },
    { id: 'cogs', stmt: 'Income Statement', label: 'Cost of goods sold' },
    { id: 'sell', stmt: 'Income Statement', label: 'Selling expense' },
    { id: 'admin', stmt: 'Income Statement', label: 'Administrative expense' },
    { id: 'oi', stmt: 'Income Statement', label: 'Other income' },
    { id: 'oe', stmt: 'Income Statement', label: 'Other expense' },
    { id: 'cap', stmt: 'Statement of Owner\'s Equity', label: 'Beginning capital' },
    { id: 'draw', stmt: 'Statement of Owner\'s Equity', label: 'Withdrawals' },
    { id: 'ca', stmt: 'Balance Sheet', label: 'Current asset' },
    { id: 'ppe', stmt: 'Balance Sheet', label: 'Property, plant, and equipment' },
    { id: 'cl', stmt: 'Balance Sheet', label: 'Current liability' },
    { id: 'ltl', stmt: 'Balance Sheet', label: 'Long-term liability' }
  ];
  const CAT = {};
  CATS.forEach(c => { CAT[c.id] = c; });

  const SEC_LABEL = {
    rev: 'sales revenue', contra: 'deduction from sales', cogs: 'cost of goods sold', sell: 'selling expense',
    admin: 'administrative expense', oi: 'other income', oe: 'other expense', ca: 'current asset',
    ppeA: 'equipment (property, plant, and equipment) account', ppeC: 'accumulated depreciation (contra asset) account',
    cl: 'current liability', ltl: 'long-term liability'
  };

  // ---------- Statement templates ----------
  // hdr: a caption. acct: pick an account and type its amount. sub: a subtotal the student
  // computes (graded on the student's own numbers). given: a labeled line whose amount the
  // student supplies (accepted values come from acc()).
  // col: 1 = inner (detail) column, 2 = outer (totals) column.

  const P = BIZ.owner;
  const rows = (prefix, n, sec, col, ind) => Array.from({ length: n }, (_, i) => ({ t: 'acct', id: prefix + (i + 1), sec, col, ind }));
  const ids = (prefix, n) => Array.from({ length: n }, (_, i) => prefix + (i + 1));

  const IS_LINES = [
    { t: 'hdr', label: 'Revenue from sales:', ind: 0 },
    { t: 'acct', id: 's1', sec: 'rev', col: 1, ind: 1 },
    { t: 'acct', id: 'd1', sec: 'contra', col: 1, ind: 1, pre: 'Less:' },
    { t: 'acct', id: 'd2', sec: 'contra', col: 1, ind: 2 },
    { t: 'sub', id: 'ns', label: 'Net sales', col: 2, ind: 1, from: ['s1', 'd1', 'd2'], f: v => v.s1 - v.d1 - v.d2,
      hint: 'Net sales = Sales minus the two deductions from sales.' },
    { t: 'acct', id: 'c1', sec: 'cogs', col: 2, ind: 1 },
    { t: 'sub', id: 'gp', label: 'Gross profit', col: 2, ind: 0, from: ['ns', 'c1'], f: v => v.ns - v.c1, total: true,
      hint: 'Gross profit = Net sales minus Cost of goods sold.' },
    { t: 'hdr', label: 'Operating expenses:', ind: 0 },
    { t: 'hdr', label: 'Selling expenses:', ind: 1 }
  ].concat(rows('se', 5, 'sell', 1, 2), [
    { t: 'sub', id: 'tse', label: 'Total selling expenses', col: 2, ind: 2, from: ids('se', 5), f: v => ids('se', 5).reduce((s, k) => s + v[k], 0),
      hint: 'Add the five selling expenses you listed.' },
    { t: 'hdr', label: 'Administrative expenses:', ind: 1 }
  ], rows('ae', 5, 'admin', 1, 2), [
    { t: 'sub', id: 'tae', label: 'Total administrative expenses', col: 2, ind: 2, from: ids('ae', 5), f: v => ids('ae', 5).reduce((s, k) => s + v[k], 0),
      hint: 'Add the five administrative expenses you listed.' },
    { t: 'sub', id: 'toe', label: 'Total operating expenses', col: 2, ind: 1, from: ['tse', 'tae'], f: v => v.tse + v.tae,
      hint: 'Total operating expenses = Total selling expenses plus Total administrative expenses.' },
    { t: 'sub', id: 'ifo', label: 'Income from operations', col: 2, ind: 0, from: ['gp', 'toe'], f: v => v.gp - v.toe, total: true,
      hint: 'Income from operations = Gross profit minus Total operating expenses.' },
    { t: 'hdr', label: 'Other income and expense:', ind: 0 },
    { t: 'acct', id: 'oi1', sec: 'oi', col: 1, ind: 1 },
    { t: 'acct', id: 'oe1', sec: 'oe', col: 1, ind: 1, pre: 'Less:' },
    { t: 'sub', id: 'noi', label: 'Net other income (expense)', col: 2, ind: 1, from: ['oi1', 'oe1'], f: v => v.oi1 - v.oe1, either: true,
      hint: 'Net other income (expense) = Other income minus Other expense. A negative result can be shown in parentheses.' },
    { t: 'sub', id: 'ni', label: 'Net income', col: 2, ind: 0, from: ['ifo', 'oi1', 'oe1'], f: v => v.ifo + v.oi1 - v.oe1, total: true, grand: true,
      hint: 'Net income = Income from operations plus other income minus other expense.' }
  ]);

  const SOE_LINES = [
    { t: 'given', id: 'beg', label: P + ', Capital, January 1, ' + Y, col: 2, ind: 0, acc: () => [ACCT[301].bal],
      hint: 'Beginning capital is the Capital balance on the adjusted trial balance (there were no new investments this year).' },
    { t: 'given', id: 'nin', label: 'Net income for the year', pre: 'Add:', col: 1, ind: 1, acc: ctx => [KEY.is.ni].concat(ctx.ni != null ? [ctx.ni] : []),
      hint: 'Bring net income forward from your income statement.' },
    { t: 'given', id: 'wd', label: 'Withdrawals', pre: 'Less:', col: 1, ind: 1, acc: () => [ACCT[302].bal],
      hint: 'Withdrawals are the Drawing balance on the adjusted trial balance.' },
    { t: 'sub', id: 'inc', label: 'Increase in owner\'s capital', col: 2, ind: 1, from: ['nin', 'wd'], f: v => v.nin - v.wd,
      hint: 'Increase in capital = Net income minus Withdrawals.' },
    { t: 'sub', id: 'end', label: P + ', Capital, December 31, ' + Y, col: 2, ind: 0, from: ['beg', 'inc'], f: v => v.beg + v.inc, total: true, grand: true,
      hint: 'Ending capital = Beginning capital plus the increase in capital.' }
  ];

  const BS_LINES = [
    { t: 'hdr', label: 'Assets', ind: 0, big: true },
    { t: 'hdr', label: 'Current assets:', ind: 0 }
  ].concat(rows('ca', 6, 'ca', 1, 1), [
    { t: 'sub', id: 'tca', label: 'Total current assets', col: 2, ind: 1, from: ids('ca', 6), f: v => ids('ca', 6).reduce((s, k) => s + v[k], 0),
      hint: 'Add the six current assets you listed.' },
    { t: 'hdr', label: 'Property, plant, and equipment:', ind: 0 },
    { t: 'acct', id: 'pa1', sec: 'ppeA', col: 1, ind: 1 },
    { t: 'acct', id: 'pc1', sec: 'ppeC', col: 1, ind: 1, pre: 'Less:', pair: 'pa1' },
    { t: 'sub', id: 'bv1', label: 'Book value', col: 2, ind: 2, from: ['pa1', 'pc1'], f: v => v.pa1 - v.pc1,
      hint: 'Book value = the equipment\'s cost minus its accumulated depreciation.' },
    { t: 'acct', id: 'pa2', sec: 'ppeA', col: 1, ind: 1 },
    { t: 'acct', id: 'pc2', sec: 'ppeC', col: 1, ind: 1, pre: 'Less:', pair: 'pa2' },
    { t: 'sub', id: 'bv2', label: 'Book value', col: 2, ind: 2, from: ['pa2', 'pc2'], f: v => v.pa2 - v.pc2,
      hint: 'Book value = the equipment\'s cost minus its accumulated depreciation.' },
    { t: 'sub', id: 'tppe', label: 'Total property, plant, and equipment', col: 2, ind: 1, from: ['bv1', 'bv2'], f: v => v.bv1 + v.bv2,
      hint: 'Add the two book values.' },
    { t: 'sub', id: 'ta', label: 'Total assets', col: 2, ind: 0, from: ['tca', 'tppe'], f: v => v.tca + v.tppe, total: true, grand: true,
      hint: 'Total assets = Total current assets plus Total property, plant, and equipment.' },
    { t: 'hdr', label: 'Liabilities', ind: 0, big: true },
    { t: 'hdr', label: 'Current liabilities:', ind: 0 }
  ], rows('cl', 4, 'cl', 1, 1), [
    { t: 'sub', id: 'tcl', label: 'Total current liabilities', col: 2, ind: 1, from: ids('cl', 4), f: v => ids('cl', 4).reduce((s, k) => s + v[k], 0),
      hint: 'Add the four current liabilities you listed.' },
    { t: 'hdr', label: 'Long-term liabilities:', ind: 0 },
    { t: 'acct', id: 'lt1', sec: 'ltl', col: 2, ind: 1 },
    { t: 'sub', id: 'tl', label: 'Total liabilities', col: 2, ind: 0, from: ['tcl', 'lt1'], f: v => v.tcl + v.lt1, total: true,
      hint: 'Total liabilities = Total current liabilities plus long-term liabilities.' },
    { t: 'hdr', label: 'Owner\'s Equity', ind: 0, big: true },
    { t: 'given', id: 'cap', label: P + ', Capital', col: 2, ind: 1, acc: ctx => [KEY.soe.end].concat(ctx.end != null ? [ctx.end] : []),
      hint: 'Use the ending capital (December 31) from your statement of owner\'s equity, not the beginning balance.' },
    { t: 'sub', id: 'tloe', label: 'Total liabilities and owner\'s equity', col: 2, ind: 0, from: ['tl', 'cap'], f: v => v.tl + v.cap, total: true, grand: true,
      hint: 'Total liabilities and owner\'s equity = Total liabilities plus ending capital. It should equal Total assets.' }
  ]);

  const PERIOD = 'For the Year Ended December 31, ' + Y;
  const POINT = 'December 31, ' + Y;
  const TITLES = ['Income Statement', 'Statement of Owner\'s Equity', 'Balance Sheet', 'Adjusted Trial Balance'];
  const DATES = [PERIOD, POINT, 'For the Month Ended December 31, ' + Y];

  const STATEMENTS = {
    is: { lines: IS_LINES, title: 'Income Statement', date: PERIOD },
    soe: { lines: SOE_LINES, title: 'Statement of Owner\'s Equity', date: PERIOD },
    bs: { lines: BS_LINES, title: 'Balance Sheet', date: POINT }
  };

  const STAGES = [
    { id: 'classify', short: 'Classify', title: 'Classify the Accounts', points: 20 },
    { id: 'is', short: 'Income Statement', title: 'Multiple-Step Income Statement', points: 35 },
    { id: 'soe', short: 'Owner\'s Equity', title: 'Statement of Owner\'s Equity', points: 15 },
    { id: 'bs', short: 'Balance Sheet', title: 'Classified Balance Sheet', points: 30 }
  ];
  const POSSIBLE = STAGES.reduce((s, x) => s + x.points, 0);

  // ---------- Helpers ----------

  function money(n) { return (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US'); }
  function plain(n) { const s = Math.abs(Math.round(n)).toLocaleString('en-US'); return n < 0 ? '(' + s + ')' : s; }

  // Accepts 1,800  $1,800  1800.00  -3,000  (3,000). Returns null for blank or unreadable input.
  function parseAmt(str) {
    let s = String(str == null ? '' : str).trim();
    if (!s) return null;
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    s = s.replace(/[$,\s]/g, '');
    if (s.startsWith('-')) { neg = !neg; s = s.slice(1); }
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    const n = Number(s);
    return neg ? -n : n;
  }
  const same = (a, b) => Math.abs(a - b) < 0.5;
  const r2 = n => Math.round(n * 100) / 100;

  function blankAnswers() {
    return { classify: {}, is: { head: {}, acct: {}, amt: {} }, soe: { head: {}, acct: {}, amt: {} }, bs: { head: {}, acct: {}, amt: {} } };
  }

  // ---------- Answer key (built from the templates, so it always matches them) ----------

  const KEY = {};
  function buildKey() {
    const ans = blankAnswers();
    ACCOUNTS.forEach(a => { ans.classify[a.no] = a.cls; });
    ['is', 'soe', 'bs'].forEach(kind => {
      const S = STATEMENTS[kind], A = ans[kind];
      A.head = { title: S.title, date: S.date };
      const used = {};
      const vals = {};
      S.lines.forEach(L => {
        if (L.t === 'acct') {
          let pick;
          if (L.pair) pick = ACCOUNTS.find(a => a.sec === 'ppeC' && a.pair === Number(A.acct[L.pair]));
          else pick = ACCOUNTS.find(a => a.sec === L.sec && !used[a.no]);
          used[pick.no] = true;
          A.acct[L.id] = String(pick.no);
          vals[L.id] = pick.bal;
        } else if (L.t === 'given') {
          vals[L.id] = L.acc({})[0];
        } else if (L.t === 'sub') {
          vals[L.id] = L.f(vals);
        } else return;
        A.amt[L.id] = plain(vals[L.id]);
      });
      KEY[kind] = vals;
    });
    return ans;
  }
  // SOE and BS "given" lines read KEY.is / KEY.soe, so build in order.
  const ANSWER_KEY = buildKey();

  // ---------- Graders ----------

  function gradeClassify(ans) {
    const items = {};
    let units = 0;
    ACCOUNTS.forEach(a => {
      const pick = ans && ans[a.no];
      let st, note;
      if (!pick) { st = 'bad'; note = 'Choose a category.'; }
      else if (pick === a.cls) { st = 'ok'; units += 1; }
      else { st = 'bad'; note = 'Not ' + CAT[pick].label.toLowerCase() + '. ' + WHY[a.no]; }
      items[a.no] = { st, note };
    });
    return { units, total: ACCOUNTS.length, items };
  }

  // Values the student typed, for carry-forward into later statements.
  function typedValue(ans, kind, id) {
    const A = ans && ans[kind];
    return A ? parseAmt(A.amt && A.amt[id]) : null;
  }
  function carryCtx(all) {
    return { ni: typedValue(all, 'is', 'ni'), end: typedValue(all, 'soe', 'end') };
  }

  function gradeStatement(kind, all) {
    const S = STATEMENTS[kind];
    const A = (all && all[kind]) || { head: {}, acct: {}, amt: {} };
    const ctx = carryCtx(all || {});
    const lines = {};
    let units = 0, total = 0;

    // Heading: statement title and date line.
    const head = {};
    total += 2;
    head.title = A.head && A.head.title === S.title ? { st: 'ok' } : { st: 'bad', note: A.head && A.head.title ? 'This is the ' + S.title + '.' : 'Choose the statement title.' };
    const dateNote = kind === 'bs'
      ? 'A balance sheet shows one moment in time, so its date line is just the date.'
      : 'This statement covers a period of time, so its date line starts "For the Year Ended."';
    head.date = A.head && A.head.date === S.date ? { st: 'ok' } : { st: 'bad', note: A.head && A.head.date ? dateNote : 'Choose the date line.' };
    units += (head.title.st === 'ok' ? 1 : 0) + (head.date.st === 'ok' ? 1 : 0);

    const vals = {}, blank = {};
    const used = {};
    S.lines.forEach(L => {
      if (L.t === 'hdr') return;
      total += 1;
      const typed = parseAmt(A.amt && A.amt[L.id]);
      const raw = A.amt && String(A.amt[L.id] || '').trim();
      vals[L.id] = typed == null ? 0 : typed;
      blank[L.id] = typed == null;
      let st = 'bad', note = '', earn = 0;

      if (L.t === 'acct') {
        const no = Number(A.acct && A.acct[L.id]);
        const a = ACCT[no];
        if (!a) note = 'Choose an account for this line.';
        else if (used[no]) note = a.name + ' is already listed above. Each account appears once.';
        else if (a.sec !== L.sec) note = a.name + ' is not a ' + SEC_LABEL[L.sec] + '. ' + WHY[no];
        else if (L.pair && ACCT[Number(A.acct[L.pair])] && ACCT[Number(A.acct[L.pair])].sec === 'ppeA' && a.pair !== Number(A.acct[L.pair])) {
          note = 'Subtract the accumulated depreciation that belongs to the equipment on the line above.';
        } else if (typed != null && same(Math.abs(typed), a.bal)) { st = 'ok'; earn = 1; }
        else { st = 'half'; earn = 0.5; note = raw && typed == null ? 'Right account. Enter the amount as a number.' : 'Right account. Use its balance from the adjusted trial balance.'; }
        if (a) used[no] = true;
        if (typed != null) vals[L.id] = Math.abs(typed);
      } else if (L.t === 'given') {
        const accepted = L.acc(ctx);
        if (typed == null) note = raw ? 'Enter the amount as a number.' : 'Enter an amount.';
        else if (accepted.some(x => same(Math.abs(typed), Math.abs(x)))) { st = 'ok'; earn = 1; }
        else note = L.hint;
      } else if (L.t === 'sub') {
        const expect = L.f(vals);
        const anyInput = L.from.some(k => !blank[k]);
        if (typed == null) note = raw ? 'Enter the amount as a number.' : 'Enter an amount.';
        else if (!anyInput) note = 'Fill in the lines above first. ' + L.hint;
        else if (same(typed, expect) || (L.either && same(Math.abs(typed), Math.abs(expect)))) { st = 'ok'; earn = 1; note = 'carry'; }
        else note = L.hint;
        if (L.either && typed != null) vals[L.id] = expect < 0 ? -Math.abs(typed) : Math.abs(typed);
      }
      units += earn;
      lines[L.id] = { st, note: note === 'carry' ? '' : note };
    });

    // How many slots in each section hold a right account (for section headers).
    return { units, total, lines, head };
  }

  function gradeStage(id, all) {
    return id === 'classify' ? gradeClassify(all && all.classify) : gradeStatement(id, all);
  }

  function stageScore(id, g) {
    const st = STAGES.find(s => s.id === id);
    return r2(g.units / g.total * st.points);
  }

  function gradeAll(all) {
    const stages = STAGES.map(s => {
      const g = gradeStage(s.id, all);
      return { id: s.id, score: stageScore(s.id, g), possible: s.points };
    });
    return { stages, total: r2(stages.reduce((s, x) => s + x.score, 0)), possible: POSSIBLE };
  }

  // Check figures the student can reveal after the first Check.
  function checkFigures(id) {
    if (id === 'classify') {
      return CATS.map(c => [c.stmt + ': ' + c.label, ACCOUNTS.filter(a => a.cls === c.id).length + ' account' + (ACCOUNTS.filter(a => a.cls === c.id).length === 1 ? '' : 's')]);
    }
    if (id === 'is') return [['Net sales', KEY.is.ns], ['Gross profit', KEY.is.gp], ['Total operating expenses', KEY.is.toe], ['Income from operations', KEY.is.ifo], ['Net income', KEY.is.ni]].map(r => [r[0], money(r[1])]);
    if (id === 'soe') return [['Increase in owner\'s capital', KEY.soe.inc], ['Ending capital, December 31', KEY.soe.end]].map(r => [r[0], money(r[1])]);
    return [['Total current assets', KEY.bs.tca], ['Total property, plant, and equipment', KEY.bs.tppe], ['Total assets', KEY.bs.ta], ['Total liabilities', KEY.bs.tl], ['Total liabilities and owner\'s equity', KEY.bs.tloe]].map(r => [r[0], money(r[1])]);
  }

  // ---------- Report codes (same scheme as Parts 1 and 2) ----------

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
  function newReportId() {
    const bytes = new Uint32Array(8);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(bytes);
    else for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 4294967296);
    let s = '';
    for (let i = 0; i < 8; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    return s.slice(0, 4) + '-' + s.slice(4);
  }
  // firstScores: { classify, is, soe, bs } first-try stage scores.
  function checkCode(reportId, name, firstScores, attempt) {
    const s = ['ACC211-P3-PRACTICE', String(reportId || '').toUpperCase(), String(name || '').trim().toLowerCase(),
      STAGES.map(st => (firstScores[st.id] || 0).toFixed(2)).join(','), 'A' + (attempt || 1)].join('|');
    return hashString(s).toString(36).toUpperCase().slice(-8);
  }

  const api = {
    BIZ, ACCOUNTS, ACCT, CATS, CAT, WHY, STATEMENTS, STAGES, POSSIBLE, TITLES, DATES, KEY, ANSWER_KEY,
    money, plain, parseAmt, blankAnswers, gradeClassify, gradeStatement, gradeStage, stageScore, gradeAll,
    checkFigures, carryCtx, newReportId, checkCode
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Part3Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
