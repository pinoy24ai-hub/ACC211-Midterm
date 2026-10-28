# ACC 211 Midterm Exam App

An interactive, browser-based midterm on the accounting cycle for a service business owned by one person.

| Phase | Task | Points |
|---|---|---|
| 1 | Journalize 10 transactions using a drop-down chart of accounts | 40 (4 each) |
| 2 | Record 6 adjusting entries from a given unadjusted trial balance: 1 accrued expense, 1 accrued revenue, 2 deferred expenses, 1 deferred revenue, 1 depreciation | 36 (6 each) |
| 3 | Run a click-based closing routine on a given adjusted trial balance: revenues to Income Summary, expenses to Income Summary, Income Summary to Capital, Drawing to Capital | 24 (6 per entry) |

Each phase supplies its own data, so mistakes never carry over from one phase to the next.

## Deploying to Netlify

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop) (or **Sites > Add new site > Deploy manually**).
2. Drag the **`netlify/midterm-exam`** folder (it holds a single `index.html`) onto the page. That's it.

Only drag `netlify/midterm-exam/`. Do **not** upload the `instructor/` folder, since it contains the answer key.

The app is fully static and has no external dependencies: the PDF library is built into the single `index.html`.

**Editing:** the source files live in `src/midterm-exam/` (and `src/gl-practice/`, `src/gl-workshop/`). After any change, run `node tools/build-netlify.js` to rebuild the single-file `netlify/<site>/index.html`. `node tests/netlify.test.js` fails if you forget.

## How the exam behaves

- **Name first.** Students enter their first and last name and confirm an integrity statement before the exam starts.
- **Unique version per student.** Each new start creates a random version code (for example `RQ33-QPNC`). The code drives everything: business, owner, dollar amounts, which transactions and adjustments appear, and their order. Phase 1 always includes an owner investment, cash and credit services, and an owner withdrawal, plus 6 transactions drawn from a pool of 14.
- **No hints or corrections.** Students see no feedback, no debit/credit totals, and no account categories on the adjustments. The score appears only at the end.
- **Locked forward.** Submitting a phase locks it.
- **Progress is saved** in the browser. A reload resumes the same version with all answers, so refreshing cannot be used to fish for new numbers.
- **Unlimited retakes, highest score counts.** After finishing, students can click **Retake Exam** for a brand-new version (new numbers, transactions and order). The results page lists every attempt and stars the highest. Each attempt has its own PDF (`..._Attempt2.pdf`), and students upload the report for each attempt. Retakes are tracked in the student's browser, so the attempt number and version code on each PDF, plus Canvas submission history, are your record.
- **PDF report.** At the end, students download `ACC211_Midterm_<Name>.pdf` with their name, version code, a check code, start and submit times, phase scores, and every response they entered (correct answers are not shown). They upload this PDF to Canvas.

## Scoring rules

- **Journal and adjusting entries:** each expected line earns full credit for the correct account, side (debit or credit) and amount, or half credit for the correct account and side with a wrong amount. Each extra or incomplete line deducts half a line. An entry never scores below zero.
- **Closing entries (6 points each):**
  - *Accounts (4 points):* students click every account in the entry, meaning the account(s) being closed **and** the account receiving the balance (Income Summary or Capital). Credit is proportional to correct accounts minus wrong ones (minimum zero). An account being closed earns nothing if its balance was already zero, for example Drawing that was wrongly closed to Income Summary in an earlier entry.
  - *Amount (2 points):* the amount typed for the receiving account must equal the total actually closed by the accounts the student selected. It counts only when some account credit was earned.
  - Entries post exactly as keyed, so a wrong amount flows into Income Summary and Capital, as it would in a real ledger. Grading compares each amount to the student's own selection, so one mistake is not penalized twice.

## Phase 3 screen

- Neutral labels ("Closing entry 1 of 4"), so students must know the order and what each entry closes.
- Ledger grouped by Assets, Liabilities, Owner's Equity, Revenues and Expenses, with live balances.
- Preview of each entry before posting, with the amount field on the receiving account's line. An entry can't post until it has two sides.
- Live Income Summary T-account, the closing journal, and a post-closing trial balance at the end (not graded).

## Instructor tools

Open `instructor/answer-key.html` directly from your computer (double-click it; no server needed).

- Enter a student's **version code** to see the full answer key for that version: all entries, both trial balances, the correct closing entries, net income or loss, and ending capital.
- Optionally enter the **name, attempt number, phase scores and check code** from the student's PDF. If they don't match, the PDF may have been edited.

### Version Inspector (whole class)

Open `instructor/version-inspector.html` (double-click it). It is a single self-contained file, so it also works if you save it somewhere on its own.

- Paste one report per line: either a bare version code, or a full row copied from a spreadsheet in this order: `Name, Attempt, Version code, Phase 1, Phase 2, Phase 3, Check code` (commas or tabs). Header rows are skipped.
- The roster verifies every check code and flags **shared codes** (the same version under different names, which usually means a copied report), **repeats**, **impossible codes**, and scores above the maximum.
- Click **View key** for the full answer key for any row, with Previous/Next and Print. **Download CSV** exports the roster with results, net income and ending capital.
- After changing `src/midterm-exam/js/engine.js`, rebuild it with `node tools/build-instructor.js`. The test suite fails if you forget.

**Shared lab computer?** Open the exam with `#reset` at the end of the URL (for example `https://your-site.netlify.app/#reset`) to clear a finished exam so the next student can start.

## Limits worth knowing

This is a static site, so all logic runs in the student's browser. A determined student could clear their browser data to start a fresh version, or read the JavaScript. The version code, timestamps and check code on each report, plus your Canvas availability window, are the practical safeguards.

## Development

```
node tests/engine.test.js
```

Generates 3,000 random versions and confirms every entry and trial balance balances, adjustments never exceed the balances they reduce, the closing routine zeroes all temporary accounts, and a perfect set of answers scores exactly 100.

---

# Part 2: Financial Statement Analysis

Two sites built from the same source files:

| Folder | Use | Numbers | Hints |
|---|---|---|---|
| **`part2-exam-site/`** | The real midterm Part 2. Deploy this as its own Netlify site. | New numbers for every version code (every new start and every retake) | None, and no refreshers |
| `part2-site/` | Practice / review version | Fixed: Blue Harbor Mobile Detailing, revenue $160,000 to $184,000 | Free hints and a refresher per stage |

**Never edit `part2-exam-site/` directly.** Edit `part2-site/`, then run `node tools/build-part2-exam.js`. The only difference between the two is `js/config.js`. The tests fail if the exam folder is out of date.

## Stages

| Stage | Section | Topic | Points |
|---|---|---|---|
| A1 | Income statement | Percent of Revenue (vertical analysis) | 15 |
| A2 | Income statement | Year-over-Year Changes (horizontal analysis) | 15 |
| A3 | Income statement | Profit Margin vs Industry benchmark | 15 |
| B1 | Balance sheet | Sort and Total | 15 |
| B2 | Balance sheet | Working Capital and Current Ratio vs benchmark | 15 |
| B3 | Balance sheet | Debt Ratio vs benchmark | 12.5 |
| B4 | Both | The Bank's Decision (scorecard, loan rules, 2 written answers) | 12.5 |

- 40 questions, 2.5 points each: multiple choice, true/false, click a line (4 expenses offered), build-the-total boards (partial credit per item) and formula builders (all or nothing).
- No right/wrong feedback; stages lock on submit. The two written answers in the final stage are required but not scored; they print in the PDF.
- Name first, saved progress, unlimited retakes (highest counts), and a PDF report per attempt with a check code.

## What changes in each exam version

The business (Blue Harbor Mobile Detailing, owner Camila Reyes) stays the same. Every version keeps the **same story**: revenue grows, expenses grow faster, the net profit margin falls from above to below the industry benchmark, the current ratio falls below its benchmark, the debt ratio moves above its benchmark, and only working capital meets the bank's loan rules. What changes:

- All dollar amounts on both statements (they always foot, balance, and tie: depreciation expense equals the change in accumulated depreciation).
- Which expenses each question asks about, the four expenses offered in the click-a-line questions, and the items students classify.
- The industry and ratio benchmarks, the bank's working-capital rule and the loan amount (always set so the story holds).
- Multiple-choice option order, and question order within each stage (the finale keeps its order because its questions build on each other).
- No displayed percent or ratio ever sits on a rounding edge, and every "which is biggest" question has a clear winner.

## Part 2 Version Inspector

Open `instructor/part2-inspector.html` (self-contained; double-click it). Paste rows as `Name, Attempt, Version code, Section A, Section B, Check code`, or bare codes. It verifies check codes, flags shared, repeated and impossible codes and scores above the maximum, and shows each version's statements, key results, and the correct answer to every question in the order that student saw them. Practice-site reports have a different check code, so they can't pass as exam reports.

## Tests

```
node tests/part2.test.js        # practice version
node tests/part2-exam.test.js   # 3,000 randomized exam versions, plus build checks
```

---

# Bright Mart General Ledger (practice set)

`netlify/gl-practice/index.html` (source in `src/gl-practice/`) is a separate single-file site that goes with the two merchandising videos (`video/merch-perpetual/` and `video/merch-sales/`). Deploy it the same way: drag the **`netlify/gl-practice`** folder onto [Netlify Drop](https://app.netlify.com/drop).

Students journalize all 15 November transactions of Bright Mart under the **perpetual inventory system**:

| # | Date | Transaction |
|---|---|---|
| 1 | Nov 1 | Purchase for cash, $5,000 |
| 2 | Nov 3 | Purchase on account, $10,000, 2/10, n/30, FOB shipping point |
| 3 | Nov 4 | Freight-in, $300 |
| 4 | Nov 6 | Purchase return, $1,000 |
| 5 | Nov 8 | Purchase allowance, $500 |
| 6 | Nov 13 | Payment within the discount period ($170 discount, $8,330 cash) |
| 7 | Nov 15 | Cash sale, $3,000 (cost $1,800) |
| 8 | Nov 18 | Sale on account, $8,000 (cost $4,800), 2/10, n/30, FOB destination |
| 9 | Nov 18 | Freight-out, $200 |
| 10 | Nov 21 | Sales return, $1,000 (cost $600) |
| 11 | Nov 23 | Sales allowance, $500 |
| 12 | Nov 28 | Collection within the discount period ($130 discount, $6,370 cash) |
| 13 to 15 | Nov 30 | Salaries $1,200, rent $900 and interest $70, paid in cash |

The ledger opens on Nov 1 with Cash and Owner's Capital of $20,000 each (given, not journalized).

## How it works

- **Name first.** The name prints on the certificate.
- **Check and retry.** "Check entry" marks each line correct or incorrect without revealing the answer; students fix and recheck with no penalty. Lines may be in any order, and a two-entry sale may be entered as one compound entry.
- The chart of accounts includes periodic-system accounts (Purchases, Freight-In, Purchase Returns and Allowances, Purchase Discounts) as distractors; choosing one is marked incorrect.
- **Correct entries lock and post** to the general ledger (running balances), trial balance and multi-step income statement, which update live.
- **Certificate of Completion** (PDF) unlocks when all 15 entries are posted. It shows the student's name, completion date, a certificate ID, and the multi-step income statement (net income $1,000, matching the sales video).
- Progress is saved in the browser. Add `#reset` to the URL to clear it on a shared computer.

```
node tests/gl-practice.test.js
```

Confirms every key entry balances and avoids periodic accounts, the checker accepts any line order and formatting and rejects wrong, partial, unbalanced and extra lines, and the ledger and statement tie to both videos (inventory $13,630 after purchases and $7,630 at month end, COGS $6,000, net income $1,000).

---

# Merchandising General Ledger Workshop (scored, with hints)

`netlify/gl-workshop/index.html` (source in `src/gl-workshop/`) is a third single-file site, rebuilt from the instructor's original single-file workshop (Elmwood Hardware) but using **the same 15 Bright Mart transactions as the two videos and the practice set** (opening Cash and Owner's Capital of $20,000; net income $1,000). Deploy it by dragging the **`netlify/gl-workshop`** folder onto [Netlify Drop](https://app.netlify.com/drop).

| Feature | How it works |
|---|---|
| Name first | Shown in the header and printed on the certificate |
| Journal entry screen | One entry per transaction (a sale and a sales return are one 4-line entry). Accounts payable and receivable lines need the vendor or customer (subsidiary ledger). Live debit and credit totals. |
| Feedback | "Check my entry" marks lines green or red with a reason (wrong account, wrong side, wrong vendor/customer, wrong amount) without revealing the answer |
| Hints | Three per entry, each more specific |
| Scoring | 1 point per entry; -0.25 per wrong check, -0.1 per hint, minimum 0.25 once solved; "Show me the answer" (after 2 misses) earns 0. Incomplete lines are not counted as attempts. |
| After each entry | A "why" explanation; the entry posts to the general journal, T-accounts, subsidiary ledgers and the live income statement (changed lines flash) |
| T-accounts | Focus accounts (Merchandise inventory, Cost of goods sold, Accounts payable) first; vendor and customer subsidiary ledgers reconcile to their control accounts |
| Income statement | Multi-step, with gross profit margin, income from operations, other expenses (interest) and net profit margin |
| Certificate | 70% or higher unlocks a direct PDF download (no print dialog). Page 1: certificate with name, score, date, Prof. Elf signature line, certificate ID and the student's income statement. Page 2: points per entry. |
| Saved progress | Every action is saved in the browser, including wrong attempts and hints, so reloading cannot reset a penalty. "Start over with a different name" clears it; `#reset` in the URL does the same on a shared computer. |

```
node tests/workshop.test.js
```

Confirms every entry balances and has 3 hints, the checker accepts any line order and flags wrong vendors, missing cost entries and reversed sides, the scoring rules, and that the ledger, subsidiary ledgers and income statement tie to the videos (inventory $7,630, COGS $6,000, net income $1,000, gross margin 36%, net margin 10.7%).

---

# Cobblestone Sports & Outdoor: November Ledger (guided walkthrough + practice)

`netlify/cobblestone/index.html` (source in `src/cobblestone/`) is a fourth single-file site. Cobblestone Sports & Outdoor (R. Delgado, owner) opens November 2026 with Cash $25,000, Merchandise Inventory $4,000, Accounts payable (Bayfront Supply Co.) $2,500 and Capital $26,500, then records 15 transactions, including a **No entry required** case (Nov 3, freight paid by the seller under FOB destination) and a late payment with no discount (Nov 27).

- **Guided walkthrough:** each transaction in four steps (read, analyze with 1 to 3 questions, journalize, post) with a "what changed" table of balances, net income and total assets. Back/Next buttons or arrow keys; the progress dots jump to any transaction; optional **Read aloud** uses the browser's built-in voice.
- **Practice:** students journalize all 15 with unlimited, no-penalty checks, free hints (the walkthrough's analysis questions) and a No entry required checkbox. Lines may be in any order. Feedback flags wrong accounts, sides, amounts and vendor or customer. No name and no certificate.
- **Live ledgers and statements** (for whichever mode is active): the posted general journal, T-accounts with Accounts payable and Accounts receivable control accounts and their subsidiary ledgers (with reconciliation), a multi-step income statement and a balance sheet that balances after every entry (net income to date is included in owner's equity).
- Progress in both modes is saved in the browser; `#reset` in the URL clears it.

Final results: net sales $10,430, COGS $6,300, gross profit $4,130, net income $1,830; Cash $20,262, Accounts receivable (Parkside Rentals) $2,000, Merchandise Inventory $6,068, Accounts payable $0, total assets $28,330.

```
node tests/cobblestone.test.js
```
