/* Cobblestone Sports & Outdoor: November transactions, entry checking, ledger, income statement and balance sheet.
   Pure functions only, so the same file runs in the browser and in the Node tests. */
(function (root) {
  'use strict';

  const BUSINESS = 'Cobblestone Sports & Outdoor';
  const OWNER = 'R. Delgado';
  const CAPITAL = 'R. Delgado, Capital';
  const MI = 'Merchandise Inventory', COGS = 'Cost of goods sold', SALES = 'Sales revenue';
  const AP = 'Accounts payable', AR = 'Accounts receivable';
  const BAY = 'Bayfront Supply Co.', RIDGE = 'Ridgeline Wholesale', KEN = 'Kenmore Rec League', PARK = 'Parkside Rentals';
  const ap = function (v) { return AP + ' (' + v + ')'; };
  const ar = function (c) { return AR + ' (' + c + ')'; };

  // Subsidiary-ledger accounts carry their control account (ctrl) and the vendor or customer (party).
  // side = normal balance. Delivery expense and the Drawing account are never used: they are tempting wrong choices.
  const ACCTS = [
    { n: 'Cash', grp: 'Assets', side: 'Dr', type: 'Current asset' },
    { n: ar(KEN), grp: 'Assets', side: 'Dr', ctrl: AR, party: KEN, sub: 'customer' },
    { n: ar(PARK), grp: 'Assets', side: 'Dr', ctrl: AR, party: PARK, sub: 'customer' },
    { n: MI, grp: 'Assets', side: 'Dr', type: 'Current asset', focus: true },
    { n: ap(BAY), grp: 'Liabilities', side: 'Cr', ctrl: AP, party: BAY, sub: 'vendor' },
    { n: ap(RIDGE), grp: 'Liabilities', side: 'Cr', ctrl: AP, party: RIDGE, sub: 'vendor' },
    { n: CAPITAL, grp: 'Owner’s equity', side: 'Cr', type: 'Owner’s equity' },
    { n: 'R. Delgado, Drawing', grp: 'Owner’s equity', side: 'Dr', type: 'Owner’s equity' },
    { n: SALES, grp: 'Revenue', side: 'Cr', type: 'Revenue' },
    { n: 'Sales returns & allowances', grp: 'Revenue', side: 'Dr', type: 'Contra-revenue' },
    { n: 'Sales discounts', grp: 'Revenue', side: 'Dr', type: 'Contra-revenue' },
    { n: COGS, grp: 'Expenses', side: 'Dr', type: 'Expense', focus: true },
    { n: 'Rent expense', grp: 'Expenses', side: 'Dr', type: 'Operating expense' },
    { n: 'Salaries expense', grp: 'Expenses', side: 'Dr', type: 'Operating expense' },
    { n: 'Delivery expense', grp: 'Expenses', side: 'Dr', type: 'Operating expense' }
  ];
  const GROUPS = ['Assets', 'Liabilities', 'Owner’s equity', 'Revenue', 'Expenses'];
  const A = {};
  ACCTS.forEach(function (a) { A[a.n] = a; });
  // Control accounts, shown in the ledger and on the balance sheet.
  const CONTROLS = {};
  CONTROLS[AR] = { n: AR, side: 'Dr', sub: 'customer', parties: [KEN, PARK] };
  CONTROLS[AP] = { n: AP, side: 'Cr', sub: 'vendor', parties: [BAY, RIDGE], focus: true };

  const OPENING = {
    id: 'open', date: 'Nov 1', d: '11/1', tag: 'Opening',
    text: 'Opening balances carried forward from October (given, already recorded).',
    lines: [{ a: 'Cash', dr: 25000 }, { a: MI, dr: 4000 }, { a: ap(BAY), cr: 2500 }, { a: CAPITAL, cr: 26500 }]
  };

  // think = analysis questions shown in the walkthrough (and as hints in practice); why = the takeaway.
  const T = [
    { id: '1', date: 'Nov 2', d: '11/2', tag: 'Purchase',
      text: 'Purchased $6,000 of merchandise from Ridgeline Wholesale on account, terms 2/10, n/30, FOB destination.',
      lines: [{ a: MI, dr: 6000 }, { a: ap(RIDGE), cr: 6000 }],
      think: [
        { q: 'What did Cobblestone get?', a: 'Merchandise to resell. Under the perpetual system, it goes straight into Merchandise Inventory (an asset).' },
        { q: 'Did it pay cash?', a: 'No. It bought on account, so it now owes Ridgeline Wholesale. Record the liability in Ridgeline’s own subsidiary account.' },
        { q: 'Do the terms change today’s entry?', a: 'No. Record the full $6,000. A 2% discount is recorded only if Cobblestone pays by November 12.' }],
      why: 'A purchase on account increases Merchandise Inventory and Accounts payable. The subsidiary account tells you exactly whom Cobblestone owes.' },

    { id: '2', date: 'Nov 3', d: '11/3', tag: 'No entry', noEntry: true,
      text: 'Ridgeline Wholesale delivered the November 2 order and paid the $240 freight bill.',
      lines: [],
      think: [
        { q: 'What were the shipping terms?', a: 'FOB destination. Ridgeline owned the goods until they arrived at Cobblestone’s store.' },
        { q: 'Who paid the freight?', a: 'Ridgeline Wholesale, the seller. The $240 is Ridgeline’s delivery expense, not Cobblestone’s.' },
        { q: 'Did any of Cobblestone’s accounts change?', a: 'No. The goods were already recorded on November 2, and Cobblestone paid nothing. No entry is required.' }],
      why: 'Under FOB destination the seller pays the freight, so the buyer records nothing. Recording the $240 would overstate both inventory (or expenses) and what Cobblestone owes.' },

    { id: '3', date: 'Nov 4', d: '11/4', tag: 'Purchase',
      text: 'Purchased $3,000 of merchandise from Bayfront Supply Co. on account, terms 2/10, n/30, FOB shipping point.',
      lines: [{ a: MI, dr: 3000 }, { a: ap(BAY), cr: 3000 }],
      think: [
        { q: 'What did Cobblestone get?', a: 'Merchandise to resell, so debit Merchandise Inventory.' },
        { q: 'Whom does it owe?', a: 'Bayfront Supply Co. Note that Bayfront’s account already has the $2,500 balance from October, so it grows to $5,500.' },
        { q: 'What do the terms mean?', a: '2/10, n/30: 2% off if paid by November 14, otherwise due by December 4. FOB shipping point means Cobblestone owns the goods once they ship, so it will pay the freight.' }],
      why: 'Same entry as November 2, but a different vendor. The subsidiary ledger keeps the two suppliers separate even though both are in Accounts payable.' },

    { id: '4', date: 'Nov 5', d: '11/5', tag: 'Freight-in',
      text: 'Paid $180 cash to the freight carrier for the Bayfront Supply Co. shipment.',
      lines: [{ a: MI, dr: 180 }, { a: 'Cash', cr: 180 }],
      think: [
        { q: 'Why is Cobblestone paying the freight this time?', a: 'The November 4 terms were FOB shipping point, so the buyer pays to bring the goods in.' },
        { q: 'Is freight-in an expense?', a: 'No. Under the perpetual system, the cost of getting goods ready for sale is part of inventory cost. Debit Merchandise Inventory, not Delivery expense.' },
        { q: 'Whom was it paid to?', a: 'The freight carrier, in cash. Bayfront is not involved, so Accounts payable does not change.' }],
      why: 'Freight-in is added to Merchandise Inventory. Compare November 3, where the seller paid and Cobblestone recorded nothing.' },

    { id: '5', date: 'Nov 6', d: '11/6', tag: 'Return',
      text: 'Returned $400 of wrong-size merchandise to Ridgeline Wholesale and received credit.',
      lines: [{ a: ap(RIDGE), dr: 400 }, { a: MI, cr: 400 }],
      think: [
        { q: 'What happened to the goods?', a: 'They went back to Ridgeline, so Merchandise Inventory decreases (credit).' },
        { q: 'What does “received credit” mean?', a: 'Ridgeline reduced what Cobblestone owes. Debit Accounts payable (Ridgeline Wholesale).' }],
      why: 'A purchase return reduces both inventory and the amount owed to that vendor. There is no separate Purchase Returns account under the perpetual system.' },

    { id: '6', date: 'Nov 8', d: '11/8', tag: 'Allowance',
      text: 'Bayfront Supply Co. gave a $300 price allowance for minor damage. Cobblestone kept the goods.',
      lines: [{ a: ap(BAY), dr: 300 }, { a: MI, cr: 300 }],
      think: [
        { q: 'Did any goods leave the store?', a: 'No, Cobblestone kept them. But they now cost $300 less.' },
        { q: 'So which accounts change?', a: 'The same ones as a return: debit Accounts payable (Bayfront Supply Co.) and credit Merchandise Inventory.' }],
      why: 'An allowance is recorded exactly like a return. The only difference is physical: the goods stay.' },

    { id: '7', date: 'Nov 10', d: '11/10', tag: 'Discount',
      text: 'Paid Ridgeline Wholesale within the discount period. Balance owed: $6,000 − $400 return = $5,600 × 2% = $112 discount.',
      lines: [{ a: ap(RIDGE), dr: 5600 }, { a: 'Cash', cr: 5488 }, { a: MI, cr: 112, tag: 'Discount' }],
      think: [
        { q: 'Is Cobblestone within the discount period?', a: 'Yes. The invoice was dated November 2, so the last discount day is November 12.' },
        { q: 'How much is owed, and how much cash is paid?', a: '$6,000 − $400 return = $5,600 owed. The discount is $5,600 × 2% = $112, so cash paid is $5,488.' },
        { q: 'Where does the $112 discount go?', a: 'It lowers the cost of the goods, so credit Merchandise Inventory. This entry has three lines.' }],
      why: 'Debit Accounts payable for the full $5,600 to clear Ridgeline’s balance. Cash and Merchandise Inventory share the credit side.' },

    { id: '8', date: 'Nov 15', d: '11/15', tag: 'Cash sale',
      text: 'Sold merchandise for $5,000 cash. Cost was $3,000.',
      lines: [{ a: 'Cash', dr: 5000 }, { a: COGS, dr: 3000, tag: 'Cost of sale' }, { a: SALES, cr: 5000 }, { a: MI, cr: 3000, tag: 'Cost of sale' }],
      think: [
        { q: 'How many parts does a perpetual sale have?', a: 'Two, recorded together: the revenue part at selling price and the cost part at cost.' },
        { q: 'Revenue part?', a: 'Debit Cash $5,000, credit Sales revenue $5,000.' },
        { q: 'Cost part?', a: 'Debit Cost of goods sold $3,000, credit Merchandise Inventory $3,000. The goods left the shelves.' }],
      why: 'Every sale is a four-line entry under the perpetual system. The $2,000 difference between price and cost is the gross profit on this sale.' },

    { id: '9', date: 'Nov 17', d: '11/17', tag: 'Credit sale',
      text: 'Sold merchandise to Kenmore Rec League for $4,000 on account, terms 2/10, n/30. Cost was $2,400.',
      lines: [{ a: ar(KEN), dr: 4000 }, { a: COGS, dr: 2400, tag: 'Cost of sale' }, { a: SALES, cr: 4000 }, { a: MI, cr: 2400, tag: 'Cost of sale' }],
      think: [
        { q: 'Who owes Cobblestone now?', a: 'Kenmore Rec League. Debit its own Accounts receivable account for $4,000.' },
        { q: 'And the cost part?', a: 'Debit Cost of goods sold $2,400, credit Merchandise Inventory $2,400.' },
        { q: 'When can Kenmore take the discount?', a: 'By November 27 (10 days after November 17). Record the full $4,000 today.' }],
      why: 'A sale on account is revenue today. The subsidiary account tracks exactly what Kenmore Rec League owes.' },

    { id: '10', date: 'Nov 19', d: '11/19', tag: 'Sales return',
      text: 'Kenmore Rec League returned $500 of merchandise sold on November 17 (cost $300).',
      lines: [{ a: 'Sales returns & allowances', dr: 500 }, { a: MI, dr: 300, tag: 'Restock' }, { a: ar(KEN), cr: 500 }, { a: COGS, cr: 300, tag: 'Restock' }],
      think: [
        { q: 'Which parts of the sale reverse?', a: 'Both. The goods came back, so this is again a four-line entry.' },
        { q: 'Revenue part, at selling price?', a: 'Debit Sales returns & allowances $500 (a contra-revenue account), credit Accounts receivable (Kenmore Rec League) $500.' },
        { q: 'Cost part, at cost?', a: 'Debit Merchandise Inventory $300, credit Cost of goods sold $300. The goods are back on the shelf.' }],
      why: 'The two pairs use different amounts: selling price for the revenue side, cost for the inventory side.' },

    { id: '11', date: 'Nov 25', d: '11/25', tag: 'Collection',
      text: 'Kenmore Rec League paid within the discount period. Balance: $4,000 − $500 return = $3,500 × 2% = $70 discount.',
      lines: [{ a: 'Cash', dr: 3430 }, { a: 'Sales discounts', dr: 70 }, { a: ar(KEN), cr: 3500 }],
      think: [
        { q: 'Is Kenmore within the discount period?', a: 'Yes. The last discount day is November 27.' },
        { q: 'How much cash comes in?', a: '$3,500 owed − $70 discount = $3,430.' },
        { q: 'Where does the $70 go?', a: 'Debit Sales discounts, a contra-revenue account. Credit Accounts receivable (Kenmore Rec League) for the full $3,500.' }],
      why: 'Kenmore’s balance is now zero. Collecting cash moves no goods, so there is no cost entry.' },

    { id: '12', date: 'Nov 27', d: '11/27', tag: 'Payment',
      text: 'Paid Bayfront Supply Co. in full. The November 4 purchase is past its discount period, so no discount: $3,000 − $300 allowance = $2,700. Also paid the $2,500 opening balance from October (no discount). Total paid: $5,200.',
      lines: [{ a: ap(BAY), dr: 5200 }, { a: 'Cash', cr: 5200 }],
      think: [
        { q: 'Is there a discount?', a: 'No. The November 4 invoice’s discount period ended November 14.' },
        { q: 'What does Cobblestone owe Bayfront in total?', a: '$2,500 from October + $3,000 − $300 allowance = $5,200. Check the Bayfront subsidiary ledger: it shows exactly $5,200.' },
        { q: 'So the entry is?', a: 'Debit Accounts payable (Bayfront Supply Co.) $5,200, credit Cash $5,200. No Merchandise Inventory line, because there is no discount.' }],
      why: 'Paying late costs the discount, so cash paid equals the full balance. Bayfront’s account is now zero.' },

    { id: '13', date: 'Nov 28', d: '11/28', tag: 'Credit sale',
      text: 'Sold merchandise to Parkside Rentals for $2,000 on account, terms n/30. Cost was $1,200.',
      lines: [{ a: ar(PARK), dr: 2000 }, { a: COGS, dr: 1200, tag: 'Cost of sale' }, { a: SALES, cr: 2000 }, { a: MI, cr: 1200, tag: 'Cost of sale' }],
      think: [
        { q: 'Who owes Cobblestone?', a: 'Parkside Rentals, a new customer with its own Accounts receivable account.' },
        { q: 'What do terms n/30 mean?', a: 'The full amount is due in 30 days. There is no discount offered.' },
        { q: 'Do you still need the cost part?', a: 'Yes. Every sale needs it: debit Cost of goods sold $1,200, credit Merchandise Inventory $1,200.' }],
      why: 'Parkside will still owe $2,000 on November 30. It is the only receivable on the balance sheet.' },

    { id: '14', date: 'Nov 30', d: '11/30', tag: 'Rent',
      text: 'Paid $1,000 store rent for November.',
      lines: [{ a: 'Rent expense', dr: 1000 }, { a: 'Cash', cr: 1000 }],
      think: [
        { q: 'Is rent part of the cost of the goods?', a: 'No. It is a cost of running the store: an operating expense.' }],
      why: 'Operating expenses appear below gross profit on the multi-step income statement.' },

    { id: '15', date: 'Nov 30', d: '11/30', tag: 'Salaries',
      text: 'Paid $1,300 in employee salaries for November.',
      lines: [{ a: 'Salaries expense', dr: 1300 }, { a: 'Cash', cr: 1300 }],
      think: [
        { q: 'What kind of cost is this?', a: 'Another operating expense. Debit Salaries expense, credit Cash.' }],
      why: 'Last entry. Net income for November is $1,830, and the balance sheet balances at $28,330.' }
  ];
  const N = T.length;

  const r2 = function (x) { return Math.round(x * 100) / 100; };
  function parseAmt(v) {
    const s = String(v == null ? '' : v).replace(/[$,\s]/g, '');
    if (s === '') return 0;
    const x = Number(s);
    return isFinite(x) && x >= 0 ? r2(x) : NaN;
  }
  function num(n) { return Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function money(n) { return (n < 0 ? '-' : '') + '$' + num(n); }
  function isBlank(r) { return !r.a && !String(r.d || '').trim() && !String(r.c || '').trim(); }

  // ---------- Checking a practice entry ----------
  // rows: [{ a, d, c }]. Lines may be in any order. Returns per-row status and message, plus an overall message.
  function check(idx, rows, noEntry) {
    const t = T[idx];
    const filled = rows.filter(function (r) { return !isBlank(r); });
    const res = { ok: false, rows: rows.map(function () { return null; }), msgs: [] };
    if (noEntry) {
      if (t.noEntry && !filled.length) { res.ok = true; return res; }
      if (t.noEntry) { res.msgs.push('You chose No entry required, which is right. Clear the journal lines, then check again.'); return res; }
      res.msgs.push('This transaction does change Cobblestone’s accounts, so it needs a journal entry.');
      return res;
    }
    if (!filled.length) { res.msgs.push('Choose accounts and enter amounts, or choose No entry required.'); return res; }
    if (t.noEntry) {
      res.msgs.push('Re-read the transaction: did Cobblestone pay anything, or did any of its accounts change?');
      rows.forEach(function (r, i) { if (!isBlank(r)) res.rows[i] = { ok: false, msg: '' }; });
      return res;
    }
    const key = t.lines.map(function (l) { return { a: l.a, side: l.dr ? 'Dr' : 'Cr', amt: l.dr || l.cr, used: false }; });
    let dT = 0, cT = 0, problems = 0;
    rows.forEach(function (r, i) {
      if (isBlank(r)) return;
      const d = parseAmt(r.d), c = parseAmt(r.c);
      if (!isNaN(d)) dT += d;
      if (!isNaN(c)) cT += c;
      const fail = function (msg) { problems++; res.rows[i] = { ok: false, msg: msg }; };
      if (!r.a) return fail('Choose an account for this line.');
      if (isNaN(d) || isNaN(c)) return fail('Enter a valid dollar amount.');
      if (d > 0 && c > 0) return fail('Use the Debit box or the Credit box, not both.');
      if (!d && !c) return fail('Enter an amount in Debit or Credit.');
      const side = d > 0 ? 'Dr' : 'Cr', amt = d > 0 ? d : c;
      const exact = key.find(function (k) { return !k.used && k.a === r.a && k.side === side && k.amt === amt; });
      if (exact) { exact.used = true; res.rows[i] = { ok: true, msg: '' }; return; }
      const same = key.filter(function (k) { return k.a === r.a; });
      if (same.length) {
        if (!same.some(function (k) { return k.side === side; })) return fail('Right account, but check whether it should be a debit or a credit.');
        return fail('Right account and side, but check the amount.');
      }
      const acct = A[r.a];
      if (acct && acct.ctrl && key.some(function (k) { return A[k.a].ctrl === acct.ctrl; }))
        return fail('Right kind of account, but check the ' + acct.sub + '.');
      return fail('This account does not belong in this entry.');
    });
    const missing = key.filter(function (k) { return !k.used; }).length;
    res.ok = !problems && !missing;
    if (res.ok) return res;
    if (r2(dT) !== r2(cT)) res.msgs.push('Debits (' + money(dT) + ') do not equal credits (' + money(cT) + ').');
    if (problems) res.msgs.push('Fix the line' + (problems > 1 ? 's' : '') + ' marked ✗. Lines marked ✓ are correct.');
    else if (missing) res.msgs.push('Every line so far is correct, but this entry needs ' + missing + ' more line' + (missing > 1 ? 's' : '') + '.');
    return res;
  }

  // ---------- Ledger ----------
  // posted: array of transaction indexes to include (the opening balances are always included).
  function buildLedger(posted) {
    const L = {};
    const add = function (t, i) {
      t.lines.forEach(function (l) { (L[l.a] = L[l.a] || []).push({ e: i, d: t.d, dr: l.dr || 0, cr: l.cr || 0, tag: l.tag || t.tag }); });
    };
    add(OPENING, -1);
    posted.slice().sort(function (a, b) { return a - b; }).forEach(function (i) { add(T[i], i); });
    return L;
  }
  function rowsFor(L, name) { // postings of an account, or of every subsidiary account under a control account
    if (CONTROLS[name]) {
      return ACCTS.filter(function (a) { return a.ctrl === name; }).reduce(function (all, a) { return all.concat((L[a.n] || []).map(function (x) { return Object.assign({ party: a.party }, x); })); }, [])
        .sort(function (x, y) { return x.e - y.e; });
    }
    return L[name] || [];
  }
  function bal(L, name) { // positive = normal balance
    const rows = rowsFor(L, name);
    const dr = rows.reduce(function (s, x) { return s + x.dr; }, 0), cr = rows.reduce(function (s, x) { return s + x.cr; }, 0);
    const side = CONTROLS[name] ? CONTROLS[name].side : A[name].side;
    return r2(side === 'Dr' ? dr - cr : cr - dr);
  }
  function totals(L) {
    let dr = 0, cr = 0;
    Object.keys(L).forEach(function (n) { L[n].forEach(function (x) { dr += x.dr; cr += x.cr; }); });
    return { dr: r2(dr), cr: r2(cr) };
  }

  // ---------- Statements ----------
  function incomeStatement(L) {
    const v = {
      sales: bal(L, SALES), ret: bal(L, 'Sales returns & allowances'), dis: bal(L, 'Sales discounts'), cogs: bal(L, COGS),
      opex: [['Rent expense', bal(L, 'Rent expense')], ['Salaries expense', bal(L, 'Salaries expense')], ['Delivery expense', bal(L, 'Delivery expense')]]
        .filter(function (x, i) { return i < 2 || x[1] !== 0; })
    };
    v.net = r2(v.sales - v.ret - v.dis);
    v.gp = r2(v.net - v.cogs);
    v.opexTotal = r2(v.opex.reduce(function (s, x) { return s + x[1]; }, 0));
    v.ni = r2(v.gp - v.opexTotal);
    return v;
  }
  function balanceSheet(L) {
    const ni = incomeStatement(L).ni;
    const v = { cash: bal(L, 'Cash'), ar: bal(L, AR), mi: bal(L, MI), ap: bal(L, AP), capBeg: bal(L, CAPITAL), drawing: bal(L, 'R. Delgado, Drawing'), ni: ni };
    v.assets = r2(v.cash + v.ar + v.mi);
    v.capEnd = r2(v.capBeg + v.ni - v.drawing);
    v.le = r2(v.ap + v.capEnd);
    return v;
  }

  // Balances that changed when transaction i was posted (for the walkthrough's "effect" panel).
  function effects(i) {
    const before = buildLedger(range(i)), after = buildLedger(range(i + 1));
    const names = [MI, COGS, 'Cash', AR, AP, SALES, 'Sales returns & allowances', 'Sales discounts', 'Rent expense', 'Salaries expense'];
    const out = names.map(function (n) { return { n: n, before: bal(before, n), after: bal(after, n) }; })
      .filter(function (x) { return x.before !== x.after; });
    return {
      accounts: out,
      ni: [incomeStatement(before).ni, incomeStatement(after).ni],
      assets: [balanceSheet(before).assets, balanceSheet(after).assets]
    };
  }
  function range(n) { const a = []; for (let i = 0; i < n; i++) a.push(i); return a; }

  const api = {
    BUSINESS: BUSINESS, OWNER: OWNER, CAPITAL: CAPITAL, ACCTS: ACCTS, GROUPS: GROUPS, A: A, CONTROLS: CONTROLS,
    OPENING: OPENING, T: T, N: N, MI: MI, COGS: COGS, AP: AP, AR: AR,
    r2: r2, parseAmt: parseAmt, num: num, money: money, isBlank: isBlank, check: check,
    buildLedger: buildLedger, rowsFor: rowsFor, bal: bal, totals: totals, incomeStatement: incomeStatement,
    balanceSheet: balanceSheet, effects: effects, range: range
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CobbleEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
