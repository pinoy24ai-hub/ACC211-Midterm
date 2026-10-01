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
2. Drag the **`site`** folder onto the page. That's it.

Only drag `site/`. Do **not** upload the `instructor/` folder, since it contains the answer key.

The app is fully static and has no external dependencies: the PDF library is bundled in `site/vendor/`.

## How the exam behaves

- **Name first.** Students enter their first and last name and confirm an integrity statement before the exam starts.
- **Unique version per student.** Each new start creates a random version code (for example `RQ33-QPNC`). The code drives everything: business, owner, dollar amounts, which transactions and adjustments appear, and their order. Phase 1 always includes an owner investment, cash and credit services, and an owner withdrawal, plus 6 transactions drawn from a pool of 14.
- **No hints or corrections.** Students see no feedback, no debit/credit totals, and no account categories on the adjustments. The score appears only at the end.
- **Locked forward.** Submitting a phase locks it.
- **Progress is saved** in the browser. A reload resumes the same version with all answers, so refreshing cannot be used to fish for new numbers.
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
- Optionally enter the **name, phase scores and check code** from the student's PDF. If they don't match, the PDF may have been edited.

**Shared lab computer?** Open the exam with `#reset` at the end of the URL (for example `https://your-site.netlify.app/#reset`) to clear a finished exam so the next student can start.

## Limits worth knowing

This is a static site, so all logic runs in the student's browser. A determined student could clear their browser data to start a fresh version, or read the JavaScript. The version code, timestamps and check code on each report, plus your Canvas availability window, are the practical safeguards.

## Development

```
node tests/engine.test.js
```

Generates 3,000 random versions and confirms every entry and trial balance balances, adjustments never exceed the balances they reduce, the closing routine zeroes all temporary accounts, and a perfect set of answers scores exactly 100.
