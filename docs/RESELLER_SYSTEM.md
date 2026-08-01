# Reseller System

Complete reference for the reseller programme: architecture, data model, money
flow, APIs, business rules and debugging.

---

## Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Folder structure](#3-folder-structure)
4. [Database collections](#4-database-collections)
5. [Relationships](#5-relationships)
6. [Authentication and authorization](#6-authentication-and-authorization)
7. [Registration flow](#7-registration-flow)
8. [Pricing and profit](#8-pricing-and-profit)
9. [Commission flow](#9-commission-flow)
10. [Wallet](#10-wallet)
11. [Withdrawals](#11-withdrawals)
12. [Referrals](#12-referrals)
13. [Order lifecycle](#13-order-lifecycle)
14. [Sharing and attribution](#14-sharing-and-attribution)
15. [Analytics](#15-analytics)
16. [Fraud detection](#16-fraud-detection)
17. [API reference](#17-api-reference)
18. [Validation rules](#18-validation-rules)
19. [Security](#19-security)
20. [Frontend state](#20-frontend-state)
21. [Concurrency and correctness](#21-concurrency-and-correctness)
22. [Debugging](#22-debugging)
23. [Scaling](#23-scaling)

---

## 1. Overview

A reseller lists existing catalogue products in their own storefront at a price
of their choosing, shares links to those products, and earns the difference
between the catalogue price and their price, minus a platform commission.

The programme deliberately reuses the existing catalogue, cart, checkout and
fulfilment. A reseller order is an ordinary `Order` document with three extra
fields. Nothing about the standard shopping path changes when the reseller
module is inactive.

```
Reseller picks a product  ->  sets a margin  ->  shares a link
Customer buys through it  ->  commission accrues as pending
Order delivered           ->  commission approved
Return window closes      ->  commission becomes withdrawable
Reseller requests payout  ->  admin settles  ->  money leaves the wallet
```

---

## 2. Architecture

```
┌──────────────────── Frontend (React 19 + Vite) ────────────────────┐
│                                                                    │
│  pages/reseller/*          10 route-split screens                  │
│  components/reseller/*     layout, share sheet, charts, primitives │
│  hooks/useReseller         profile + status gate                   │
│  utils/resellerRef         attribution across cart -> checkout     │
│                                                                    │
└────────────────────────────────┬───────────────────────────────────┘
                                 │ JSON over HTTPS, JWT bearer
┌────────────────────────────────▼───────────────────────────────────┐
│                     Backend (Express + Mongoose)                   │
│                                                                    │
│  routes/reseller.js         reseller-facing API                    │
│  routes/adminReseller.js    admin API                              │
│  middleware/reseller.js     role gate, attaches req.reseller       │
│                                                                    │
│  services/resellerService     pricing, commission, analytics, fraud│
│  services/walletService       the ledger; the only thing that      │
│                               moves money                          │
│  services/commissionMaturity  releases matured commissions         │
│                                                                    │
└────────────────────────────────┬───────────────────────────────────┘
                                 │
┌────────────────────────────────▼───────────────────────────────────┐
│  MongoDB: resellers, resellerproducts, wallets, transactions,      │
│           commissions, withdrawals, referrals, reselleranalytics   │
└────────────────────────────────────────────────────────────────────┘
```

**Layering rule.** Route handlers validate input and enforce authorization.
Services own business rules. Only `walletService` writes to `wallets` and
`transactions`. No route mutates a balance directly.

---

## 3. Folder structure

```
backend/
  models/
    Reseller.js              profile, status, rates, referral code, risk
    ResellerProduct.js       a listing: product + margin + share slug
    Wallet.js                balances (available / pending / locked)
    Transaction.js           immutable ledger, one row per balance change
    Commission.js            per-order commission breakdown
    Withdrawal.js            payout request and its lifecycle
    Referral.js              referrer -> referee edge
    ResellerAnalytics.js     one pre-aggregated bucket per reseller per day
  middleware/
    reseller.js              requireReseller, attachReseller
    validate.js              express-validator terminator, pagination, sorting
  services/
    resellerService.js       pricing, commission, attribution, analytics, fraud
    walletService.js         the ledger
    commissionMaturity.js    maturity sweeper and on-read settlement
  routes/
    reseller.js              /api/reseller/*
    adminReseller.js         /api/admin/* (reseller subset)
  tests/
    wallet.concurrency.test.js   money-safety tests
    reseller.logic.test.js       pricing and commission maths

FrontEnd/src/
  pages/reseller/
    ResellerApply, ResellerDashboard, ResellerCatalog, ResellerProducts,
    ResellerOrders, ResellerWallet, ResellerAnalytics, ResellerReferrals,
    ResellerCustomers, ResellerStorefront
  pages/admin/
    ManageResellers, ManageWithdrawals
  components/reseller/
    ResellerLayout, ResellerUI, ShareDialog, Charts
  hooks/useReseller.js
  utils/resellerRef.js
```

---

## 4. Database collections

### resellers

One document per reseller, 1:1 with a `User`.

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId → User | unique |
| `resellerCode` | String | public store id, e.g. `TRK7M2P9`, unique |
| `storeName`, `storeSlug`, `storeLogo`, `bio` | String | storefront identity |
| `whatsappNumber` | String | 10 digits, optional |
| `status` | Enum | `pending` → `approved` / `rejected` / `suspended` |
| `commissionRate` | Number | platform cut, percent of base. Admin-set |
| `maxMarginPercent` | Number | ceiling the reseller may add. Admin-set |
| `defaultMarginPercent` | Number | prefilled in the margin picker |
| `referralCode` | String | e.g. `REFX8K2QA`, unique |
| `referredBy` | ObjectId → Reseller | nullable |
| `stats.*` | Numbers | denormalised counters for dashboards |
| `riskScore` / `fraudFlags` | Number / Array | advisory, see §16 |

`resellerCode`, `referralCode` and `storeSlug` are generated in a `pre("validate")`
hook using a collision-checked alphabet that omits visually ambiguous characters
(no `0`/`O`, no `1`/`I`).

### resellerproducts

| Field | Notes |
|---|---|
| `reseller`, `product` | unique together: one listing per product per reseller |
| `shareSlug` | 12 hex chars, the `/s/:slug` identifier |
| `basePrice` | catalogue price snapshot at listing time |
| `marginPercent`, `marginAmount`, `sellingPrice` | derived, see §8 |
| `isActive` | soft hide without deleting stats |
| `stats.*` | clicks, orders, unitsSold, revenue, earnings |

`basePrice` is a snapshot on purpose: an admin repricing a product must not
silently change what a reseller has already advertised.

### wallets

| Field | Meaning |
|---|---|
| `availableBalance` | withdrawable now |
| `pendingBalance` | earned, not yet releasable |
| `lockedBalance` | reserved against an in-flight withdrawal |
| `lifetimeEarnings` | cumulative released earnings, never decremented by payouts |
| `totalWithdrawn` | cumulative paid out |
| `version` | incremented on every mutation, useful for debugging |

### transactions

Append-only ledger. Every balance change writes exactly one row, so a wallet can
be reconciled by replaying it.

| Field | Notes |
|---|---|
| `type` | `commission` \| `referral` \| `bonus` \| `withdrawal` \| `reversal` \| `adjustment` |
| `direction` | `credit` \| `debit` |
| `status` | `pending` \| `completed` \| `failed` \| `reversed` |
| `amount`, `balanceAfter` | |
| `idempotencyKey` | unique sparse index. The concurrency primitive, see §21 |

### commissions

| Field | Meaning |
|---|---|
| `baseAmount` | catalogue value of the items |
| `sellingAmount` | what the customer paid |
| `grossMargin` | `sellingAmount - baseAmount` |
| `platformFee` | `baseAmount × commissionRate / 100` |
| `netCommission` | `max(0, grossMargin - platformFee)` |
| `status` | `pending` → `approved` → `paid`, or `reversed` |
| `maturesAt` | when the money becomes withdrawable |
| `referralPayout` | the referrer's slice, if any |

### withdrawals, referrals, reselleranalytics

See the model files; fields are self-describing. `reselleranalytics` holds one
document per reseller per UTC day so the dashboard is O(days) rather than
O(orders).

---

## 5. Relationships

```
User 1───1 Reseller 1───1 Wallet 1───* Transaction
              │                            
              ├───* ResellerProduct ───* Product
              │
              ├───* Commission ───1 Order
              │
              ├───* Withdrawal
              │
              ├───* Referral (as referrer)
              └───1 Referral (as referee, unique)
              │
              └───* ResellerAnalytics (one per day)

Order ───0..1 Reseller        attribution, nullable
Order.items[] ───0..1 ResellerProduct
```

A `Referral` is unique on `referee`: a reseller can only ever be referred once.

---

## 6. Authentication and authorization

Authentication is the site-wide JWT scheme, unchanged: a short-lived access
token in `localStorage`, a refresh token in an HTTP-only `sameSite=strict`
cookie, rotated by an axios response interceptor on 401.

Authorization adds one middleware, mounted after `auth`:

```js
router.get("/wallet", auth, requireReseller, handler);
//                    │      └─ resolves the Reseller, enforces status,
//                    │         attaches req.reseller
//                    └─ verifies the JWT, attaches req.user
```

`requireReseller` returns a distinct code per state so the UI can render the
right screen instead of a generic error:

| Status | HTTP | Code |
|---|---|---|
| no profile | 403 | `NOT_A_RESELLER` |
| `pending` | 403 | `RESELLER_PENDING` |
| `rejected` | 403 | `RESELLER_REJECTED` |
| `suspended` | 403 | `RESELLER_SUSPENDED` |
| `approved` | passes through | |

`attachReseller` is the non-blocking variant, used by `/reseller/me` so the
onboarding screen can ask "am I a reseller?" without a 403.

Admin routes use `auth, admin` and are mounted before the legacy admin router
so the more specific paths win.

```
Request
  │
  ├─ auth ──────────── no/invalid token ─────────► 401
  │
  ├─ requireReseller ─ not approved ─────────────► 403 + code
  │
  └─ handler ───────── scoped by req.reseller._id ─► 200
```

Every reseller query is scoped by `reseller: req.reseller._id`. There is no
endpoint that takes a reseller id from the client, so there is no IDOR surface.

---

## 7. Registration flow

```
User → POST /api/reseller/apply
         │
         ├─ already has a profile?           → 409 with current status
         ├─ referral code supplied?
         │    ├─ not found or inactive       → 400
         │    └─ belongs to the same user    → 400 (self-referral)
         │
         ├─ create Reseller (status: pending)
         │    └─ pre-validate generates resellerCode, referralCode, storeSlug
         ├─ create Wallet (zeroed)
         ├─ create Referral (status: pending) if a code was used
         ├─ set User.resellerProfile
         └─ queue a fraud scan (non-blocking)
                                             → 201

Admin → PATCH /api/admin/resellers/:id/approve
         ├─ Reseller.status = approved
         ├─ User.isReseller = true
         ├─ Referral.status = pending → active
         └─ notify the user
```

The referral edge is created at application time but only activated on approval,
so a rejected applicant never generates referral earnings.

---

## 8. Pricing and profit

One function is the single source of truth, in `resellerService`:

```js
marginAmount = round2(basePrice × marginPercent / 100)
sellingPrice = round2(basePrice + marginAmount)
```

`round2` exists because floating point cannot represent currency exactly:
`0.1 + 0.2 === 0.30000000000000004`. Every monetary value is rounded to two
decimals at the point of computation, never at display time.

The margin is validated server-side against `maxMarginPercent` on both create
and update. The client shows a slider capped at the same value, but the server
does not trust it.

**Prices are never accepted from the client.** At checkout the server looks up
the reseller's active listing for each cart item and derives the price from it.
A tampered request body cannot change what the customer is charged or what the
reseller earns.

---

## 9. Commission flow

```
                     order placed
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │ recordOrderCommission               │
        │   compute breakdown                 │
        │   create Commission (pending)       │
        │   creditPending  → pendingBalance   │
        │   referral slice → referrer pending │
        └─────────────────┬───────────────────┘
                          │
              order delivered by admin
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │ settleCommissionForOrder            │
        │   Commission → approved             │
        │   (release only if already matured) │
        └─────────────────┬───────────────────┘
                          │
             return window elapses
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │ maturity sweeper, every 15 min      │
        │   releasePending                    │
        │   pending → available               │
        │   Commission → paid                 │
        └─────────────────────────────────────┘

        cancelled or returned at any point
                          │
                          ▼
        reverseCommission: claw back from pending first, then available
```

### Worked example

Two units of a product with a catalogue price of ₹1000, a 20% margin and a 10%
platform commission:

```
basePrice     1000
marginAmount   200      1000 × 20%
sellingPrice  1200

quantity         2
baseAmount    2000
sellingAmount 2400
grossMargin    400      2400 − 2000
platformFee    200      2000 × 10%
netCommission  200      400 − 200
```

`netCommission` is floored at zero: if a reseller sets a margin smaller than the
platform commission, they earn nothing rather than owing money.

### Why approval and release are separate

Delivery always happens before the return window closes, so a single "settle on
delivery" step can never release funds — it would always find `maturesAt` in the
future and return early. Approval marks the commission eligible; the sweeper
releases it once time has actually passed. `settleMaturedForReseller` also runs
when a reseller opens their wallet, so the balance is correct even if the
process has been idle.

---

## 10. Wallet

```
                creditPending
                      │
                      ▼
              ┌───────────────┐
              │    pending    │  earned, not yet releasable
              └───────┬───────┘
                      │ releasePending (after maturity)
                      ▼
              ┌───────────────┐
              │   available   │  withdrawable
              └───┬───────┬───┘
                  │       │ lockForWithdrawal
                  │       ▼
                  │  ┌───────────────┐
                  │  │    locked     │  reserved for a payout
                  │  └───┬───────┬───┘
                  │      │       │ settleWithdrawal
                  │      │       ▼
                  │      │   paid out, totalWithdrawn ↑
                  │      │
                  │      └─ unlockWithdrawal (rejected / cancelled)
                  │         back to available
                  │
                  └─ reverseCommission: pending first, then available
```

`lifetimeEarnings` tracks released earnings only. It is not reduced by
withdrawals, so it answers "how much has this reseller ever earned", which is
what the dashboard and leaderboard display.

---

## 11. Withdrawals

```
Reseller → POST /api/reseller/withdrawals
   ├─ amount < 100                     → 400
   ├─ an open request already exists   → 409
   ├─ lockForWithdrawal
   │    conditional on availableBalance ≥ amount
   │    fails  → 400 insufficient balance
   │    succeeds → available −= amount, locked += amount
   ├─ create Withdrawal (pending)
   │    on failure: unlock, then rethrow. Funds are never stranded.
   └─                                   → 201

Admin → approve   status pending → approved       (money stays locked)
      → reject    status → rejected, then unlock  (back to available)
      → paid      status → paid, then settle      (locked cleared, withdrawn ↑)

Reseller → cancel while still pending → unlock
```

Every transition is claimed with a conditional `findOneAndUpdate` on the current
status **before** any money moves. Two administrators clicking reject at the same
moment produce one state change and one unlock; the second sees "no longer
pending".

---

## 12. Referrals

A referrer earns `referralCommissionRate` percent (default 5) of the referee's
**net commission**, not of the order value. It is funded from the platform's
share, so it never reduces what the referee earns.

```
Referee earns netCommission 200
Referrer rate 5%
Referrer receives 10, credited to their pending balance under the same
maturity rules, with idempotency key referral:<orderId>:<referrerId>
```

Referral payouts are reversed alongside the parent commission when an order is
cancelled or returned. Self-referral is blocked at application time and also
flagged by the fraud scan.

---

## 13. Order lifecycle

Reseller-facing status vocabulary, mapped onto the storefront's statuses:

| Reseller view | Order status | Commission |
|---|---|---|
| Pending | `Placed` | pending |
| Confirmed | `Confirmed` | pending |
| Packed | `Processing` | pending |
| Shipped | `Shipped`, `Out for Delivery` | pending |
| Delivered | `Delivered` | approved, then paid after maturity |
| Cancelled | `Cancelled` | reversed |
| Returned | `Returned` | reversed |

Commission side effects are fired without blocking the response:

```js
resellerService
  .recordOrderCommission(order)
  .catch((err) => console.error("Reseller commission error:", err.message));
```

A ledger problem must never fail a customer's checkout. The write is idempotent
on order id, so it can be safely retried.

---

## 14. Sharing and attribution

```
/s/:slug          one shared product
/store/:code      the reseller's full storefront
```

Landing on either writes the reseller code to `sessionStorage` under
`talish:resellerRef`. Checkout reads it and sends it as `resellerCode`; the
server resolves it to an approved reseller and prices the order from that
reseller's listings. The key is cleared once the order succeeds.

`sessionStorage` rather than `localStorage` is deliberate: attribution should
last a visit, not follow the device indefinitely.

Share targets: WhatsApp, Telegram, Facebook and X use web share intents.
Instagram has no equivalent, so the caption is copied to the clipboard and the
app is opened. `navigator.share` is offered where supported.

---

## 15. Analytics

Writes go to a daily bucket per reseller:

```js
ResellerAnalytics.findOneAndUpdate(
  { reseller, date: utcMidnight },
  { $inc: { clicks, orders, unitsSold, revenue, earnings } },
  { upsert: true },
);
```

Reads are a range scan over those buckets, so a 90-day chart reads 90 documents
regardless of order volume. Top products come from the denormalised counters on
`resellerproducts`; top customers are an aggregation over orders with the phone
number masked in the projection.

Charts are hand-written inline SVG. Recharts or Chart.js would add roughly
90-160 kB gzipped for two charts on one authenticated route.

---

## 16. Fraud detection

Advisory only. It raises flags and a 0-100 score for the admin queue and never
suspends anyone automatically, because a false positive would lock an honest
reseller out of their earnings.

| Signal | Score | Trigger |
|---|---|---|
| `self_referral` | +40 | referrer and referee share an account |
| `duplicate_payout` | +35 | UPI or account number reused across accounts |
| `high_cancellation` | +30 / +15 | over 50% / 30% cancelled or returned, min 10 orders |
| `velocity` | +20 | 10 or more referrals in 24 hours |

Re-runs on application, on payout change, and on demand via
`POST /api/admin/resellers/:id/rescan`.

---

## 17. API reference

All list endpoints accept `page`, `limit` (capped at 100) and a whitelisted
`sort`, and return `{ success, data, pagination }`.

### Public

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/reseller/public/:slug` | shared product page, records a click |
| GET | `/api/reseller/public/store/:code` | storefront listing |

### Reseller (`auth` + `requireReseller`)

| Method | Path |
|---|---|
| POST | `/api/reseller/apply` (auth only) |
| GET / PUT | `/api/reseller/me` |
| GET | `/api/reseller/catalog` |
| GET / POST | `/api/reseller/products` |
| PUT / DELETE | `/api/reseller/products/:id` |
| GET | `/api/reseller/products/:id/share` |
| GET | `/api/reseller/orders`, `/api/reseller/orders/:id` |
| GET | `/api/reseller/wallet`, `/api/reseller/wallet/transactions` |
| POST / GET | `/api/reseller/withdrawals` |
| DELETE | `/api/reseller/withdrawals/:id` |
| GET | `/api/reseller/analytics`, `/commissions`, `/referrals`, `/customers` |
| GET | `/api/reseller/reports/export?type=orders\|commissions\|transactions` |

### Admin (`auth` + `admin`)

| Method | Path |
|---|---|
| GET | `/api/admin/resellers`, `/:id` |
| GET | `/api/admin/resellers/stats/overview`, `/stats/leaderboard`, `/fraud` |
| PATCH | `/api/admin/resellers/:id/approve\|reject\|suspend\|reinstate\|limits` |
| POST | `/api/admin/resellers/:id/rescan` |
| GET | `/api/admin/withdrawals` |
| PATCH | `/api/admin/withdrawals/:id/approve\|reject\|paid` |
| GET | `/api/admin/referrals` · PATCH `/api/admin/referrals/:id/revoke` |
| GET / PUT | `/api/admin/commission-rules` |

---

## 18. Validation rules

| Field | Rule |
|---|---|
| `storeName` | 3-60 characters |
| `whatsappNumber` | exactly 10 digits |
| `bio` | max 300 characters |
| `marginPercent` | 0 to `maxMarginPercent`, enforced server-side |
| `upiId` | `^[\w.-]{2,256}@[a-zA-Z]{2,64}$` |
| `ifscCode` | `^[A-Z]{4}0[A-Z0-9]{6}$` |
| `panNumber` | `^[A-Z]{5}[0-9]{4}[A-Z]$` |
| `accountNumber` | 6-20 digits |
| withdrawal `amount` | minimum 100, at most the available balance |
| `reason` on reject/suspend | 3-300 characters |

Validation is declared with `express-validator` chains and terminated by the
shared `validate` middleware, which returns `{ field, message }` pairs so the
client can highlight the offending input.

---

## 19. Security

| Concern | Measure |
|---|---|
| Ownership | every query scoped by `req.reseller._id`; no client-supplied reseller id |
| Price tampering | prices derived server-side from listings, never read from the request |
| Margin tampering | re-validated against `maxMarginPercent` on write |
| Double-spend | conditional balance updates, see §21 |
| Replay | unique `idempotencyKey` on credits and settlements |
| NoSQL injection | `$`-prefixed keys and dotted paths stripped from body, params and query |
| ReDoS | user search strings escaped before use in `$regex` |
| Rate limiting | 10 withdrawals/hour per account; 10 login attempts/15 min |
| PII | customer phone numbers masked to `******1234` in all reseller responses |
| CSV injection | leading `= + - @` prefixed with `'` in exports |
| Enumeration | login and newsletter responses do not reveal whether a record exists |

---

## 20. Frontend state

`useReseller` loads the profile once and exposes a discriminated status so each
screen can gate itself without duplicating the checks:

```js
const { reseller, loading, isApproved, isPending, status } = useReseller();
if (loading)     return <Skeleton />;
if (!isApproved) return <ResellerGate status={status} />;
```

Cart and wishlist state is split across two contexts each:

- `useCart()` returns the count and re-renders when it changes. Used by the
  navbar badge.
- `useCartActions()` returns only stable callbacks. Used by product cards, which
  mutate the cart but never display the count.

This matters because context propagation bypasses `React.memo`: a single
add-to-cart would otherwise re-render every card on the page.

`CatalogStateContext` fetches cart and wishlist membership once per page and
exposes them as `Set`s, so a card's "is this in my cart" check is an O(1) read
with no effect of its own.

---

## 21. Concurrency and correctness

The wallet is the part of the system where a race condition costs real money.
Three rules are enforced in `walletService`:

**1. The ledger row is written before the balance moves.**

```js
const txn = await claimLedgerEntry({ ..., idempotencyKey });
if (!txn) return null;          // another caller already did this
await Wallet.findOneAndUpdate(...);
```

The unique index on `idempotencyKey` makes the insert the concurrency claim.
Ten simultaneous retries of the same commission produce one insert and one
credit. Incrementing first would let a duplicate inflate a balance and then fail
to record it.

**2. Guards live in the query filter, never in JavaScript.**

```js
// Correct: the database decides, atomically.
await Wallet.findOneAndUpdate(
  { reseller, availableBalance: { $gte: amount } },
  { $inc: { availableBalance: -amount, lockedBalance: amount } },
);
```

Reading a balance, comparing it in JS, and then writing leaves a window in which
another request can change it. Two concurrent withdrawals for the full balance
would both pass such a check.

**3. Status transitions are claimed before side effects.**

```js
const withdrawal = await Withdrawal.findOneAndUpdate(
  { _id: id, status: { $in: ["pending", "approved"] } },
  { $set: { status: "rejected" } },
  { new: true },
);
if (!withdrawal) return conflict();
await walletService.unlockWithdrawal(...);   // only the winner reaches this
```

### Test coverage

`tests/wallet.concurrency.test.js` runs operations with `Promise.all` so a
non-atomic implementation actually fails:

| Scenario | Assertion |
|---|---|
| 10 concurrent identical credits | exactly one applied |
| 3 concurrent releases | released once, lifetime not inflated |
| 2 concurrent withdrawals for the full balance | one succeeds, one 400s |
| repeated unlock | balance does not grow, locked does not go negative |
| repeated settlement | withdrawn counted once |
| over-release, over-reversal | refused; no balance goes negative |

These were validated by mutation testing: reverting `lockForWithdrawal` to the
old read-then-write form fails the double-spend test, and restoring the old
credit ordering fails ten of the sixteen.

---

## 22. Debugging

### A reseller says their balance is wrong

Replay the ledger. It should equal the wallet.

```js
db.transactions.aggregate([
  { $match: { reseller: ObjectId("..."), status: "completed" } },
  { $group: {
      _id: "$direction",
      total: { $sum: "$amount" },
  }},
]);
// credits − debits should equal available + pending + locked
```

Then check for `status: "failed"` rows, which record an attempt whose balance
update was rejected by its guard.

### Commission stuck in pending

```js
db.commissions.find({ reseller: ObjectId("..."), status: { $ne: "paid" } })
  .forEach(c => print(c._id, c.status, c.maturesAt));
```

- `status: "pending"` → the order has not been marked Delivered.
- `status: "approved"` with `maturesAt` in the past → the sweeper has not run.
  It fires 30 seconds after boot and every 15 minutes; opening the wallet also
  triggers `settleMaturedForReseller`.

### Order not attributed

Check in order:

1. `sessionStorage.getItem("talish:resellerRef")` in the browser at checkout.
2. The request body contained `resellerCode`.
3. The reseller is `approved` — an unapproved code is ignored silently.
4. `ResellerProduct` exists and is `isActive` for that product.

Without an active listing the item is priced at the catalogue price and earns
no margin.

### Withdrawal appears stuck

```js
db.withdrawals.find({ reseller: ObjectId("...") }).sort({ createdAt: -1 });
db.wallets.findOne({ reseller: ObjectId("...") });
```

`lockedBalance` should equal the sum of amounts in `pending`, `approved` and
`processing` withdrawals. A mismatch means a transition ran without its matching
lock change; the ledger will show which.

### Useful queries

```js
// Everything due for release
db.commissions.find({ status: "approved", maturesAt: { $lte: new Date() } }).count();

// Wallets whose totals look impossible
db.wallets.find({ $or: [
  { availableBalance: { $lt: 0 } },
  { pendingBalance:   { $lt: 0 } },
  { lockedBalance:    { $lt: 0 } },
]});

// Duplicate idempotency keys (should always be zero)
db.transactions.aggregate([
  { $match: { idempotencyKey: { $ne: null } } },
  { $group: { _id: "$idempotencyKey", n: { $sum: 1 } } },
  { $match: { n: { $gt: 1 } } },
]);
```

---

## 23. Scaling

Ordered by when it becomes worth doing.

**Now.** The maturity sweeper runs in-process. With more than one instance every
instance sweeps, which is safe because releases are idempotent, but wasteful.
Move it to a single worker or a scheduled job when you scale horizontally.

**Soon.** Replace the fire-and-forget commission call with a queue (BullMQ,
SQS). Today a crash between order creation and commission recording leaves the
commission unwritten; a queue makes it retryable. The write is already
idempotent, so this is a drop-in change.

**When Mongo is a replica set.** Wrap credit-plus-release in a transaction. The
current design is correct without one because each step is individually atomic
and idempotent, but a transaction would collapse the multi-step reversal into a
single unit.

**At volume.**

- Analytics buckets grow at one document per reseller per day. Add a TTL index
  or roll days into months past 90 days.
- The transaction ledger is append-only and will be the largest collection.
  Archive completed rows older than a year to cold storage.
- Cache `/reseller/public/*` at the CDN edge; the payload is identical for every
  visitor and only changes when the reseller edits a listing.
- The leaderboard sorts on `stats.lifetimeEarnings`, which is indexed. If it
  becomes hot, materialise the top 100 into a small collection on a schedule.

**Operational.** Alert on: wallets with a negative balance, duplicate
idempotency keys, commissions approved more than 24 hours past `maturesAt`, and
`lockedBalance` disagreeing with the sum of open withdrawals. All four indicate
a correctness bug rather than a business problem.
