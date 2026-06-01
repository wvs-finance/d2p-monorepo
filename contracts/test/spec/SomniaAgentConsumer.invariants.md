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

- **INV-4 — Value pass-through conservation.** A `_sendRequest` call leaves the consumer's own
  balance unchanged: it forwards exactly `getRequestDeposit()` to the platform and refunds the
  remainder to the caller (`forwarded + refunded == msg.value`). The contract retains nothing from
  a send. The only inbound value is later platform rebates via `receive()`.

## Notes / boundary conditions (from review)
- `getRequestDeposit()` is an operations-reserve **floor**, not the true execution cost
  (repo `CLAUDE.md` non-negotiable). Forwarding the floor means the platform may return
  `Failed`/`TimedOut`; that is INV-covered by the handleResponse failure branch, not an error here.
- Refund uses `call{value:}("")` + success check under a reentrancy guard — never `transfer`
  (the reusable paradigm must not carry the 2300-gas footgun into `AgentRouter`/escrow).
- The real callback **signature/arg-order** (`handleResponse(uint256,Response[],ResponseStatus,Request)`)
  is NOT proven by these unit tests (the mock replays the consumer's own selector). It is verified
  ONLY by the live-testnet observe step — that step is a hard gate, not optional.
