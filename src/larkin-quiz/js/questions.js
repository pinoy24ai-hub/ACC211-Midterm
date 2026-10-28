/* Larkin Craft & Hobby Supply: December multiple-choice practice. One question per transaction.
   Each question has one correct entry and three wrong entries built from common mistakes; every wrong
   choice says why it is wrong. An entry is a list of lines; null means "No entry required"; a list of
   lists is two separate journal entries (sales and sales returns: the revenue entry, then the cost entry). */
(function (root) {
  'use strict';

  const MI = 'Merchandise Inventory', COGS = 'Cost of goods sold', SALES = 'Sales revenue', SRA = 'Sales returns & allowances';
  const SD = 'Sales discounts', ALW = 'Allowance for Doubtful Accounts', BDE = 'Bad debt expense', DRAW = 'J. Morales, Drawing';
  const APB = 'Accounts payable (Brightwater Wholesale)', APS = 'Accounts payable (Summit Craft Distributors)';
  const ARE = 'Accounts receivable (Elmwood Art Studio)', ARD = 'Accounts receivable (Delaware Park Gallery)';
  const ARH = 'Accounts receivable (Hamlin Hobby Club)', ARL = 'Accounts receivable (Lockport Crafters)';
  const dr = function (a, n) { return { a: a, dr: n }; };
  const cr = function (a, n) { return { a: a, cr: n }; };

  const OPENING = [['Cash', 15000, 0], [ARE, 2700, 0], [ARD, 1500, 0], [MI, 18000, 0], [ALW, 0, 210], ['J. Morales, Capital', 0, 36990]];

  const Q = [
    { date: 'Dec 2', text: 'Purchased $6,000 of merchandise from Brightwater Wholesale on account, terms 2/10, n/30.',
      hints: ['Under the perpetual system, where do goods bought for resale go?', 'Larkin has not paid yet. Which vendor does it owe?'],
      correct: [dr(MI, 6000), cr(APB, 6000)],
      wrong: [
        { e: [dr('Purchases', 6000), cr(APB, 6000)], why: 'Purchases is a periodic-system account. Under the perpetual system, goods bought for resale go straight into Merchandise Inventory.' },
        { e: [dr(MI, 6000), cr(APS, 6000)], why: 'Wrong vendor. Larkin bought these goods from Brightwater Wholesale.' },
        { e: [dr(MI, 5880), cr(APB, 5880)], why: 'Record the full invoice price. The 2% discount ($120) is recorded only if Larkin actually pays within 10 days.' }],
      why: 'A purchase is recorded at the full invoice price. The 2/10, n/30 terms matter later, when Larkin pays.' },

    { date: 'Dec 3', text: 'Sold merchandise to a walk-in customer for $2,000 cash. Cost was $1,200.',
      hints: ['A perpetual sale needs two entries: one for revenue at selling price and one for cost at cost.', 'The two entries use two different amounts.'],
      correct: [[dr('Cash', 2000), cr(SALES, 2000)], [dr(COGS, 1200), cr(MI, 1200)]],
      wrong: [
        { e: [dr('Cash', 2000), cr(SALES, 2000)], why: 'This records only the revenue entry. A second entry moves the $1,200 cost from Merchandise Inventory to Cost of goods sold.' },
        { e: [[dr('Cash', 2000), cr(SALES, 2000)], [dr(COGS, 2000), cr(MI, 2000)]], why: 'The cost entry must use cost ($1,200), not the selling price.' },
        { e: [dr('Cash', 2000), cr(MI, 2000)], why: 'This skips revenue entirely and removes inventory at selling price. Revenue goes to Sales revenue; inventory leaves at cost ($1,200).' }],
      why: 'The first entry uses the selling price and the second uses cost. The $800 difference is the gross profit on this sale.' },

    { date: 'Dec 4', text: 'Delaware Park Gallery paid its $1,500 invoice dated November 12 (terms 2/10, n/30). The discount period ended in November.',
      hints: ['When did the 10-day discount window for a November 12 invoice close?', 'Collecting a receivable is not new revenue: the sale was recorded in November.'],
      correct: [dr('Cash', 1500), cr(ARD, 1500)],
      wrong: [
        { e: [dr('Cash', 1470), dr(SD, 30), cr(ARD, 1500)], why: 'The discount window closed on November 22, so Delaware Park pays the full $1,500 and there is no sales discount.' },
        { e: [dr('Cash', 1500), cr(SALES, 1500)], why: 'The revenue was recorded in November when the goods were sold. Collecting the cash only clears the receivable.' },
        { e: [dr('Cash', 1500), cr(ARE, 1500)], why: 'Wrong customer. Delaware Park Gallery paid this invoice.' }],
      why: 'Paying after the discount window means the full amount is collected and there is no Sales discounts line. No inventory is involved because the goods left in November.' },

    { date: 'Dec 5', text: 'Sold merchandise to Hamlin Hobby Club for $5,000 on account, terms 2/10, n/30. Cost was $3,000.',
      hints: ['Who owes Larkin now?', 'Every sale needs a second entry for the cost of the goods.'],
      correct: [[dr(ARH, 5000), cr(SALES, 5000)], [dr(COGS, 3000), cr(MI, 3000)]],
      wrong: [
        { e: [[dr(ARH, 4900), cr(SALES, 4900)], [dr(COGS, 3000), cr(MI, 3000)]], why: 'Record the full $5,000. A sales discount is recorded only if Hamlin pays within 10 days (the gross method).' },
        { e: [dr(ARH, 5000), cr(SALES, 5000)], why: 'This is missing the cost entry: debit Cost of goods sold $3,000 and credit Merchandise Inventory $3,000.' },
        { e: [[dr(ARH, 5000), cr(SALES, 5000)], [dr(MI, 3000), cr(COGS, 3000)]], why: 'The cost entry is reversed. The goods left the shelves, so credit Merchandise Inventory and debit Cost of goods sold.' }],
      why: 'Revenue is recorded at the full invoice price when the goods are delivered, even though no cash has arrived. The cost entry is recorded at the same time.' },

    { date: 'Dec 6', text: 'Lockport Crafters placed a purchase order for $2,400 of merchandise. Larkin will ship the goods on December 9.',
      hints: ['When is revenue earned: when the customer orders, or when the goods are delivered?', 'Have any goods left the store, or has any cash arrived?'],
      correct: null,
      wrong: [
        { e: [dr(ARL, 2400), cr(SALES, 2400)], why: 'Revenue is earned when the goods are delivered (December 9), not when the order is placed. Lockport owes nothing yet.' },
        { e: [dr('Cash', 2400), cr(SALES, 2400)], why: 'No cash has been received and no goods have been delivered. An order is only a promise.' },
        { e: [dr(ARL, 2400), cr(MI, 2400)], why: 'Nothing has left the shelves yet, and Lockport owes nothing until the goods are delivered.' }],
      why: 'An order is only a promise. Revenue is recorded when it is earned (goods delivered). The sale is recorded on December 9.' },

    { date: 'Dec 8', text: 'Paid Brightwater Wholesale within the discount period: $6,000 × 2% = $120 discount.',
      hints: ['Clear the whole amount owed, even though less cash leaves.', 'Larkin is the buyer here. A purchase discount lowers the cost of which account?'],
      correct: [dr(APB, 6000), cr('Cash', 5880), cr(MI, 120)],
      wrong: [
        { e: [dr(APB, 5880), cr('Cash', 5880)], why: 'This leaves $120 still owed to Brightwater. Debit the full $6,000 and record the $120 discount.' },
        { e: [dr(APB, 6000), cr('Cash', 5880), cr(SD, 120)], why: 'Sales discounts is for discounts Larkin gives its customers. A discount Larkin earns as a buyer reduces Merchandise Inventory.' },
        { e: [dr(APB, 6000), cr('Cash', 6000)], why: 'Larkin paid within 10 days and took the $120 discount, so it paid only $5,880 in cash.' }],
      why: 'Same terms, opposite sides: a buyer who earns a discount credits Merchandise Inventory (lower cost); a seller who gives one debits Sales discounts (lower net sales).' },

    { date: 'Dec 9', text: 'Delivered the December 6 order to Lockport Crafters: $2,400 on account, terms n/30. Cost was $1,440.',
      hints: ['The goods were delivered today, so the revenue is now earned.', 'Every sale needs its cost entry too.'],
      correct: [[dr(ARL, 2400), cr(SALES, 2400)], [dr(COGS, 1440), cr(MI, 1440)]],
      wrong: [
        { e: [dr(ARL, 2400), cr(SALES, 2400)], why: 'This is missing the cost entry: debit Cost of goods sold $1,440 and credit Merchandise Inventory $1,440.' },
        { e: null, why: 'The December 6 order needed no entry, but today the goods were delivered. The sale is earned now and must be recorded.' },
        { e: [[dr(ARL, 2352), cr(SALES, 2352)], [dr(COGS, 1440), cr(MI, 1440)]], why: 'Terms n/30 offer no discount, and sales are recorded at the full price anyway. Use $2,400.' }],
      why: 'The order on December 6 created no entry; the delivery creates the full sale. The n/30 terms mean no discount is offered.' },

    { date: 'Dec 10', text: 'Hamlin Hobby Club returned $400 of merchandise from the December 5 sale. The goods are in resalable condition (cost $240).',
      hints: ['The goods came back, so both entries from the sale reverse.', 'The revenue entry uses selling price; the inventory entry uses cost.'],
      correct: [[dr(SRA, 400), cr(ARH, 400)], [dr(MI, 240), cr(COGS, 240)]],
      wrong: [
        { e: [dr(SRA, 400), cr(ARH, 400)], why: 'This would be correct for an allowance, but here the goods came back. A second entry debits Merchandise Inventory $240 and credits Cost of goods sold $240.' },
        { e: [[dr(SALES, 400), cr(ARH, 400)], [dr(MI, 240), cr(COGS, 240)]], why: 'Use the contra-revenue account, Sales returns & allowances, so the business keeps a record of returns.' },
        { e: [[dr(SRA, 400), cr(ARH, 400)], [dr(MI, 400), cr(COGS, 400)]], why: 'The goods return to inventory at cost ($240), not at the $400 selling price.' }],
      why: 'A sales return reverses both entries of the sale: the revenue entry at selling price and the cost entry at cost.' },

    { date: 'Dec 12', text: 'Hamlin Hobby Club paid the December 5 invoice within the discount period. Balance: $5,000 − $400 return = $4,600 × 2% = $92 discount.',
      hints: ['Clear the whole receivable, even though less cash comes in.', 'A discount Larkin gives a customer reduces sales.'],
      correct: [dr('Cash', 4508), dr(SD, 92), cr(ARH, 4600)],
      wrong: [
        { e: [dr('Cash', 4900), dr(SD, 100), cr(ARH, 5000)], why: 'This ignores the $400 return on December 10. Hamlin owes $4,600, so the discount is $92.' },
        { e: [dr('Cash', 4508), cr(ARH, 4508)], why: 'This leaves $92 on Hamlin’s account. Credit the full $4,600 and debit Sales discounts for $92.' },
        { e: [dr('Cash', 4508), dr(MI, 92), cr(ARH, 4600)], why: 'A sales discount is contra-revenue. It does not change the cost of inventory.' }],
      why: 'Sales discounts is a contra-revenue account: it is subtracted from Sales revenue to get Net sales. Collecting cash moves no goods, so there is no cost entry.' },

    { date: 'Dec 14', text: 'Sold merchandise to Elmwood Art Studio for $3,200 on account, terms 2/10, n/30. Cost was $1,920.',
      hints: ['Elmwood already owes an older balance from November. Record only today’s sale.', 'Every sale needs its cost entry.'],
      correct: [[dr(ARE, 3200), cr(SALES, 3200)], [dr(COGS, 1920), cr(MI, 1920)]],
      wrong: [
        { e: [[dr(ARE, 5900), cr(SALES, 5900)], [dr(COGS, 1920), cr(MI, 1920)]], why: 'The $2,700 November balance was recorded last month. Journalize only today’s $3,200 sale.' },
        { e: [[dr(ARD, 3200), cr(SALES, 3200)], [dr(COGS, 1920), cr(MI, 1920)]], why: 'Wrong customer. Elmwood Art Studio bought these goods.' },
        { e: [dr(ARE, 3200), cr(SALES, 3200)], why: 'This is missing the cost entry: debit Cost of goods sold $1,920 and credit Merchandise Inventory $1,920.' }],
      why: 'Elmwood now has two open invoices: the November one and this one. Each is tracked separately.' },

    { date: 'Dec 16', text: 'Elmwood Art Studio reported $200 of minor damage on the December 14 shipment. Larkin granted a $200 price reduction, and Elmwood kept the goods.',
      hints: ['No goods come back. Does anything change on Larkin’s shelves?', 'Only the revenue side changes.'],
      correct: [dr(SRA, 200), cr(ARE, 200)],
      wrong: [
        { e: [[dr(SRA, 200), cr(ARE, 200)], [dr(MI, 200), cr(COGS, 200)]], why: 'Elmwood kept the goods, so nothing returns to inventory. An allowance has no cost entry.' },
        { e: [dr(SALES, 200), cr(ARE, 200)], why: 'Use the contra-revenue account, Sales returns & allowances, so the business keeps a record of allowances granted.' },
        { e: null, why: 'Elmwood now owes $200 less, so Accounts receivable and net sales both change. An entry is required.' }],
      why: 'A return takes two entries (reverse revenue and restore inventory), but an allowance takes one, because nothing physical comes back.' },

    { date: 'Dec 22', text: 'Elmwood Art Studio paid the December 14 invoice within the discount period. Balance: $3,200 − $200 allowance = $3,000 × 2% = $60 discount.',
      hints: ['The discount applies to the balance after the allowance.', 'Elmwood’s older November balance is a separate invoice and is not paid here.'],
      correct: [dr('Cash', 2940), dr(SD, 60), cr(ARE, 3000)],
      wrong: [
        { e: [dr('Cash', 5640), dr(SD, 60), cr(ARE, 5700)], why: 'Elmwood paid only the December 14 invoice. The $2,700 November balance is still open.' },
        { e: [dr('Cash', 3136), dr(SD, 64), cr(ARE, 3200)], why: 'This ignores the $200 allowance on December 16. The balance is $3,000, so the discount is $60.' },
        { e: [dr('Cash', 2940), cr(ARE, 2940)], why: 'This leaves $60 on Elmwood’s account. Credit the full $3,000 and debit Sales discounts for $60.' }],
      why: 'Elmwood still owes the $2,700 from November. That older invoice is now past due, which matters when estimating bad debts at year-end.' },

    { date: 'Dec 29', text: 'Sold merchandise to Delaware Park Gallery for $2,500 on account, terms n/30. Cost was $1,500.',
      hints: ['On account means no cash yet. Who owes Larkin?', 'Every sale needs its cost entry.'],
      correct: [[dr(ARD, 2500), cr(SALES, 2500)], [dr(COGS, 1500), cr(MI, 1500)]],
      wrong: [
        { e: [dr(ARD, 2500), cr(SALES, 2500)], why: 'This is missing the cost entry: debit Cost of goods sold $1,500 and credit Merchandise Inventory $1,500.' },
        { e: [[dr(ARD, 2450), cr(SALES, 2450)], [dr(COGS, 1500), cr(MI, 1500)]], why: 'Terms n/30 offer no discount, and sales are recorded at the full price anyway. Use $2,500.' },
        { e: [[dr('Cash', 2500), cr(SALES, 2500)], [dr(COGS, 1500), cr(MI, 1500)]], why: 'The sale was on account, so no cash came in. Debit Accounts receivable (Delaware Park Gallery).' }],
      why: 'This sale will still be unpaid at year-end, so it increases the ending Accounts receivable that the bad debt estimate is based on.' },

    { date: 'Dec 30', text: 'Paid $1,200 store rent for December.',
      hints: ['Is rent part of the cost of merchandise, or a cost of running the store?'],
      correct: [dr('Rent expense', 1200), cr('Cash', 1200)],
      wrong: [
        { e: [dr(MI, 1200), cr('Cash', 1200)], why: 'Rent is not part of the cost of the goods. It is an operating expense.' },
        { e: [dr('Cash', 1200), cr('Rent expense', 1200)], why: 'The sides are reversed. Paying rent increases an expense (debit) and decreases Cash (credit).' },
        { e: [dr(DRAW, 1200), cr('Cash', 1200)], why: 'Drawing is for the owner’s personal withdrawals. Store rent is a business expense.' }],
      why: 'Operating expenses appear on the income statement below gross profit.' },

    { date: 'Dec 30', text: 'Paid $1,800 in employee salaries for December.',
      hints: ['Salaries are paid to employees for running the store. What kind of cost is that?'],
      correct: [dr('Salaries expense', 1800), cr('Cash', 1800)],
      wrong: [
        { e: [dr(COGS, 1800), cr('Cash', 1800)], why: 'Cost of goods sold is the cost of merchandise sold. Store salaries are an operating expense.' },
        { e: [dr('Salaries expense', 1800), cr('Salaries payable', 1800)], why: 'The salaries were paid in cash, so nothing is owed. Credit Cash.' },
        { e: [dr(DRAW, 1800), cr('Cash', 1800)], why: 'These are employee salaries, not the owner’s withdrawals. Employees’ pay is an expense.' }],
      why: 'Salaries are an operating expense. One more entry to go: the year-end bad debt adjustment.' },

    { date: 'Dec 31', text: 'Year-end adjusting entry: estimate bad debts at 5% of the ending Accounts receivable balance (allowance method). The Allowance for Doubtful Accounts already has a $210 credit balance.',
      note: 'Ending Accounts receivable before this entry is $7,600: Elmwood Art Studio $2,700, Lockport Crafters $2,400 and Delaware Park Gallery $2,500.',
      hints: ['The allowance should end at 5% of $7,600. How much more does it need?', 'The adjustment brings the allowance up to the target, not by the target.'],
      correct: [dr(BDE, 170), cr(ALW, 170)],
      wrong: [
        { e: [dr(BDE, 380), cr(ALW, 380)], why: '$380 is the balance the allowance should end at (5% × $7,600). It already has $210, so add only $170.' },
        { e: [dr(BDE, 170), cr(ARE, 170)], why: 'Under the allowance method no customer has been identified as uncollectible yet, so credit the Allowance for Doubtful Accounts, not a customer’s account.' },
        { e: [dr(BDE, 590), cr(ALW, 590)], why: 'The existing $210 credit balance is subtracted from the $380 target, not added to it: $380 − $210 = $170.' }],
      why: 'The adjustment brings the allowance up to $380. Accounts receivable stays at $7,600, and the balance sheet shows $7,600 less the $380 allowance: a net realizable value of $7,220.' }
  ];

  // Business details used by the shared quiz and PDF code.
  const META = {
    business: 'Larkin Craft & Hobby Supply', owner: 'J. Morales', month: 'December', year: 2026,
    quiz: 'Larkin Entry Quiz', storeKey: 'acc211-larkin-quiz-v1',
    pdfName: 'Larkin_December_Correct_Entries.pdf', practice: 'the Larkin Craft & Hobby Supply general ledger workshop',
    openingDate: 'December 1, 2026',
    reminders: [
      'Purchases and purchase discounts go through **Merchandise Inventory**; sales discounts go to **Sales discounts** (contra-revenue).',
      'Revenue is recorded when goods are **delivered**, not when an order is placed.',
      'Every sale takes two entries: revenue at selling price, then Cost of goods sold / Merchandise Inventory at cost. A return reverses both; an allowance reverses only the revenue.',
      'Discount windows: 2/10 means the customer or buyer must pay within 10 days of the invoice date.',
      'Allowance method: adjust the Allowance for Doubtful Accounts **up to** the required balance.']
  };

  const api = { Q: Q, OPENING: OPENING, META: META };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.QuizData = api;
})(typeof window !== 'undefined' ? window : globalThis);
