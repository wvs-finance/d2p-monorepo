# Requirements: abrigo-somnia v2.0 — Convex Instrument (cCOP/USD long-gamma)

**Defined:** 2026-06-01
**Core Value:** A TE-sized long-gamma cCOP/USD hedge on borrowed-Panoptic-V2-data-model contracts (Base-fork demo), with a premium that carries a data-cost-weighted reimbursement.
**Scope:** Hackathon demo, testnet/fork only (never production). Panoptic **V2 (Uniswap V4) on a Base fork**; M1 econometrics parked (snapshots in `.planning/*-M1-donor-transfer-2026-06-01.md`).

## v1 Requirements (the demo loop)

### FORK — Base-fork + borrowed Panoptic V2
- [x] **FORK-01**: Foundry Base-fork harness (UniV4 PoolManager + a stable token), `forge` + `bulloak`, with a BUSL NOTICE for borrowed Panoptic code
- [x] **FORK-02**: Deploy our own cCOP/USDC UniV4 pool (mock cCOP, realistic params) on the fork
- [x] **FORK-03**: Borrow a minimal Panoptic V2 core behind an `IPanopticData` interface (demo-scoped)

### WRAP — long-gamma cash-flow
- [ ] **WRAP-01**: User deposits upfront collateral into `LongGammaWrapper`, which owns the position on their behalf
- [ ] **WRAP-02**: Wrapper mints a long-gamma (`isLong`) position on the cCOP/USDC pool
- [ ] **WRAP-03**: Streamia accrues against collateral (read from the contract), including involuntary-close branches (`forceExercise`/`settleLongPremium`/liquidation)
- [ ] **WRAP-04**: Burn closes the position and computes the residual from surviving collateral at actual close

### FEE — premium split + data-cost reimbursement
- [ ] **FEE-01**: `PremiumSplitter` decomposes a premium into `π_panoptic + μ_LP + φ_data`
- [ ] **FEE-02**: `CapitalRemunerationVault` (ERC-4626) receives `φ_data` (mutualized fixed $199) with a no-double-count conservation invariant vs the per-position hedge cost
- [ ] **FEE-03**: User reimbursement = surviving collateral − streamia − commission − metered hedge-data cost (data-cost-weighted residual)

### SIZE — oracle sizing
- [ ] **SIZE-01**: `MacroOracle` exposes a CPI surprise (adds EME consensus + σ so `s_t = (actual − consensus)/σ` is computable)
- [ ] **SIZE-02**: `PositionBuilder` sizes notional/strike from `s_t` + the cCOP/USD mark (`te/fx/usdcop`), with the CPI→FX linkage flagged `linkage_validated:false`

## Deferred (stretch — after the loop works)

### PAY — x402 entry
- **PAY-01**: Deposit via x402 on Base (keeper/off-chain entry)

### XCHAIN — Reactive cross-chain
- **XCHAIN-01**: Reactive callback dual-auth (CallbackProxy + RVM-id) + replay nonce; DATA_PAYMENT→vault, PREMIUM→PositionBuilder

### HEDGE — live delta-hedge
- **HEDGE-01**: External delta-hedge keeper trades the underlying (v1 meters the data cost with a stubbed hedge)

## Out of Scope

| Feature | Reason |
|---|---|
| Production / mainnet deployment | Hackathon demo only; keeps borrowed Panoptic V2 (BUSL-1.1) in permitted non-production use |
| Real Celo cCOP pool | cCOP pool is UniV3/Celo; V2 is UniV4/Base — incompatible; we deploy our own demo pool |
| Canonical Panoptic V2 integration | Borrow the data model now; swap to a canonical V2 deployment later (repoint `IPanopticData`) |
| CPI→FX transfer-function calibration | Belongs to the parked M1 donor-transfer econometrics track |
| Real money / real users | Demo |

## Traceability

Mapped by the roadmapper (2026-06-01). Coverage: 12/12 v1 requirements → exactly one active phase; 0 orphans. Deferred items carry no active phase. See `.planning/ROADMAP.md` (phases 7–10).

| Requirement | Phase | Status |
|---|---|---|
| FORK-01 | Phase 7 | Complete |
| FORK-02 | Phase 7 | Complete |
| FORK-03 | Phase 7 | Complete |
| WRAP-01 | Phase 8 | Pending |
| WRAP-02 | Phase 8 | Pending |
| WRAP-03 | Phase 8 | Pending |
| WRAP-04 | Phase 8 | Pending |
| FEE-01 | Phase 9 | Pending |
| FEE-02 | Phase 9 | Pending |
| FEE-03 | Phase 9 | Pending |
| SIZE-01 | Phase 10 | Pending |
| SIZE-02 | Phase 10 | Pending |
| PAY-01 | Deferred | Future (no active phase) |
| XCHAIN-01 | Deferred | Future (no active phase) |
| HEDGE-01 | Deferred | Future (no active phase) |

---
*Requirements defined: 2026-06-01. Traceability filled by the roadmapper 2026-06-01 (phases 7–10).*
