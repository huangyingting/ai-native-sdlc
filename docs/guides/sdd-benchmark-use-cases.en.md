# Spec-Driven Development (SDD) Benchmark Use Cases

[中文](sdd-benchmark-use-cases.md)

This guide provides portable, stack-agnostic benchmark use cases for evaluating
**Spec-Driven Development (SDD)** frameworks and workflows (such as GitHub Spec
Kit, Kiro, BMAD, OpenSpec, or custom specification-first pipelines).

For the broader early-stage delivery research and how this repository's own
human-gated specification flow works, see the
[early-stage research](../research/ai-native-sdlc-early-stage-research.en.md)
and the [illustrated AI-native SDLC guide](ai-native-sdlc/README.en.md).

## 1. What makes a good SDD benchmark use case

A trivial CRUD prompt fails to differentiate SDD frameworks because an LLM can
one-shot the code without a specification. Conversely, a sprawling enterprise
system takes too long to run across multiple tools. An effective SDD benchmark
must combine four properties:

| Property | Why it matters for SDD evaluation |
|---|---|
| **Intuitive domain** | Anyone can understand the domain in 30 seconds without specialized background knowledge |
| **Stack-agnostic & zero-dependency** | Can be implemented as a pure library, CLI, or small REST API in any language |
| **Deliberate specification ambiguities** | Forces the framework's **Specify / Clarify** phase to surface open questions instead of silently guessing business policy |
| **Non-trivial engineering invariant** | Forces the **Plan / Task / Implement** phases to design data models and edge-case tests rather than writing naive happy-path code |

---

## 2. Use Case 1: Order Discount & Partial Refund Calculator (Financial & Combinatorial Rules)

This use case tests how an SDD framework handles **business-rule combinatorics,
stateful partial operations, and exact monetary arithmetic**.

### 2.1 Seed prompt (copy-paste input)

Provide this exact initial prompt to the SDD framework under test:

```text
Build an Order Checkout and Refund service. Users can create an order with multiple line items (quantity and unit price) and apply promo codes. Support three promo types: percentage off the order, fixed amount off the order (with a minimum spend threshold), and buy-X-get-Y-free on a specific item. After checkout, users can request a refund for one or more items (partial or full return) across multiple separate return requests, and the system must calculate the exact refund amount for each request.
```

### 2.2 Clarification traps (Specify / Clarify phase)

A weak SDD workflow will immediately invent rules and generate code. A strong
SDD workflow will pause or flag these **four underspecified product decisions**
before finalizing the specification:

1. **Promo code stacking and application order**
   - Can multiple promo codes be applied to a single order?
   - If stacking is allowed, in what order are they evaluated?
   - *Why it matters:* On a `$100.00` order, applying `$20.00 off` before `10% off` yields `$72.00`, whereas applying `10% off` before `$20.00 off` yields `$70.00`.
2. **Minimum spend threshold breach on partial return (Proration vs. Clawback)**
   - Suppose a customer buys `$100.00` of items using a `"$25.00 off orders >= $100.00"` coupon (paying `$75.00`), and later returns a `$30.00` item so the kept items total `$70.00` (below the `$100.00` threshold).
   - Does the customer receive a **prorated refund** (`$22.50`), or does breaching the minimum threshold **revoke the coupon** so the customer is refunded only `$30.00 - $25.00 = $5.00`?
3. **Partial return of "Buy-X-Get-Y-Free" items**
   - When a customer buys 2 items and gets 1 free (3 units total for the price of 2) and returns 1 unit, does that return yield `$0.00` (returning the free unit first), the full unit price, or a prorated $\frac{2}{3}$ unit price?
4. **Discount floor and scope boundaries**
   - Can fixed discounts reduce an order or line item below `$0.00`? Are taxes and shipping out of scope?

### 2.3 Preset operator answers (for standardized testing)

When the SDD tool asks for clarification, use this standardized answer set so
results are comparable across frameworks:

- **Stacking order:** Multiple promos are allowed. Apply item-level promos (`buy-X-get-Y-free`) first, then fixed-amount order discounts, then percentage order discounts.
- **Threshold policy on partial return:** Use **pro-rata allocation** (no retroactive clawback), because clawback can produce `$0.00` or negative refunds on small partial returns.
- **Buy-X-Get-Y-Free return policy:** Prorate the bundle discount evenly across all $(X + Y)$ units in each qualifying bundle.
- **Floor:** Order and unit payable amounts are clamped at a minimum of `$0.00`. Taxes and shipping are out of scope.

### 2.4 Hard implementation point (Plan & Code phase)

Even after all product rules are clarified, this use case contains a classic
engineering trap: **The Penny-Splitting / Cumulative Remainder Bug**.

#### Why naive implementations fail

Suppose a customer buys **3 identical items at `$10.00` each** (`$30.00` subtotal)
and applies a **`$10.00 off`** order coupon, paying **`$20.00`** total.

The customer then submits **three separate partial return requests**, returning
1 unit each time:

- The exact prorated value per unit is $\$20.00 \div 3 = \$6.6666\dots$
- If each refund request independently rounds to the nearest cent (`$6.67`), three returns refund `$6.67 × 3 = $20.01` (**over-refunding by 1 cent**).
- If each refund truncates (`$6.66`), returning the entire order across three requests refunds `$6.66 × 3 = $19.98` (**shortchanging the customer by 2 cents**).

#### What the SDD technical plan must specify

1. **Integer minor units:** Represent all monetary values in integer cents (e.g., `2000` cents), never IEEE 754 floating-point numbers.
2. **Unit-level discount allocation at checkout (Largest Remainder Method) or remainder reconciliation:**
   - Allocate order-level discounts down to individual purchasable units at checkout (`667`, `667`, and `666` cents), **or**
   - Track `refunded_cents` and `remaining_refundable_cents` per line item/order so the final returned unit always reconciles to the exact remaining paid balance.

### 2.5 Golden acceptance test cases

Use these three test cases to verify the final implementation:

| Case ID | Checkout setup | Return sequence | Expected refunds | Invariant verified |
|---|---|---|---|---|
| **ORD-1** | 3 × `$10.00` (`$30.00`), promo `$10.00 off` (paid `$20.00`) | 3 separate requests returning 1 unit each | Request 1: `$6.67`, Request 2: `$6.67`, Request 3: `$6.66` (or `$6.66, $6.67, $6.67`; sum must be exactly `$20.00`) | Cumulative partial refunds never exceed or fall short of total paid |
| **ORD-2** | Item A `$60.00` + Item B `$40.00`, promo `$20.00 off >= $80.00` + promo `10% off` (paid `$72.00`) | Return Item A (`$60.00`), then attempt to return Item A again | Request 1: `$43.20`; Request 2: rejected (already returned) | Stacking precedence (`$100 -> $80 -> $72`) + idempotency / over-return guard |
| **ORD-3** | 3 × `$15.00` with `Buy-2-Get-1-Free` (paid `$30.00`) | Return 1 unit, then return remaining 2 units | Request 1: `$10.00`; Request 2: `$20.00` | Item-bundle proration across partial returns |

### 2.6 Phase 2: Spec Evolution & Change Request (`v1 -> v2`)

Many SDD tools handle greenfield (`v1`) generation well but struggle when a new
requirement modifies existing invariants. After `v1` passes, feed this `v2`
change prompt to test **spec evolution, impact analysis, and backward
compatibility**:

```text
Extend the Order Checkout and Refund service to support split payment at checkout (Gift Card balance + Credit Card) and a return reason (`defective` vs. `changed_mind`) on refund requests. `changed_mind` returns incur a 10% restocking fee, whereas `defective` returns receive a full prorated refund.
```

- **New clarification traps (`v2`):**
  1. **Refund tender waterfall:** When an order paid `$30.00` via Gift Card and `$50.00` via Credit Card is partially refunded, which payment method is refunded first (Credit Card first, Gift Card first, or proportional to the payment split)?
  2. **Restocking fee calculation base:** Is the `10%` restocking fee calculated on the item's *original unit price* or on its *post-discount prorated paid amount*?
- **New hard implementation point (`v2`):**
  - **Conservation of money across fees and tenders:** Across multiple partial returns (mixing `defective` and `changed_mind`), `sum(credit_card_refunds) + sum(gift_card_refunds) + sum(retained_restocking_fees)` must never exceed `total_paid_cents`, while preserving all `v1` penny-splitting invariants (`ORD-1` through `ORD-3`).

---

## 3. Use Case 2: Smart Meeting Room Booking Service (Time-Series & State Invariants)

If you prefer to evaluate **temporal reasoning, interval overlap math, and state
modification invariants** instead of financial calculations, use this second
benchmark.

### 3.1 Seed prompt (copy-paste input)

```text
Build a Meeting Room Booking service. Users can book a room for a time range and attendee headcount, modify or cancel bookings, query available rooms for a time window, and create a weekly recurring booking for up to N weeks. Every room requires a 15-minute cleanup buffer between meetings.
```

### 3.2 Clarification traps (Specify / Clarify phase)

A strong SDD framework should identify and ask about these **four ambiguities**:

1. **Recurring booking conflict policy (Atomic vs. Skip vs. Fallback Room)**
   - If week 3 of an 8-week recurring booking conflicts with an existing meeting, does the entire 8-week request fail (**all-or-nothing**), book the other 7 weeks and report week 3 as skipped (**best-effort**), or automatically assign another room of sufficient capacity for week 3?
2. **Cleanup buffer boundary rules**
   - Does the 15-minute cleanup buffer apply before the first meeting of the day or after the last meeting against building operating hours (e.g., if a room closes at `18:00`, can a meeting end at `18:00`, or must it end at `17:45`)?
   - Is a 15-minute buffer required between two consecutive bookings in the same room by the **same organizer**?
3. **Recurring cancellation and modification scope**
   - Can a user cancel or reschedule a single occurrence (`this occurrence`), `this and following`, or only the entire recurring series?
4. **Room selection strategy**
   - Does the caller specify a `roomId`, or does the system auto-assign the smallest available room that satisfies `headcount` (best-fit capacity)?

### 3.3 Hard implementation points (Plan & Code phase)

1. **Self-Overlap Exclusion on Booking Modification**
   - When a user shifts an existing booking from `10:00–11:00` to `10:30–11:30`, a naive availability check queries whether `10:30–11:30` (plus the 15-minute buffer) overlaps any active booking in that room—and falsely rejects the update because it collides with the booking's **own** prior `10:00–11:00` slot.
2. **Wall-Clock Recurrence Across Daylight Saving Time (DST)**
   - A weekly recurring meeting scheduled at `09:00–10:00 America/New_York` for 6 weeks across a DST transition must stay at `09:00` local wall-clock time. Naive UTC timestamp arithmetic (`start_utc + 7 * 86400_000`) shifts the meeting to `08:00` or `10:00` local time after the DST boundary.

### 3.4 Golden acceptance test cases

| Case ID | Scenario | Expected outcome | Invariant verified |
|---|---|---|---|
| **RM-1** | Booking A is `10:00–11:00`. User requests Booking B in the same room for `11:10–12:00` | Rejected; earliest allowed start is `11:15` | 15-minute turnaround buffer enforcement |
| **RM-2** | Booking A is `10:00–11:00` (with Booking C at `12:00–13:00`). User resizes Booking A in-place to `10:15–11:45` | Succeeds (`11:45 + 0:15 buffer == 12:00`, and Booking A does not conflict with itself) | Self-exclusion during in-place update + exact buffer boundary (`end + buffer == next.start` is allowed) |
| **RM-3** | 4-week recurring booking where Week 3 has an existing conflict | Follows the clarified atomic/skip policy and returns explicit conflict details for Week 3 | Recurrence conflict handling matches specification |

### 3.5 Phase 2: Spec Evolution & Change Request (`v1 -> v2`)

After `v1` passes, test how the SDD framework evolves the specification and
existing data model with this `v2` change prompt:

```text
Update the Meeting Room Booking service so that meetings with more than 10 attendees require a 30-minute cleanup buffer instead of 15 minutes, and allow users to reschedule or change the headcount of a single occurrence within a recurring series without cancelling the rest of the series.
```

- **New clarification traps (`v2`):**
  1. **Asymmetric buffer direction:** Cleanup happens *after* a meeting ends. If Meeting A has 6 attendees (`15m` buffer) and the following Meeting B has 12 attendees (`30m` buffer), is the required gap between A and B `15` minutes (A's cleanup) or `max(15, 30) = 30` minutes?
  2. **Headcount increase conflict:** If an organizer increases an existing booking's headcount from `8` to `12` attendees—expanding its required post-meeting buffer from `15` to `30` minutes—and that extra `15` minutes overlaps the next meeting, is the headcount update rejected or moved to another room?
  3. **Series cancellation after single-occurrence override:** If Week 2 of a recurring series was rescheduled as an exception and the user later cancels the entire series, does that also cancel the rescheduled Week 2 occurrence?
- **New hard implementation point (`v2`):**
  - **Linked recurrence exceptions:** Representing single-occurrence overrides (`seriesId` + `occurrenceIndex`) so that series-level mutations and availability queries neither orphan modified occurrences nor resurrect cancelled ones.

---

## 4. SDD Framework Evaluation Scorecard

Use this rubric to score and compare different SDD tools on the same use case:

| Phase | Dimension | Score 0 (Weak) | Score 1 (Partial) | Score 2 (Strong) |
|---|---|---|---|---|
| **1. Specify & Clarify** | **Ambiguity Detection** | Silently guesses rules and jumps to code or a finished spec | Flags surface questions (e.g., input formats) but misses core policy traps | Explicitly surfaces the core policy traps (e.g., stacking order, partial-return threshold breach, recurring conflict mode) before locking the spec |
| **2. Specification** | **Concrete Acceptance Criteria** | Vague prose ("refunds should be calculated accurately") | Defines rules in prose but lacks numeric boundary scenarios | Includes Given/When/Then scenarios with exact numeric or temporal edge cases |
| **3. Plan** | **Invariant & Edge-Case Design** | Generic architecture boilerplate (folder layout only) | Mentions rounding or overlap checks without a concrete algorithm | Explicitly designs the invariant solution (e.g., integer cents + Largest Remainder / remainder reconciliation, or self-exclusion on update) |
| **4. Tasks & Code** | **Traceability & Verification** | Tests only cover happy paths; golden edge cases fail | Golden edge cases pass after manual prompting | Generated task breakdown and automated test suite directly cover and pass all golden edge cases on the first pass |
| **5. Spec Evolution (`v1 -> v2`)** | **Change Impact & Regression Safety** | Overwrites `v1` spec/code from scratch or breaks `v1` golden tests | Appends `v2` features but misses cross-feature interactions with `v1` invariants | Updates the spec deltas cleanly, surfaces `v1 × v2` interaction questions, and passes both `v1` and `v2` golden tests |
