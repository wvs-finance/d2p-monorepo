# SomniaAgentConsumer — algebraic invariants (Phase-1 SPECIFY, Part B)

Behavioral unit: `_sendRequest` + `handleResponse` (request→callback lifecycle).
Verified by fuzz (`forge`) and, where tractable, formal proof (`kontrol` is present).

- **INV-1 — Callback authentication (access-control).** No address other than `PLATFORM`
  can clear `pendingRequests[id]` or cause `_onResult` to execute. `handleResponse` from any
  `msg.sender != PLATFORM` reverts and changes no state.

- **INV-2 — No-replay / idempotence.** Each `requestId` is fulfilled at most once.
  After a successful `handleResponse(id, …)`, a second delivery of the same `id` reverts
  ("unknown request"). Enforced by clearing pending *before* dispatch (checks-effects-interactions).

- **INV-3 — Pending-flag lifecycle (monotonicity / no resurrection).** For any `id`,
  `pendingRequests[id]` follows `false → true` (on `_sendRequest`) `→ false` (on the single
  `handleResponse`) and never returns to `true`. There is no code path that re-sets a cleared id.

- **INV-4 — Value pass-through conservation (over-fund, no refund).** A `_sendRequest` call forwards
  the **whole** `msg.value` to the platform (`forwarded == msg.value`) and the consumer retains
  nothing from the send. The caller must send `>= getRequestDeposit()` (the floor); per `CLAUDE.md`
  the caller over-funds to `minPerAgentDeposit*subSize + p_i*subSize` so the surplus funds
  `perAgentBudget`. The only inbound value the consumer keeps is a later platform **rebate** via
  `receive()` (unused budget). There is no refund path **on send** — but inbound value is
  always recoverable: the base exposes an owner-only `sweep(to)` egress (INV-5), so rebates
  are never trapped.

- **INV-5 — Egress exists / no trapped value.** Every wei that lands in the consumer
  (`receive()` rebates, over-fund surplus) is recoverable by `owner` via `sweep(to)`, which
  transfers the full balance and leaves the contract at zero. No non-owner can move funds.
  (Resolves the one-way-trap defect: `receive()` inflow must have a matching outflow.)

## Notes / boundary conditions (from review)
- `getRequestDeposit()` is an operations-reserve **floor**, not the true execution cost
  (repo `CLAUDE.md` non-negotiable). Forwarding **only** the floor leaves `perAgentBudget = 0`,
  so runners skip and the platform returns `TimedOut` (live finding, 2026-06-01). The consumer
  therefore forwards the full over-funded `msg.value`; a `Failed`/`TimedOut` outcome is still
  INV-covered by the handleResponse failure branch, not an error in `_sendRequest`.
- No refund subtree: the over-fund surplus is intentionally forwarded (it IS the agent budget),
  removing the prior `call`/`transfer` reentrancy footgun from the reusable paradigm entirely.
- The real callback **signature/arg-order** (`handleResponse(uint256,Response[],ResponseStatus,Request)`)
  is NOT proven by these unit tests (the mock replays the consumer's own selector). It is verified
  ONLY by the live-testnet observe step — that step is a hard gate, not optional.
