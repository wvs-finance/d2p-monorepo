"""INDEX-01 three-leg completeness logic — PURE (no network).

Resolved topic0 roles cite **ROADMAP SC#6(b) correction 2026-05-29 /
schemas/topic0_map_v1.json** (impl ``0x9af5…3edd``):

  - ``RequestCreated``         = ``0xb623…``  (the 3-topic / 1120-byte shape; fires 1–5×/tx)
  - ``RequestFinalized``       = ``0x65db…``
  - ``CommitteeDepositFailed`` = ``0x5c09…``

The scout addendum's "request pair (0x65db+0x5c09)" labelling was the **INVERTED**
label for the *FINALIZATION* pair (RequestFinalized + CommitteeDepositFailed). Leg-b's
numerator is the resolved ``RequestCreated`` (0xb623) COUNT, NOT the finalization-pair
tx-appearance rate.

CRITICAL (gate-review #3 MAJOR-1, faithful to ROADMAP SC#6(b)) — **leg-b is
ADVISORY + DIRECTIONAL and NEVER auto-halts**. SC#6(b): leg-b is non-blocking;
legs (a) + (c) carry the binding completeness assurance, not (b). ``structural_ratio_status``
records the rc-vs-rf COUNT BALANCE + the descriptive count-ratio as INDEX-01 OUTPUTS
and surfaces a SINGLE advisory flag for HUMAN REVIEW only when RequestCreated is
materially BELOW RequestFinalized (``rc < rf − TOL·max(rf,1)`` — the missing-
RequestCreated direction). Finalization LAGS creation, so the NORMAL in-flight tail
is ``rc ≥ rf``; that direction (``rc > rf``) is EXPECTED, logged, and NEVER flagged.
A symmetric ``abs()`` test would FALSE-flag the normal in-flight tail — REJECTED.
The advisory routes to the EXISTING human checkpoint (the free-vs-paid / paid-archive-
swap decision in 03-04) — a human review, NO auto-halt, NO auto-spend.

The addendum's 1:1:1 LIFETIME balance (count(RequestCreated) ≈ count(RequestFinalized))
is DISCLAIMED by the addendum as **IN-SAMPLE-ONLY** (83/83/83; "the exact RequestCreated
lifetime count is an INDEX-01 output") — NOT a lifetime invariant.

Why NOT a Wilson proportion band: 0xb623 fires 1–5×/tx, so ``RequestCreated COUNT ÷
distinct-tx`` is a COUNT ratio, NOT a Bernoulli proportion bounded [0,1]; it can
exceed 1.0. The Wilson band ``[0.628, 0.790]`` / point ``0.716`` is dimensionally
mis-applied to a count ratio → **RETIRED as a gate** (kept only as the documented
``DESCRIPTIVE_RATIO_REFERENCE`` "NOT a gate — see structural-floor advisory" figure).

MINOR-5 note: leg-b's operands (RequestCreated ↔ RequestFinalized 1:1) are UNAFFECTED
by ``CommitteeDepositFailed``'s retryable >1×/requestId multiplicity — leg-b does NOT
use CommitteeDepositFailed counts (that multiplicity is absorbed by the requestId-keyed
non-lossy fold in the subgraph, Plan 03-03).
"""

from __future__ import annotations

# --------------------------------------------------------------------------- #
# Recorded constants (copied — no derivation)
# --------------------------------------------------------------------------- #

# DIRECTIONAL advisory threshold ONLY — used in the rc < rf − TOL·max(rf,1)
# direction. A deploy-probe advisory threshold, NOT a gate; tune against observed
# finalization lag.
STRUCTURAL_TOLERANCE = 0.15

# Documented descriptive reference figure — NOT a gate (the Wilson band / point
# 0.716 is RETIRED; see the module docstring). Kept only so completeness_proof.md
# can cite it with an explicit "NOT a gate — see structural-floor advisory" note.
DESCRIPTIVE_RATIO_REFERENCE = 0.716

# leg-a — Blockscout transactions_count monotonicity floor (≥). The EXTERNAL anchor
# — NEVER fed to the leg-b descriptive ratio (anti-circularity).
TX_ANCHOR_FLOOR = 234999

# B3 — canonical IAgentRequester proxy (lowercased for a case-insensitive compare).
PROXY = "0x5e5205cf39e766118c01636bed000a54d93163e6"

# leg-b advisory-floor operands (resolved topic0 roles; SC#6(b) / topic0_map_v1.json).
REQUEST_CREATED_TOPIC0 = (
    "0xb62339927ed9948fd837358a55f5b9a824f7b047043faece66965593ed726889"
)
REQUEST_FINALIZED_TOPIC0 = (
    "0x65db1ef5b3bcd84fe4fb8dbbe1cadc9fe6643bb261ab2e01d65c281c3d466af2"
)


# --------------------------------------------------------------------------- #
# leg-b — ADVISORY + DIRECTIONAL structural floor (NEVER halts)
# --------------------------------------------------------------------------- #


def structural_ratio_status(
    request_created_count: int,
    request_finalized_count: int,
    indexer_distinct_tx: int,
) -> str:
    """ADVISORY + DIRECTIONAL leg-b. NEVER returns a halt verdict.

    ROADMAP SC#6(b): leg-b is non-blocking; legs (a) + (c) bind. Flags
    ``"advisory_review"`` for HUMAN REVIEW only when RequestCreated is materially
    BELOW RequestFinalized (``rc < rf − TOL·max(rf,1)``) — the missing-RequestCreated
    direction; finalization-lag CANNOT explain ``rc < rf``. ``rc > rf`` is the NORMAL
    in-flight finalization-lag tail (finalization lags creation), EXPECTED and never
    flagged — a symmetric ``abs()`` would false-flag it.

    NOT a proportion CI: 0xb623 fires 1–5×/tx so ``rc / indexer_distinct_tx`` is a
    COUNT ratio (can exceed 1.0). Wilson ``[0.628, 0.790]`` / 0.716 RETIRED.
    ``STRUCTURAL_TOLERANCE`` = 0.15 is a deploy-probe advisory threshold, NOT a gate.
    The exact RequestCreated lifetime count is an INDEX-01 output (addendum 83/83/83
    disclaimed in-sample-only).

    ``indexer_distinct_tx`` is the indexer's OWN distinct-tx count — used ONLY for the
    DESCRIPTIVE log ratio (``descriptive_count_ratio``), NEVER as the verdict
    discriminator. The external ``TX_ANCHOR_FLOOR`` (234999) must NEVER be passed here
    (circularity).
    """
    rc = request_created_count
    rf = request_finalized_count
    # DIRECTIONAL: materially-missing RequestCreated vs RequestFinalized only.
    if rc < rf - STRUCTURAL_TOLERANCE * max(rf, 1):
        return "advisory_review"
    return "ok"


def descriptive_count_ratio(
    request_created_count: int, indexer_distinct_tx: int
) -> float:
    """Descriptive INDEX-01 OUTPUT for completeness_proof.md — NOT a pass/halt gate.

    Returns ``request_created_count / max(indexer_distinct_tx, 1)`` (MINOR-1 divide-by-
    zero guard so an empty stratum does not raise). May exceed 1.0 (0xb623 fires
    1–5×/tx). The denominator is the indexer's OWN distinct-tx count, NEVER the
    external 234999.
    """
    return request_created_count / max(indexer_distinct_tx, 1)


def count_balance(
    request_created_count: int, request_finalized_count: int
) -> float:
    """SIGNED rc-vs-rf balance ``(rc − rf) / max(rf, 1)`` — an INDEX-01 OUTPUT.

    Descriptive only (divide-by-zero guarded); the advisory decision is made by
    ``structural_ratio_status``. Positive = in-flight tail (rc > rf, expected);
    negative = missing-RequestCreated direction.
    """
    rc = request_created_count
    rf = request_finalized_count
    return (rc - rf) / max(rf, 1)


# --------------------------------------------------------------------------- #
# leg-a — tx-anchor monotonicity floor
# --------------------------------------------------------------------------- #


def tx_anchor_ok(fresh_tx_count: int) -> bool:
    """leg-a: fresh Blockscout transactions_count ≥ TX_ANCHOR_FLOOR (234999)."""
    return fresh_tx_count >= TX_ANCHOR_FLOOR


# --------------------------------------------------------------------------- #
# leg-c — cursor-contiguity over the host's PROCESSED ranges
# --------------------------------------------------------------------------- #


def cursor_contiguity(
    processed_ranges: list[tuple[int, int]], deploy: int, head: int
) -> list[tuple[int, int]]:
    """Return the missing PROCESSED spans inside ``[deploy, head]``.

    Takes the host's PROCESSED-block ranges (from ``_meta``, inclusive ``(lo, hi)``
    spans) and returns the spans inside ``[deploy, head]`` not covered by any
    processed range (empty list = the host cursor advanced contiguously over the
    whole range).

    This proves the HOST CURSOR advanced over every block (host belief), NOT that an
    event was emitted in every block. Over a sparse log population (~0.0005
    RequestCreated/block) most blocks carry no proxy log, so event-block interval-fill
    would FLOOD false gaps — that is why this checks PROCESSED ranges, not
    ``event_block_numbers``. Completeness-bearing ONLY conjoined with leg (a).
    """
    # Normalize, clip to [deploy, head], sort, and sweep for uncovered spans.
    spans = sorted(
        (max(lo, deploy), min(hi, head))
        for lo, hi in processed_ranges
        if min(hi, head) >= max(lo, deploy)
    )
    missing: list[tuple[int, int]] = []
    cursor = deploy
    for lo, hi in spans:
        if lo > cursor:
            missing.append((cursor, lo - 1))
        cursor = max(cursor, hi + 1)
    if cursor <= head:
        missing.append((cursor, head))
    return missing


# --------------------------------------------------------------------------- #
# B3 — proxy-address invariant (PITFALLS B3)
# --------------------------------------------------------------------------- #


def is_proxy_row(log_address: str) -> bool:
    """B3 invariant: every indexed row's ``log_address`` must equal PROXY (lc compare)."""
    return log_address.lower() == PROXY
