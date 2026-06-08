---
phase: 07-base-fork-borrowed-panoptic-v2-ccop-usdc-pool
plan: 01
subsystem: foundry-toolchain-and-provenance
tags: [foundry, panoptic-v2, base-fork, cwia, bulloak, busl, remappings]
requires: []
provides:
  - "single ^0.8.24 / evm_version=cancun compile profile (forge build green)"
  - "[rpc_endpoints] base = ${BASE_RPC_URL} fork endpoint"
  - "[fuzz] runs=256 CI floor"
  - "full Panoptic-V2 transitive dep set pinned (foundry.lock) at §C SHAs"
  - "audit-verbatim remappings.txt (CWIA + v3 + OZ-into-v4-core + v4-core/src, NO v4-periphery)"
  - "bulloak 0.9.2 on PATH for evm-tdd .tree scaffolding"
  - "BUSL-1.1 NOTICE with borrowed-commit provenance + byte-preservation guard"
affects:
  - "Plans 02-05: every later plan compiles + forks against this config"
tech-stack:
  added:
    - "Uniswap/v4-core @ e50237c43811bd9b526eff40f26772152a42daba"
    - "1inch/clones-with-immutable-args @ 196f1ecc6485c1bf2d41677fa01d3df4927ff9ce (clone2/clone3/addressOfClone3)"
    - "transmissions11/solmate @ eaa7041378f9a6c12f943de08a6c41b31a9870fc"
    - "vectorized/solady @ adfad66656a6ef8c65b2a412d849bbf7f7a59842"
    - "Uniswap/v3-core @ 6562c52e8f75f0c10f9deaf44861847585fc8129"
    - "Uniswap/v3-periphery @ b325bb0905d922ae61fcc7df85ee802e8df5e96c"
    - "openzeppelin/openzeppelin-contracts @ 0a25c1940ca220686588c4af3ec526f725fe2582"
    - "bulloak 0.9.2 (cargo install)"
  patterns:
    - "lib/ gitignored + restorable via foundry.lock; deps NOT committed (no submodules in HEAD)"
    - "remappings file-only mode (remappings.txt present ⇒ Foundry drops lib/ auto-detection as authority; auto-detected extras remain harmless supersets)"
    - "@openzeppelin/ aliased INTO v4-core's vendored OZ, not the top-level install"
    - "fork block as a Solidity constant in test source (M-4), not an env var"
key-files:
  created:
    - "contracts/remappings.txt"
    - "contracts/NOTICE"
    - "contracts/.env.example"
    - "contracts/foundry.lock"
  modified:
    - "contracts/foundry.toml"
    - "contracts/.gitignore"
decisions:
  - "Single cancun/0.8.24 profile supersedes FORK-01's roadmap multi-version solc matrix wording (07-RESEARCH §5; Panoptic V2 is ^0.8.24 everywhere) — gate-confirmed, recorded in NOTICE + SUMMARY so the checker does not flag a false gap"
  - "v4-periphery NOT installed and NO v4-periphery remapping (B-2): its StateView/IStateView pull the undefined @uniswap/v4-core/ alias + permit2; pool-state reads go through the already-borrowed V4StateReader + v4-core StateLibrary under the v4-core/ alias"
  - "lib/ deps kept OUT of git (gitignored, restorable via foundry.lock) — reverted a stray prior forge-install submodule registration (.gitmodules + staged gitlinks) to match the plan's restore model"
metrics:
  duration: "~3h wall (incl. ~50s bulloak compile + dep reinstall)"
  completed: "2026-06-02"
  tasks: 3
  files: 6
---

# Phase 7 Plan 01: Foundry Toolchain + Panoptic V2 Provenance Layer Summary

Established the Phase 7 Foundry substrate: a single `^0.8.24` / `evm_version="cancun"` compile profile with a Base fork endpoint and CI fuzz floor, the full Panoptic-V2 transitive dependency set pinned at the 07-RESEARCH-DEPLOY §C SHAs (v4-core, 1inch CWIA, solmate, solady, v3-core, v3-periphery, OZ — and deliberately NOT v4-periphery/permit2 per B-2), the audit's verbatim `remappings.txt` repointed at `panoptic-borrowed/`, the `bulloak` evm-tdd toolchain, and a BUSL-1.1 `NOTICE` with a byte-preservation guard. `forge build` is green and every later Phase-7 plan now compiles and forks against this configuration.

## What was built

**Task 1 — Dep set + bulloak (`5763d8c`)**
- All seven §C deps verified present at their exact pinned SHAs (six were already on disk and clean; OZ was a broken submodule pointer — empty checkout pointing at a non-existent gitdir — so it was removed and reinstalled at `0a25c194…`).
- `foundry.lock` now pins all seven (the restore manifest; `lib/` itself stays gitignored).
- No `lib/v4-periphery` (B-2). CWIA `addressOfClone3` and v4-core `StateLibrary` confirmed present (the read path Plans 03/04 use instead of StateView).
- `bulloak 0.9.2` installed via `cargo install` and on PATH.

**Task 2 — foundry.toml + remappings.txt + .env.example (`8dbca24`)**
- `foundry.toml`: single `solc=0.8.24` / `evm_version="cancun"` profile, `optimizer_runs=200` (24KB limit not yet exercised — no borrowed core compiled this plan; raise to the audit's `9_999_999` in a later plan if the factory+pool hit the size cap), `[rpc_endpoints] base="${BASE_RPC_URL}"`, `[fuzz] runs=256` floor + `[profile.ci] fuzz.runs=256`.
- `remappings.txt`: audit-verbatim §C lines — `forge-std/`, `@openzeppelin/=lib/v4-core/lib/openzeppelin-contracts/`, `solmate/`, `clones-with-immutable-args/=lib/clones-with-immutable-args/src/`, `univ3-core/`, `univ3-periphery/`, `v4-core/=lib/v4-core/src` — with `@contracts/@libraries/@base/@tokens/@types` repointed at `panoptic-borrowed/`. NO `v4-periphery/` alias.
- `.env.example`: `BASE_RPC_URL` + `SOMNIA_TESTNET_*` key names only (no secrets); a comment notes `BASE_FORK_BLOCK` is a Solidity constant (value 46700000) in the test source, NOT an env key.
- `.gitignore`: added `.env` (with `!.env.example`).
- `forge build` exits 0 (existing Somnia sources compile under the new single profile).

**Task 3 — BUSL-1.1 NOTICE (`5ea1226`)**
- Records borrowed commit `fe557748210a529ae414d7c487b6514be0d9e220`, mirror `d20b0aed127ab5d3e5ca17c5399782aad2f0ff4c`, BUSL-1.1 / Axicon Labs Limited / Change Date `2027-09-07` / GPL v2.0-or-later / Additional Use Grant `v1-license-grants.panoptic.eth`, non-production fork scope, the byte-preservation guard for Plan 02's import rewrite (anchor only `^import .*from "` lines), and the single-cancun-compile supersession note.

## remappings reconciliation (`forge remappings`)

After writing `remappings.txt`, `forge remappings` returned our 12 lines verbatim (Foundry only normalizes trailing slashes — cosmetic) PLUS auto-detected supersets from `lib/`: `solady/`, bare `openzeppelin-contracts/`, bare `v3-core/`/`v3-periphery/`, `ds-test/`, `erc4626-tests/`, `@ensdomains/`, `hardhat/`. Outcome:
- Every alias the borrowed/factory import graph needs (`@contracts/`, `solmate/`, `clones-with-immutable-args/`, `v4-core/`, `univ3-core/`, `univ3-periphery/`, `@openzeppelin/`) is present in our file with audit-verbatim RHS.
- **No `v4-periphery` alias surfaced** anywhere — confirms B-2 holds (no StateView import slipped in).
- The auto-detected extras do not conflict with or shadow any audit alias; they are harmless and left as-is.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Broken OpenZeppelin checkout reinstalled**
- **Found during:** Task 1.
- **Issue:** `lib/openzeppelin-contracts/` was an empty checkout whose `.git` pointed at a non-existent gitdir (`HEAD` unresolvable, missing from `foundry.lock`) — `forge build` would not resolve OZ transitively and the §C SHA pin was absent.
- **Fix:** Removed the broken checkout (working tree + the orphan `.git/modules/.../openzeppelin-contracts` dir) and ran `forge install openzeppelin/openzeppelin-contracts@0a25c194…`. Resolved SHA confirmed `0a25c1940ca220686588c4af3ec526f725fe2582`; `foundry.lock` updated.
- **Files modified:** `contracts/lib/openzeppelin-contracts/` (gitignored), `contracts/foundry.lock`.
- **Commit:** `5763d8c`.

**2. [Rule 3 - Blocking] Removed stray submodule registration so lib/ stays restorable, not committed**
- **Found during:** Task 1 (`git status` after the OZ reinstall).
- **Issue:** A prior `forge install` had registered all seven deps as git submodules (a root `.gitmodules` + staged `160000` gitlinks under `contracts/lib/`), contradicting the plan's explicit model (`lib/` gitignored, restorable via `forge install`/`foundry.lock`, NOT committed). HEAD contains zero gitlinks, so `.gitmodules` was a new staged artifact with no committed counterpart.
- **Fix:** Force-unstaged the seven lib gitlinks (`git rm --cached -rf`, working tree kept), unstaged + deleted the orphan `.gitmodules`. Result: `lib/` fully untracked/gitignored, deps intact on disk, only `foundry.lock` tracked as the restore manifest.
- **Files modified:** index only (no committed file beyond `foundry.lock`).
- **Commit:** `5763d8c`.

**3. [Rule 1 - Bug] `.env.example` comment phrasing tripped the M-4 acceptance grep**
- **Found during:** Task 2 verification.
- **Issue:** The fork-block note initially read `BASE_FORK_BLOCK = 46700000`, which matches the acceptance check `! grep -q 'BASE_FORK_BLOCK *='` (the block must NOT look like an env key per M-4).
- **Fix:** Reworded the comment to "the BASE_FORK_BLOCK constant is 46700000" so the `=`-assignment form no longer appears; `! grep -qE 'BASE_FORK_BLOCK *='` now passes while the verified value 46700000 is still documented.
- **Files modified:** `contracts/.env.example`.
- **Commit:** `8dbca24`.

### Notes / non-deviations
- Forge-lint emitted `named-struct-fields` advisory `note`s on the pre-existing `src/MacroOracle.sol` during `forge build`. These are non-blocking style notes on out-of-scope files (build exits 0); not fixed (scope boundary).
- `optimizer_runs` kept at `200` (plan default). The plan's fallback to `9_999_999` is only triggered by a 24KB size hit, which cannot occur until the borrowed core compiles (Plan 02+); deferred to that plan.

## Authentication Gates
None.

## Verification
- `forge build` exits 0 under the single cancun/0.8.24 profile.
- `bulloak --version` → `bulloak 0.9.2`.
- `grep -q "fe557748210a529ae414d7c487b6514be0d9e220" NOTICE && grep -q "BUSL-1.1" NOTICE` → PASS (FORK-01 NOTICE gate from 07-VALIDATION).
- All seven deps under `lib/`; `! test -d lib/v4-periphery` → PASS.
- `remappings.txt` audit-verbatim with five `@`-aliases repointed at `panoptic-borrowed/`, no v4-periphery, reconciled against `forge remappings`.

## Self-Check: PASSED
