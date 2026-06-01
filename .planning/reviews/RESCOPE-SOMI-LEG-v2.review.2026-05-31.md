# Planning-Review Pipeline Audit Trail — SOMI-Leg Re-scope v2 (Donor-Transfer Cost Function)

**Protocol:** `CLAUDE.md § Planning-review protocol (non-negotiable)`
**Artifact:** `.planning/RESCOPE-SOMI-LEG-2026-05-31-v2.md` (supersedes `03-DATA-SOURCE-REDECISION.md` + `RESCOPE-SOMI-LEG-2026-05-31.md`, both NEEDS WORK).
**Outcome:** **PASS after 3 gate rounds.** 2026-05-31. The gate caught real, execution-expensive statistical defects before any estimation spend.

## Selector (Studio Producer) — surface shifted from data-pipeline to statistical-estimation
- Rounds 1–3 **primary:** `Model QA Specialist`; fallbacks: `AI Engineer` (r1, r2), `Structural Estimation Engineer` (r3 — **invalid name, not in roster**; primary was valid so the fallback was not invoked; AI Engineer substituted as the contingency).
- Rationale: the load-bearing surface is hierarchical-Bayesian transfer estimation (censored selection, identifiability, posterior calibration), not pipeline plumbing — Model QA Specialist owns model-validity end-to-end and authored the r1/r2 findings, so it verified its own findings' resolution.

## Round-by-round (Reviewer A = Reality Checker [fixed]; Reviewer B = Model QA Specialist [selected])
| Round | Reality Checker | Model QA | Findings resolved |
|---|---|---|---|
| #1 | NEEDS WORK | NEEDS WORK | RC: unfalsifiable-on-Somnia framing, HAL feasibility ungated, Wave-D non-organic labelling. MQA-**B1** outcome-truncated selection (Heckman defect: censor selected on `log(amount)` = a function of the Part-2 outcome); MQA-**B2** prior-only params (`κ,B0`,rebate) laundered as posterior estimates; MQA-**B3** anchoring tautology (`s·m(class)≈{.03,.07,.10}` reproduces by construction) + under-specified HAL bridge; + MAJORs (FX un-propagated, circular farmed-de-biasing, `R_pass`/redundancy conflation, un-frozen pre-registration) |
| #2 | **PASS** | NEEDS WORK | All six r1 BLOCKERs verified resolved in-text. New MQA-**B1′**: covariate-only fix migrated the truncation bias into `sybil_label`/`HHI_agent` (for ACP/OLAS the "organic" label IS the dust threshold → back-door endogeneity); + MAJORs M1′ (`contraction>0` trivial → needs τ floor + SBC), M2′ (slope-orthogonality test had no metric/tolerance/consequence), M3′ (Wave-0 bar TBD; arXiv fallback may have no testable coefficient) |
| #3 | **PASS** | **PASS** | B1′ fixed: explicit conditional-ignorability premise + **mandatory Tobit for threshold-derived-label donors** (ACP/OLAS) + covariate-only restricted to externally-labelled donors (x402/Artemis) + pre-registered placebo. M1′: τ floor + SBC + prior-sensitivity on data-identified params. M2′: slope-orthogonality numeric gate + structural-zero-on-fail. M3′: committed Wave-0 bars (strict ordering + accuracy floor 0.70, frozen before decrypt) + real arXiv precondition. FX-dependence default; LODO max-swing threshold. **MQA confirmed mandatory-Tobit introduces no infeasibility** (censoring point is a known constant for ACP/OLAS; OLAS routed to cross-check-only). |

## Verdict gate
Both PASS at round 3. No outstanding BLOCKER/MAJOR. The re-scope is **execution-ready**, gated to contract if Wave-0 (HAL) fails or Wave-C3 shows pervasive prior-dominance.

## Carry-forwards to the downstream ESTIMATION-SPEC gate (named, not lost)
Both reviewers explicitly deferred these to the Wave-B1 frozen pre-registration (itself subject to this same two-reviewer gate):
1. Numeric freezes: τ (contraction floor), placebo "material gap" tolerance, slope-orthogonality tolerance, Wave-0 accuracy-floor finalization, post-censor minimum-N per donor, LODO max-swing threshold.
2. Collider **identification** (DAG / sensitivity-to-unobserved-confounding), not just the placebo **detection** test, for `HHI_agent`.
3. FX tail-dependence **identifiability** from the available (thin) SOMI/USD window — else the copula/shared-shock "dependence default" is an assumption and must be labelled so in the P95/P99 output.
- Minor: pin x402's primary role (covariate-only-eligible vs cross-check) when the two conflict.

## State
LOCAL only; nothing pushed; cascade into PROJECT/REQUIREMENTS/ROADMAP authorized by this PASS but not yet applied. Next execution step = Wave 0 (HAL feasibility gate) + the Wave-B1 frozen pre-registration (→ estimation-spec gate).
