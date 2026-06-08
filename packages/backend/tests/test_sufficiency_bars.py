"""DATA-SOURCE-01 — four-bar sufficiency logic + leg-(b) tolerance-basis tests.

Encodes the ROADMAP SC#7(ii) rule: free-tier SUFFICIENT iff ALL FOUR bars pass;
any single free-tier bar failing flips the verdict to the paid branch. Also pins
the leg-(b) tolerance band (raw Wilson 95% CI on n=116) and asserts that the
cross-epoch widening is a DEFERRED sibling note, NOT folded into the interval.

Consumes the N2-contract conftest fixtures ``research_dir`` + ``load_yaml`` as
TEST PARAMETERS.
"""

from __future__ import annotations

BAR_KEYS = (
    "bar_1_tx_coverage_and_structural_ratio",
    "bar_2_timestamp_granularity",
    "bar_3_log_index_ordering",
    "bar_4_no_indexer_zero_rpc_positive",
)


def free_tier_sufficient(bars: dict) -> bool:
    """Pure verdict function: free tier is sufficient iff ALL FOUR bars pass.

    ``bars`` maps each of the four bar keys to a mapping carrying a boolean
    ``pass``. Any single ``pass: False`` ⇒ free tier insufficient ⇒ paid branch.
    """
    return all(bool(bars[k]["pass"]) for k in BAR_KEYS)


def test_four_bars_have_passfail(research_dir, load_yaml):
    """bar_1..bar_4 each carry a boolean ``pass``."""
    d = load_yaml(research_dir / "data_sourcing_matrix.yaml")
    bars = d["sufficiency_bars"]
    for k in BAR_KEYS:
        assert k in bars, f"missing {k}"
        assert isinstance(bars[k]["pass"], bool), f"{k}.pass is not boolean"


def test_free_sufficient_iff_all_pass(research_dir, load_yaml):
    """All-pass ⇒ True; flipping ANY single bar to fail ⇒ False (paid branch)."""
    d = load_yaml(research_dir / "data_sourcing_matrix.yaml")
    bars = {k: dict(d["sufficiency_bars"][k]) for k in BAR_KEYS}

    # committed state: all four pass -> free tier sufficient
    assert all(bars[k]["pass"] for k in BAR_KEYS), "fixture precondition: all bars pass"
    assert free_tier_sufficient(bars) is True

    # flipping ANY single bar to fail flips the verdict to the paid branch
    for k in BAR_KEYS:
        flipped = {kk: dict(vv) for kk, vv in bars.items()}
        flipped[k]["pass"] = False
        assert free_tier_sufficient(flipped) is False, (
            f"flipping {k} to fail must flip the verdict to paid"
        )


def test_leg_b_tolerance_basis(research_dir, load_yaml):
    """bar_1 tolerance band: Wilson-CI basis, raw [0.628, 0.790], deferred widening."""
    d = load_yaml(research_dir / "data_sourcing_matrix.yaml")
    tb = d["sufficiency_bars"]["bar_1_tx_coverage_and_structural_ratio"]["tolerance_band"]

    assert tb["basis"] == "wilson_95ci_n116"
    # the RAW round-half-up Wilson CI (NOT 0.627 / 0.791; NOT widened)
    assert tb["interval"] == [0.628, 0.790], tb["interval"]
    # cross-epoch widening is a DEFERRED sibling note, NOT applied to the interval
    assert tb["cross_epoch_widening"] == "deferred_to_phase_3"
