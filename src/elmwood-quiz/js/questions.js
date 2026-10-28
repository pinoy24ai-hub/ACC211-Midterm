/* Elmwood Hardware & Supply: May multiple-choice practice. One question per transaction.
   Each question has one correct entry and three wrong entries built from common mistakes; every wrong
   choice says why it is wrong. An entry is a list of lines; null means "No entry required"; a list of
   lists is two separate journal entries (sales and sales returns: the revenue entry, then the cost entry). */
(function (root) {
  'use strict';

  const MI = 'Merchandise Inventory', COGS = 'Cost of goods sold', SALES = 'Sales revenue', SRA = 'Sales returns & allowances';
  const SD = 'Sales discounts', APA = 'Accounts payable (Alpha Co.)', ARB = 'Accounts receivable (Beta Co.)';
  const dr = function (a, n) { return { a: a, dr: n }; };
  const cr = function (a, n) { return { a: a, cr: n }; };

  // The workshop starts with empty books.
  const OPENING = [];

  const Q = [
    { date: 'May 2', text: 'Purchased $5,000 of merchandise for cash.',
      hints: ['Under the perpetual system, where do goods bought for resale go?', 'Which asset did Elmwood pay with?'],
      correct: [dr(MI, 5000), cr('Cash', 5000)],
      wrong: [
        { e: [dr('Purchases', 5000), cr('Cash', 5000)], why: 'Purchases is a periodic-system account. Under the perpetual system, goods bought for resale go straight into Merchandise Inventory.' },
        { e: [dr(MI, 5000), cr(APA, 5000)], why: 'Elmwood paid cash, so it owes nobody. Credit Cash, not Accounts payable.' },
        { e: [dr('Cash', 5000), cr(MI, 5000)], why: 'The sides are reversed. Inventory goes up (debit) and Cash goes down (credit).' }],
      why: 'Perpetual system: Merchandise Inventory is updated at the moment of every purchase, return, discount and sale, so it always shows what is on the shelves.' },

    { date: 'May 5', text: 'Purchased $3,000 of merchandise from Alpha Co., terms 2/10, n/30.',
      hints: ['Elmwood has not paid yet. What does it now owe Alpha Co.?', 'The credit terms do not change today’s entry.'],
      correct: [dr(MI, 3000), cr(APA, 3000)],
      wrong: [
        { e: [dr('Purchases', 3000), cr(APA, 3000)], why: 'Purchases is a periodic-system account. Under the perpetual system, debit Merchandise Inventory.' },
        { e: [dr(MI, 2940), cr(APA, 2940)], why: 'Record the full invoice price. The 2% discount ($60) is recorded only if Elmwood actually pays within 10 days.' },
        { e: [dr(MI, 3000), cr('Cash', 3000)], why: 'Terms 2/10, n/30 mean Elmwood bought on account and has not paid yet. Credit Accounts payable (Alpha Co.).' }],
      why: 'Terms 2/10, n/30: 2% off if paid within 10 days, otherwise the full amount is due in 30 days. Record the invoice at the full (gross) amount and handle any discount when paying.' },

    { date: 'May 8', text: 'Returned $500 of defective merchandise to Alpha Co.',
      hints: ['Two things shrink: the goods on hand and the amount owed. Which side records a decrease in each?'],
      correct: [dr(APA, 500), cr(MI, 500)],
      wrong: [
        { e: [dr(MI, 500), cr(APA, 500)], why: 'The sides are reversed. Returning goods decreases inventory (credit) and decreases the amount owed (debit).' },
        { e: [dr(APA, 500), cr('Purchase returns & allowances', 500)], why: 'Purchase returns & allowances is a periodic-system account. Under the perpetual system, credit Merchandise Inventory directly.' },
        { e: [dr('Cash', 500), cr(MI, 500)], why: 'Alpha Co. has not been paid yet, so it reduces what Elmwood owes instead of refunding cash. Debit Accounts payable (Alpha Co.).' }],
      why: 'Under the perpetual system a purchase return reduces Merchandise Inventory directly. There is no separate Purchase Returns account.' },

    { date: 'May 10', text: 'Paid $200 freight on the May 5 purchase, terms FOB shipping point.',
      hints: ['Under FOB shipping point, who pays the freight?', 'Is the cost of getting goods onto the shelves part of what the goods cost?'],
      correct: [dr(MI, 200), cr('Cash', 200)],
      wrong: [
        { e: [dr('Delivery expense', 200), cr('Cash', 200)], why: 'Delivery expense is for freight-out (delivering goods to customers). Freight-in is part of the cost of inventory.' },
        { e: [dr(MI, 200), cr(APA, 200)], why: 'Elmwood paid the carrier in cash. Alpha Co. is not involved, so Accounts payable does not change.' },
        { e: null, why: 'Under FOB shipping point the buyer pays the freight, and Elmwood did pay $200. An entry is required.' }],
      why: 'Freight-in is part of inventory cost, not an expense. Freight-out (delivering goods to customers) would be a selling expense instead.' },

    { date: 'May 12', text: 'Paid Alpha Co. within the discount period: $3,000 − $500 return = $2,500 × 2% = $50 discount.',
      hints: ['Clear the whole amount owed, even though less cash leaves.', 'A purchase discount lowers the cost of the goods. The freight was paid to the carrier, not to Alpha Co.'],
      correct: [dr(APA, 2500), cr('Cash', 2450), cr(MI, 50)],
      wrong: [
        { e: [dr(APA, 2450), cr('Cash', 2450)], why: 'This leaves $50 still owed to Alpha Co. Debit the full $2,500 and record the $50 discount.' },
        { e: [dr(APA, 2500), cr('Cash', 2450), cr(SD, 50)], why: 'Sales discounts is for discounts Elmwood gives its customers. A discount Elmwood earns as a buyer reduces Merchandise Inventory.' },
        { e: [dr(APA, 2700), cr('Cash', 2646), cr(MI, 54)], why: 'The $200 freight was paid to the carrier on May 10, so it is not owed to Alpha Co. and is not discounted. Alpha is owed $2,500.' }],
      why: 'A purchase discount reduces the cost of inventory. Accounts payable for Alpha Co. is now zero.' },

    { date: 'May 15', text: 'Sold merchandise for $4,000 cash. Cost was $2,400.',
      hints: ['A perpetual sale needs two entries: one for revenue at selling price and one for cost at cost.', 'The two entries use two different amounts.'],
      correct: [[dr('Cash', 4000), cr(SALES, 4000)], [dr(COGS, 2400), cr(MI, 2400)]],
      wrong: [
        { e: [dr('Cash', 4000), cr(SALES, 4000)], why: 'This records only the revenue entry. A second entry moves the $2,400 cost from Merchandise Inventory to Cost of goods sold.' },
        { e: [[dr('Cash', 4000), cr(SALES, 4000)], [dr(COGS, 4000), cr(MI, 4000)]], why: 'The cost entry must use cost ($2,400), not the selling price.' },
        { e: [dr('Cash', 4000), cr(MI, 4000)], why: 'This skips revenue entirely and removes inventory at selling price. Revenue goes to Sales revenue; inventory leaves at cost ($2,400).' }],
      why: 'Revenue is recorded at the selling price and the cost of the goods at cost, at the same time: the matching principle. The $1,600 difference is the gross profit on this sale.' },

    { date: 'May 20', text: 'Sold merchandise to Beta Co. for $3,500 on account. Cost was $2,100.',
      hints: ['Beta Co. has not paid yet. Which asset records money customers owe?', 'Every sale needs a second entry for the cost of the goods.'],
      correct: [[dr(ARB, 3500), cr(SALES, 3500)], [dr(COGS, 2100), cr(MI, 2100)]],
      wrong: [
        { e: [dr(ARB, 3500), cr(SALES, 3500)], why: 'This is missing the cost entry: debit Cost of goods sold $2,100 and credit Merchandise Inventory $2,100.' },
        { e: [[dr('Cash', 3500), cr(SALES, 3500)], [dr(COGS, 2100), cr(MI, 2100)]], why: 'The sale was on account, so no cash came in. Debit Accounts receivable (Beta Co.).' },
        { e: [[dr(ARB, 3500), cr(SALES, 3500)], [dr(MI, 2100), cr(COGS, 2100)]], why: 'The cost entry is reversed. The goods left the shelves, so credit Merchandise Inventory and debit Cost of goods sold.' }],
      why: 'A sale on account is revenue today, and cost of goods sold is recorded at the same time. Beta Co. gets its own account in the receivables subsidiary ledger.' },

    { date: 'May 22', text: 'Beta Co. returned $500 of merchandise sold on May 20 (cost $300).',
      hints: ['The goods came back, so both entries from the sale reverse.', 'The revenue entry uses selling price; the inventory entry uses cost.'],
      correct: [[dr(SRA, 500), cr(ARB, 500)], [dr(MI, 300), cr(COGS, 300)]],
      wrong: [
        { e: [dr(SRA, 500), cr(ARB, 500)], why: 'This would be correct for an allowance, but here the goods came back. A second entry debits Merchandise Inventory $300 and credits Cost of goods sold $300.' },
        { e: [[dr(SALES, 500), cr(ARB, 500)], [dr(MI, 300), cr(COGS, 300)]], why: 'Use the contra-revenue account, Sales returns & allowances, so managers can see how much revenue was lost to returns.' },
        { e: [[dr(SRA, 500), cr(ARB, 500)], [dr(MI, 500), cr(COGS, 500)]], why: 'The goods return to inventory at cost ($300), not at the $500 selling price.' }],
      why: 'The revenue entry works at selling price and the cost entry at cost. That is why the amounts differ.' },

    { date: 'May 29', text: 'Beta Co. paid the remaining balance within the discount period. Original sale: $3,500 − $500 return = $3,000 × 2% = $60 discount.',
      hints: ['Clear the whole receivable, even though less cash comes in.', 'A discount Elmwood gives a customer reduces sales.'],
      correct: [dr('Cash', 2940), dr(SD, 60), cr(ARB, 3000)],
      wrong: [
        { e: [dr('Cash', 3430), dr(SD, 70), cr(ARB, 3500)], why: 'This ignores the $500 return on May 22. Beta Co. owes $3,000, so the discount is $60.' },
        { e: [dr('Cash', 2940), cr(ARB, 2940)], why: 'This leaves $60 on Beta Co.’s account. Credit the full $3,000 and debit Sales discounts for $60.' },
        { e: [dr('Cash', 2940), dr(MI, 60), cr(ARB, 3000)], why: 'A sales discount is contra-revenue. It does not change the cost of inventory.' }],
      why: 'Sales discounts is a contra-revenue account. Together with returns, it takes Sales revenue down to Net sales on the income statement.' },

    { date: 'May 30', text: 'Paid $900 store rent for May.',
      hints: ['Is rent part of the cost of merchandise, or a cost of running the store?'],
      correct: [dr('Rent expense', 900), cr('Cash', 900)],
      wrong: [
        { e: [dr(MI, 900), cr('Cash', 900)], why: 'Rent is not part of the cost of the goods. It is an operating expense.' },
        { e: [dr('Cash', 900), cr('Rent expense', 900)], why: 'The sides are reversed. Paying rent increases an expense (debit) and decreases Cash (credit).' },
        { e: [dr('Prepaid rent', 900), cr('Cash', 900)], why: 'This rent is for May, which has already been used, so it is an expense now, not a prepayment for a future month.' }],
      why: 'Operating expenses show up on the income statement below gross profit.' },

    { date: 'May 31', text: 'Paid $1,100 in employee salaries for May.',
      hints: ['Salaries are paid to employees for running the store. What kind of cost is that?'],
      correct: [dr('Salaries expense', 1100), cr('Cash', 1100)],
      wrong: [
        { e: [dr(COGS, 1100), cr('Cash', 1100)], why: 'Cost of goods sold is the cost of merchandise sold. Store salaries are an operating expense.' },
        { e: [dr('Salaries expense', 1100), cr('Salaries payable', 1100)], why: 'The salaries were paid in cash, so nothing is owed. Credit Cash.' },
        { e: [dr('Cash', 1100), cr('Salaries expense', 1100)], why: 'The sides are reversed. Paying salaries increases an expense (debit) and decreases Cash (credit).' }],
      why: 'Salaries are an operating expense, so they reduce income after gross profit is calculated.' },

    { date: 'May 31', text: 'Paid the $180 electric and heating bill for May.',
      hints: ['Utilities keep the store running. Are they part of the cost of the merchandise?'],
      correct: [dr('Utilities expense', 180), cr('Cash', 180)],
      wrong: [
        { e: [dr(MI, 180), cr('Cash', 180)], why: 'Utilities are not part of the cost of the goods. They are an operating expense.' },
        { e: [dr('Utilities expense', 180), cr('Accounts payable', 180)], why: 'The bill was paid, so nothing is owed. Credit Cash.' },
        { e: [dr(COGS, 180), cr('Cash', 180)], why: 'Cost of goods sold is the cost of merchandise sold. Store utilities are an operating expense.' }],
      why: 'Last entry. Utilities, rent and salaries are all operating expenses, subtracted from gross profit to reach net income.' }
  ];

  // Business details used by the shared quiz and PDF code.
  const META = {
    business: 'Elmwood Hardware & Supply', owner: '', month: 'May', year: 2025,
    quiz: 'Elmwood Entry Quiz', storeKey: 'acc211-elmwood-quiz-v1',
    pdfName: 'Elmwood_May_Correct_Entries.pdf', practice: 'the Elmwood Hardware & Supply general ledger workshop',
    openingDate: '',
    reminders: [
      'Purchases, freight-in, returns and purchase discounts all go through **Merchandise Inventory**.',
      'FOB shipping point: the buyer pays freight and adds it to inventory. FOB destination: the seller pays.',
      'Every sale takes two entries: revenue at selling price, then Cost of goods sold / Merchandise Inventory at cost. A sales return reverses both.',
      'Sales discounts and sales returns & allowances are contra-revenue accounts: they reduce sales.',
      'Payables and receivables use the vendor or customer account, for example Accounts payable (Alpha Co.).']
  };

  const api = { Q: Q, OPENING: OPENING, META: META };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.QuizData = api;
})(typeof window !== 'undefined' ? window : globalThis);
