// Slides and narration for the "Sales under the Perpetual Inventory System" video.
// Each step is one frame of the video plus the narration spoken while it is on screen.

const fmt = (n) => n.toLocaleString('en-US');

// Journal entry table. lines: [account, debit, credit]; a credit line is indented.
function journal(date, lines, memo) {
  const rows = lines.map(([acct, dr, cr], i) => `
    <tr>
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

// A labeled pair of entries: the revenue side at selling price and the cost side at cost.
const side = (label, kind) => `<div class="side-label ${kind}">${label}</div>`;

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

// Selling price vs cost box for a sale.
const margin = (price, cost) => `
  <table class="calc">
    <tr><td>Selling price (to Sales Revenue)</td><td>${fmt(price)}</td></tr>
    <tr><td>Cost (to Cost of Goods Sold)</td><td>(${fmt(cost)})</td></tr>
    <tr class="tot"><td>Gross profit on this sale</td><td>${fmt(price - cost)}</td></tr>
  </table>`;

function quickCheck(showAnswer) {
  return `<div class="frame title-frame">
    <div class="kicker">Your turn</div>
    <h1 class="big-title">Quick check</h1>
    <p class="q">A company sells goods on account for $6,000 (cost $3,500), terms 2/10, n/30. The customer returns
    $1,000 of goods (cost $600) that can be resold, then pays within 10 days.<br><br>
    How much cash is collected, and what are the two entries for the return?</p>
    <p class="ans ${showAnswer ? '' : 'hidden'}">$6,000 − $1,000 = $5,000 owed · discount $5,000 × 2% = $100 · cash collected <b>$4,900</b><br>
    Return: <b>Dr</b> Sales Returns &amp; Allowances 1,000, <b>Cr</b> Accounts Receivable 1,000 ·
    <b>Dr</b> Merchandise Inventory 600, <b>Cr</b> Cost of Goods Sold 600</p></div>`;
}

export const steps = [
  {
    html: `<div class="frame title-frame">
      <div class="kicker">ACC 211 · Video Overview</div>
      <h1 class="big-title">Recording Sales of Merchandise</h1>
      <h2>Journal entries under the perpetual inventory system</h2>
      <ul class="agenda">
        <li><b>a</b> Cash sale</li><li><b>b</b> Sale on account, 2/10, n/30</li>
        <li><b>+</b> Freight-out, FOB destination</li><li><b>+</b> Sales returns and sales allowances</li>
        <li><b>c</b> Collection within the discount period</li><li><b>+</b> The multi-step income statement</li>
      </ul></div>`,
    say: `Welcome back. In the last video we recorded purchases. Now we sell the merchandise. We will journalize a
      cash sale, a sale on account with terms of two ten, net thirty, freight out under F O B destination, a sales
      return and a sales allowance, and finally the customer's payment within the discount period. All of this is
      under the perpetual inventory system. We will finish by building a multi step income statement that shows
      gross profit and net income.`,
  },
  {
    html: slide({
      tag: 'The big idea', title: 'Every sale needs two entries',
      body: two(`
        <p class="lead">Under a <b>perpetual</b> system, each sale is recorded twice:</p>
        <div class="pair">
          <div class="pair-card rev"><div class="pair-n">1</div><div><b>Revenue side</b>, at <b>selling price</b><br>
            <span>Dr Cash or Accounts Receivable · Cr Sales Revenue</span></div></div>
          <div class="pair-card cost"><div class="pair-n">2</div><div><b>Cost side</b>, at <b>cost</b><br>
            <span>Dr Cost of Goods Sold · Cr Merchandise Inventory</span></div></div>
        </div>
        ${note('Entry 2 is what makes the system "perpetual": inventory and cost of goods sold are always up to date.', 'tip')}`, `
        <div class="rule-card">
          <div class="rule-title">Contra-revenue accounts</div>
          <p class="small">They reduce Sales Revenue, so they carry a <b>debit</b> balance.</p>
          <div class="rule down">Sales Returns and Allowances</div>
          <div class="rule down">Sales Discounts</div>
          <p class="small muted">Sales Revenue − these two = <b>Net Sales</b></p>
        </div>`),
    }),
    say: `Here is the big idea. Under a perpetual system, every sale needs two entries. The first entry records the
      revenue side at the selling price: debit Cash or Accounts Receivable, and credit Sales Revenue. The second
      entry records the cost side at cost: debit Cost of Goods Sold, and credit Merchandise Inventory. That second
      entry is what keeps inventory up to date. We will also use two contra revenue accounts: Sales Returns and
      Allowances, and Sales Discounts. They reduce Sales Revenue, so they have normal debit balances. Sales
      Revenue minus these two accounts gives us Net Sales.`,
  },
  {
    html: slide({
      tag: 'Our example', title: 'Bright Mart, November sales',
      body: `<table class="list">
        <tr><td>Nov 15</td><td><b>(a)</b> Sold merchandise for <b>$3,000 cash</b>. Cost of the goods: <b>$1,800</b>.</td></tr>
        <tr><td>Nov 18</td><td><b>(b)</b> Sold merchandise to Rosa's Shop on account, <b>$8,000</b>, terms <b>2/10, n/30</b>, FOB destination. Cost: <b>$4,800</b>.</td></tr>
        <tr><td>Nov 18</td><td><b>(+)</b> Paid <b>$200</b> freight to deliver the goods to Rosa's Shop.</td></tr>
        <tr><td>Nov 21</td><td><b>(+)</b> Rosa's Shop returned <b>$1,000</b> of goods (cost <b>$600</b>), in good condition.</td></tr>
        <tr><td>Nov 23</td><td><b>(+)</b> Granted Rosa's Shop a <b>$500 allowance</b> for slightly damaged goods it kept.</td></tr>
        <tr><td>Nov 28</td><td><b>(c)</b> Collected the balance from Rosa's Shop, within the discount period.</td></tr>
      </table>`,
    }),
    say: `Here is our example, still with Bright Mart. On November fifteenth, it sells merchandise for three thousand
      dollars cash. Those goods cost eighteen hundred. On November eighteenth, it sells eight thousand dollars of
      merchandise to Rosa's Shop on account, terms two ten, net thirty, F O B destination. Those goods cost four
      thousand eight hundred. The same day, Bright Mart pays two hundred dollars to deliver them. On November twenty
      first, Rosa's Shop returns one thousand dollars of goods that cost six hundred. On November twenty third,
      Bright Mart grants a five hundred dollar allowance for damaged goods the customer kept. And on November twenty
      eighth, Rosa's Shop pays within the discount period.`,
  },
  // (a)
  {
    html: slide({
      tag: '(a) Cash sale', title: 'Selling merchandise for cash',
      body: two(txn('Nov 15: Sold merchandise for <b>$3,000 cash</b>. The goods cost <b>$1,800</b>.') +
        side('1 · Revenue side, at selling price', 'rev') +
        journal('Nov 15', [['Cash', 3000], ['Sales Revenue', 0, 3000]], 'To record cash sale.') +
        side('2 · Cost side, at cost', 'cost') +
        journal('Nov 15', [['Cost of Goods Sold', 1800], ['Merchandise Inventory', 0, 1800]], 'To record cost of merchandise sold.'),
        margin(3000, 1800) +
        note('Notice that the two entries use <b>different amounts</b>. The difference is the profit on the sale before expenses.', 'tip')),
    }),
    say: `Transaction A, a cash sale. On November fifteenth, Bright Mart sells merchandise for three thousand dollars
      cash. First, the revenue side at selling price: debit Cash for three thousand, and credit Sales Revenue for
      three thousand. Second, the cost side at cost: debit Cost of Goods Sold for eighteen hundred, and credit
      Merchandise Inventory for eighteen hundred, because those goods have left the shelf. Notice that the two entries
      use different amounts. The twelve hundred dollar difference is the gross profit on this sale.`,
  },
  // (b)
  {
    html: slide({
      tag: '(b) Sale on account', title: 'Selling on credit: 2/10, n/30',
      body: two(txn("Nov 18: Sold merchandise to Rosa's Shop on account, <b>$8,000</b>, terms <b>2/10, n/30</b>, FOB destination. Cost: <b>$4,800</b>.") +
        side('1 · Revenue side, at selling price', 'rev') +
        journal('Nov 18', [['Accounts Receivable', 8000], ['Sales Revenue', 0, 8000]], "To record sale on account to Rosa's Shop, terms 2/10, n/30.") +
        side('2 · Cost side, at cost', 'cost') +
        journal('Nov 18', [['Cost of Goods Sold', 4800], ['Merchandise Inventory', 0, 4800]], 'To record cost of merchandise sold.'),
        note('Record the <b>full invoice price</b>. The discount is recorded only if the customer actually pays within 10 days.', 'tip') +
        `<div class="mini-terms"><div><b>2/10</b> 2% off if paid by <b>Nov 28</b></div><div><b>n/30</b> full amount due by <b>Dec 18</b></div></div>`),
    }),
    say: `Transaction B, a sale on account. On November eighteenth, Bright Mart sells eight thousand dollars of goods
      to Rosa's Shop on credit. The revenue side: debit Accounts Receivable for eight thousand, and credit Sales
      Revenue for eight thousand. The cost side: debit Cost of Goods Sold for four thousand eight hundred, and credit
      Merchandise Inventory for four thousand eight hundred. Just like with purchases, we record the full invoice
      price. The customer can take a two percent discount by paying on or before November twenty eighth. Otherwise,
      the full amount is due on December eighteenth.`,
  },
  // Freight-out
  {
    html: slide({
      tag: 'Freight-out', title: 'FOB destination: the seller pays freight',
      body: two(`
        <div class="ship">
          <div class="box seller">Seller<br><span>Bright Mart</span></div>
          <div class="arrow2"></div>
          <div class="truck">Truck in transit<br><span>freight paid by <b>seller</b></span></div>
          <div class="arrow"><span>ownership passes here</span></div>
          <div class="box buyer">Buyer<br><span>Rosa's Shop</span></div>
        </div>` +
        txn("Nov 18: Paid <b>$200</b> freight to deliver the goods to Rosa's Shop.") +
        journal('Nov 18', [['Delivery Expense', 200], ['Cash', 0, 200]], 'To record freight paid on goods sold, FOB destination.'),
        `<table class="cmp"><tr><th></th><th>Freight-in</th><th>Freight-out</th></tr>
          <tr><td>Who</td><td>Buyer pays</td><td>Seller pays</td></tr>
          <tr><td>Account</td><td>Merchandise Inventory</td><td>Delivery Expense</td></tr>
          <tr><td>Reported as</td><td>Part of inventory cost</td><td>Operating (selling) expense</td></tr></table>` +
        note('<b>FOB shipping point?</b> The buyer pays freight, so the seller makes <b>no entry</b>.')),
    }),
    say: `Because the terms are F O B destination, Bright Mart owns the goods until they reach the customer, so Bright
      Mart pays the freight. On November eighteenth, it pays two hundred dollars. For the seller, freight out is not
      part of inventory cost. It is a selling expense. So we debit Delivery Expense, sometimes called Freight Out, for
      two hundred, and credit Cash for two hundred. Compare this with freight in from the purchases video. Freight in
      is paid by the buyer and added to Merchandise Inventory. Freight out is paid by the seller and reported as an
      operating expense. And if the terms were F O B shipping point, the buyer would pay, and the seller would make
      no entry at all.`,
  },
  // Sales return
  {
    html: slide({
      tag: 'Sales return', title: 'The customer sends goods back',
      body: two(txn("Nov 21: Rosa's Shop returned <b>$1,000</b> of goods (cost <b>$600</b>). The goods are in good condition.") +
        side('1 · Reverse the revenue, at selling price', 'rev') +
        journal('Nov 21', [['Sales Returns and Allowances', 1000], ['Accounts Receivable', 0, 1000]], "To record goods returned by Rosa's Shop.") +
        side('2 · Put the goods back, at cost', 'cost') +
        journal('Nov 21', [['Merchandise Inventory', 600], ['Cost of Goods Sold', 0, 600]], 'To restore returned goods to inventory.'),
        note('Why not debit Sales Revenue directly? Using the contra account <b>keeps a record of returns</b>, so managers can see how often customers are unhappy.', 'tip') +
        note('If the returned goods were damaged and could not be resold, skip entry 2.')),
    }),
    say: `Now a sales return. On November twenty first, Rosa's Shop returns one thousand dollars of goods that cost
      six hundred. Because the goods come back, we need two entries again. First, reverse the revenue at selling
      price: debit Sales Returns and Allowances for one thousand, and credit Accounts Receivable for one thousand,
      because the customer owes us less. Second, put the goods back on the shelf at cost: debit Merchandise Inventory
      for six hundred, and credit Cost of Goods Sold for six hundred. Why not just debit Sales Revenue? Using the
      contra account keeps a separate record of returns, so managers can track them. And if the returned goods were
      damaged and worthless, we would skip the second entry.`,
  },
  // Sales allowance
  {
    html: slide({
      tag: 'Sales allowance', title: 'The customer keeps the goods at a lower price',
      body: two(txn("Nov 23: Granted Rosa's Shop a <b>$500 allowance</b> for slightly damaged goods that it kept.") +
        side('Revenue side only', 'rev') +
        journal('Nov 23', [['Sales Returns and Allowances', 500], ['Accounts Receivable', 0, 500]], "To record allowance granted to Rosa's Shop.") +
        note('No goods come back, so there is <b>no cost entry</b>.', 'tip'),
        `<table class="cmp"><tr><th></th><th>Sales return</th><th>Sales allowance</th></tr>
          <tr><td>Goods</td><td>Come back</td><td>Customer keeps them</td></tr>
          <tr><td>Revenue entry</td><td colspan="2" class="same">Same: Dr Sales Returns and Allowances, Cr Accounts Receivable</td></tr>
          <tr><td>Cost entry</td><td>Dr Merchandise Inventory, Cr COGS</td><td><b>None</b></td></tr></table>`),
    }),
    say: `Next, a sales allowance. On November twenty third, Bright Mart gives Rosa's Shop a five hundred dollar price
      reduction for slightly damaged goods that the customer decides to keep. Debit Sales Returns and Allowances for
      five hundred, and credit Accounts Receivable for five hundred. That's it. Because no goods come back, there is
      no cost entry. This is the key difference from a return. Both use the same revenue entry, but only a return
      puts goods back into inventory.`,
  },
  // (c) collection
  {
    html: slide({
      tag: '(c) Collection within 10 days', title: 'The customer takes the sales discount',
      body: two(`
        <table class="calc">
          <tr><td>Original invoice (Nov 18)</td><td>$8,000</td></tr>
          <tr><td>Less: return (Nov 21)</td><td>(1,000)</td></tr>
          <tr><td>Less: allowance (Nov 23)</td><td>(500)</td></tr>
          <tr class="sub"><td>Balance owed</td><td>$6,500</td></tr>
          <tr><td>Discount: $6,500 × 2%</td><td>(130)</td></tr>
          <tr class="tot"><td>Cash collected</td><td>$6,370</td></tr>
        </table>` +
        journal('Nov 28', [['Cash', 6370], ['Sales Discounts', 130], ['Accounts Receivable', 0, 6500]],
          "To record collection from Rosa's Shop within the discount period."),
        note('Sales Discounts is a <b>contra-revenue</b> account with a debit balance. It is <b>not</b> an expense.', 'tip') +
        note("Collected late (after Nov 28)? No discount: <b>Dr</b> Cash 6,500, <b>Cr</b> Accounts Receivable 6,500.") +
        note('No cost entry here: collecting cash does not move any goods.')),
    }),
    say: `Transaction C, collecting from the customer. Rosa's Shop pays on November twenty eighth, the tenth day, so it
      earns the discount. Start with the eight thousand dollar invoice. Subtract the one thousand dollar return and
      the five hundred dollar allowance. The balance owed is six thousand five hundred. Two percent of that is one
      hundred thirty dollars, so Bright Mart collects six thousand three hundred seventy. The entry: debit Cash for
      six thousand three hundred seventy, debit Sales Discounts for one hundred thirty, and credit Accounts Receivable
      for the full six thousand five hundred, which clears the customer's balance. Sales Discounts is a contra revenue
      account, not an expense. If the customer had paid after November twenty eighth, there would be no discount:
      debit Cash and credit Accounts Receivable for six thousand five hundred. And there is no cost entry, because
      collecting cash does not move any goods.`,
  },
  // Net sales & gross profit
  {
    html: slide({
      tag: 'Putting it together', title: 'From sales revenue to gross profit',
      body: two(`
        <table class="calc">
          <tr class="head"><td colspan="2">Net sales</td></tr>
          <tr><td>Sales revenue: 3,000 + 8,000</td><td>11,000</td></tr>
          <tr><td>Less: sales returns and allowances: 1,000 + 500</td><td>(1,500)</td></tr>
          <tr><td>Less: sales discounts</td><td>(130)</td></tr>
          <tr class="sub"><td>Net sales</td><td>9,370</td></tr>
          <tr class="head"><td colspan="2">Cost of goods sold</td></tr>
          <tr><td>Cash sale + sale on account: 1,800 + 4,800</td><td>6,600</td></tr>
          <tr><td>Less: cost of goods returned</td><td>(600)</td></tr>
          <tr class="sub"><td>Cost of goods sold</td><td>6,000</td></tr>
          <tr class="tot"><td>Gross profit: 9,370 − 6,000</td><td>$3,370</td></tr>
        </table>`,
        note('<b>Net sales</b> is what the company really earned from customers after returns, allowances and discounts.', 'tip') +
        note('<b>Gross profit</b> is what is left to pay operating expenses after covering the cost of the goods sold.', 'tip') +
        note('Gross profit rate: 3,370 ÷ 9,370 ≈ <b>36%</b> of every sales dollar.')),
    }),
    say: `Let's put these entries together. Sales Revenue is three thousand plus eight thousand, or eleven thousand.
      Subtract sales returns and allowances of fifteen hundred, and sales discounts of one hundred thirty. Net sales
      is nine thousand three hundred seventy. Next, cost of goods sold. The two sales cost eighteen hundred plus four
      thousand eight hundred, or sixty six hundred, less the six hundred dollars of returned goods. Cost of goods sold
      is six thousand. Net sales minus cost of goods sold gives a gross profit of three thousand three hundred seventy
      dollars. That is about thirty six cents of every sales dollar left over to pay operating expenses.`,
  },
  // Multi-step income statement
  {
    html: slide({
      tag: 'The multi-step income statement', title: 'Bright Mart, month ended November 30',
      body: two(`
        <table class="is">
          <tr><td>Sales revenue</td><td></td><td>$11,000</td></tr>
          <tr><td class="in">Less: Sales returns and allowances</td><td>$1,500</td><td></td></tr>
          <tr><td class="in">Sales discounts</td><td class="u">130</td><td class="u">1,630</td></tr>
          <tr class="key"><td>Net sales</td><td></td><td>9,370</td></tr>
          <tr><td>Cost of goods sold</td><td></td><td class="u">6,000</td></tr>
          <tr class="key step1"><td>Gross profit</td><td></td><td>3,370</td></tr>
          <tr><td>Operating expenses</td><td></td><td></td></tr>
          <tr><td class="in">Salaries expense*</td><td>1,200</td><td></td></tr>
          <tr><td class="in">Rent expense*</td><td>900</td><td></td></tr>
          <tr><td class="in">Delivery expense</td><td class="u">200</td><td></td></tr>
          <tr><td class="in2">Total operating expenses</td><td></td><td class="u">2,300</td></tr>
          <tr class="key"><td>Income from operations</td><td></td><td>1,070</td></tr>
          <tr><td>Other expenses: Interest expense*</td><td></td><td class="u">70</td></tr>
          <tr class="key final"><td>Net income</td><td></td><td class="dbl">$1,000</td></tr>
        </table>
        <p class="foot">* Assumed for illustration. All other amounts come from this video's transactions.</p>`, `
        <div class="steps">
          <div class="st"><b>Step 1</b> Net sales − Cost of goods sold = <b>Gross profit</b></div>
          <div class="st"><b>Step 2</b> Gross profit − Operating expenses = <b>Income from operations</b></div>
          <div class="st"><b>Step 3</b> ± Other revenues and expenses = <b>Net income</b></div>
        </div>
        ${note('Delivery expense (freight-out) is an <b>operating expense</b>. Interest is <b>not</b> part of operations, so it goes below income from operations.', 'tip')}
        ${note('A <b>single-step</b> statement would just total all revenues and all expenses. Multi-step shows gross profit along the way.')}`),
    }),
    say: `Finally, the multi step income statement for the month ended November thirtieth. Start with sales revenue
      of eleven thousand. Subtract sales returns and allowances and sales discounts to get net sales of nine thousand
      three hundred seventy. Subtract cost of goods sold of six thousand. That is step one, gross profit, three
      thousand three hundred seventy. Step two: subtract operating expenses. Delivery expense of two hundred comes
      from our freight out entry. Salaries of twelve hundred and rent of nine hundred are assumed amounts for
      illustration. Total operating expenses are twenty three hundred, so income from operations is one thousand
      seventy. Step three: add other revenues and subtract other expenses that are not part of normal operations.
      Here, we have seventy dollars of interest expense, which is also assumed. Net income is one thousand dollars.
      It is called multi step because it shows these subtotals along the way. A single step statement would simply
      subtract total expenses from total revenues.`,
  },
  {
    html: slide({
      tag: 'Summary', title: 'Sales entries at a glance',
      body: `<table class="sum">
        <tr><th>Transaction</th><th>Revenue-side entry</th><th>Cost-side entry</th></tr>
        <tr><td>(a) Cash sale</td><td>Dr Cash · Cr Sales Revenue</td><td>Dr COGS · Cr Merchandise Inventory</td></tr>
        <tr><td>(b) Sale on account</td><td>Dr Accounts Receivable · Cr Sales Revenue</td><td>Dr COGS · Cr Merchandise Inventory</td></tr>
        <tr><td>Freight-out, FOB destination</td><td>Dr Delivery Expense · Cr Cash</td><td class="none">None</td></tr>
        <tr><td>Sales return</td><td>Dr Sales Returns &amp; Allow. · Cr Accounts Receivable</td><td>Dr Merchandise Inventory · Cr COGS</td></tr>
        <tr><td>Sales allowance</td><td>Dr Sales Returns &amp; Allow. · Cr Accounts Receivable</td><td class="none">None</td></tr>
        <tr><td>(c) Collect within discount period</td><td>Dr Cash, Dr Sales Discounts · Cr Accounts Receivable</td><td class="none">None</td></tr>
        <tr><td>Collect after discount period</td><td>Dr Cash · Cr Accounts Receivable</td><td class="none">None</td></tr>
      </table>`,
    }),
    say: `Here is the whole lesson on one screen. Every sale needs a revenue entry at selling price and a cost entry
      at cost. A return reverses both, but an allowance only touches the revenue side. Freight out under F O B
      destination is a delivery expense with no cost entry. And collecting from a customer never touches inventory.
      Within the discount period, debit Sales Discounts for the discount. After it, simply debit Cash and credit
      Accounts Receivable. Pause here if you want to copy this table into your notes.`,
  },
  {
    html: quickCheck(false),
    say: `Let's finish with a quick check. A company sells goods on account for six thousand dollars. They cost three
      thousand five hundred. Terms are two ten, net thirty. The customer returns one thousand dollars of goods that
      cost six hundred and can be resold, then pays within ten days. How much cash is collected, and what are the two
      entries for the return? Pause the video and try it.`,
  },
  {
    html: quickCheck(true),
    say: `Here is the answer. The customer owes six thousand minus one thousand, or five thousand. Two percent of that
      is one hundred dollars, so the company collects four thousand nine hundred. For the return, the revenue side is
      a debit to Sales Returns and Allowances and a credit to Accounts Receivable for one thousand. The cost side is a
      debit to Merchandise Inventory and a credit to Cost of Goods Sold for six hundred. Great work. See you in the
      next video.`,
  },
];
