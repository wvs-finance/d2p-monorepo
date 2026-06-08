# Phase 2 — Cross-Phase Forward Hand-Off Notes

> **Status:** hand-off record. These are **NOT Phase-2 work items** — they
> propagate findings RESOLVED in Phase 2 (TOPIC-01 / IMPL-01) to later phase
> plans so a downstream planner inherits them without re-deriving. Each note
> carries a one-line provenance pointer to its source.
> **Plan:** 02-02 (IMPL-01). **Created:** 2026-05-29.

---

## Note 1 — `responses` table is STATE-ONLY → EVENT-01 / Phase-3 INDEX-01

**Provenance:** `02-RESEARCH.md §Open Questions 1` + `§Common Pitfalls 5`;
`schemas/event_schema_v1.md §responses child table` (the OPEN QUESTION this note
closes); `references/interfaces/IAgentRequester.sol` (event + `getRequest`
surface).

**Finding (closes the EVENT-01 `responses` open question).** The
`IAgentRequester` interface has **NO `ResponseReceived` event**. Its five events
are `RequestCreated`, `RequestFinalized`, `SubcommitteePaid`,
`CommitteeDepositFailed`, `NativeTransferFailed` — and `SubcommitteePaid` /
`NativeTransferFailed` are **never emitted on-chain** (absent in all 60 sampled
windows). Per-member `Response[]` data
(`{validator, result, status, receipt, timestamp, executionCost}`) lives **ONLY**
in the `Request.responses` struct-array state, readable via
`getRequest(uint256) → Request memory` (**selector `0xc58343ef`**), keyed off the
`requestId`s carried by `RequestFinalized`.

**Hand-off to Phase 3 (INDEX-01).** The EVENT-01 `responses` child table
(PK `(chain_id, tx_hash, log_index, member_index)`) is **state-fill-only** — a
batched `eth_call getRequest(requestId)` per finalized request — **NOT
event-fillable**. Phase 3 must NOT assume an event-fill path for it. If M1
BYTECODE-01 Tier-C only needs the aggregate `Σ_i executionCost`, that aggregate
is readable from the **same** `getRequest` call, so the per-member child table may
be **deferred** rather than populated. Decision is Phase 3's; the constraint
(no response event → state-fill or defer) is fixed here.

---

## Note 2 — `CommitteeDepositFailed` is a STRUCTURAL INVARIANT → BYTECODE-01 / Phase-4

**Provenance:** `02-RESEARCH.md §Common Pitfalls 6` + `§Open Questions 3`;
`references/interfaces/IAgentRequester.sol` (`CommitteeDepositFailed` NatSpec —
budget restored on revert).

**Finding.** `CommitteeDepositFailed(uint256 indexed requestId, uint256
attemptedAmount)` fires on **EVERY finalization** — 1:1 with `RequestCreated` and
`RequestFinalized` across the in-sample census. The interface NatSpec states the
budget is **restored** on this revert. It is therefore a **NORMAL lifecycle
event**, a structural invariant of this deployment — NOT an error to filter.

**Hand-off to BYTECODE-01 (Phase 4).** The resolver records it as
`decode_status='resolved'`, never quarantined. Strong prior for BYTECODE-01: the
rebate / budget-restoration residual likely flows through this
**budget-restoration branch**, NOT through `NativeTransferFailed` (which is never
emitted). **Do NOT act on this in Phase 2** — it is recorded only as a downstream
prior so the Phase-4 rebate-residual model starts from the right branch.

---

## Note 3 — Payment protocol ($75/mo Ormi Production, no auto-spend) → Phase-3 INDEX-01

**Provenance:** `02-CONTEXT.md §decisions` (cross-phase payment protocol — fires
at Phase 3); `.planning/phases/01-…/01-03-SUMMARY.md` "User Setup Required" +
`research/DATA_SOURCING.md` (the DATA-SOURCE-01 Ormi free-tier pick this refines).

**Finding.** The Ormi free-tier pick (DATA-SOURCE-01) needs **no spend** for
Phase 2 — Phase 2 touches NO paid infra. This note exists ONLY so the protocol
lands in the Phase-3 plan, per the user's explicit instruction.

**Hand-off to Phase 3 (INDEX-01) — the payment protocol.** IF during Phase 3 the
free **300k-entity** cap looks likely to be exceeded → **notify the user
mid-process with entity-count evidence**; the user makes the **$75/mo Ormi
Production** payment and **CONFIRMS before provisioning**. **NO auto-spend** under
any circumstances. **Disable Ormi free-tier auto-upgrade at signup regardless**
(Pitfall 5) so a silent overage cannot trigger an unconfirmed charge. Phase 2
itself provisions nothing paid.
