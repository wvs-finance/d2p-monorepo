---
phase: 07-base-fork-borrowed-panoptic-v2-ccop-usdc-pool
plan: 02
subsystem: borrowed-panoptic-v2-core-and-swap-seam
tags: [panoptic-v2, cwia, busl, ipanopticdata, mock-erc20, base-fork, foundry, code-423n4]

requires:
  - phase: 07-01
    provides: "single cancun/0.8.24 profile + audit-verbatim remappings (@contracts/@libraries/@types/@tokens/@base repointed at panoptic-borrowed/, plus v4-core/clones-with-immutable-args/solmate/solady/univ3-core/univ3-periphery/@openzeppelin, NO v4-periphery) + §C dep SHAs + bulloak + BUSL NOTICE"
provides:
  - "panoptic-borrowed/ — minimal §F Panoptic V2 core vendored byte-intact @ fe55774 (PanopticPool, CollateralTracker, SemiFungiblePositionManagerV4, RiskEngine, PanopticFactoryV4 + base/tokens/libraries/types closure) compiling under cancun"
  - "contracts/src/instrument/interfaces/IPanopticData.sol — the swap-seam interface (6 §E-verified V2 fns, value types only)"
  - "contracts/test/mocks/MockCcop.sol — 18-dp mintable mock cCOP ERC20"
affects:
  - "Plan 03 (harness): deploys factory + master copies, reads pool state via V4StateReader.getSqrtPriceX96 + v4-core StateLibrary.getLiquidity"
  - "Plan 04 (cCOP/USDC pool): PoolManager.initialize + factory.deployNewPool, uses MockCcop + sqrtPriceX96 decimal-gap math"
  - "Plan 05 (seam test): runtime conformance — non-reverting dispatch + getAccumulatedFeesAndPositionsData against IPanopticData"

tech-stack:
  added:
    - "code-423n4/2025-12-panoptic @ fe557748210a529ae414d7c487b6514be0d9e220 (borrowed V2 core, BUSL-1.1 / GPL headers byte-intact)"
  patterns:
    - "Borrowed V2 internal imports use the §C @-aliases verbatim (Plan 01 repointed those aliases at panoptic-borrowed/) → ZERO import rewrites needed (mn-A confirmed)"
    - "Swap-seam interface depends only on V2 value types (user-defined `type ... is uint256`), never on BUSL concretes — compile-time conformance = forge build, not an IPanopticData(addr) cast (FORK-03)"
    - "fetch-at-exact-SHA via `gh api .../contents/...?ref=<sha>` with Accept: application/vnd.github.raw preserves SPDX/BUSL bytes"

key-files:
  created:
    - "contracts/panoptic-borrowed/ (31 files: 5 concretes + 3 base + 2 interfaces + 3 tokens + 10 libraries + 9 types — incl. Pointer, V4StateReader, FactoryNFT, MetadataStore)"
    - "contracts/src/instrument/interfaces/IPanopticData.sol"
    - "contracts/test/mocks/MockCcop.sol"
  modified: []

key-decisions:
  - "Executed on branch feat/keeper-vercel-buildoutput (the live branch carrying 07-01); the prompt's rescope/somi-leg-donor-transfer is NOT where Phase-7 lives (07-01 commits 5ea1226/8dbca24/dad463b are reachable only from feat/keeper-vercel-buildoutput). Committed in place, no branch (branching=none)."
  - "Optional getOracleTicks (§E L1899) NOT declared on IPanopticData — kept the seam to exactly the six §E-confirmed functions; a later Phase-8 plan can add it when the oracle shape is actually consumed."
  - "MockCcop authored as a self-contained hand-rolled 18-dp ERC20 (MIT, MockPlatform style) with an explicit `decimals()` function (not a constant getter) to match the plan's `function decimals` acceptance grep and the ERC20 ABI unambiguously."

patterns-established:
  - "panoptic-borrowed/ is the COMMITTED provenance tree (not lib/) so BUSL travels with the repo; lib/ deps stay gitignored/restorable via foundry.lock"
  - "IPanopticData is the only seam Plans 03-05 build against; concretes are never imported by repo src/ (only the harness/tests construct them)"

requirements-completed: [FORK-03]

duration: ~35min
completed: 2026-06-02
---

# Phase 7 Plan 02: Borrowed Panoptic V2 Core + IPanopticData Swap-Seam Summary

**Vendored the minimal §F Panoptic V2 core (incl. the CWIA factory `PanopticFactoryV4`, FactoryNFT/MetadataStore, Pointer, V4StateReader) byte-intact at the audit SHA and authored the `IPanopticData` swap-seam against the §E-verified V2 ABI — `forge build` is green under cancun/0.8.24, which IS the FORK-03 compile-time conformance proof.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-06-02
- **Tasks:** 2/2
- **Files modified/created:** 33 (31 borrowed + IPanopticData + MockCcop)

## Accomplishments

**Task 1 — Vendor the §F minimal borrowed Panoptic V2 core (`badaa74`)**
- Found a partial `panoptic-borrowed/` already on disk (untracked) from a prior run: the five large concretes (`PanopticPool` 2156 L, `CollateralTracker`, `SemiFungiblePositionManagerV4`, `RiskEngine`, `PanopticFactoryV4`), `base/{Multicall,FactoryNFT,MetadataStore}`, two `interfaces/`, and `libraries/{Constants,EfficientHash,CallbackLib}` were present and real — but `libraries/Errors.sol` was a 0-byte stub and the entire `types/`, `tokens/`, and the rest of `libraries/` were missing.
- Computed the exact alias-import closure (`grep -rhoE 'from "@(contracts|libraries|types|tokens|base)/..."'`) and fetched every missing target from `code-423n4/2025-12-panoptic @ fe557748210a529ae414d7c487b6514be0d9e220` via `gh api .../contents/...?ref=<sha>` with `Accept: application/vnd.github.raw` (byte-preserving): `libraries/{Errors,Math,PanopticMath,InteractionHelper,SafeTransferLib,V4StateReader,FeesCalc}`, all nine `types/*` (incl. `Pointer`), all three `tokens/*`.
- Final tree = **31 files**, exactly the §F closure — **no transitive files beyond §F were needed**; every remaining import resolved either to a §F-enumerated borrowed file or to an already-installed `lib/` dep.
- `forge build` exits 0: the whole borrowed core + factory + CWIA `Clone` usage + V4StateReader + types/tokens compiles under the single cancun/0.8.24 profile alongside v4-core / v3-core / CWIA / solady / solmate / OZ.

**Task 2 — IPanopticData seam + MockCcop (`45234dc`)**
- `IPanopticData.sol` declares the six §E-verified V2 functions byte-for-byte: `dispatch` (L572), `dispatchFrom` (L1360, `external payable`), `getAccumulatedFeesAndPositionsData` (L221), `getCurrentTick` (L1949), `getTWAP` (L1944), `numberOfLegs` (L1921). Imports ONLY the V2 value types (`TokenId`, `PositionBalance`, `LeftRightUnsigned` — confirmed `type ... is uint256` UDVTs); no concrete/factory import; no V1 `mintOptions`/`burnOptions` (Pitfall 1 guard holds).
- `MockCcop.sol`: minimal 18-decimal mintable ERC20 (`name "Mock cCOP"`, `symbol "cCOP"`, `decimals()→18`, public `mint(address,uint256)`), MIT, mirroring the in-tree `MockPlatform.sol` style.
- `forge build` green = the FORK-03 compile-time conformance proof (the interface compiles against the borrowed V2 type imports — NOT an unchecked `IPanopticData(addr)` cast).

## Import-rewrite reality (mn-A) — CONFIRMED, no rewrites

The §A/mn-A prediction held exactly. The borrowed V2 source uses the **curly-brace** import form (`import {Sym} from "...";`) and its INTERNAL imports **already use the §C aliases** (`@contracts/`, `@libraries/`, `@types/`, `@tokens/`, `@base/`) that Plan 01 repointed at `panoptic-borrowed/` — plus two relative `./CollateralTracker.sol` / `./PanopticPool.sol` forms that also resolve. The third-party prefixes all matched the §C remapping RHS verbatim:

| Prefix in source | §C remapping target | rewrite? |
|---|---|---|
| `v4-core/types|interfaces|libraries/...` | `lib/v4-core/src` | no |
| `clones-with-immutable-args/{Clone,ClonesWithImmutableArgs}.sol` | `lib/clones-with-immutable-args/src/` | no |
| `solmate/src/utils/TransientReentrancyGuard.sol` | `lib/solmate/` | no |
| `solady/utils/{Base64,LibZip,LibString,FixedPointMathLib}.sol` | `lib/solady/src/` (auto-detected, verified via `forge remappings`) | no |
| `@openzeppelin/contracts/...` | `lib/v4-core/lib/openzeppelin-contracts/` | no |
| `univ3-core/interfaces/...` | `lib/v3-core/contracts` | no |

**Zero `sed`/import rewrites were performed.** No `v4-periphery` / `StateView` import exists anywhere in the borrowed set (B-2 holds).

## Deviations from Plan

### Environment correction (not a code deviation)

**1. [Rule 3 — Blocking] Branch reality: Phase-7 lives on `feat/keeper-vercel-buildoutput`, not `rescope/...`**
- **Found during:** pre-Task-1 environment check.
- **Issue:** The prompt and STATE.md said the working branch is `rescope/somi-leg-donor-transfer`, but the live repo HEAD was `feat/keeper-vercel-buildoutput`, and `git merge-base --is-ancestor` proved the 07-01 commits (`5ea1226`/`8dbca24`/`dad463b`) are reachable ONLY from `feat/keeper-vercel-buildoutput` (`NO on rescope`). Committing on `rescope` would have orphaned Plan 02 from its Plan 01 substrate.
- **Fix:** Executed and committed in place on `feat/keeper-vercel-buildoutput` (the live Phase-7 lineage). Branching directive was "none" anyway, so no branch was created.
- **Files modified:** none (branch decision only).

### Auto-fixed Issues

**2. [Rule 1 — Bug] Natspec `@L<n>` doc tags broke compile of IPanopticData**
- **Found during:** Task 2 first `forge build`.
- **Issue:** The `///` doc comment referenced source line anchors as `@L572 / @L1949`; solc parsed `@L572`/`@L1949` as invalid custom natspec tags → `Error (6546): Documentation tag @L1949, not valid for contracts.` (3 errors).
- **Fix:** Reworded the doc comment to `(L572)` / `(L1949)` (parenthesised, no leading `@`). The inline `// ... @L572` plain comments inside the body are non-natspec and were left as-is.
- **Files modified:** `contracts/src/instrument/interfaces/IPanopticData.sol`.
- **Commit:** `45234dc`.

### Notes / non-deviations
- `forge build` still emits pre-existing `named-struct-fields` / `unsafe-typecast` **lint notes** on out-of-scope `src/MacroOracle.sol` (build exits 0). Not fixed (scope boundary — carried over from 07-01).
- `optimizer_runs` stayed at `200` (07-01 default); the borrowed core compiled without hitting the 24KB cap, so the audit's `9_999_999` fallback was not triggered.

## Authentication Gates
None. (`gh` was already authenticated as `JMSBPP`.)

## Verification

- `forge build` exits 0 — borrowed core + `PanopticFactoryV4` (`deployNewPool`) + CWIA `Clone` bases + `V4StateReader` + interface + mock + repo + v4-core + v3-core + CWIA compile in one cancun/0.8.24 pass.
- `test -f panoptic-borrowed/PanopticFactoryV4.sol` + `grep -q deployNewPool` → PASS (factory vendored).
- `test -f panoptic-borrowed/{base/FactoryNFT,base/MetadataStore,types/Pointer,libraries/V4StateReader}.sol` → all PASS.
- `grep -q "BUSL-1.1" panoptic-borrowed/PanopticPool.sol` → PASS (header byte-intact); fetched `types/`/`libraries/` carry their `GPL-2.0-or-later` headers byte-intact.
- `! test -f panoptic-borrowed/SemiFungiblePositionManager.sol` + `! test -f panoptic-borrowed/PanopticFactory.sol` → PASS (UniV3 SFPM + V3 factory NOT vendored).
- `! grep -rq "v4-periphery" panoptic-borrowed/` → PASS (B-2).
- `grep -q "0.8.24" panoptic-borrowed/PanopticPool.sol` → PASS (pragma unbumped).
- IPanopticData: all six §E fns present, `external payable` on `dispatchFrom`, `! grep -qE "mintOptions|burnOptions"`, `import.*TokenId` present, `! grep -qE "import.*(PanopticPool|SemiFungiblePositionManagerV4|RiskEngine|PanopticFactory)"` → all PASS.
- MockCcop: `function decimals` + `function mint(` present → PASS.

## Self-Check: PASSED

- All 7 spot-checked created files FOUND on disk.
- Both task commits FOUND in history: `badaa74` (Task 1), `45234dc` (Task 2).
