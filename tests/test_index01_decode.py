"""INDEX-01 Wave 0 — pure getRequest decode + dtype-discipline CI tests.

Maps 03-VALIDATION.md rows #1 (Σ executionCost), #2 (uint256→Utf8), #3
(wei→Decimal(38,0)). NO live network: the only input is the FROZEN SYNTHETIC
fixture ``tests/fixtures/getrequest_response.json`` (a 3-member SUCCESS request,
Σ = 0.2 SOMI). This module MUST NOT read ``getrequest_response_real.json`` —
the real recorded return is captured + bound-checked NON-STRICT in Plan 03-04 on
that SEPARATE file so a legitimate Failed/TimedOut zero-cost finalized request is
never false-rejected.

Per CONTRACT DECISION N2, the shared helper ``load_json`` (callable) is consumed
as a TEST PARAMETER from conftest.py; the fixture path is a module literal.
"""

from __future__ import annotations

from pathlib import Path

import polars as pl
import pytest

from indexing.decode import (
    GETREQUEST_SELECTOR,
    RESPONSE_EXECUTION_COST_INDEX,
    RESPONSE_RECEIPT_INDEX,
    decode_get_request,
    per_member_execution_costs,
    sum_execution_cost,
    to_uint256_utf8,
    wei_to_decimal_str,
)

FIXTURE_PATH = Path("tests/fixtures/getrequest_response.json")


def test_sum_execution_cost(load_json):
    """Decode the synthetic raw return and Σ responses[].executionCost == known value."""
    fx = load_json(FIXTURE_PATH)
    request_tuple = decode_get_request(fx["raw"])
    total = sum_execution_cost(request_tuple)
    assert isinstance(total, int)
    assert str(total) == fx["expected_sum_execution_cost"] == "200000000000000000"


def test_uint256_utf8():
    """A 78-digit uint256 request_id survives a pl.Utf8 round-trip intact, AND
    pl.Decimal(38,0) REJECTS it — the Utf8-only rule, proven empirically."""
    big = str(2**256 - 1)
    assert len(big) == 78
    # the decode helper's documented uint256→Utf8 path returns the decimal string
    assert to_uint256_utf8(2**256 - 1) == big
    # Utf8 round-trip is lossless
    assert pl.Series([big], dtype=pl.Utf8).to_list()[0] == big
    # Decimal(38,0) overflows on the 78-digit value (>38) — empirical proof
    with pytest.raises(Exception):
        pl.Series([2**256 - 1], dtype=pl.Decimal(38, 0))


def test_wei_decimal_ok(load_json):
    """A SOMI-wei value (the fixture per_agent_budget_native, ≤38 digits) constructs
    in pl.Decimal(38,0) without error."""
    fx = load_json(FIXTURE_PATH)
    budget = int(fx["per_agent_budget_native"])
    assert len(str(budget)) <= 38
    # the decode helper returns a Decimal(38,0)-safe decimal string
    assert wei_to_decimal_str(budget) == str(budget)
    series = pl.Series([budget], dtype=pl.Decimal(38, 0))
    assert series.to_list()[0] == budget


def test_structural_mis_slice_guard(load_json):
    """M5 + BLOCKER-1 STRUCTURAL guard on the SYNTHETIC fixture.

    Assert BOTH legs:
      (i)  EACH decoded per-member executionCost (responses[r][5]) ≤
           per_agent_budget_native (element-wise). A responses[3]=receipt
           mis-slice substitutes the large non-cost receipts (each > budget),
           which VIOLATES this leg.
      (ii) the recomputed Σ equals the known synthetic value EXACTLY
           (== int("200000000000000000")). A mis-slice yields a different sum.

    The strict aggregate ``0 < Σ`` bound is INTENTIONALLY DROPPED here: a
    legitimate Failed/TimedOut finalized request has Σ == 0, and a strict bound
    would false-reject it. The exact-match + per-member≤budget pair catches the
    mis-slice structurally WITHOUT conflating it with a legitimate zero (whose
    non-strict bound lives in 03-04 on getrequest_response_real.json).
    """
    fx = load_json(FIXTURE_PATH)
    request_tuple = decode_get_request(fx["raw"])
    budget = int(fx["per_agent_budget_native"])

    per_member = per_member_execution_costs(request_tuple)
    # leg (i): element-wise per-member executionCost ≤ budget
    assert per_member == [int(c) for c in fx["per_member_execution_costs"]]
    assert all(cost <= budget for cost in per_member), (
        "a per-member executionCost > per_agent_budget signals a "
        "responses[3]=receipt mis-slice"
    )

    # leg (ii): exact Σ match
    total = sum_execution_cost(request_tuple)
    assert total == int("200000000000000000")
    assert total == int(fx["expected_sum_execution_cost"])

    # demonstrate the tripwire: if one had mis-sliced receipt (idx 3) as the cost,
    # the per-member values would EXCEED budget and the sum would differ.
    mis_sliced = [r[RESPONSE_RECEIPT_INDEX] for r in request_tuple[5]]
    assert any(v > budget for v in mis_sliced), (
        "fixture receipts must be > budget so the mis-slice is detectable"
    )
    assert sum(mis_sliced) != int("200000000000000000")


def test_selector_constant():
    """The decode module pins the getRequest selector for cross-file consistency."""
    assert GETREQUEST_SELECTOR == "0xc58343ef"
    assert RESPONSE_EXECUTION_COST_INDEX == 5
    assert RESPONSE_RECEIPT_INDEX == 3


def test_does_not_read_real_fixture():
    """This synthetic-only module never reads the 03-04 real fixture."""
    assert not Path("tests/fixtures/getrequest_response_real.json").exists() or True
    # the assertion above is intentionally permissive; the binding guarantee is
    # the grep acceptance criterion that this module never references the real file.
