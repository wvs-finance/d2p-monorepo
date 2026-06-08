"""DATA-SOURCE-01 — fixed-schema conformance + provenance + verdict tests.

Validates ``research/data_sourcing_matrix.yaml`` against its fixed row schema,
asserts full provenance (every row carries source_url + utc_fetch_ts), checks
that the mandatory capability rows are present, and pins the provisional verdict.

Consumes the N2-contract conftest fixtures ``research_dir`` (-> Path) and
``load_yaml`` (-> callable) as TEST PARAMETERS, per the locked harness contract.
"""

from __future__ import annotations

FIXED_SCHEMA_KEYS = {
    "source",
    "capability",
    "value",
    "threshold",
    "pass",
    "source_url",
    "utc_fetch_ts",
}


def test_fixed_schema(research_dir, load_yaml):
    """Every capability_rows entry has EXACTLY the 7 fixed-schema keys."""
    d = load_yaml(research_dir / "data_sourcing_matrix.yaml")
    rows = d["capability_rows"]
    assert rows, "no capability_rows"
    for r in rows:
        assert set(r.keys()) == FIXED_SCHEMA_KEYS, (
            f"row {r.get('capability')!r} keys {sorted(r.keys())} "
            f"!= fixed schema {sorted(FIXED_SCHEMA_KEYS)}"
        )
    # the declared fixed_row_schema must match the enforced key set
    assert set(d["fixed_row_schema"]) == FIXED_SCHEMA_KEYS


def test_provenance_complete(research_dir, load_yaml):
    """Every row's source_url and utc_fetch_ts are present and non-empty."""
    d = load_yaml(research_dir / "data_sourcing_matrix.yaml")
    for r in d["capability_rows"]:
        assert str(r["source_url"]).strip(), f"empty source_url: {r['capability']}"
        assert str(r["utc_fetch_ts"]).strip(), f"empty utc_fetch_ts: {r['capability']}"


def test_mandatory_rows_present(research_dir, load_yaml):
    """The mandatory capability rows for DATA-SOURCE-01 all exist."""
    d = load_yaml(research_dir / "data_sourcing_matrix.yaml")
    rows = d["capability_rows"]
    caps = [str(r["capability"]) for r in rows]
    values = [str(r["value"]) for r in rows]
    sources = [str(r["source"]) for r in rows]

    # chain / RPC capabilities
    assert any("getLogs" in c for c in caps), "missing eth_getLogs cap row"
    assert any("getBlockReceipts" in c for c in caps), "missing eth_getBlockReceipts row"
    assert any("deployment_block" in c for c in caps), "missing deployment_block row"
    assert any("283417317" in v for v in values), "deployment block 283417317 not recorded"

    # exact independent tx anchor
    assert any("transactions_count" in c for c in caps), "missing tx-count anchor row"
    assert any("234999" in v for v in values), "234999 tx anchor not recorded"

    # scout-addendum structural-ratio provenance
    assert any(s == "scout-addendum" for s in sources), "missing scout-addendum row"

    # Ormi free-tier rows (cost, entity cap, deploy permission, deep-history, throttle)
    ormi_caps = [str(r["capability"]) for r in rows if str(r["source"]) == "ormi-free"]
    assert any("cost" in c for c in ormi_caps), "missing Ormi cost row"
    assert any("entity cap" in c for c in ormi_caps), "missing Ormi entity-cap row"
    assert any("deployment permission" in c for c in ormi_caps), "missing Ormi deploy-permission row"
    assert any("retention" in c or "DEEP-HISTORY" in c for c in ormi_caps), "missing Ormi deep-history row"
    assert any("throttle" in c or "THROUGHPUT" in c for c in ormi_caps), "missing Ormi backfill-throttle row"


def test_verdict(research_dir, load_yaml):
    """The provisional verdict and the paid-options-under-ceiling invariant hold."""
    d = load_yaml(research_dir / "data_sourcing_matrix.yaml")
    v = d["verdict"]
    assert v["selected_source"] == "ormi-free-developer"
    assert v["selected_cost_usd_per_mo"] == 0
    assert v["provisional"] is True
    assert v["confirmed_in"] == "phase-3"
    assert v["budget_ceiling_usd_per_mo"] == 390
    assert v["paid_fallback_subgraph_compatible"]["cost_usd_per_mo"] == 75
    assert v["paid_fallback_nonsubgraph"]["cost_usd_per_mo"] == 39
    # free pick commits no spend -> no sign-off required
    assert v["sign_off_required"] is False

    # all priced paid options <= 390 EXCEPT the explicitly-flagged GetBlock Pro $399
    ceiling = v["budget_ceiling_usd_per_mo"]
    for opt in v["paid_options_priced"]:
        cost = opt["cost_usd_per_mo"]
        if not isinstance(cost, (int, float)):
            continue  # self-hosted = "infra (...)"; not a metered $/mo
        if opt["vendor"] == "getblock-pro":
            assert cost >= ceiling, "GetBlock Pro should be at/above the ceiling (flagged)"
            assert opt["under_ceiling"] is False
        else:
            assert cost <= ceiling, f"{opt['vendor']} ${cost} exceeds the ${ceiling} ceiling"
            assert opt["under_ceiling"] is True
