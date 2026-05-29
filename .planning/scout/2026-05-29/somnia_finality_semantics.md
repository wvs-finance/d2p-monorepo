# Scout Archive — KPD-09-docs Somnia finality semantics (doc-side verdict)

> Canonical KPD-09-docs provenance record. Discharges the **doc-side** half of
> the finality question (the empirical half, KPD-09-empirical, is a Phase-3
> ≥1-hour rollback observation). Gates the Phase-3 `safe_block_depth`
> assumption used by INDEX-01 and the completeness/contiguity gate.

**Sources (fetched 2026-05-29):**
- `docs.somnia.network/llms-full.txt` — Somnia documentation full-text export.
- Somnia MultiStream consensus page (`docs.somnia.network`, MultiStream / PBFT
  section).
- GetBlock Somnia docs (`docs.getblock.io/api-reference/somnia`) — cross-reference.

| capability | finding | source_url | utc_fetch_ts |
|---|---|---|---|
| finality wording | "sub-second finality" asserted; deterministic PBFT merge | https://docs.somnia.network/llms-full.txt | 2026-05-29 |
| irreversibility / reorg statement | **NOT explicitly stated** — docs never assert reorg-impossibility / irreversibility | https://docs.somnia.network/ (MultiStream consensus page) | 2026-05-29 |
| consensus mechanism | MultiStream PBFT (deterministic merge) | https://docs.somnia.network/ (MultiStream consensus page) | 2026-05-29 |

## Finding

The Somnia documentation asserts **sub-second finality** and a deterministic
**MultiStream PBFT** merge, but **never explicitly states reorg-impossibility /
irreversibility**. The absence of an explicit irreversibility guarantee means a
doc-only verdict cannot be HIGH-confidence; the PBFT determinism assertion,
however, is strong enough to default to a shallow `safe_block_depth` provisionally.

**CONFIDENCE: MEDIUM.**

## VERDICT

**Branch (a) PROVISIONAL:** docs assert sub-second finality + deterministic PBFT
merge but do not state irreversibility → `safe_block_depth = 1` provisionally
accepted; Phase 3 KPD-09-empirical confirms via ≥1-hour rollback observation.

This is **NOT branch (b)** (full deferral): because the docs *do* assert
sub-second finality, the correct doc-side default is branch (a) provisional
(shallow depth, empirically re-confirmed) rather than deferring the depth choice
entirely to Phase 3.

## Consequence for Phase 3

`safe_block_depth = 1` is the working assumption for the INDEX-01 cursor and the
contiguity proof. KPD-09-empirical (Phase 3) observes the chain for ≥1 hour and
confirms no rollback at depth 1 is observed; if a rollback at depth 1 is
observed, `safe_block_depth` is raised and the completeness gate re-evaluated.
