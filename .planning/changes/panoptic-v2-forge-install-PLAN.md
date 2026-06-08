# Change Plan: Replace vendored `panoptic-borrowed/` with pinned forge-installed `panoptic-v2-core`

**Type:** infrastructure / dependency refactor (not a roadmap phase)
**Branch:** `chore/panoptic-v2-forge-install` (off `feat/macro-hedge-agent`)
**Date:** 2026-06-02
**Status:** r3 — two gate passes (Reality Checker + DevOps Automator). r1's 3 BLOCKERs + MAJOR-1 resolved in r2; r2's gate confirmed those closed and raised MAJOR-2 (Task-4 keyless false-green) + MINOR-4/5, resolved in r3. See `<review_resolutions>`.

## Objective

Replace the 32 vendored Solidity files in `contracts/panoptic-borrowed/` (a copy of the Code4rena audit snapshot `code-423n4/2025-12-panoptic @ fe55774`, **import-rewritten** by Phase-7 Plan-02 to this repo's aliases) with a **pinned dependency** on the canonical upstream `panoptic-labs/panoptic-v2-core @ d20b0aed127ab5d3e5ca17c5399782aad2f0ff4c` (the commit our `NOTICE` already records as the mirror of `fe55774`), restored into gitignored `lib/` by `contracts/script/ci-install-deps.sh`. Realizes the swap-seam design ("repoint `IPanopticData` to canonical V2 later").

## Non-negotiables this change MUST preserve

- **Logic + license byte-identity (NOT byte-mirror):** upstream `contracts/` is a **superset** — it has 4 files the vendored snapshot lacks (`Builder.sol`, `PanopticFactoryV3.sol`, `PanopticGuardian.sol`, `SemiFungiblePositionManagerV3.sol`). And the vendored files were **import-rewritten** (`NOTICE` L36-43). So raw byte-equality will NOT hold. The invariant is: for each of the **32 vendored files**, the non-import bytes (SPDX + license header + contract logic) are **identical** to its `d20b0aed` counterpart; only `import ... from "<alias>"` lines may differ (alias prefix). A gate (Task 2) PROVES this before any deletion.
- **Suite parity:** the Phase-8 RESEARCH line citations and the **30/30 unit tests + 2 fuzz invariants** stay green, unchanged, recompiled cold against the forge-installed tree.
- **BUSL-1.1 non-production scope unchanged:** upstream LICENSE is BUSL-1.1 (Axicon Labs, Change Date 2028-03-01 → GPL-2.0), non-production granted = our fork/testnet demo. The restored `lib/panoptic-v2-core/LICENSE` carries the obligation ("display the License").
- **Swap seam intact:** `LongGammaWrapper` + its tests reach the pool ONLY via `IPanopticData`, collateral via `IERC4626`; deploy HELPERS may import `@contracts/` concretes (the M-3 isolation boundary).
- **No new git-tracked BUSL source:** `lib/` stays gitignored; the borrowed code is fetched reproducibly, never committed.
- **No unbuildable commit:** the deletion (Task 5) is verified-safe by a mandatory clean-room build (Task 4) FIRST; the script-append + remapping + deletion land as one verified unit.

## Evidence from the spike + the review gate (verified)

- `NOTICE` records `Canonical mirror: panoptic-labs/panoptic-v2-core @ d20b0aed`. The 32 vendored files were import-rewritten by Phase-7 Plan-02 (`NOTICE` L36-43).
- Importers use aliases (`@contracts/...`, `@types/...`), NOT hardcoded `panoptic-borrowed/` paths → only remappings change; no importer edits.
- `contracts/lib/` already has the full official dep tree (8 submodules). panoptic-v2-core's OWN nested submodules are unused — every `@`-alias the borrowed tree imports resolves to our TOP-LEVEL `lib/`. So a plain pinned clone (no recursive init) suffices.
- `contracts-ci.yml` needs **NO edit**: both `build-and-spec` (L38-39) and `fork` (L83-84) call `bash script/ci-install-deps.sh` as their sole dep step; `somnia-e2e` doesn't touch contracts. The script is the single dep entry point.
- `foundry.lock` is a partial forge-managed subset WITHOUT URLs (`forge-std` is already omitted); the script is the source of truth. Omitting panoptic-v2-core from the lock is consistent.
- `inst()` (`git clone` + `git fetch origin <rev>` + `git checkout <rev>`) handles a full SHA not reachable from the default tip and is idempotent. `d20b0aed` is currently the `main` tip (NOTICE L15) so it's clone-reachable today; the SHA pin survives `main` moving via the fetch-by-SHA path.
- Same `solc 0.8.24` / `cancun` profile; the same code already compiles.

## Task breakdown (ORDERED — divergence gate + clean build BEFORE deletion)

### Task 1 — Add panoptic-v2-core to the dep-restore manifest
- Append to `contracts/script/ci-install-deps.sh` (after the existing `inst` lines, before the v4-core recursive block):
  ```bash
  # Panoptic V2 core (BUSL-1.1, non-production). Pinned to the mirror of the Code4rena
  # @fe55774 audit snapshot. ONLY contracts/ source is used — nested submodules are NOT
  # needed (our remappings resolve v4-core/solmate/clones/solady/etc. to our top-level lib/).
  inst https://github.com/panoptic-labs/panoptic-v2-core  panoptic-v2-core  d20b0aed127ab5d3e5ca17c5399782aad2f0ff4c
  ```
- Run `bash script/ci-install-deps.sh`.
- **MAJOR-1 safety net:** immediately assert the exact SHA landed (because `inst()`'s `git fetch ... || true` on L24 swallows a fetch failure, a wrong/missing rev would otherwise checkout silently): `test "$(git -C contracts/lib/panoptic-v2-core rev-parse HEAD)" = "d20b0aed127ab5d3e5ca17c5399782aad2f0ff4c"` — hard-fail if not.
- **Acceptance:** `lib/panoptic-v2-core/contracts/PanopticPool.sol` exists; `git -C contracts/lib/panoptic-v2-core rev-parse HEAD == d20b0aed127ab5d3e5ca17c5399782aad2f0ff4c`.

### Task 2 — Divergence gate: prove logic+license byte-identity for the 32 files (BLOCKER-1 — BEFORE any deletion)
- For EACH of the 32 files under `contracts/panoptic-borrowed/<relpath>`, compare against `contracts/lib/panoptic-v2-core/contracts/<relpath>`, **normalizing import lines** so only logic+license bytes are compared:
  ```bash
  fail=0
  while IFS= read -r f; do
    rel="${f#contracts/panoptic-borrowed/}"
    up="contracts/lib/panoptic-v2-core/contracts/$rel"
    [ -f "$up" ] || { echo "MISSING UPSTREAM: $rel"; fail=1; continue; }
    # strip every `import ...;` line on both sides; the remainder (SPDX, license header,
    # contract logic) MUST be identical.
    if ! diff -q <(grep -vE '^[[:space:]]*import ' "$f") \
                 <(grep -vE '^[[:space:]]*import ' "$up") >/dev/null; then
      echo "BODY DIVERGENCE (not import-only): $rel"; fail=1
    fi
  done < <(find contracts/panoptic-borrowed -name '*.sol')
  [ "$fail" -eq 0 ] && echo "DIVERGENCE_GATE_PASS" || { echo "DIVERGENCE_GATE_FAIL"; exit 1; }
  ```
- The 4 superset upstream files (`Builder.sol`, `PanopticFactoryV3.sol`, `PanopticGuardian.sol`, `SemiFungiblePositionManagerV3.sol`) are NOT in the 32 → correctly ignored (we iterate the vendored set, not the upstream set).
- Additionally record the import-line deltas for the audit trail (expected: alias-prefix only): `for the 32 files, diff the import lines and confirm each delta is an alias retarget, not a changed target module`.
- **MINOR-4 — upstream multi-line-import robustness:** the strip is verified exact on the vendored side (zero multi-line imports), but it also strips the UPSTREAM side, where a `import {\n A,\n B\n} from "…";` block would leave continuation lines in the compared "body" → a **false** `BODY DIVERGENCE` (a fail-SAFE false STOP, never a false delete). So on ANY `BODY DIVERGENCE`, the operator MUST hand-inspect the flagged file's imports for line-wrapping (collapse multi-line `import {…}` to one logical line and re-diff) BEFORE concluding a real provenance break. The gate fails closed; a false-fail blocks (never silently deletes).
- **Acceptance:** prints `DIVERGENCE_GATE_PASS`; any `BODY DIVERGENCE`/`MISSING UPSTREAM` hard-fails the change pending the MINOR-4 hand-inspection (a confirmed body delta → STOP, do not delete). This is what substantiates the `NOTICE` audit-lineage attribution once the in-tree copy is gone.

### Task 3 — Repoint the 5 remappings
- In `contracts/remappings.txt`, retarget the 5 panoptic-internal aliases (external aliases UNCHANGED):
  ```
  @contracts/=lib/panoptic-v2-core/contracts/
  @libraries/=lib/panoptic-v2-core/contracts/libraries/
  @base/=lib/panoptic-v2-core/contracts/base/
  @tokens/=lib/panoptic-v2-core/contracts/tokens/
  @types/=lib/panoptic-v2-core/contracts/types/
  ```
- **Acceptance:** `grep -c "panoptic-borrowed" contracts/remappings.txt` == 0; the 5 aliases each point under `lib/panoptic-v2-core/contracts/`.

### Task 4 — MANDATORY clean-room build + full re-verify (BLOCKER-2 + BLOCKER-3 — BEFORE deletion)
- **Cache-cold + dep-cold**, simulating a fresh clone, with `panoptic-borrowed/` still present (so this proves the forge-installed tree builds on its own, not via the vendored copy — confirm by checking nothing resolves to `panoptic-borrowed/` after Task 3's repoint).
- **MAJOR-2 — two SEPARATE legs (keyless vs fork) with HONEST acceptance.** The 8 `LongGammaWrapper.*.t.sol` units fork unconditionally in `LongGammaWrapperBase.setUp()` (`vm.createSelectFork(vm.rpcUrl("base"), BASE_FORK_BLOCK)`) despite the `.t.sol` name — they are **fork tests**. So the keyless leg MUST exclude them, and the 30/30 + 2 are verified ONLY by the fork leg (never the keyless leg — that was the false-green the gate caught).
  ```bash
  cd contracts
  forge clean                                   # B3: wipe out/ + cache/
  rm -rf lib/panoptic-v2-core                    # B2: dep-cold
  bash script/ci-install-deps.sh                 # restore from the manifest alone
  test "$(git -C lib/panoptic-v2-core rev-parse HEAD)" = "d20b0aed127ab5d3e5ca17c5399782aad2f0ff4c"
  # (i) KEYLESS leg — build + NON-fork specs ONLY, with BASE_RPC_URL genuinely UNSET.
  #     Excludes the 8 fork-in-setUp wrapper units (--no-match-contract LongGammaWrapper)
  #     AND the *fork* helpers. Proves the forge-installed tree compiles + keyless specs pass
  #     with no RPC — the true parity with CI `build-and-spec`.
  env -u BASE_RPC_URL forge build
  env -u BASE_RPC_URL forge test --no-match-contract LongGammaWrapper --no-match-path 'test/**/*fork*'
  # (ii) FORK leg — the ONLY proof of the 30/30 unit + 2/2 invariants. Export env so
  #     vm.rpcUrl("base") resolves (the in-test createSelectFork forks; a CLI --fork-url is inert).
  #     Per-unit non-zero-passed + 0-failed assertion guards against a 0-tests-run false green.
  set -a; . .env; set +a
  for u in open streamia close claimResidual settleLong forceExercise liquidation invariants; do
    out=$(forge test --match-path "test/instrument/LongGammaWrapper.$u.t.sol")   # spaced for the Alchemy 429
    echo "$out" | grep -qE '[1-9][0-9]* (test|tests) passed|[1-9][0-9]* passed' || { echo "ZERO/NO-RUN in $u"; exit 1; }
    echo "$out" | grep -q '0 failed' || { echo "FAILURES in $u"; exit 1; }
  done
  ```
- **Acceptance:** (i) KEYLESS leg — `forge build` + non-fork specs exit 0 with `BASE_RPC_URL` UNSET (true cold+keyless parity with CI `build-and-spec`; the wrapper fork units are NOT claimed here). (ii) FORK leg — each of the 8 units reports a NON-ZERO passed count AND `0 failed` → **30/30 unit + 2/2 invariants green** (identical to pre-migration), verified ONLY by this leg. The ordering invariant is explicit: **Task 5's deletion is committed ONLY after Task 2 + Task 4 both pass.** Script-append (Task 1) + remapping (Task 3) + deletion (Task 5) are one verified unit; never deletion-first.
- **Out of scope (pre-existing, surfaced by this review):** the 8 wrapper fork units slip past CI `build-and-spec`'s `*fork*` keyless exclusion (a Phase-8 naming inconsistency — they fork but aren't `.fork.t.sol`, and renaming would break the bulloak `.tree`↔`.t.sol` co-location). This migration does NOT change CI test selection; it only stops the PLAN from asserting a keyless parity the repo lacks. Tracked separately.

### Task 5 — Remove the vendored tree (only after Tasks 2 + 4 green)
- `git rm -r contracts/panoptic-borrowed/` (32 tracked files).
- Re-run `forge clean && forge build` to confirm nothing referenced the deleted path.
- **Acceptance:** `git ls-files contracts/panoptic-borrowed | wc -l` == 0; `forge build` exit 0 post-deletion.

### Task 6 — Update `contracts/NOTICE` (copy values from the restored upstream LICENSE)
- Rewrite provenance: borrowed source is now `lib/panoptic-v2-core @ d20b0aed` restored by `script/ci-install-deps.sh`, not an in-tree copy; keep the Code4rena `@fe55774` lineage note + the Task-2 divergence-gate attestation.
- **Fix the pre-existing v1/v2 pointer bug** (`NOTICE` L21-24 say "Panoptic V2" but cite `v1-license-date.panoptic.eth` / Change Date `2027-09-07`). Copy the CORRECT values **verbatim from `lib/panoptic-v2-core/LICENSE`** (now present post-Task-1): Licensor Axicon Labs Limited, Additional Use Grant `v2-license-grants.panoptic.eth`, Change Date `2028-03-01` (or `v2-license-date.panoptic.eth`), Change License GPL-2.0-or-later. Point the "display the License" obligation at the restored `lib/panoptic-v2-core/LICENSE`.
- Drop the now-moot "byte-preservation guard for Plan-02's import rewrite" paragraph.
- **Acceptance:** `grep -c "2028-03-01" contracts/NOTICE` >= 1; `grep -c "v1-license" contracts/NOTICE` == 0; `grep -c "lib/panoptic-v2-core" contracts/NOTICE` >= 1; the cited Change Date matches `grep "Change Date" contracts/lib/panoptic-v2-core/LICENSE`.

### Task 7 — Executable swap-seam guard (NEW tooling, not a "repurpose")
- The pre-existing "guard" is **doc-comment prose only** (`PanopticDataSeam.fork.t.sol` L14, `PanopticDataSeamBase.sol` L10) — not an executable check. Add a real one as a CI step in `contracts-ci.yml`'s `build-and-spec` job (and runnable locally):
  ```bash
  # the wrapper + its behavioral test units must NOT import borrowed CONCRETES
  if grep -REn '@contracts/(PanopticPool|CollateralTracker|SemiFungiblePositionManagerV4|RiskEngine|PanopticFactoryV4)' \
       contracts/src/instrument/LongGammaWrapper.sol \
       contracts/test/instrument/LongGammaWrapper.*.t.sol ; then
    echo "SEAM VIOLATION: wrapper/test imports a borrowed concrete"; exit 1
  fi
  echo "SWAP_SEAM_OK"
  ```
- Explicitly EXEMPT `test/instrument/helpers/PanopticV2DeployHelper.sol` (the M-3 isolation boundary legitimately imports the 5 concretes via `@contracts/`). The exemption is STRUCTURAL — the guard's grep targets only `LongGammaWrapper.sol` + `LongGammaWrapper.*.t.sol`, so `helpers/` is out of scope by construction. **MINOR-5:** `LongGammaWrapperBase.sol` is ALSO intentionally out of guard scope — it imports the deploy helper (which imports concretes) by M-3 design; the base sits behind the seam, so guarding it would be wrong. Document this so no future contributor "fixes" the base into the guard.
- **Acceptance:** the guard prints `SWAP_SEAM_OK` today (the wrapper imports zero `@contracts/` concretes — verified) and is wired into CI.

### Task 8 — foundry.lock note (MINOR-1)
- Add a one-line comment (in the plan/commit msg + optionally the script header) that panoptic-v2-core is intentionally NOT in `foundry.lock` — like `forge-std`, its pin lives only in `ci-install-deps.sh` (the source of truth); the lock stays the partial forge-managed subset. Prevents a future "fix."

## Out of scope (explicit)

- Bumping to upstream `main` (fixes since the Dec-2025 audit) — a separate, re-verified change.
- Migrating to canonical Panoptic V2 *deployment* addresses (vs the borrowed data model).
- Any change to `LongGammaWrapper` logic or the Phase-8 test assertions.
- Updating `foundry.lock` (intentional — see Task 8).

## Rollback

`git checkout feat/macro-hedge-agent -- contracts/panoptic-borrowed contracts/remappings.txt contracts/NOTICE contracts/script/ci-install-deps.sh .github/workflows/contracts-ci.yml` restores the vendored state; the branch is discardable. Zero impact to `feat/macro-hedge-agent` until merged.

<review_resolutions>
## Planning-review gate — how the r1 findings were resolved

Gate: Studio Producer selected **DevOps Automator** (primary) + **Reality Checker** (fixed). Both returned NEEDS WORK; 3 shared BLOCKERs.

- **B1 (no divergence gate; "byte-mirror" false — superset + import-rewrite)** → Task 2 added: per-file logic+license diff over the 32 vendored files (import lines stripped), the 4 superset files ignored by construction; the "byte-mirror" wording corrected to "logic+license byte-identical modulo the import-alias rewrite" in §Non-negotiables.
- **B2 (clean-clone build optional → must be mandatory + pre-deletion)** → Task 4 made mandatory and ORDERED before Task 5's `git rm`; explicit "deletion only after Tasks 2+4 green; never deletion-first" ordering invariant; confirmed `contracts-ci.yml` needs no edit (single dep entry point).
- **B3 (stale-cache false green)** → Task 4 prepends `forge clean` + `rm -rf lib/panoptic-v2-core` (cache-cold + dep-cold); Task 5 re-cleans post-deletion.
- **MAJOR-1 (`inst()` `|| true` silences fetch failure)** → Task 1 adds an explicit `rev-parse HEAD == d20b0aed` hard-fail assertion as the documented safety net; noted d20b0aed is currently `main`-reachable.
- **MINOR-1 (foundry.lock)** → Task 8: documented the intentional omission (matches forge-std).
- **MINOR-2 (remappings bijective)** → confirmed clean by both reviewers; no `@interfaces/` alias needed (resolves via `@contracts/interfaces`/`@tokens/interfaces`).
- **MINOR-3 (Task-6 guard)** → Task 7 owns it as NEW CI tooling with the exact concrete-import grep pattern + explicit deploy-helper exemption.
- **NOTICE accuracy** → Task 6 copies values verbatim from the restored `lib/panoptic-v2-core/LICENSE` rather than hand-asserting.

### r3 — resolving r2's gate (both reviewers confirmed B1/B2/B3/MAJOR-1/Task6/Task7/Task8 closed; one new MAJOR-2 + 2 minors)
- **MAJOR-2 (Task-4 keyless line falsely claimed "30/30 unit green" — the wrapper units fork in setUp despite the `.t.sol` name)** → Task 4 split into a KEYLESS leg (`env -u BASE_RPC_URL` build + `--no-match-contract LongGammaWrapper` non-fork specs) and a FORK leg (the ONLY proof of 30/30+2, env-exported, with a per-unit non-zero-passed + 0-failed assertion guarding against a 0-run false green). The inert `--fork-url` flag dropped (MINOR-A). Pre-existing CI keyless-exclusion bug noted explicitly OUT OF SCOPE (renaming to `.fork.t.sol` would break the bulloak `.tree`↔`.t.sol` co-location).
- **MINOR-4 (Task-2 gate could false-fail on UPSTREAM multi-line imports)** → added the fail-closed hand-inspection step (collapse multi-line `import {…}` and re-diff before concluding a provenance break); the gate never silently deletes.
- **MINOR-5 (M-3 base out of seam-guard scope)** → documented that `LongGammaWrapperBase.sol` is intentionally un-guarded (it sits behind the seam, imports the deploy helper by design).
- **Verified-closed by both r2 reviewers (no further action):** B1 (divergence gate iterates the vendored set, strips imports exactly — zero multi-line on the vendored side, 100% of `git rm` coverage), B2 (mandatory pre-deletion cold build, ordered, CI no-edit), B3 (forge clean + dep-cold), MAJOR-1 (rev-parse hard-fail), Task 6 (NOTICE verbatim from restored LICENSE + v1→v2 fix), Task 7 (real executable seam guard, structural helper exemption), Task 8 (foundry.lock intentional omission).
</review_resolutions>

## Risks (residual)

- **R1 (now gated):** body divergence between a vendored file and `d20b0aed` → Task 2 hard-fails BEFORE deletion (was: deferred to the suite). If it fires, the vendored copy was modified beyond imports — investigate before proceeding (do not delete).
- **R2 (low):** foundry eagerly compiles an unused superset file needing an alias we don't provide → foundry lazy-compiles only the reachable graph (the deploy helper imports 5 V4 concretes; the 4 superset files are not reachable). Task 4's cold build catches it if wrong.
- **R3 (policy, documented):** a fresh clone must run `script/ci-install-deps.sh` (already true for all deps; this adds one more). In the script header + NOTICE.
