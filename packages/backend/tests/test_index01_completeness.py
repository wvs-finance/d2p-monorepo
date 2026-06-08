"""INDEX-01 completeness-logic CI tests (Plan 03-02, Task 1).

Phase 3, Wave 0. Pure-logic tests for the 3-leg completeness gate — network-free,
asserted against synthetic fixtures + recorded constants (03-VALIDATION CI-vs-LIVE
boundary). These exercise the EXACT functions the LIVE probes in Plan 03-04 call.

CRITICAL (gate-review #3 MAJOR-1, ROADMAP SC#6(b)): leg-b is ADVISORY + DIRECTIONAL
— ``structural_ratio_status`` NEVER returns "halt". It records the rc-vs-rf count
balance + the descriptive count-ratio as INDEX-01 OUTPUTS and flags
"advisory_review" for HUMAN REVIEW only in the missing-RequestCreated direction
(rc < rf − TOL·max(rf,1)); the rc > rf in-flight finalization-lag tail is EXPECTED
and never flagged. The Wilson proportion band is RETIRED.

Resolved topic0 roles (topic0_map_v1.json; SC#6(b) correction 2026-05-29):
RequestCreated = 0xb623…, RequestFinalized = 0x65db…, CommitteeDepositFailed = 0x5c09….
"""

from __future__ import annotations

import pytest

from indexing.completeness import (
    PROXY,
    REQUEST_CREATED_TOPIC0,
    REQUEST_FINALIZED_TOPIC0,
    STRUCTURAL_TOLERANCE,
    TX_ANCHOR_FLOOR,
    count_balance,
    cursor_contiguity,
    descriptive_count_ratio,
    is_proxy_row,
    structural_ratio_status,
    tx_anchor_ok,
)

# Resolved deploy block of the proxy (probes/somnia_rpc.DEPLOYMENT_BLOCK).
DEPLOY_BLOCK = 283417317


# --------------------------------------------------------------------------- #
# leg-b — ADVISORY + DIRECTIONAL structural floor (NEVER halts)
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize(
    "rc, rf",
    [
        (83, 83),       # balanced
        (200, 50),      # rc >> rf (in-flight tail, exaggerated)
        (10, 200),      # rc << rf (missing-RequestCreated direction)
        (0, 0),         # empty stratum
        (0, 100),       # extreme missing
        (1000, 1),      # extreme over
    ],
)
def test_structural_floor_never_halts(rc, rf):
    """structural_ratio_status NEVER returns 'halt' for ANY (rc, rf) — SC#6(b)."""
    verdict = structural_ratio_status(rc, rf, indexer_distinct_tx=116)
    assert verdict in {"ok", "advisory_review"}
    assert verdict != "halt"


def test_balanced_no_advisory():
    """A balanced pair (and a within-TOL pair) → 'ok' (no advisory)."""
    assert structural_ratio_status(83, 83, indexer_distinct_tx=116) == "ok"
    # rc=83, rf=90: rc−rf = −7; TOL·max(rf,1) = 0.15·90 = 13.5; −7 > −13.5 → not
    # materially below → "ok".
    assert structural_ratio_status(83, 90, indexer_distinct_tx=116) == "ok"


def test_directional_advisory_fires_on_missing_request_created():
    """rc materially BELOW rf → 'advisory_review' (missing-RequestCreated dir)."""
    # rc=40, rf=83: rf − TOL·max(rf,1) = 83 − 12.45 = 70.55; 40 < 70.55 → flag.
    verdict = structural_ratio_status(40, 83, indexer_distinct_tx=116)
    assert verdict == "advisory_review"
    assert verdict != "halt"


def test_in_flight_tail_not_flagged():
    """The NORMAL in-flight finalization-lag tail rc > rf → 'ok', never flagged."""
    # rc=83, rf=60: rc > rf (finalization lags creation). Symmetric abs() would
    # WRONGLY flag this — assert it does not, and is never "halt".
    verdict = structural_ratio_status(83, 60, indexer_distinct_tx=116)
    assert verdict == "ok"
    assert verdict != "halt"


def test_count_ratio_over_1_does_not_flag():
    """A descriptive count ratio > 1.0 does NOT flag (0xb623 fires 1–5×/tx)."""
    # rc=200 vs indexer_distinct_tx=116 → ratio ≈ 1.72 (>1.0). With a healthy
    # rc-vs-rf balance (rf=190 here), the verdict is "ok" regardless of the ratio.
    ratio = descriptive_count_ratio(200, 116)
    assert ratio > 1.0
    assert structural_ratio_status(200, 190, indexer_distinct_tx=116) == "ok"


def test_descriptive_ratio_is_emitted_not_gated():
    """The descriptive ratio is COMPUTED for logging but NEVER drives the verdict."""
    # Same rc-vs-rf balance, wildly different distinct-tx denominators → identical
    # verdict (the ratio is not the discriminator).
    v1 = structural_ratio_status(40, 83, indexer_distinct_tx=1)
    v2 = structural_ratio_status(40, 83, indexer_distinct_tx=10_000)
    assert v1 == v2 == "advisory_review"


def test_descriptive_ratio_zero_division_guard():
    """descriptive_count_ratio(rc, 0) does NOT raise (denominator max(·,1))."""
    assert descriptive_count_ratio(5, 0) == 5.0
    assert descriptive_count_ratio(0, 0) == 0.0


def test_uses_own_tx_count_for_descriptive():
    """The descriptive denominator is the indexer's OWN distinct-tx, not 234999."""
    # descriptive_count_ratio is computed against the passed distinct-tx count, NOT
    # the external anchor — passing 116 (own) yields rc/116, never rc/234999.
    assert descriptive_count_ratio(116, 116) == pytest.approx(1.0)
    assert descriptive_count_ratio(58, 116) == pytest.approx(0.5)


def test_count_balance_is_signed_output():
    """count_balance is the SIGNED (rc−rf)/max(rf,1) INDEX-01 output, guarded."""
    assert count_balance(83, 83) == pytest.approx(0.0)
    assert count_balance(90, 83) > 0.0   # in-flight tail → positive
    assert count_balance(40, 83) < 0.0   # missing-RequestCreated → negative
    assert count_balance(5, 0) == 5.0    # divide-by-zero guard


# --------------------------------------------------------------------------- #
# leg-a — tx-anchor monotonicity floor
# --------------------------------------------------------------------------- #


def test_tx_anchor_floor():
    """Fresh transactions_count < 234999 FAILS; ≥ 234999 PASSES."""
    assert tx_anchor_ok(234998) is False
    assert tx_anchor_ok(234999) is True
    assert tx_anchor_ok(300000) is True
    assert TX_ANCHOR_FLOOR == 234999


# --------------------------------------------------------------------------- #
# leg-c — cursor-contiguity over the host's PROCESSED ranges
# --------------------------------------------------------------------------- #


def test_cursor_contiguity_detects_skipped_range():
    """A skipped PROCESSED range is reported; a contiguous one yields no gap."""
    # Processed ranges with block 283417319 skipped (NOT a missing event-block).
    skipped = cursor_contiguity(
        [(283417317, 283417318), (283417320, 283417321)],
        deploy=283417317,
        head=283417321,
    )
    assert skipped == [(283417319, 283417319)]
    # A single fully-contiguous processed range → no gap.
    none_missing = cursor_contiguity(
        [(283417317, 283417321)], deploy=283417317, head=283417321
    )
    assert none_missing == []


def test_cursor_contiguity_head_gap():
    """An uncovered head tail is reported as a gap."""
    missing = cursor_contiguity(
        [(283417317, 283417319)], deploy=283417317, head=283417321
    )
    assert missing == [(283417320, 283417321)]


# --------------------------------------------------------------------------- #
# B3 — proxy-address invariant
# --------------------------------------------------------------------------- #


def test_proxy_address_invariant():
    """A row at the proxy (any case) passes; a foreign address is rejected."""
    assert is_proxy_row("0x5E5205CF39E766118C01636bED000A54D93163E6") is True
    assert is_proxy_row(PROXY) is True
    assert is_proxy_row("0x5e5205cf39e766118c01636bed000a54d93163e6") is True
    assert is_proxy_row("0x0000000000000000000000000000000000000000") is False


# --------------------------------------------------------------------------- #
# resolved topic0 roles present
# --------------------------------------------------------------------------- #


def test_resolved_topic0_roles():
    """RequestCreated = 0xb623…, RequestFinalized = 0x65db… (SC#6(b))."""
    assert REQUEST_CREATED_TOPIC0 == (
        "0xb62339927ed9948fd837358a55f5b9a824f7b047043faece66965593ed726889"
    )
    assert REQUEST_FINALIZED_TOPIC0 == (
        "0x65db1ef5b3bcd84fe4fb8dbbe1cadc9fe6643bb261ab2e01d65c281c3d466af2"
    )
    assert 0.0 < STRUCTURAL_TOLERANCE < 1.0
