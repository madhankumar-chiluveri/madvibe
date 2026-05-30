# Card-Funded Loans & Lending — Design

**Date:** 2026-05-30
**Module:** Personal Ledger (`/workspace/ledger`)
**Status:** Approved design, pending implementation plan

## Problem

The user lends money to friends from a credit card. Today the Loans tab only links a
loan to a bank account, and credit cards live in a separate workspace with no connection
to loans. The user wants lending from a credit card to be tracked as a loan, the credit
card debt to reflect the lent amount, and an optional charges/fee field captured on the
lend.

Separately, bank accounts are being retired from the Ledger UI, so the ledger becomes
credit-card-centric: account lists and account-derived dashboard metrics are removed, and
loan funding / repayment flows move onto credit cards.

## Decisions (locked with the user)

1. **Charges ownership:** the friend owes the charges too. Stored loan principal =
   `lent amount + charges`; the charge is a pass-through receivable, not the lender's
   expense.
2. **Funding picker:** a single "Fund from card" dropdown (credit cards only — no bank
   accounts). Selecting a card reveals the Charges field.
3. **Repayments:** target a credit card and **pay down that card's balance**.
4. **Bank removal scope:** remove the account list and account-derived dashboard metric(s)
   from the Overview tab, and all account dropdowns/labels in the loan + repayment flows.
   The `financeAccounts` table itself **stays** as hidden plumbing — credit-card
   transactions still require `card.accountId`, and the card-add flow auto-bootstraps a
   hidden "Main Account".
5. **Net Worth metric:** removed entirely (the Overview metric grid drops from 4 cards to
   3: Income / Expenses / Savings).
6. **Backend approach:** extend the existing `createLoan` mutation (chosen over chaining
   `recordCardSpend` or a new `lendFromCard` mutation) — one atomic mutation, single source
   of truth, reuses the dual-link transaction fields the schema already has.

## Existing facts the design relies on

- `financeTransactions` already has **both** `loanId` and `linkedCreditCardId` optional
  fields, so a single transaction can be linked to a loan and a card at once.
- `signedTransactionAmount()` returns `0` when `affectsBalance === false`, so the existing
  `deleteLoan` bank-reversal loop is already a safe no-op for credit-card transactions.
- `recordCardSpend` is the reference pattern for card-balance mutation: write an expense
  transaction against `card.accountId` with `affectsBalance:false`, then
  `currentBalance += amount`, `availableCredit = max(0, creditLimit - newBalance)`.
- The card-add flow auto-creates a hidden "Main Account" when no account exists, so hiding
  the account UI does not break card creation.
- `transactions-tab-v2.tsx` is dead code (not imported/mounted) — out of scope.

## Changes

### 1. Schema (`convex/schema.ts`)

`financeLoans` — add:
```
fundingCreditCardId: v.optional(v.id("financeCreditCards"))
charges: v.optional(v.number())   // fee; display-only, already folded into principalAmount
```

`financeLoanRepayments` — add:
```
creditCardId: v.optional(v.id("financeCreditCards"))
```

All new fields are optional → backward-compatible; existing rows are unaffected. No new
index required.

### 2. `createLoan` (`convex/ledgerLoans.ts`)

New optional args: `fundingCreditCardId`, `charges`.

Semantics for a card-funded lent loan:
- Input `principalAmount` = amount handed to the friend (the lent amount).
- Input `charges` = fee.
- `total = principalAmount + (charges ?? 0)`.
- Stored loan: `principalAmount = total`, `currentBalance = total`, `charges`,
  `fundingCreditCardId`.

Branch logic:
- **Lent + card present:** validate the card belongs to the user. Write a principal
  transaction (amount = lent) and, if `charges > 0`, a fee transaction (amount = charges),
  both against `card.accountId`, `type:"expense"`, `affectsBalance:false`, linked to both
  `loanId` and `linkedCreditCardId`. Descriptions: principal → `Lent to {name} · {issuer}
  ••{lastFour}`, fee → `Lending fee · {name}`. Then bump the card:
  `currentBalance += total`, `availableCredit = max(0, creditLimit - newBalance)`.
- **Lent without card:** record-only (no transactions, no balance change).
- **Borrowed:** record-only (no funding source, no balance change). The legacy bank branch
  is no longer reachable from the UI.

Server guard: `fundingCreditCardId` is only honored for `direction === "lent"`.

### 3. `recordLoanRepayment` (`convex/ledgerLoans.ts`)

Replace the `accountId` arg with optional `creditCardId`.
- If `creditCardId` set: validate ownership, write a repayment transaction against
  `card.accountId`, `type:"income"`, `affectsBalance:false`, linked to `loanId` +
  `linkedCreditCardId`, description `Repayment from {name} · {issuer} ••{lastFour}`. Then
  pay down the card: `currentBalance -= amount`, `availableCredit = min(creditLimit,
  creditLimit - newBalance)` (clamped ≥ 0). Store `creditCardId` on the repayment row.
- If absent: record-only (reduce loan balance only).
- Loan balance/status update is unchanged (`currentBalance -= amount`, re-resolve status).
- Default repayment target in the UI = the loan's `fundingCreditCardId`.

### 4. `deleteLoan` (`convex/ledgerLoans.ts`)

After the existing bank-reversal loop (which stays — it is a no-op for card txns), add card
reversal: for every `by_loanId` transaction carrying `linkedCreditCardId`, compute
`cardDelta = tx.type === "expense" ? +tx.amount : -tx.amount` (the amount the card balance
moved at creation) and reverse it: `card.currentBalance -= cardDelta`, then recompute
`availableCredit`. This correctly unwinds both lend transactions (expense, +balance) and
repayment transactions (income, −balance). Then delete transactions, repayments, and the
loan as today.

### 5. Overview tab (`src/app/workspace/ledger/page.tsx`, `DashboardTab`)

- Remove the "Account Balances" list section.
- Remove the `accounts = useQuery(api.ledger.listAccounts)` subscription.
- Remove the "Net Worth · all accounts" metric card. The metric grid becomes 3 cards:
  Income / Expenses / Savings (adjust grid columns accordingly).
- Leave `getDashboardData` backend untouched (still computes `netWorth`; simply not
  displayed).

### 6. Loan form (`LoansTab` Add Loan modal)

- Add `const creditCards = useQuery(api.ledgerCards.listCreditCards)`.
- Remove the account dropdown, `accountsById`, and `listAccounts`.
- Form state: replace `linkedAccountId` with `fundingCreditCardId` and add `charges`.
- **Lent:** "Fund from card" dropdown listing the user's credit cards plus an empty
  "Don't track on a card" option. When a card is selected, reveal a **Charges (INR)**
  number field and a live helper line: `Friend owes ₹{lent + charges}`.
- **Borrowed:** no funding field.
- `handleSubmit` sends `principalAmount` (lent amount), `charges`, and
  `fundingCreditCardId` (when a card is chosen) to `createLoan`.

### 7. Repayment modal (`LoansTab`)

- Replace the account dropdown with a **credit-card** dropdown plus an empty
  "Don't track on a card" option; default the selection to the loan's
  `fundingCreditCardId`.
- `repayForm.accountId` → `repayForm.creditCardId`; pass `creditCardId` to
  `recordLoanRepayment`.

### 8. Loan card display (`LoanCard`)

- When `loan.fundingCreditCardId` is set, render `Lent via {issuer} ••{lastFour}` and, if
  `charges > 0`, a second line `incl. ₹{charges} charges`, replacing the "Sent from
  {account}" line.
- Repayment-history rows show the repayment's card name instead of an account name.
- Build a `cardsById` map from `listCreditCards` for these labels.

## Data flow (worked example)

Lend ₹10,000 from HDFC card with ₹250 charges:
1. UI: amount = 10000, charges = 250, fundingCreditCardId = HDFC.
2. `createLoan`: total = 10250 → loan `{principalAmount:10250, currentBalance:10250,
   charges:250, fundingCreditCardId:HDFC}`; principal tx (10000) + fee tx (250) linked to
   loan+card; HDFC `currentBalance += 10250`.
3. Friend repays ₹10250 to HDFC: `recordLoanRepayment {creditCardId:HDFC, amount:10250}`
   → loan `currentBalance = 0` (settled); HDFC `currentBalance -= 10250`; repayment row +
   income tx linked to loan+card.
4. Delete loan: lend txns reverse HDFC `-= 10250`, repayment tx reverses HDFC `+= 10250`
   → net zero, card restored.

## Edge cases

- Charges = 0 / empty → no fee transaction; total = lent amount.
- Lent loan with no card selected → pure record-only loan.
- Borrowed loans → always record-only (no card wiring).
- Card-add still works with the account UI hidden (auto-bootstrap "Main Account").
- Lending beyond available credit is allowed (mirrors `recordCardSpend`, which does not
  block over-limit).

## Out of scope

- Borrowing onto / repaying borrowed loans via a credit card.
- A reverse view listing card-funded loans inside the credit-card workspace.
- Removing the `financeAccounts` table or the `transactions-tab-v2.tsx` dead code.
- Any change to `getDashboardData` backend math.
