# Full Project Audit

Branch `arena/019fb8f0-shopeasy` · React 19 · Vite 7 · Express 4 · Mongoose 7

Every number below was measured in this repository. Where something could not
be measured here, it says so.

---

## 1. Audit scope

183 source files read across frontend, backend, models, routes, services,
middleware, hooks, contexts, utilities, build config and the service worker.

| Area | Files | Lines |
|---|---|---|
| Frontend components | 42 | 11,765 |
| Frontend pages | 46 | 18,256 |
| Contexts / hooks / utils | 19 | 2,090 |
| Backend routes | 20 | 6,412 |
| Backend models | 22 | 1,889 |
| Backend services / middleware / utils | 11 | 1,965 |

---

## 2. Issues found

### Critical — money

| # | Issue | Impact |
|---|---|---|
| C1 | **Commissions never became withdrawable.** `settleCommissionForOrder` ran only on the Delivered transition. At that moment `maturesAt` is always ~7 days out, so the guard `if (maturesAt > now) return` fired every time — and nothing ever called it again. No scheduler existed. | Every reseller's earnings were permanently stuck in `pendingBalance`. The withdrawal feature was unreachable. |
| C2 | **Credit applied before the ledger row was written.** `creditPending` did `findOne(idempotencyKey)` → `$inc wallet` → `create transaction`. Two concurrent retries both passed the check, both incremented, and the second insert then failed on the unique index. | A retried webhook inflated a balance with no ledger row to explain it. |
| C3 | **Balances computed from stale reads.** `releasePending` and `reverseCommission` read the wallet, computed amounts in JavaScript, then applied them unconditionally. | Concurrent operations could over-release or over-claw, and reversal could drive `lifetimeEarnings` negative. |
| C4 | **`unlockWithdrawal` had no guard.** An unconditional `$inc` on `lockedBalance: -amount, availableBalance: +amount`. | A repeated reject minted money and pushed `lockedBalance` negative. |
| C5 | **Withdrawal transitions checked status in JS, then wrote.** Approve, reject, mark-paid and cancel all did `findById` → `if (status...)` → `save()`. | Two admins acting at once both passed the check; reject-plus-cancel double-unlocked the same funds. |
| C6 | **Locked funds stranded on failure.** If `Withdrawal.create` threw after `lockForWithdrawal` succeeded, the money stayed locked with no record. | Balance permanently unavailable, no audit trail. |

### High — rendering and correctness

| # | Issue | Impact |
|---|---|---|
| H1 | **Context propagation bypasses `React.memo`.** Every `ProductCard` consumed `CartContext` and `WishlistContext` for `refreshCart`/`refreshWishlist`, but none display the counts. Changing `cartCount` re-rendered every card. | One add-to-cart re-rendered the entire visible grid. |
| H2 | **Per-card membership fetching.** Each card ran its own effect to answer "is this in my cart", then scanned the returned arrays. Caching cut the network cost but not the effects or the scans. | Hundreds of redundant effects while scrolling a long grid. |
| H3 | **Desktop Size Chart button did nothing.** `setShowSizeChart(true)` was wired to a button, but the `<SizeChart>` modal was never rendered on desktop. Mobile rendered it correctly. | Dead UI control on desktop product pages. |

### High — backend performance

| # | Issue | Impact |
|---|---|---|
| P1 | **No indexes on the hottest query.** Product listing filters on `category`, `subCategory`, `brand`, `price`, `sizes` and sorts by `createdAt`/`price`/`rating`/`discount`. Only `salesCount` and `isTrending` were indexed. | Every homepage request was a full collection scan plus an in-memory sort. The homepage issues five of them. |
| P2 | **No projection, no `lean()`, no limit cap.** The listing returned every field including `description`, hydrated into full Mongoose documents, with a client-controlled limit. | Oversized payloads and avoidable CPU on an instance with little of it. |
| P3 | **Default Mongo connection settings.** No pool sizing, and the 30s default `serverSelectionTimeoutMS`. | On a cold start a request could hang 30s before failing. |
| P4 | **Unescaped `$regex` on user search input.** Four-field `$or` built straight from the query string. | ReDoS vector and incorrect matching on inputs containing regex metacharacters. |

### Medium

| # | Issue |
|---|---|
| M1 | Notification polling every 15-20s with no visibility check; a backgrounded tab polled forever. |
| M2 | Dead code: `HeroSlideshow.jsx` (336 lines, superseded), `authRoutes.js` + `authController.js` (611 lines, never mounted), `NotificationToastContainer.jsx`, and `src/index.js` which imported a stylesheet that does not exist. |
| M3 | Six unused dependencies: `resend`, `nodemailer`, `multer-storage-cloudinary`, `express-mongo-sanitize`, `crypto` (a Node builtin shadowed by a deprecated package), `workbox-window`. |
| M4 | ESLint configuration wrong for the codebase: `sw.js` flagged `clients` as undefined because service-worker globals were not declared; context files flagged for exporting hooks alongside providers. 78 problems, mostly noise hiding the two real ones. |
| M5 | `config/razorpay.js` calls `process.exit(1)` at import time when keys are missing — the whole API dies silently. Pre-existing; documented, not changed, because fixing it alters deployment behaviour. |

---

## 3. Fixes applied

### Money safety

**C1 — commission maturation.** New `services/commissionMaturity.js`:

- `sweepMaturedCommissions` releases everything past `maturesAt`, run 30s after
  boot and every 15 minutes thereafter, with `unref()` so it never blocks
  shutdown.
- `settleMaturedForReseller` runs on wallet read, so the balance is correct
  immediately even on a host that idles between requests.
- `settleCommissionForOrder` now only approves on delivery and releases
  immediately if the window has already elapsed.

Both paths are idempotent, so a commission touched by both is released once.

**C2 — ledger-first ordering.** The `Transaction` insert is now the concurrency
claim. The unique `idempotencyKey` index means exactly one caller can insert;
the loser returns without touching the wallet.

```js
const txn = await claimLedgerEntry({ ..., idempotencyKey });
if (!txn) return null;                    // someone else already did this
await Wallet.findOneAndUpdate(...);       // only the winner moves money
```

**C3, C4 — guards moved into the query filter.** No balance is derived from a
value read earlier:

```js
await Wallet.findOneAndUpdate(
  { _id, pendingBalance: { $gte: value } },   // the database decides
  { $inc: { pendingBalance: -value, availableBalance: value } },
);
```

If the guard fails, the already-written Transaction is marked `failed` rather
than deleted, preserving the audit trail.

**C5 — transitions claimed before side effects.** All four withdrawal
transitions now use a conditional `findOneAndUpdate` on the current status, then
move money only if they won.

**C6 — compensating unlock.** A failed `Withdrawal.create` releases the lock
before rethrowing.

### Rendering

**H1 — split contexts.** `CartContext` and `WishlistContext` each expose two
contexts: a value context carrying the count, and an actions context holding
only stable callbacks. Cards consume the actions; the navbar badge consumes the
value.

**H2 — `CatalogStateContext`.** Cart and wishlist membership is fetched once per
page and exposed as `Set`s. A card's check is now an O(1) read with no effect of
its own, and mutations propagate to every card showing that product.

**H3 —** the desktop `<SizeChart>` modal is now rendered, matching mobile.

### Backend performance

**P1 —** ten indexes added to `Product`, shaped around the actual queries,
including a weighted text index. Four added to `Order`, two to `Review`.

**P2 —** the listing endpoint now uses field projection, `.lean()`, and a
100-item hard cap.

**P3 —** connection pooling, 8s server selection instead of 30s, keepalive, and
`bufferCommands: false` so queries fail fast instead of queueing invisibly.
Paired with a readiness gate that returns `503 WARMING_UP` with `Retry-After`
while connecting, and an axios interceptor that retries those transparently.

**P4 —** search input is escaped before use in `$regex`.

### Cold-start experience

The request cache now supports stale-while-revalidate and `localStorage`
persistence. Catalogue reads render from the previous payload instantly while
the slow first request completes behind them, and a failed request falls back to
stale data rather than an error. This is the single largest perceived-speed
change on a free-tier host.

### Cleanup

- 4 dead files removed (≈1,000 lines).
- 6 unused dependencies removed.
- ESLint config corrected — service-worker globals declared, context files
  scoped — then all remaining problems fixed rather than suppressed:
  **78 → 0**. 31 empty `catch (err)` bindings became `catch`.
- Emoji removed from server logs.

---

## 4. Verification

Every claim below is reproducible with `npm test` in each package.

### Money-safety tests (16)

`backend/tests/wallet.concurrency.test.js` runs operations with `Promise.all`
so a non-atomic implementation actually fails:

| Scenario | Assertion |
|---|---|
| 10 concurrent identical credits | exactly one applied |
| 3 concurrent releases | released once, `lifetimeEarnings` not inflated |
| 2 concurrent withdrawals for the full balance | one succeeds, one 400s |
| repeated unlock ×3 | balance unchanged, `lockedBalance` not negative |
| repeated settlement | `totalWithdrawn` counted once |
| over-release / over-reversal | refused; no balance negative |
| full lifecycle | earn → mature → withdraw → settle |

**Mutation testing** confirms the tests have teeth. Reverting each fix and
re-running:

```
old non-atomic lockForWithdrawal   → 1 failure  (double-spend test)
old credit-before-ledger ordering  → 10 failures
correct implementation             → 16 pass
```

### Render isolation

Real React render counting in jsdom, 9 seconds of banner autorotation:

```
banner              One → Three   (rotated twice)
page renders        1 → 1         delta 0
section renders     1 → 1         delta 0
card renders        12 → 12       delta 0
carousel DOM node   preserved
scrollLeft          320 → 320     preserved
runtime errors      0
```

Context split, 3 cart updates against 10 action-only consumers:

```
badge renders        1 → 4    (+3, correct — it displays the count)
action-only renders  10 → 10  (+0, previously would have been +30)
```

### Application

12 routes rendered in jsdom with a dead API: **0 runtime errors** on
`/`, `/products`, `/cart`, `/checkout`, `/login`, `/account`, `/reseller`,
`/reseller/apply`, `/s/:slug`, `/store/:code`, `/contact`, `/categories`.

Footer correctly `hidden md:block` on all public routes (Phase 6).

### Readiness gate

```
health during cold start : 200  database: connecting
API during cold start    : 503  WARMING_UP  Retry-After: 3
```

`/health` stays reachable, so an external keep-alive pinger still works.

---

## 5. Before vs after

| Metric | Before | After |
|---|---|---|
| ESLint problems | 78 | **0** |
| Automated tests | 19 | **48** |
| Money-safety tests | 0 | **16** (mutation-verified) |
| Dead source lines | ~1,000 | **0** |
| Unused dependencies | 6 | **0** |
| Product query indexes | 2 | **12** |
| Renders per banner rotation | page + 12 cards | **banner only** |
| Renders per cart update | every card | **badge only** |
| Commission → withdrawable | **never** | sweeper + on-read |
| Concurrent withdrawal double-spend | **possible** | prevented |
| Cold-start first paint | blank until API responds | **stale content immediately** |
| Background-tab polling | every 15-20s forever | **paused** |
| Initial JS (gzip) | 219.3 kB (pre-session) | **126.4 kB** |
| Initial total (brotli) | — | **131.1 kB** |

Bundle size is essentially unchanged from the previous session's 154.3 kB gzip
total — this session's work was correctness and runtime behaviour, not payload.
The removed dead code was already tree-shaken out of the entry chunk.

---

## 6. Lighthouse

**Not measured.** There is no Chrome binary in this environment and no deployed
URL to audit. Rather than publish invented numbers, the repository includes
`npm run lighthouse`, which serves `dist/` with SPA fallback, runs Lighthouse
headless, and prints all four categories plus FCP, LCP, TBT, CLS, SI and TTI.

Expected direction per metric, with the reasoning:

| Metric | Change |
|---|---|
| FCP / LCP | SWR renders real content before the API responds, which on a cold start is the difference between instant and 30+ seconds |
| TBT | fewer re-renders per interaction; membership lookups are O(1) instead of per-card effects |
| CLS | unchanged; skeletons already matched final dimensions |
| INP | `touch-action: manipulation` removes the 300ms tap delay on mobile |

**The dominant factor remains your host.** A cold Render free-tier instance
takes 30-50s to wake. The SWR layer hides that for returning visitors; it cannot
help a first-time visitor with an empty cache. An external keep-alive ping
against `/api/health` every 10 minutes would address the root cause.

---

## 7. Files

**Created (7)**

```
backend/services/commissionMaturity.js       maturity sweeper
backend/tests/wallet.concurrency.test.js     16 money-safety tests
backend/tests/helpers/fakeMongo.js           atomic-update test double
FrontEnd/src/context/CatalogStateContext.jsx set-based membership
FrontEnd/src/hooks/usePolling.js             visibility-aware polling
FrontEnd/src/utils/sizeChart.js              extracted helper
FrontEnd/tests/requestCache.test.mjs         13 cache tests
docs/RESELLER_SYSTEM.md                      reseller reference
AUDIT_REPORT.md                              this document
```

**Deleted (4)**

```
FrontEnd/src/components/HeroSlideshow.jsx            336 lines, superseded
FrontEnd/src/components/NotificationToastContainer.jsx  31 lines, unreferenced
FrontEnd/src/index.js                                broken CRA leftover
backend/routes/authRoutes.js                         never mounted
backend/controllers/authController.js                588 lines, unreachable
```

**Modified (significant)**

```
backend/services/walletService.js     rewritten: ledger-first, guarded updates
backend/services/resellerService.js   approve-on-delivery split from release
backend/routes/reseller.js            atomic cancel, compensating unlock, on-read settle
backend/routes/adminReseller.js       all four transitions claimed atomically
backend/routes/products.js            projection, lean, cap, escaped search
backend/models/Product.js             10 indexes + weighted text index
backend/models/Review.js              2 indexes
backend/config/db.js                  pooling, timeouts, fail-fast
backend/server.js                     readiness gate, sweeper lifecycle
FrontEnd/src/context/CartContext.jsx      split value/actions
FrontEnd/src/context/WishlistContext.jsx  split value/actions
FrontEnd/src/components/ProductCard.jsx   set-based membership, no effect
FrontEnd/src/utils/requestCache.js        SWR + persistence + offline fallback
FrontEnd/src/utils/api.js                 warm-up retry, SWR on catalogue reads
FrontEnd/src/App.jsx                      CatalogStateProvider, desktop-only footer
FrontEnd/src/index.css                    mobile scroll/touch, reduced motion
FrontEnd/eslint.config.js                 correct globals and scoping
+ 24 files: unused catch bindings removed
```

---

## 8. Testing checklist

Automated, already green:

- [x] `cd backend && npm test` — 35 pass
- [x] `cd FrontEnd && npm test` — 13 pass
- [x] `npm run lint` — 0 problems
- [x] `npm run build` — succeeds, 63 chunks
- [x] 12 routes render with 0 runtime errors
- [x] Banner isolation: 0 sibling re-renders, scroll preserved
- [x] Context split: 0 re-renders of action-only consumers
- [x] Readiness gate: 503 + Retry-After, `/health` reachable
- [x] Mutation testing: fixes verified against reverted implementations

Manual, needs a database:

- [ ] Homepage, listing, filters, search, product details
- [ ] Cart: add, update quantity, remove, coupon
- [ ] Checkout: COD and Razorpay, address validation, pincode lookup
- [ ] Login with a wrong password: no browser warning, lockout after 5
- [ ] Desktop Size Chart button now opens the modal
- [ ] Footer visible on desktop, absent on mobile
- [ ] Admin: products, orders, users, coupons, banners, trending
- [ ] Reseller: apply → admin approve → catalog → set margin → share
- [ ] Order through a shared link carries `resellerCode`
- [ ] Commission appears as pending, then available after the window
- [ ] Withdrawal: request → approve → mark paid; and reject returns the funds
- [ ] Cancel a reseller order: commission reversed

Before deploying:

- [ ] `cd backend && npm install` — dependencies changed
- [ ] Indexes build on first boot; on a large `products` collection create them
      with `background: true` during a quiet period
- [ ] Consider a keep-alive ping on `/api/health` every 10 minutes

---

## 9. Deliberately not changed

**`config/razorpay.js` exits the process at import.** If `RAZORPAY_KEY_ID` or
`RAZORPAY_KEY_SECRET` is missing, the entire API dies with no error message.
Fixing it changes deployment behaviour — a misconfigured deploy would start and
serve traffic with payments broken instead of failing loudly. That is a product
decision. My recommendation is to log a warning and disable only the payment
route, but I have left it as-is.

**Mongo transactions.** `walletService` no longer exposes `withTransaction`. It
was dead code, and the current design is correct without it: each step is
individually atomic and idempotent. Once your deployment is a replica set,
wrapping credit-plus-release in a real transaction would be a genuine
improvement rather than a no-op.

**Recharts / Chart.js.** The reseller analytics charts remain hand-written SVG.
A charting library would add 90-160 kB gzipped for two charts on one
authenticated route.
