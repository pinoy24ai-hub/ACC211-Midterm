/* Cobblestone Sports & Outdoor: November multiple-choice practice. One question per transaction.
   Each question has one correct entry and three wrong entries built from common mistakes; every wrong
   choice says why it is wrong. An entry of null means "No entry required". */
(function (root) {
  'use strict';

  const MI = 'Merchandise Inventory', COGS = 'Cost of goods sold', SALES = 'Sales revenue', SRA = 'Sales returns & allowances';
  const APB = 'Accounts payable (Bayfront Supply Co.)', APR = 'Accounts payable (Ridgeline Wholesale)';
  const ARK = 'Accounts receivable (Kenmore Rec League)', ARP = 'Accounts receivable (Parkside Rentals)';
  const dr = function (a, n) { return { a: a, dr: n }; };
  const cr = function (a, n) { return { a: a, cr: n }; };

  const OPENING = [['Cash', 25000, 0], [MI, 4000, 0], [APB, 0, 2500], ['R. Delgado, Capital', 0, 26500]];

  const Q = [
    { date: 'Nov 2', text: 'Purchased $6,000 of merchandise from Ridgeline Wholesale on account, terms 2/10, n/30, FOB destination.',
      hints: ['Under the perpetual system, where do goods bought for resale go?', 'Cobblestone owes money now. To which vendor?'],
      correct: [dr(MI, 6000), cr(APR, 6000)],
      wrong: [
        { e: [dr('Purchases', 6000), cr(APR, 6000)], why: 'Purchases is a periodic-system account. Under the perpetual system, goods bought for resale go straight into Merchandise Inventory.' },
        { e: [dr(MI, 6000), cr(APB, 6000)], why: 'Wrong vendor. Cobblestone bought these goods from Ridgeline Wholesale, so the liability belongs in Ridgeline’s account.' },
        { e: [dr(MI, 5880), cr(APR, 5880)], why: 'Record the full invoice price. The 2% discount ($120) is recorded only if Cobblestone actually pays within 10 days.' }],
      why: 'A purchase on account increases Merchandise Inventory and the amount owed to that vendor. The 2/10, n/30 terms do not change today’s entry.' },

    { date: 'Nov 3', text: 'Ridgeline Wholesale delivered the November 2 order and paid the $240 freight bill.',
      hints: ['Re-read the November 2 shipping terms: FOB shipping point or FOB destination?', 'Who paid the $240? Did any of Cobblestone’s accounts change?'],
      correct: null,
      wrong: [
        { e: [dr(MI, 240), cr('Cash', 240)], why: 'Cobblestone did not pay anything. Under FOB destination the seller (Ridgeline) pays the freight, so the buyer records nothing.' },
        { e: [dr('Delivery expense', 240), cr('Cash', 240)], why: 'This is Ridgeline’s delivery expense, not Cobblestone’s. The seller records freight-out; the buyer makes no entry.' },
        { e: [dr(MI, 240), cr(APR, 240)], why: 'Ridgeline paid its own freight and did not bill Cobblestone for it, so Cobblestone owes nothing extra.' }],
      why: 'Under FOB destination the seller owns the goods in transit and pays the freight. None of Cobblestone’s accounts change, so no entry is required.' },

    { date: 'Nov 4', text: 'Purchased $3,000 of merchandise from Bayfront Supply Co. on account, terms 2/10, n/30, FOB shipping point.',
      hints: ['This is another purchase on account. Which vendor?', 'Record only today’s purchase. The October balance is already on the books.'],
      correct: [dr(MI, 3000), cr(APB, 3000)],
      wrong: [
        { e: [dr(MI, 3000), cr('Cash', 3000)], why: 'Cobblestone bought on account, so it did not pay cash. Credit Accounts payable (Bayfront Supply Co.).' },
        { e: [dr(MI, 5500), cr(APB, 5500)], why: 'The $2,500 October balance was recorded last month. Journalize only today’s $3,000 purchase; the ledger adds them up.' },
        { e: [dr(MI, 2940), cr(APB, 2940)], why: 'Record the full $3,000. A discount is recorded only if and when Cobblestone pays within the discount period.' }],
      why: 'Same entry as November 2, with a different vendor. Bayfront’s subsidiary account now shows $2,500 + $3,000 = $5,500.' },

    { date: 'Nov 5', text: 'Paid $180 cash to the freight carrier for the Bayfront Supply Co. shipment.',
      hints: ['The November 4 terms were FOB shipping point. Who pays the freight?', 'Is freight-in part of the cost of the goods, or an expense?'],
      correct: [dr(MI, 180), cr('Cash', 180)],
      wrong: [
        { e: [dr('Delivery expense', 180), cr('Cash', 180)], why: 'Delivery expense is for freight-out (shipping goods to customers). Freight-in is part of the cost of inventory.' },
        { e: [dr(MI, 180), cr(APB, 180)], why: 'Cobblestone paid the freight carrier in cash. Bayfront is not involved, so Accounts payable does not change.' },
        { e: null, why: 'Under FOB shipping point the buyer pays the freight, and Cobblestone did pay $180. An entry is required.' }],
      why: 'Freight-in is added to Merchandise Inventory because it is a cost of getting goods ready for sale. Compare November 3, where the seller paid.' },

    { date: 'Nov 6', text: 'Returned $400 of wrong-size merchandise to Ridgeline Wholesale and received credit.',
      hints: ['Two things shrink: the goods on hand and the amount owed. Which side records a decrease in each?'],
      correct: [dr(APR, 400), cr(MI, 400)],
      wrong: [
        { e: [dr(MI, 400), cr(APR, 400)], why: 'The sides are reversed. Returning goods decreases inventory (credit) and decreases the amount owed (debit).' },
        { e: [dr(APR, 400), cr('Purchase returns & allowances', 400)], why: 'Purchase returns & allowances is a periodic-system account. Under the perpetual system, credit Merchandise Inventory directly.' },
        { e: [dr('Cash', 400), cr(MI, 400)], why: 'Cobblestone received credit on its account, not cash. Debit Accounts payable (Ridgeline Wholesale).' }],
      why: 'A purchase return reduces both inventory and the amount owed to that vendor.' },

    { date: 'Nov 8', text: 'Bayfront Supply Co. gave a $300 price allowance for minor damage. Cobblestone kept the goods.',
      hints: ['The goods stayed, but did their cost change?', 'An allowance is recorded just like a return.'],
      correct: [dr(APB, 300), cr(MI, 300)],
      wrong: [
        { e: null, why: 'Even though the goods stayed, they now cost $300 less and Cobblestone owes $300 less. That changes two accounts.' },
        { e: [dr(APB, 300), cr(SRA, 300)], why: 'Sales returns & allowances is for allowances Cobblestone gives to its customers. An allowance received from a supplier reduces Merchandise Inventory.' },
        { e: [dr(APR, 300), cr(MI, 300)], why: 'Wrong vendor. The allowance came from Bayfront Supply Co.' }],
      why: 'A purchase allowance is recorded exactly like a return: debit Accounts payable, credit Merchandise Inventory. The only difference is that the goods stay.' },

    { date: 'Nov 10', text: 'Paid Ridgeline Wholesale within the discount period. Balance owed: $6,000 − $400 return = $5,600 × 2% = $112 discount.',
      hints: ['Clear the whole amount owed, even though less cash leaves.', 'A purchase discount lowers the cost of the goods. Which account holds that cost?'],
      correct: [dr(APR, 5600), cr('Cash', 5488), cr(MI, 112)],
      wrong: [
        { e: [dr(APR, 5488), cr('Cash', 5488)], why: 'This leaves $112 still owed to Ridgeline. Debit the full $5,600 balance, and record the $112 discount.' },
        { e: [dr(APR, 5600), cr('Cash', 5488), cr('Sales discounts', 112)], why: 'Sales discounts is for discounts Cobblestone gives customers. A purchase discount reduces Merchandise Inventory.' },
        { e: [dr(APR, 6000), cr('Cash', 5880), cr(MI, 120)], why: 'This ignores the $400 return on November 6. Only $5,600 is owed, so the discount is $112.' }],
      why: 'Debit Accounts payable (Ridgeline Wholesale) for the full $5,600 to clear it. Cash ($5,488) and Merchandise Inventory ($112) share the credit side.' },

    { date: 'Nov 15', text: 'Sold merchandise for $5,000 cash. Cost was $3,000.',
      hints: ['A perpetual sale has two parts: revenue at selling price and cost at cost.', 'Look for an entry with four lines and two different amounts.'],
      correct: [dr('Cash', 5000), dr(COGS, 3000), cr(SALES, 5000), cr(MI, 3000)],
      wrong: [
        { e: [dr('Cash', 5000), cr(SALES, 5000)], why: 'This records only the revenue part. Under the perpetual system, also move the $3,000 cost from Merchandise Inventory to Cost of goods sold.' },
        { e: [dr('Cash', 5000), cr(MI, 5000)], why: 'This skips revenue entirely and removes inventory at selling price. Revenue goes to Sales revenue; inventory leaves at cost ($3,000).' },
        { e: [dr('Cash', 5000), dr(COGS, 5000), cr(SALES, 5000), cr(MI, 5000)], why: 'The cost part must use cost ($3,000), not the selling price.' }],
      why: 'Revenue is recorded at the selling price and the cost of the goods at cost, in one entry. The $2,000 difference is the gross profit on this sale.' },

    { date: 'Nov 17', text: 'Sold merchandise to Kenmore Rec League for $4,000 on account, terms 2/10, n/30. Cost was $2,400.',
      hints: ['Who owes Cobblestone now?', 'Every sale needs the cost part too.'],
      correct: [dr(ARK, 4000), dr(COGS, 2400), cr(SALES, 4000), cr(MI, 2400)],
      wrong: [
        { e: [dr(ARK, 3920), dr(COGS, 2400), cr(SALES, 3920), cr(MI, 2400)], why: 'Record the full $4,000. The sales discount is recorded only if Kenmore pays within 10 days.' },
        { e: [dr(ARP, 4000), dr(COGS, 2400), cr(SALES, 4000), cr(MI, 2400)], why: 'Wrong customer. Kenmore Rec League owes this amount.' },
        { e: [dr(ARK, 4000), cr(SALES, 4000)], why: 'This is missing the cost part: debit Cost of goods sold $2,400 and credit Merchandise Inventory $2,400.' }],
      why: 'A sale on account is revenue today. The cost part is recorded at the same time, and Kenmore’s own account tracks what it owes.' },

    { date: 'Nov 19', text: 'Kenmore Rec League returned $500 of merchandise sold on November 17 (cost $300).',
      hints: ['The goods came back, so both parts of the sale reverse.', 'The revenue side uses selling price; the inventory side uses cost.'],
      correct: [dr(SRA, 500), dr(MI, 300), cr(ARK, 500), cr(COGS, 300)],
      wrong: [
        { e: [dr(SRA, 500), cr(ARK, 500)], why: 'This would be correct for an allowance, but here the goods came back. Also debit Merchandise Inventory $300 and credit Cost of goods sold $300.' },
        { e: [dr(SALES, 500), dr(MI, 300), cr(ARK, 500), cr(COGS, 300)], why: 'Use the contra-revenue account, Sales returns & allowances, so the business keeps a record of returns.' },
        { e: [dr(SRA, 500), dr(MI, 500), cr(ARK, 500), cr(COGS, 500)], why: 'The goods return to inventory at cost ($300), not at the $500 selling price.' }],
      why: 'A sales return reverses both parts of the sale: the revenue part at selling price and the cost part at cost.' },

    { date: 'Nov 25', text: 'Kenmore Rec League paid within the discount period. Balance: $4,000 − $500 return = $3,500 × 2% = $70 discount.',
      hints: ['Clear the whole receivable, even though less cash comes in.', 'A discount Cobblestone gives a customer reduces sales.'],
      correct: [dr('Cash', 3430), dr('Sales discounts', 70), cr(ARK, 3500)],
      wrong: [
        { e: [dr('Cash', 3430), cr(ARK, 3430)], why: 'This leaves $70 on Kenmore’s account. Credit the full $3,500 and debit Sales discounts for $70.' },
        { e: [dr('Cash', 3920), dr('Sales discounts', 80), cr(ARK, 4000)], why: 'This ignores the $500 return on November 19. Kenmore owes $3,500, so the discount is $70.' },
        { e: [dr('Cash', 3430), dr(MI, 70), cr(ARK, 3500)], why: 'A sales discount is a contra-revenue item. It does not change the cost of inventory.' }],
      why: 'Sales discounts is a contra-revenue account. Collecting cash moves no goods, so there is no cost entry.' },

    { date: 'Nov 27', text: 'Paid Bayfront Supply Co. in full. The November 4 purchase is past its discount period, so no discount: $3,000 − $300 allowance = $2,700. Also paid the $2,500 opening balance from October (no discount). Total paid: $5,200.',
      hints: ['Is there any discount this time?', 'Add up everything owed to Bayfront: the October balance, the November 4 purchase and the allowance.'],
      correct: [dr(APB, 5200), cr('Cash', 5200)],
      wrong: [
        { e: [dr(APB, 5200), cr('Cash', 5146), cr(MI, 54)], why: 'The discount period for the November 4 invoice ended November 14. Paying late means no discount.' },
        { e: [dr(APB, 2700), cr('Cash', 2700)], why: 'This forgets the $2,500 balance from October, which Cobblestone also paid. Total paid is $5,200.' },
        { e: [dr(APB, 5500), cr('Cash', 5500)], why: 'This forgets the $300 allowance from November 8. Bayfront’s balance is $5,200.' }],
      why: 'No discount, so cash paid equals the full balance: $2,500 + $3,000 − $300 = $5,200. Bayfront’s account is now zero.' },

    { date: 'Nov 28', text: 'Sold merchandise to Parkside Rentals for $2,000 on account, terms n/30. Cost was $1,200.',
      hints: ['A new customer: who owes Cobblestone?', 'n/30 means no discount is offered, but every sale still needs its cost part.'],
      correct: [dr(ARP, 2000), dr(COGS, 1200), cr(SALES, 2000), cr(MI, 1200)],
      wrong: [
        { e: [dr(ARP, 2000), cr(SALES, 2000)], why: 'This is missing the cost part: debit Cost of goods sold $1,200 and credit Merchandise Inventory $1,200.' },
        { e: [dr(ARK, 2000), dr(COGS, 1200), cr(SALES, 2000), cr(MI, 1200)], why: 'Wrong customer. Parkside Rentals bought these goods.' },
        { e: [dr(ARP, 1960), dr(COGS, 1200), cr(SALES, 1960), cr(MI, 1200)], why: 'Terms n/30 offer no discount, and sales are recorded at the full price anyway. Use $2,000.' }],
      why: 'Parkside will still owe $2,000 on November 30. It is the only receivable on the balance sheet.' },

    { date: 'Nov 30', text: 'Paid $1,000 store rent for November.',
      hints: ['Is rent part of the cost of merchandise, or a cost of running the store?'],
      correct: [dr('Rent expense', 1000), cr('Cash', 1000)],
      wrong: [
        { e: [dr(MI, 1000), cr('Cash', 1000)], why: 'Rent is not part of the cost of the goods. It is an operating expense.' },
        { e: [dr('Cash', 1000), cr('Rent expense', 1000)], why: 'The sides are reversed. Paying rent increases an expense (debit) and decreases Cash (credit).' },
        { e: [dr('R. Delgado, Drawing', 1000), cr('Cash', 1000)], why: 'Drawing is for the owner’s personal withdrawals. Store rent is a business expense.' }],
      why: 'Rent is an operating expense. It appears below gross profit on the multi-step income statement.' },

    { date: 'Nov 30', text: 'Paid $1,300 in employee salaries for November.',
      hints: ['Salaries are paid to employees for running the store. What kind of cost is that?'],
      correct: [dr('Salaries expense', 1300), cr('Cash', 1300)],
      wrong: [
        { e: [dr(COGS, 1300), cr('Cash', 1300)], why: 'Cost of goods sold is the cost of merchandise sold. Store salaries are an operating expense.' },
        { e: [dr('Salaries expense', 1300), cr('Salaries payable', 1300)], why: 'The salaries were paid in cash, so nothing is owed. Credit Cash.' },
        { e: [dr('R. Delgado, Drawing', 1300), cr('Cash', 1300)], why: 'These are employee salaries, not the owner’s withdrawals. A sole proprietor’s own pay is a drawing; employees’ pay is an expense.' }],
      why: 'Salaries are an operating expense. With this last entry, November net income is $1,830.' }
  ];

  const api = { Q: Q, OPENING: OPENING };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.QuizData = api;
})(typeof window !== 'undefined' ? window : globalThis);
