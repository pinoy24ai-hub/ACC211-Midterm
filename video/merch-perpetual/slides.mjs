// Slides and narration for the "Purchases under the Perpetual Inventory System" video.
// Each step is one frame of the video plus the narration spoken while it is on screen.

const fmt = (n) => n.toLocaleString('en-US');

// Journal entry table. lines: [account, debit, credit]; a credit line is indented.
function journal(date, lines, memo, hi = []) {
  const rows = lines.map(([acct, dr, cr], i) => `
    <tr class="${hi.includes(i) ? 'hi' : ''}">
      <td class="date">${i === 0 ? date : ''}</td>
      <td class="${cr ? 'cr-acct' : ''}">${acct}</td>
      <td class="num">${dr ? fmt(dr) : ''}</td>
      <td class="num">${cr ? fmt(cr) : ''}</td>
    </tr>`).join('');
  return `
    <table class="je">
      <thead><tr><th>Date</th><th>Account Titles and Explanation</th><th>Debit</th><th>Credit</th></tr></thead>
      <tbody>${rows}<tr class="memo"><td></td><td colspan="3">${memo}</td></tr></tbody>
    </table>`;
}

// Merchandise Inventory T-account. dr/cr: [label, amount]; newest flags the latest posting.
function taccount(dr, cr, { newest = null, balance = true, big = false } = {}) {
  const side = (items, s) => items.map(([l, a], i) =>
    `<div class="t-row ${newest === `${s}${i}` ? 'new' : ''}"><span>${l}</span><span>${fmt(a)}</span></div>`).join('');
  const sum = (items) => items.reduce((t, [, a]) => t + a, 0);
  const bal = sum(dr) - sum(cr);
  return `
    <div class="t ${big ? 'big' : ''}">
      <div class="t-title">Merchandise Inventory</div>
      <div class="t-body">
        <div class="t-side"><div class="t-head">Debit (increase)</div>${side(dr, 'd')}</div>
        <div class="t-side"><div class="t-head">Credit (decrease)</div>${side(cr, 'c')}</div>
      </div>
      ${balance ? `<div class="t-bal"><span>Balance</span><span>${fmt(bal)}</span></div>` : ''}
    </div>`;
}

function slide({ tag, title, body }) {
  return `
    <div class="frame">
      <header>${tag ? `<div class="tag">${tag}</div>` : ''}<h1>${title}</h1></header>
      <main>${body}</main>
      <footer><span>ACC 211 · Merchandising Operations</span><span>Perpetual Inventory System</span></footer>
    </div>`;
}

const txn = (text) => `<div class="txn"><div class="txn-label">Transaction</div><p>${text}</p></div>`;
const note = (text, kind = '') => `<div class="note ${kind}">${text}</div>`;
const two = (left, right) => `<div class="two"><div>${left}</div><div>${right}</div></div>`;

function quickCheck(showAnswer) {
  return `<div class="frame title-frame">
    <div class="kicker">Your turn</div>
    <h1 class="big-title">Quick check</h1>
    <p class="q">A company buys $4,000 of goods on account, terms 2/10, n/30, FOB destination.
    It returns $400 of goods, then pays within 10 days.<br><br>
    How much cash does it pay, and what is the credit to Merchandise Inventory on the payment date?</p>
    <p class="ans ${showAnswer ? '' : 'hidden'}">$4,000 − $400 = $3,600 owed · discount $3,600 × 2% = $72<br>
    Cash paid <b>$3,528</b> · credit Merchandise Inventory <b>$72</b> · FOB destination, so no freight entry</p></div>`;
}

// Running ledger postings, in date order.
const D = {
  a: ['Nov 1 Cash purchase', 5000],
  b: ['Nov 3 Purchase on account', 10000],
  c: ['Nov 4 Freight-in', 300],
};
const C = {
  d: ['Nov 6 Purchase return', 1000],
  e: ['Nov 8 Purchase allowance', 500],
  f: ['Nov 13 Purchase discount', 170],
};

export const steps = [
  {
    html: `<div class="frame title-frame">
      <div class="kicker">ACC 211 · Video Overview</div>
      <h1 class="big-title">Recording Purchases of Merchandise</h1>
      <h2>Journal entries under the perpetual inventory system</h2>
      <ul class="agenda">
        <li><b>a</b> Purchase for cash</li><li><b>b</b> Purchase on account, 2/10, n/30</li>
        <li><b>c</b> Freight, FOB shipping point</li><li><b>d</b> Purchase returns</li>
        <li><b>e</b> Purchase allowances</li><li><b>+</b> The Merchandise Inventory ledger</li>
      </ul></div>`,
    say: `Welcome to this video overview on recording purchases of merchandise. We will journalize five
      kinds of purchase transactions using the perpetual inventory system: a purchase for cash, a purchase on
      account with terms of two ten, net thirty, freight under F O B shipping point, purchase returns, and
      purchase allowances. At the end, we will post everything to the Merchandise Inventory T account and
      find its balance.`,
  },
  {
    html: slide({
      tag: 'The big idea', title: 'What "perpetual" means',
      body: two(`
        <p class="lead">Under a <b>perpetual</b> system, the company updates the <b>Merchandise Inventory</b> account
        every time goods come in or go out.</p>
        <ul class="bul">
          <li>Anything that changes the <b>cost of goods bought</b> is recorded directly in Merchandise Inventory.</li>
          <li>There is <b>no Purchases account</b>, no Freight-In account, and no Purchase Returns account.</li>
          <li>Inventory is an <b>asset</b>: debit to increase, credit to decrease.</li>
        </ul>`, `
        <div class="rule-card">
          <div class="rule up">Cost goes <b>up</b><br><span>Debit Merchandise Inventory</span></div>
          <div class="rule-ex">purchases · freight-in</div>
          <div class="rule down">Cost goes <b>down</b><br><span>Credit Merchandise Inventory</span></div>
          <div class="rule-ex">returns · allowances · discounts</div>
        </div>`),
    }),
    say: `First, the big idea. Under a perpetual inventory system, the company updates the Merchandise
      Inventory account every time goods come in or go out. So anything that changes the cost of the goods we
      bought is recorded directly in Merchandise Inventory. There is no separate Purchases account, no Freight In
      account, and no Purchase Returns account. Those belong to the periodic system. Remember that inventory is an
      asset. When the cost goes up, such as a purchase or freight in, we debit Merchandise Inventory. When the cost
      goes down, such as a return, an allowance, or a discount, we credit Merchandise Inventory.`,
  },
  {
    html: slide({
      tag: 'Our example', title: 'Bright Mart, November transactions',
      body: `<table class="list">
        <tr><td>Nov 1</td><td><b>(a)</b> Bought merchandise for <b>$5,000 cash</b>.</td></tr>
        <tr><td>Nov 3</td><td><b>(b)</b> Bought merchandise from Ace Supply on account, <b>$10,000</b>, terms <b>2/10, n/30</b>, FOB shipping point.</td></tr>
        <tr><td>Nov 4</td><td><b>(c)</b> Paid <b>$300</b> freight to the carrier for the Nov 3 shipment.</td></tr>
        <tr><td>Nov 6</td><td><b>(d)</b> Returned <b>$1,000</b> of the Nov 3 goods to Ace Supply.</td></tr>
        <tr><td>Nov 8</td><td><b>(e)</b> Received a <b>$500 allowance</b> from Ace Supply for slightly damaged goods we kept.</td></tr>
        <tr><td>Nov 13</td><td><b>(b, continued)</b> Paid Ace Supply the balance due, within the discount period.</td></tr>
      </table>`,
    }),
    say: `Here is our example. Bright Mart is a small retailer. On November first, it buys merchandise for five
      thousand dollars cash. On November third, it buys ten thousand dollars of merchandise from Ace Supply on
      account, terms two ten, net thirty, F O B shipping point. On November fourth, it pays three hundred dollars
      of freight. On November sixth, it returns one thousand dollars of goods. On November eighth, it receives a
      five hundred dollar allowance for damaged goods it decided to keep. And on November thirteenth, it pays Ace
      Supply within the discount period. Let's journalize each one.`,
  },
  // (a)
  {
    html: slide({
      tag: '(a) Purchase for cash', title: 'Buying merchandise with cash',
      body: two(txn('Nov 1: Bright Mart bought merchandise for <b>$5,000 cash</b>.') +
        journal('Nov 1', [['Merchandise Inventory', 5000], ['Cash', 0, 5000]],
          'To record purchase of merchandise for cash.') +
        note('Two assets trade places: inventory goes up, cash goes down.'),
        taccount([D.a], [], { newest: 'd0' })),
    }),
    say: `Transaction A, a purchase for cash. On November first, Bright Mart buys merchandise for five thousand
      dollars cash. Inventory increases, so we debit Merchandise Inventory for five thousand. Cash decreases, so
      we credit Cash for five thousand. Notice that one asset simply trades places with another. On the right,
      you can see the debit posted to the Merchandise Inventory T account.`,
  },
  // (b)
  {
    html: slide({
      tag: '(b) Purchase on account', title: 'Buying on credit: 2/10, n/30',
      body: two(txn('Nov 3: Bought merchandise from Ace Supply on account, <b>$10,000</b>, terms <b>2/10, n/30</b>, FOB shipping point.') +
        journal('Nov 3', [['Merchandise Inventory', 10000], ['Accounts Payable', 0, 10000]],
          'To record purchase on account from Ace Supply, terms 2/10, n/30.') +
        note('Record the <b>full invoice price</b> now. Any discount is recorded only if and when we pay early.', 'tip'),
        taccount([D.a, D.b], [], { newest: 'd1' })),
    }),
    say: `Transaction B, a purchase on account. On November third, Bright Mart buys ten thousand dollars of
      merchandise from Ace Supply on credit. We debit Merchandise Inventory for ten thousand, and credit Accounts
      Payable for ten thousand, because we now owe the supplier. Here is a key point: we record the full invoice
      price today. We do not know yet whether we will pay early, so the discount is recorded only if and when we
      actually take it.`,
  },
  {
    html: slide({
      tag: '(b) Reading the terms', title: 'What does 2/10, n/30 mean?',
      body: `
        <div class="terms">
          <div class="term"><div class="big">2</div><div>percent<br>discount</div></div>
          <div class="slash">/</div>
          <div class="term"><div class="big">10</div><div>if paid within<br>10 days</div></div>
          <div class="comma">,</div>
          <div class="term"><div class="big">n/30</div><div>otherwise, the net<br>amount is due in 30 days</div></div>
        </div>
        <div class="timeline">
          <div class="seg disc">Days 1 to 10: take the 2% discount</div>
          <div class="seg full">Days 11 to 30: pay the full balance</div>
        </div>
        <div class="tl-labels"><span>Nov 3 invoice</span><span>Nov 13 last discount day</span><span>Dec 3 final due date</span></div>
        ${note('The discount applies to the cost of the goods <b>after returns and allowances</b>, never to freight.', 'tip')}`,
    }),
    say: `Before we move on, let's read the credit terms. Two ten, net thirty, means the buyer gets a two percent
      discount if it pays within ten days of the invoice date. Otherwise, the full net amount is due within thirty
      days. For an invoice dated November third, the last day to take the discount is November thirteenth, and the
      final due date is December third. Keep in mind that the discount applies to the cost of the goods after any
      returns and allowances. It never applies to freight.`,
  },
  // (c)
  {
    html: slide({
      tag: '(c) Freight', title: 'FOB shipping point: the buyer pays freight',
      body: two(`
        <div class="ship">
          <div class="box seller">Seller<br><span>Ace Supply</span></div>
          <div class="arrow"><span>ownership passes here</span></div>
          <div class="truck">Truck in transit<br><span>freight paid by <b>buyer</b></span></div>
          <div class="arrow2"></div>
          <div class="box buyer">Buyer<br><span>Bright Mart</span></div>
        </div>` +
        txn('Nov 4: Paid <b>$300</b> freight to the carrier for the Nov 3 shipment.') +
        journal('Nov 4', [['Merchandise Inventory', 300], ['Cash', 0, 300]],
          'To record freight paid on goods purchased, FOB shipping point.'),
        taccount([D.a, D.b, D.c], [], { newest: 'd2' }) +
        note('Freight-in is part of the <b>cost of the inventory</b>, so it is debited to Merchandise Inventory.', 'tip') +
        note('<b>FOB destination?</b> The seller pays freight. The buyer makes <b>no entry</b>.')),
    }),
    say: `Transaction C, freight. With F O B shipping point, ownership passes to the buyer as soon as the goods leave
      the seller's dock, so the buyer pays the shipping cost. On November fourth, Bright Mart pays three hundred
      dollars to the carrier. Freight in is a cost of getting the inventory ready for sale, so it becomes part of the
      inventory's cost. We debit Merchandise Inventory for three hundred, and credit Cash for three hundred. Compare
      this with F O B destination. In that case, the seller owns the goods while they are in transit and pays the
      freight, so the buyer makes no entry at all.`,
  },
  // (d)
  {
    html: slide({
      tag: '(d) Purchase return', title: 'Sending goods back to the supplier',
      body: two(txn('Nov 6: Returned <b>$1,000</b> of the Nov 3 merchandise to Ace Supply.') +
        journal('Nov 6', [['Accounts Payable', 1000], ['Merchandise Inventory', 0, 1000]],
          'To record return of merchandise to Ace Supply.') +
        note('We owe less, and we have fewer goods. <b>Debit</b> Accounts Payable, <b>credit</b> Merchandise Inventory.'),
        taccount([D.a, D.b, D.c], [C.d], { newest: 'c0' })),
    }),
    say: `Transaction D, a purchase return. On November sixth, Bright Mart sends one thousand dollars of the goods
      back to Ace Supply. Two things happen. We owe the supplier less, so we debit Accounts Payable for one
      thousand. And we no longer have those goods, so we credit Merchandise Inventory for one thousand. If we had
      paid cash originally, we would debit Cash or a receivable from the supplier instead of Accounts Payable.
      Notice our first credit in the T account.`,
  },
  // (e)
  {
    html: slide({
      tag: '(e) Purchase allowance', title: 'Keeping the goods for a lower price',
      body: two(txn('Nov 8: Received a <b>$500 allowance</b> from Ace Supply for slightly damaged goods that Bright Mart kept.') +
        journal('Nov 8', [['Accounts Payable', 500], ['Merchandise Inventory', 0, 500]],
          'To record allowance received for damaged merchandise.') +
        `<table class="cmp"><tr><th></th><th>Return</th><th>Allowance</th></tr>
          <tr><td>Goods</td><td>Sent back</td><td>Kept</td></tr>
          <tr><td>Entry</td><td colspan="2" class="same">Same: Dr Accounts Payable, Cr Merchandise Inventory</td></tr></table>`,
        taccount([D.a, D.b, D.c], [C.d, C.e], { newest: 'c1' })),
    }),
    say: `Transaction E, a purchase allowance. On November eighth, some goods arrive slightly damaged. Instead of
      sending them back, Bright Mart agrees to keep them in exchange for a five hundred dollar price reduction. The
      entry looks exactly like a return: debit Accounts Payable for five hundred, and credit Merchandise Inventory
      for five hundred. The only difference is physical. With a return, the goods go back. With an allowance, we keep
      the goods, but their cost goes down.`,
  },
  // (b) payment
  {
    html: slide({
      tag: '(b) continued: paying within 10 days', title: 'Taking the purchase discount',
      body: two(`
        <table class="calc">
          <tr><td>Original invoice</td><td>$10,000</td></tr>
          <tr><td>Less: return (Nov 6)</td><td>(1,000)</td></tr>
          <tr><td>Less: allowance (Nov 8)</td><td>(500)</td></tr>
          <tr class="sub"><td>Balance owed</td><td>$8,500</td></tr>
          <tr><td>Discount: $8,500 × 2%</td><td>(170)</td></tr>
          <tr class="tot"><td>Cash paid</td><td>$8,330</td></tr>
        </table>` +
        journal('Nov 13', [['Accounts Payable', 8500], ['Merchandise Inventory', 0, 170], ['Cash', 0, 8330]],
          'To record payment to Ace Supply within the discount period.'),
        taccount([D.a, D.b, D.c], [C.d, C.e, C.f], { newest: 'c2' }) +
        note('Paid late (after Nov 13)? No discount: <b>Dr</b> Accounts Payable 8,500, <b>Cr</b> Cash 8,500.')),
    }),
    say: `Now let's finish transaction B by paying the supplier. Bright Mart pays on November thirteenth, the tenth
      day, so it qualifies for the discount. Start with the ten thousand dollar invoice. Subtract the one thousand
      dollar return and the five hundred dollar allowance. That leaves a balance owed of eight thousand five hundred.
      The discount is two percent of eight thousand five hundred, which is one hundred seventy dollars. So Bright
      Mart pays eight thousand three hundred thirty in cash. The entry: debit Accounts Payable for the full eight
      thousand five hundred, to wipe out the debt. Credit Merchandise Inventory for the one hundred seventy dollar
      discount, because the goods cost us less. And credit Cash for eight thousand three hundred thirty. If Bright
      Mart had paid after November thirteenth, there would be no discount, and it would simply debit Accounts
      Payable and credit Cash for eight thousand five hundred.`,
  },
  // Ledger build
  {
    html: slide({
      tag: 'The ledger', title: 'Merchandise Inventory T-account: debits',
      body: two(taccount([D.a, D.b, D.c], [], { balance: false, big: true }),
        `<p class="lead">Every cost that <b>increased</b> inventory sits on the debit side.</p>
         <table class="calc"><tr><td>Cash purchase</td><td>5,000</td></tr><tr><td>Purchase on account</td><td>10,000</td></tr>
         <tr><td>Freight-in</td><td>300</td></tr><tr class="tot"><td>Total debits</td><td>15,300</td></tr></table>`),
    }),
    say: `Now let's pull everything together in the Merchandise Inventory ledger. On the debit side, we have every
      cost that increased inventory: the five thousand dollar cash purchase, the ten thousand dollar purchase on
      account, and the three hundred dollars of freight in. Total debits are fifteen thousand three hundred.`,
  },
  {
    html: slide({
      tag: 'The ledger', title: 'Merchandise Inventory T-account: credits',
      body: two(taccount([D.a, D.b, D.c], [C.d, C.e, C.f], { balance: false, big: true }),
        `<p class="lead">Every reduction in cost sits on the credit side.</p>
         <table class="calc"><tr><td>Purchase return</td><td>1,000</td></tr><tr><td>Purchase allowance</td><td>500</td></tr>
         <tr><td>Purchase discount</td><td>170</td></tr><tr class="tot"><td>Total credits</td><td>1,670</td></tr></table>`),
    }),
    say: `On the credit side, we have every reduction in cost: the one thousand dollar return, the five hundred
      dollar allowance, and the one hundred seventy dollar purchase discount. Total credits are one thousand six
      hundred seventy.`,
  },
  {
    html: slide({
      tag: 'The ledger', title: 'Ending balance',
      body: two(taccount([D.a, D.b, D.c], [C.d, C.e, C.f], { big: true }),
        `<table class="calc"><tr><td>Total debits</td><td>15,300</td></tr><tr><td>Less: total credits</td><td>(1,670)</td></tr>
         <tr class="tot"><td>Debit balance</td><td>$13,630</td></tr></table>
         ${note('This is the <b>net cost</b> of the goods on hand. When Bright Mart sells them, it moves this cost to <b>Cost of Goods Sold</b>.', 'tip')}`),
    }),
    say: `Subtract the credits from the debits. Fifteen thousand three hundred, minus one thousand six hundred
      seventy, gives a debit balance of thirteen thousand six hundred thirty dollars. That is the net cost of the
      merchandise Bright Mart has on hand. When it sells those goods, it will move that cost out of inventory and
      into Cost of Goods Sold, which is the topic of our next video.`,
  },
  {
    html: slide({
      tag: 'Summary', title: 'Purchase entries at a glance',
      body: `<table class="sum">
        <tr><th>Transaction</th><th>Debit</th><th>Credit</th><th>Effect on inventory</th></tr>
        <tr><td>(a) Purchase for cash</td><td>Merchandise Inventory</td><td>Cash</td><td class="up">Increase</td></tr>
        <tr><td>(b) Purchase on account</td><td>Merchandise Inventory</td><td>Accounts Payable</td><td class="up">Increase</td></tr>
        <tr><td>(c) Freight, FOB shipping point</td><td>Merchandise Inventory</td><td>Cash</td><td class="up">Increase</td></tr>
        <tr><td>(d) Purchase return</td><td>Accounts Payable (or Cash)</td><td>Merchandise Inventory</td><td class="down">Decrease</td></tr>
        <tr><td>(e) Purchase allowance</td><td>Accounts Payable (or Cash)</td><td>Merchandise Inventory</td><td class="down">Decrease</td></tr>
        <tr><td>(b) Pay within discount period</td><td>Accounts Payable</td><td>Merchandise Inventory, Cash</td><td class="down">Decrease</td></tr>
        <tr><td>(b) Pay after discount period</td><td>Accounts Payable</td><td>Cash</td><td>No effect</td></tr>
      </table>`,
    }),
    say: `Here is the whole lesson on one screen. Purchases for cash or on account, and freight under F O B shipping
      point, all increase inventory, so we debit Merchandise Inventory. Returns, allowances, and purchase discounts
      all decrease inventory, so we credit Merchandise Inventory. Paying after the discount period simply settles
      the payable and has no effect on inventory. Pause the video here if you want to copy this table into your
      notes.`,
  },
  {
    html: quickCheck(false),
    say: `Let's finish with a quick check. A company buys four thousand dollars of goods on account, terms two ten,
      net thirty, F O B destination. It returns four hundred dollars of goods, then pays within ten days. How much
      cash does it pay, and what is the credit to Merchandise Inventory on the payment date? Pause the video and
      try it.`,
  },
  {
    html: quickCheck(true),
    say: `Here is the answer. The balance owed is four thousand minus four hundred,
      or three thousand six hundred. Two percent of that is seventy two dollars. So it pays three thousand five
      hundred twenty eight dollars, and credits Merchandise Inventory for seventy two. And because the terms are F O B
      destination, the buyer makes no freight entry. Great work. See you in the next video.`,
  },
];
