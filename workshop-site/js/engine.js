/* Merchandising General Ledger Workshop: Bright Mart data, entry evaluation, scoring, ledgers and the income statement.
   Pure functions only, so the same file runs in the browser and in the Node tests. */
(function (root) {
  'use strict';

  const BUSINESS = 'Bright Mart';
  const PERIOD = 'For the Month Ended November 30';
  const PASS = 70;
  const PARTIES = ['Ace Supply', 'Rosa’s Shop'];

  // side = normal balance; sub = subsidiary ledger kept by vendor or customer; focus = merchandising focus account.
  const ACCTS = [
    { n: 'Cash', type: 'Asset', grp: 'Assets', side: 'Dr' },
    { n: 'Accounts receivable', type: 'Asset', grp: 'Assets', side: 'Dr', sub: 'Customer' },
    { n: 'Merchandise inventory', type: 'Asset', grp: 'Assets', side: 'Dr', focus: true },
    { n: 'Accounts payable', type: 'Liability', grp: 'Liabilities', side: 'Cr', sub: 'Vendor', focus: true },
    { n: 'Owner’s capital', type: 'Equity', grp: 'Owner’s equity', side: 'Cr' },
    { n: 'Sales revenue', type: 'Revenue', grp: 'Revenue', side: 'Cr' },
    { n: 'Sales returns & allowances', type: 'Contra-revenue', grp: 'Revenue', side: 'Dr' },
    { n: 'Sales discounts', type: 'Contra-revenue', grp: 'Revenue', side: 'Dr' },
    { n: 'Cost of goods sold', type: 'Expense', grp: 'Expenses', side: 'Dr', focus: true },
    { n: 'Salaries expense', type: 'Operating expense', grp: 'Expenses', side: 'Dr' },
    { n: 'Rent expense', type: 'Operating expense', grp: 'Expenses', side: 'Dr' },
    { n: 'Delivery expense', type: 'Operating expense', grp: 'Expenses', side: 'Dr' },
    { n: 'Utilities expense', type: 'Operating expense', grp: 'Expenses', side: 'Dr' },
    { n: 'Interest expense', type: 'Other expense', grp: 'Expenses', side: 'Dr' }
  ];
  const GROUPS = ['Assets', 'Liabilities', 'Owner’s equity', 'Revenue', 'Expenses'];
  const A = {};
  ACCTS.forEach(function (a) { A[a.n] = a; });

  // Opening balances on Nov 1 (given, not journalized).
  const OPENING = [{ a: 'Cash', dr: 20000 }, { a: 'Owner’s capital', cr: 20000 }];

  const MI = 'Merchandise inventory', AP = 'Accounts payable', AR = 'Accounts receivable', COGS = 'Cost of goods sold';
  const ACE = 'Ace Supply', ROSA = 'Rosa’s Shop';

  // One journal entry per transaction. tag = short T-account label.
  const E = [
    { id: '1', d: '11/1', date: 'Nov 1', tag: 'Purchase',
      text: 'Purchased $5,000 of merchandise for cash.',
      lines: [{ a: MI, dr: 5000 }, { a: 'Cash', cr: 5000 }],
      hints: [
        'Under the perpetual system, goods bought to resell go straight into an asset account, not an expense. Which account holds goods waiting to be sold?',
        'Debit Merchandise inventory (the asset increases). The other side is the asset you paid with.',
        'Both sides are $5,000, the full price paid.'],
      why: 'Perpetual system: Merchandise inventory is updated at the moment of every purchase, return, discount and sale, so the account always shows what is on the shelves.' },

    { id: '2', d: '11/3', date: 'Nov 3', tag: 'Purchase',
      text: 'Purchased $10,000 of merchandise from Ace Supply on account, terms 2/10, n/30, FOB shipping point.',
      lines: [{ a: MI, dr: 10000 }, { a: AP, cr: 10000, p: ACE }],
      hints: [
        'You have not paid yet. You now owe Ace Supply. Which liability account tracks what you owe suppliers?',
        'Debit Merchandise inventory, credit Accounts payable. When you pick Accounts payable, also choose the vendor. That is the subsidiary ledger.',
        'Each side is $10,000. The 2/10, n/30 terms do not change today’s entry. A discount is recorded only if you pay early.'],
      why: 'Terms 2/10, n/30 mean 2% off if paid within 10 days (by Nov 13), otherwise the full amount is due in 30 days. Record the invoice at the full (gross) amount and handle any discount when you pay.' },

    { id: '3', d: '11/4', date: 'Nov 4', tag: 'Freight-in',
      text: 'Paid $300 freight to the carrier on the November 3 purchase, terms FOB shipping point.',
      lines: [{ a: MI, dr: 300 }, { a: 'Cash', cr: 300 }],
      hints: [
        'FOB shipping point means the buyer owns the goods once they ship, so the buyer pays the freight. Is the cost of getting goods onto your shelves part of what the goods cost you?',
        'Yes. Debit Merchandise inventory (freight-in is added to the cost of inventory) and credit Cash.',
        'Each side is $300.'],
      why: 'Freight-in is part of inventory cost, not an expense. Freight-out (delivering goods to customers) is a selling expense instead. You will see that on Nov 18.' },

    { id: '4', d: '11/6', date: 'Nov 6', tag: 'Return',
      text: 'Returned $1,000 of the November 3 merchandise to Ace Supply.',
      lines: [{ a: AP, dr: 1000, p: ACE }, { a: MI, cr: 1000 }],
      hints: [
        'Sending goods back means you hold less inventory and you owe Ace Supply less. Think about which accounts shrink.',
        'Debit Accounts payable (the liability decreases, vendor Ace Supply) and credit Merchandise inventory (the asset decreases).',
        'Each side is $1,000.'],
      why: 'Under the perpetual system a purchase return reduces Merchandise inventory directly. There is no separate Purchase Returns account.' },

    { id: '5', d: '11/8', date: 'Nov 8', tag: 'Allowance',
      text: 'Received a $500 allowance from Ace Supply for slightly damaged goods that Bright Mart kept.',
      lines: [{ a: AP, dr: 500, p: ACE }, { a: MI, cr: 500 }],
      hints: [
        'You keep the goods, but they now cost you less, and you owe Ace Supply less. Does this look like a return to you?',
        'Same accounts as a return: debit Accounts payable (Ace Supply) and credit Merchandise inventory.',
        'Each side is $500.'],
      why: 'An allowance is recorded exactly like a return. The only difference is physical: with a return the goods go back, with an allowance you keep them at a lower cost.' },

    { id: '6', d: '11/13', date: 'Nov 13', tag: 'Discount',
      text: 'Paid Ace Supply the balance due, within the discount period.',
      lines: [{ a: AP, dr: 8500, p: ACE }, { a: 'Cash', cr: 8330 }, { a: MI, cr: 170, tag: 'Discount' }],
      hints: [
        'This entry has three accounts. You clear the whole amount owed, but pay less cash because of the 2% discount. The discount lowers what the inventory cost you. Start with what you still owe after the return and the allowance.',
        'Debit Accounts payable (Ace Supply) for the balance owed. Credit Cash for what you actually pay. Credit Merchandise inventory for the discount.',
        '$10,000 − $1,000 − $500 = $8,500 owed. Discount $8,500 × 2% = $170. Cash paid $8,330.'],
      why: 'A purchase discount reduces the cost of inventory. The freight was not discounted because it was paid to the carrier, not to Ace Supply. Notice that Accounts payable for Ace Supply is now zero.' },

    { id: '7', d: '11/15', date: 'Nov 15', tag: 'Cash sale',
      text: 'Sold merchandise for $3,000 cash. The cost of the merchandise sold was $1,800.',
      lines: [{ a: 'Cash', dr: 3000 }, { a: COGS, dr: 1800, tag: 'Cost of sale' }, { a: 'Sales revenue', cr: 3000 }, { a: MI, cr: 1800, tag: 'Cost of sale' }],
      hints: [
        'Under the perpetual system, every sale has two parts, and you record both in the same journal entry. Part 1: the revenue at the selling price. Part 2: the cost of the goods that left your shelves. That makes four lines.',
        'Part 1: debit Cash, credit Sales revenue. Part 2: debit Cost of goods sold, credit Merchandise inventory.',
        'Cash $3,000 debit and Sales revenue $3,000 credit (selling price). Cost of goods sold $1,800 debit and Merchandise inventory $1,800 credit (cost).'],
      why: 'Revenue is recorded at the selling price, and the cost of the goods is recorded at the same time at cost. This is the matching principle. The $1,200 difference is the gross profit on this sale.' },

    { id: '8', d: '11/18', date: 'Nov 18', tag: 'Credit sale',
      text: 'Sold merchandise to Rosa’s Shop on account, $8,000, terms 2/10, n/30, FOB destination. The cost of the merchandise sold was $4,800.',
      lines: [{ a: AR, dr: 8000, p: ROSA }, { a: COGS, dr: 4800, tag: 'Cost of sale' }, { a: 'Sales revenue', cr: 8000 }, { a: MI, cr: 4800, tag: 'Cost of sale' }],
      hints: [
        'Same two-part idea as the cash sale, but Rosa’s Shop has not paid yet. Which asset records money customers owe you? Record the revenue part and the cost part together, four lines in all.',
        'Part 1: debit Accounts receivable (choose Rosa’s Shop as the customer), credit Sales revenue. Part 2: debit Cost of goods sold, credit Merchandise inventory.',
        'Accounts receivable $8,000 debit and Sales revenue $8,000 credit (selling price). Cost of goods sold $4,800 debit and Merchandise inventory $4,800 credit (cost).'],
      why: 'A sale on account is revenue today, and cost of goods sold is recorded at the same time. Rosa’s Shop also gets its own page in the accounts receivable subsidiary ledger.' },

    { id: '9', d: '11/18', date: 'Nov 18', tag: 'Freight-out',
      text: 'Paid $200 to the carrier to deliver the November 18 sale to Rosa’s Shop (FOB destination).',
      lines: [{ a: 'Delivery expense', dr: 200 }, { a: 'Cash', cr: 200 }],
      hints: [
        'FOB destination means the seller owns the goods until they arrive, so the seller pays the freight. Is this freight part of the cost of inventory you are keeping, or a cost of selling?',
        'It is a cost of selling. Debit Delivery expense (freight-out) and credit Cash. It does not touch Merchandise inventory.',
        'Each side is $200.'],
      why: 'Freight-out is an operating (selling) expense. Compare freight-in on Nov 4, which was added to inventory cost. Same truck, different account, because who pays depends on the FOB terms.' },

    { id: '10', d: '11/21', date: 'Nov 21', tag: 'Sales return',
      text: 'Rosa’s Shop returned $1,000 of the merchandise sold on November 18. The goods cost $600 and are in good condition.',
      lines: [{ a: 'Sales returns & allowances', dr: 1000 }, { a: MI, dr: 600, tag: 'Restock' }, { a: AR, cr: 1000, p: ROSA }, { a: COGS, cr: 600, tag: 'Restock' }],
      hints: [
        'A sales return reverses both parts of the original sale, so again you record four lines in one entry. At selling price, reverse part of the revenue (use the contra-revenue account) and reduce what Rosa’s Shop owes. At cost, the goods return to your shelves and the expense reverses.',
        'Part 1: debit Sales returns & allowances, credit Accounts receivable (Rosa’s Shop). Part 2: debit Merchandise inventory, credit Cost of goods sold.',
        'Sales returns & allowances $1,000 debit and Accounts receivable $1,000 credit (selling price). Merchandise inventory $600 debit and Cost of goods sold $600 credit (cost, not selling price).'],
      why: 'Sales returns & allowances is a contra-revenue account, so managers can see how much revenue was lost to returns. The first pair works at selling price, the second at cost. That is why the amounts differ.' },

    { id: '11', d: '11/23', date: 'Nov 23', tag: 'Sales allowance',
      text: 'Granted Rosa’s Shop a $500 allowance for slightly damaged merchandise that it kept.',
      lines: [{ a: 'Sales returns & allowances', dr: 500 }, { a: AR, cr: 500, p: ROSA }],
      hints: [
        'The customer keeps the goods, so nothing comes back to your shelves. Which part of the sale changes: the revenue part, the cost part, or both?',
        'Only the revenue part. Debit Sales returns & allowances and credit Accounts receivable (Rosa’s Shop). There is no cost entry.',
        'Each side is $500.'],
      why: 'An allowance uses the same revenue entry as a return, but there is no cost entry, because no goods move back into inventory. Students often add a cost entry here by mistake.' },

    { id: '12', d: '11/28', date: 'Nov 28', tag: 'Collection',
      text: 'Collected the balance due from Rosa’s Shop, within the discount period.',
      lines: [{ a: 'Cash', dr: 6370 }, { a: 'Sales discounts', dr: 130 }, { a: AR, cr: 6500, p: ROSA }],
      hints: [
        'Rosa’s Shop pays less than it owes because of the 2% discount. You clear the whole receivable, receive less cash, and the difference is a reduction of sales. Start with what is still owed after the return and the allowance.',
        'Debit Cash for the cash received, debit Sales discounts for the discount, credit Accounts receivable (Rosa’s Shop) for the full balance.',
        '$8,000 − $1,000 − $500 = $6,500 owed. Discount $6,500 × 2% = $130. Cash received $6,370.'],
      why: 'Sales discounts is another contra-revenue account. Together with returns and allowances, it takes you from Sales revenue down to Net sales. Collecting cash moves no goods, so there is no cost entry.' },

    { id: '13', d: '11/30', date: 'Nov 30', tag: 'Salaries',
      text: 'Paid $1,200 in employee salaries for November.',
      lines: [{ a: 'Salaries expense', dr: 1200 }, { a: 'Cash', cr: 1200 }],
      hints: [
        'Paying employees is a cost of running the store, not goods you plan to resell.',
        'Debit Salaries expense, credit Cash.',
        'Each side is $1,200.'],
      why: 'Salaries are an operating expense, so they reduce income after gross profit is calculated.' },

    { id: '14', d: '11/30', date: 'Nov 30', tag: 'Rent',
      text: 'Paid $900 store rent for November.',
      lines: [{ a: 'Rent expense', dr: 900 }, { a: 'Cash', cr: 900 }],
      hints: [
        'Rent keeps the store open. It is not part of the cost of the merchandise.',
        'Debit Rent expense, credit Cash.',
        'Each side is $900.'],
      why: 'Rent is an operating expense. Together with salaries and delivery expense, it takes you from gross profit to income from operations.' },

    { id: '15', d: '11/30', date: 'Nov 30', tag: 'Interest',
      text: 'Paid $70 interest on the business credit line for November.',
      lines: [{ a: 'Interest expense', dr: 70 }, { a: 'Cash', cr: 70 }],
      hints: [
        'Interest is the cost of borrowing money. Is borrowing part of the store’s normal operations of buying and selling goods?',
        'Debit Interest expense, credit Cash. It is reported as an other expense, below income from operations.',
        'Each side is $70.'],
      why: 'Last entry! Interest is a nonoperating (other) expense, so it appears after income from operations. Open the income statement tab to see gross profit flow down to net income.' }
  ];
  const N = E.length;

  const r2 = function (x) { return Math.round(x * 100) / 100; };
  function parseAmt(v) {
    const s = String(v == null ? '' : v).replace(/[$,\s]/g, '');
    if (s === '') return 0;
    const x = Number(s);
    return isFinite(x) && x >= 0 ? r2(x) : NaN;
  }
  function money(n) { return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
  function num(n) { return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }

  // ---------- Evaluating a student entry ----------
  // rows: [{ a: account, p: party, d: debit text, c: credit text }]. Lines are compared as totals per
  // account, side and (for subsidiary accounts) party, so line order and splitting do not matter.
  function keyOf(a, side, p) { return a + '|' + side + '|' + (A[a].sub ? p : ''); }
  function evaluate(idx, rows) {
    const e = E[idx];
    const res = { ok: false, counted: false, msgs: [], rowMsg: rows.map(function () { return null; }), rowOk: rows.map(function () { return null; }) };
    const used = rows.map(function (r, i) { return { a: r.a, p: r.p, d: r.d, c: r.c, i: i }; })
      .filter(function (r) { return r.a || String(r.d || '') !== '' || String(r.c || '') !== ''; });
    if (!used.length) { res.msgs.push('Choose accounts and enter amounts first.'); return res; }
    let structural = false;
    const parsed = [];
    used.forEach(function (r) {
      const d = parseAmt(r.d), c = parseAmt(r.c);
      const bad = function (m) { res.rowMsg[r.i] = m; res.rowOk[r.i] = false; structural = true; };
      if (!r.a) return bad('Choose an account for this line.');
      if (isNaN(d) || isNaN(c)) return bad('Enter a valid dollar amount.');
      if (d > 0 && c > 0) return bad('Use the Debit box or the Credit box, not both.');
      if (d === 0 && c === 0) return bad('Enter an amount in Debit or Credit.');
      if (A[r.a].sub && !r.p) return bad('Choose the ' + A[r.a].sub.toLowerCase() + ' (subsidiary ledger).');
      parsed.push({ i: r.i, a: r.a, side: d > 0 ? 'Dr' : 'Cr', amt: d > 0 ? d : c, p: r.p });
    });
    if (structural) { res.msgs.push('Some lines are incomplete. Fix the red lines, then check again.'); return res; }

    res.counted = true;
    const td = r2(parsed.filter(function (x) { return x.side === 'Dr'; }).reduce(function (s, x) { return s + x.amt; }, 0));
    const tc = r2(parsed.filter(function (x) { return x.side === 'Cr'; }).reduce(function (s, x) { return s + x.amt; }, 0));
    const balanced = td === tc;
    if (!balanced) res.msgs.push('Debits (' + money(td) + ') do not equal credits (' + money(tc) + '). Every journal entry must balance.');

    const stu = {}, exp = {};
    parsed.forEach(function (x) { const k = keyOf(x.a, x.side, x.p); stu[k] = r2((stu[k] || 0) + x.amt); });
    e.lines.forEach(function (l) { const k = keyOf(l.a, l.dr ? 'Dr' : 'Cr', l.p); exp[k] = r2((exp[k] || 0) + (l.dr || l.cr)); });
    const sk = Object.keys(stu), ek = Object.keys(exp);
    if (sk.length === ek.length && sk.every(function (k) { return exp[k] === stu[k]; })) {
      res.ok = true;
      parsed.forEach(function (x) { res.rowOk[x.i] = true; });
      return res;
    }

    // Per-line diagnosis that never reveals the answer.
    parsed.forEach(function (x) {
      const k = keyOf(x.a, x.side, x.p);
      if (exp[k] !== undefined && exp[k] === stu[k]) { res.rowOk[x.i] = true; return; }
      res.rowOk[x.i] = false;
      const same = e.lines.filter(function (l) { return l.a === x.a; });
      if (!same.length) { res.rowMsg[x.i] = 'This account does not belong in this entry.'; return; }
      const sameSide = same.filter(function (l) { return (l.dr ? 'Dr' : 'Cr') === x.side; });
      if (!sameSide.length) { res.rowMsg[x.i] = 'Right account, but check whether it should be a debit or a credit.'; return; }
      if (A[x.a].sub && !sameSide.some(function (l) { return (l.p || '') === x.p; })) { res.rowMsg[x.i] = 'Check the ' + A[x.a].sub.toLowerCase() + ' name for this line.'; return; }
      res.rowMsg[x.i] = 'Right account and side, but check the amount.';
    });
    const stuAccts = {};
    parsed.forEach(function (x) { stuAccts[x.a] = true; });
    const expAccts = {};
    e.lines.forEach(function (l) { expAccts[l.a] = true; });
    const missing = Object.keys(expAccts).filter(function (a) { return !stuAccts[a]; }).length;
    if (missing) res.msgs.push('Your entry is missing ' + missing + ' account' + (missing > 1 ? 's' : '') + '.');
    if (balanced && !missing && res.rowOk.every(function (v) { return v !== false; })) res.msgs.push('Each line looks reasonable, but the combination is not right. Re-read the transaction and compare the amounts.');
    else if (res.rowOk.some(function (v) { return v === false; })) res.msgs.push('Red lines need another look. Green lines are correct.');
    return res;
  }

  // ---------- Scoring ----------
  function creditFor(wrong, hints) { return Math.max(0.25, r2(1 - 0.25 * wrong - 0.1 * hints)); }
  function scoreInfo(results) {
    const done = results.filter(Boolean);
    const sum = r2(done.reduce(function (s, r) { return s + r.credit; }, 0));
    return { done: done.length, sum: sum, pctAll: Math.round(sum / N * 1000) / 10, pctSoFar: done.length ? Math.round(sum / done.length * 1000) / 10 : null };
  }

  // ---------- Ledger ----------
  // Postings for the opening balances and every posted entry, in entry order.
  function buildLedger(results) {
    const L = {};
    const push = function (a, x) { (L[a] = L[a] || []).push(x); };
    OPENING.forEach(function (l) { push(l.a, { e: -1, d: '11/1', dr: l.dr || 0, cr: l.cr || 0, p: '', tag: 'Opening' }); });
    E.forEach(function (e, i) {
      if (!results[i]) return;
      e.lines.forEach(function (l) { push(l.a, { e: i, d: e.d, dr: l.dr || 0, cr: l.cr || 0, p: l.p || '', tag: l.tag || e.tag }); });
    });
    return L;
  }
  function totals(L, acct, party) {
    let dr = 0, cr = 0;
    (L[acct] || []).forEach(function (x) { if (!party || x.p === party) { dr += x.dr; cr += x.cr; } });
    return { dr: r2(dr), cr: r2(cr) };
  }
  function bal(L, acct, party) { // positive = normal balance
    const t = totals(L, acct, party);
    return A[acct].side === 'Dr' ? r2(t.dr - t.cr) : r2(t.cr - t.dr);
  }

  // ---------- Income statement ----------
  function isValues(L) {
    const v = {
      rev: bal(L, 'Sales revenue'), ret: bal(L, 'Sales returns & allowances'), dis: bal(L, 'Sales discounts'),
      cogs: bal(L, COGS), sal: bal(L, 'Salaries expense'), rent: bal(L, 'Rent expense'),
      del: bal(L, 'Delivery expense'), utl: bal(L, 'Utilities expense'), int: bal(L, 'Interest expense')
    };
    v.net = r2(v.rev - v.ret - v.dis);
    v.gp = r2(v.net - v.cogs);
    v.opx = r2(v.sal + v.rent + v.del + v.utl);
    v.ops = r2(v.gp - v.opx);
    v.ni = r2(v.ops - v.int);
    v.gm = v.net > 0 ? Math.round(v.gp / v.net * 1000) / 10 : null;
    v.nm = v.net > 0 ? Math.round(v.ni / v.net * 1000) / 10 : null;
    return v;
  }

  // Short verification code for a certificate.
  function certificateId(name, finishedAt, pct) {
    const s = String(name).toLowerCase().replace(/\s+/g, ' ').trim() + '|' + finishedAt + '|' + pct + '|bright-mart-workshop';
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
    BUSINESS: BUSINESS, PERIOD: PERIOD, PASS: PASS, PARTIES: PARTIES, ACCTS: ACCTS, GROUPS: GROUPS, A: A, OPENING: OPENING, E: E, N: N,
    r2: r2, parseAmt: parseAmt, money: money, num: num, evaluate: evaluate, creditFor: creditFor, scoreInfo: scoreInfo,
    buildLedger: buildLedger, totals: totals, bal: bal, isValues: isValues, certificateId: certificateId
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.WorkshopEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
