# Pre-Assessment — Reconstructing the Realized Caller Cost (SOMI leg)

**Status:** assessment / pre-decision input (feeds the SOMI-leg re-scope, which gates through the planning-review pipeline).
**Date:** 2026-05-31. **Decision driver:** "do what it takes to reconstruct the cost — caller economics is what we care about."

## 0. Target quantity (caller economics)
Per request *i*, per agent class *c* ∈ {json-fetch 0.03, llm-inference 0.07, llm-parse-website 0.10}:

```
realized_caller_cost_i = gross_deposit_i (msg.value, on the RequestCreated tx)
                         − Σ(native SOMI rebated back to the requester)
                         (+ gas paid by the requester, tracked separately)
```

`gross_deposit` is on-chain-observable (request-tx `value`; `perAgentBudget` from `RequestCreated` data; practical deposits 0.12/0.24/0.33 = `minPerAgentDeposit·subSize + price·subSize`). **The rebate is the unknown** — and it is NOT in event data (only `NativeTransferFailed` logs on failure).

## 1. KEY EMPIRICAL FINDING (2026-05-31, live) — the event-only view was wrong
`debug_traceTransaction` (callTracer) on a real `llm-parse-website` finalize tx `0x89d7…df784` (block 321,190,016) shows the realized native flows the events hide:

| Internal call | value | result |
|---|---|---|
| `committee.deposit{value:…}` → `0x4df3…` (validator-bonuses) | **0.30 SOMI** (=3×0.10) | **EXECUTION_REVERTED** → this IS `CommitteeDepositFailed`, attemptedAmount 0.30 ✓ |
| payment → `0xcefbce45…` (consensus/committee module, delegatecalls lib `0xb2fc3991…`) | **0.327176778 SOMI** | **SUCCESS** |
| **rebate → requester `0x9f1fc6…`** | **0.001715184 SOMI** | SUCCESS |

**Interpretation:** `CommitteeDepositFailed` is a *handled exception*, not non-payment. After the primary `committee.deposit` path reverts, the budget is **still distributed** via an internal call to `0xcefbce45` (≈0.327), and only ≈0.0017 is rebated. So **the caller pays ≈ the full posted price** (realized cost ≈ deposit − 0.0017 ≈ 0.328 SOMI for this parse request), settled on-chain — just never via `SubcommitteePaid`. The naive "event-only" read (CommitteeDepositFailed + 0 SubcommitteePaid ⇒ unpaid/refunded) is **falsified**; realized economics live in the internal transfers, recoverable only by tracing. *(One-tx evidence — the pattern must be validated across a sample; see §5.)*

## 2. Ranked methods to reconstruct the realized cost

| # | Method | Decode? | Free-RPC support | Verdict |
|---|---|---|---|---|
| **1** | **Trace-based** — `debug_traceTransaction`/callTracer per finalize tx; classify internal SOMI transfers (committee-pay vs rebate-to-requester) | **No** | ✅ **PROVEN** (debug namespace live; `trace_*` OE namespace absent but not needed) | **PRIMARY.** Exact realized flows, $0, no decompilation. This is the ground truth. |
| **2** | **Archive balance-diff** — `eth_getBalance` at B−1 vs B on requester (and `0xcefbce45`) | No | ✅ (archive getBalance live) | **Cross-check** for #1; recovers net native flow independently. Confounded if the requester does other things in-block — use as reconciliation, not primary. |
| **3** | **Docs-semantics model** — bound cost from the documented deposit/rebate lifecycle + events (`perAgentBudget`, `attemptedAmount`) | No | n/a | **Cheap bound + scenario input** (§4). Not a measurement. |
| **4** | **Bytecode decompilation** (BYTECODE-01 Tier-B) — recover the closed-form rebate/distribution equation from impl `0x9af5…` (~18.5 KB) | Yes | n/a | **NOT on the critical path** — trace (#1) already yields the realized residual. Use only for the closed form / robustness cross-check, and never as load-bearing (PITFALLS D2). |

**Headline:** we do **not** need to decode to get the realized cost. #1 + #2 deliver it from the free RPC.

## 3. Best open-source decoding tools (the explicit ask — ranked, for the #4 / closed-form path only)

Source recovery first: impl `0x9af5…` is **not verified** (scout Tier-A unavailable; explorer rate-limited on re-check). Check **Sourcify** before any decompile. Then, in preference order:

1. **heimdall-rs** (Jon-Becker) — flagship OSS EVM decompiler/toolkit: `decompile`, `disassemble`, `cfg`, `dump`, `decode`. Rust, scriptable for batch. **Caveat:** nested-mapping/struct misindexing → plausible-but-wrong output (PITFALLS D2) — must cross-validate.
2. **Dedaub Decompiler** (app.dedaub.com) — best-in-class *output quality*; free web tool (core = the `gigahorse-toolchain`, OSS/academic). Use as the high-quality cross-read against heimdall.
3. **gigahorse-toolchain** — OSS framework behind Dedaub; powerful, steeper setup; for serious static analysis.
4. **whatsabi** (shazow) — recovers selectors/ABI/events/proxy structure from bytecode without full decompile — ideal to confirm getter/event layout cheaply.
5. **evmole** — fast function-selector + arg-type extraction (Rust/Py/JS).
6. **Foundry `cast run --trace` / `cast call --trace` + REVM** — "decode by execution": replay txs locally for full call/state traces. This is the *local* analogue of the remote `debug_traceTransaction` we already have — best path for value-flow recovery and far more reliable than static decompilation.
7. **Sourcify / 4byte / openchain** — verification + selector/error/event resolution (already used: `0x4ec726c7`→`RequestNotFound`).

**Decode recommendation:** if/when we want the closed-form equation, run **Dedaub + heimdall-rs in parallel**, reconcile, and validate against the empirical trace residual to **BYTECODE-01 Tier-B's ±2% holdout-of-≥500** bar. Trace stays the ground truth; decompilation is the explanation, not the measurement.

## 4. Scenario / counterfactual track (the "we also do the scenario")
Two cost regimes worth separating, both feeding the forward cost model / convex-demand thesis:
- **Realized (now, degraded):** committee.deposit reverts on ~95%; cost settled via `0xcefbce45` fallback; caller pays ≈ full price − tiny rebate. Measured by #1.
- **Intended (documented):** validators paid via `committee.deposit(perMember×subSize)`, `perMember = median(executionCost)` capped at `perAgentBudget`; unused reserve rebated. Modeled by #3 from docs.
The gap between them = the on-chain settlement degradation, and the counterfactual cost if the validator-payment leg activates. M2/M3 should carry both.

## 5. Recommended ordered plan + honest caveats
1. **Validate the §1 pattern across a sample** (trace N≈200 finalize txs spanning classes + the ~5% non-CommitteeDepositFailed path): confirm recipient roles (`0xcefbce45` = committee/treasury? a burn? — classify), confirm rebate magnitude, confirm the deposit↔finalize linkage.
2. **Resolve the deposit-location puzzle:** the sampled finalize tx had `value=0` (deposit paid on the RequestCreated tx or from contract balance). The reconstruction must **link the create-tx `msg.value` to the finalize-tx distribution by `requestId`** — both are observable; the join is the engineering.
3. **Build the per-request panel:** `(requestId, class via perAgentBudget, gross_deposit, Σ committee_pay, rebate, realized_cost, gas)` from a full event sweep + a `debug_traceTransaction` pass over the ~71.7k finalize txs (free; throughput already proven ~minutes-to-hours).
4. **Decompile only if** the closed form is wanted for the scenario/robustness — tools per §3.

**Caveats:** §1 is one-tx evidence; recipient-role classification (`0xcefbce45`, `0x4df3…`, the burn split) is unconfirmed; `debug_traceTransaction` over 71.7k txs is heavier than a plain getLogs sweep (per-call trace latency TBD — needs a sustained-rate probe, like the getLogs sweep did). None of this needs paid infra or decompilation as currently scoped.

## 6. SAMPLE VALIDATION (2026-05-31, n=41 recent finalize txs + early-history probe)
**Headline CONFIRMED:** the caller pays ≈ the full deposit; not refunded.
- **1 request per finalize tx** (mean 1.00, all 41) — clean attribution; no batching.
- **Recipient sink:** `0xcefbce45` (+ its delegatecall lib `0xb2fc3991`) receives the payment in 32/41 txs = the committee/payment module; `0x5213c5b6` is a secondary recipient (18/41). Rebate-to-requester is small (~0.007–0.013 SOMI mean).
- **De-cascade trap (recipe fix, now load-bearing):** callTracer reports a `value` on **DELEGATECALL** frames, but delegatecalls **do not transfer value** — counting them double-counts the committee module's internal cascade (inflated the first per-tx sums to ~2×). **Correct accounting: sum only `type == CALL`/`CREATE` frames with `value>0 && error==null`.** With that fix, the manual single-tx decode is the truth: parse request → **0.327 paid to `0xcefbce45`, 0.0017 rebated** → realized ≈ deposit(0.33) − 0.0017 ≈ **0.328**; llm → ~0.21–0.23 paid, realized ≈ 0.23.
- **Per-request realized cost ≈ subSize × price** (the reward pot), i.e. ~0.23 (llm) / ~0.33 (parse), **not** the per-member price 0.07/0.10.
- **0/41 recent finalals lack `CommitteeDepositFailed`**; the early-history scan (first 40k blocks post-deploy) found **no finalals** (contract idle at first). So the ~5% non-CDF path (3,422 per Dune) is neither recent nor earliest — **uncharacterized; resolve in the full pass via a Dune anti-join** (RequestFinalized minus CommitteeDepositFailed by requestId).

**Open items for the full 71.7k pass:** (a) CALL-only de-cascade accounting (above); (b) characterize the ~5% non-CDF path (Dune anti-join → trace that subset); (c) deposit is deterministic per class (0.12/0.24/0.33) but **check for over-deposits** by reading the actual `RequestCreated` tx `value` rather than assuming the minimum; (d) sustained-rate trace probe to confirm 71.7k-tx wall-clock. All free, no decompilation.
