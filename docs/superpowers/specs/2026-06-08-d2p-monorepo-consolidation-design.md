# d2p Monorepo Consolidation — design (Phase 10)

**Status:** REVISED v4 — READY (recipe empirically proven by a reversible local build). Two-way review: v1 (NEEDS WORK) → v2 (Git WM APPROVE-w/-minor + Reality Checker NB1+M-A) → v3 (NB1/M-A/MINOR resolved). **v4 = the local-build proof finding:** vendor ALL 14 Foundry lib deps as committed files (SUPERSEDES the v2 submodule re-registration), because abrigo's `contracts/.gitignore` blanket-ignores `lib/` and only 6 of 14 deps are tracked submodules — the other 8 are gitignored local `forge install` checkouts in NO git history, so neither the source nor a submodule-only monorepo can `forge build` from a clean clone. Vendoring → plain `git clone && forge build` works. Also: frontend package is `d2p-frontend` (root scripts use `--filter d2p-frontend`).

## v3 → v4 (from the reversible local-build proof, 2026-06-08)
A throwaway local build (`/home/jmsbpp/apps/d2p-monorepo`) executed §2–§6 and verified both pipelines. PROVEN: subtree lands Foundry at `packages/backend/contracts/`; frontend builds with no Foundry (committed `generated.ts`); codegen resolves `../backend/contracts` (byte-identical); `.planning` at root resolves for GSD; histories DAG-reachable. The build surfaced ONE real gap text-review missed → the vendoring decision below. **Decision (user 2026-06-08): VENDOR all 14 lib deps as committed plain files; remove `.gitmodules` entirely; un-ignore `lib/` under the backend contracts package.** This replaces §3a's submodule re-registration. CI/runbook simplify (no `submodules: recursive`, plain `git clone`).
**Date:** 2026-06-08
**Sub-project 1 of 2.** Sub-project 2 = "Full-live cornerstone integration" (Phase 11) — specced separately once the monorepo paths are real (preview in §9).

## Review-resolution log (v1 → v2)
- **B1 (both reviewers): wrong tree shape** — `abrigo-somnia` root is NOT the Foundry project (Foundry is at `abrigo-somnia/contracts/`; the repo also holds `keeper/ indexing/ subgraphs/ openspec/ adapters/ probes/ schemas/ tests/` + Python `pyproject.toml`/`uv.lock` + its own `.github/`/`CLAUDE.md`/`.planning/`). **Resolved (user decision):** migrate the WHOLE backend as `packages/backend` via plain subtree (no history rewrite). Foundry lands at `packages/backend/contracts/`; ALL paths updated accordingly (§3/§4). The non-contracts trees come along by design.
- **B2 (both): 6 Foundry git submodules** (`.gitmodules` in abrigo: `panoptic-helper, panoptic-sdk, protocol-v3, solady, v4-hooks-public, v4-periphery`, all under `contracts/lib/*`). Subtree imports gitlinks, not files; `.gitmodules` won't resolve at the new prefix. **Resolved (user decision): re-register submodules** at the new path (§3a recipe) — root `.gitmodules` with rewritten `path = packages/backend/contracts/lib/*`; clone/CI use `--recurse-submodules`.
- **B3 (Git WM): `git log <new-prefix>` does not follow originals per-file** after a subtree move (only DAG-reachable). **Resolved:** §10 reworded to the verifiable DAG-reachability claim (no per-file-follow guarantee — we chose subtree over filter-repo, so no SHA rewrite).
- **M1: wrong/again branch** — abrigo's active branch is `feat/somnia-strategist-live-deploy` (NOT `feat/macro-hedge-agent`) and abrigo has **no `main`**; the live-deploy artifacts (`somnia-strategist-deployment.json`) live on that branch. **Resolved (§2).**
- **M2/M3: `contracts/out` gitignored/untracked + `.gitignore` union** (abrigo bare `out/` vs frontend anchored `/out/`). **Resolved (§4 + §3b):** Foundry IS required for `contracts:gen`; the frontend-only `pnpm build` uses the committed `lib/contracts/generated.ts` (no Foundry). Per-package-anchored root `.gitignore` union spelled out.
- **M4: fresh-clone runbook + CI submodules.** **Resolved (§5 + §8).**
- **Validated correct by both:** §8 reversibility (sources are read-only inputs), merge-PR-#8-first for the frontend side, `subtree ≡ read-tree+merge -s ours` for the non-submodule case, `.env` is gitignored (no secret leak).

---

## §0 Goal & non-goals

**Goal:** Consolidate the two separate git repos — `d2p/frontend` (Next.js) and `d2p/abrigo/abrigo-somnia` (the whole backend: Foundry contracts + keeper + indexing + subgraphs + research) — into ONE permanent monorepo `d2p`, both commit histories preserved (DAG-reachable), a working pnpm workspace, intra-repo codegen, single CI, and a re-linked Vercel deploy. Foundation for single-repo delivery + the full-live integration (Phase 11).

**Non-goals (this phase):** the live cornerstone wiring (Phase 11); any contract changes; the backend `--no-mint`/SHILLER-fork-proof TODOs (Phase 11); deleting the old repos (archived read-only, not deleted); pruning the non-contracts backend trees (they come along; pruning is a later optional cleanup).

## §1 Target structure

```
d2p/                              # new repo (wvs-finance/d2p)
  package.json                    # root workspace scripts (delegate)
  pnpm-workspace.yaml             # packages: ['packages/frontend']  (backend is non-JS, §3)
  .gitmodules                     # rewritten → packages/backend/contracts/lib/*  (§3a)
  .gitignore                      # per-package-anchored union (§4)
  .planning/                      # CANONICAL — moved from frontend/.planning (history preserved)
  MILESTONES.md                   # carried from frontend
  .github/workflows/ci.yml        # two lanes: backend (forge) + frontend (pnpm)
  README.md                       # monorepo overview + fresh-clone runbook
  packages/
    frontend/                     # = current frontend repo (subtree, full history, DAG-reachable)
      app/ lib/ components/ wagmi.config.ts (→ ../backend/contracts/out) ...
      lib/contracts/generated.ts  # committed (frontend builds without Foundry)
      lib/apps/abrigo/cornerstone/buildbear-deployments.json  # the ONLY committed frontend mirror today (build input)
      # NOTE: somnia-strategist-deployment.json is NOT committed in frontend — it lives on the backend
      # branch at contracts/script/out/ → post-migration packages/backend/contracts/script/out/ (Phase 11 mirrors it)
    backend/                      # = whole abrigo-somnia (subtree, full history, DAG-reachable)
      contracts/                  # Foundry: foundry.toml src/ script/ test/ lib/(submodules) out/(gitignored)
      keeper/ indexing/ subgraphs/ openspec/ adapters/ probes/ schemas/ research/
      pyproject.toml uv.lock
      .planning/                  # abrigo's GSD history (reference, not the active root)
      .github/                    # abrigo's old workflows — INERT (only root .github/workflows runs)
```

## §2 Migration method (subtree, history-preserving, no rewrite)

**Source branches (verified against the live repos):**
- **frontend** — **merge PR #8 → `main` first** (PR #8 confirmed OPEN/MERGEABLE, base `main`, head `feat/phase-09-cornerstone-live-tx`), then migrate from `main` (clean linear base). Frontend remote = `wvs-finance/d2p-frontend`; the new monorepo is a NEW repo `wvs-finance/d2p` (§11.1).
- **backend** — migrate from **`feat/somnia-strategist-live-deploy`** (HEAD `6810c47`). **Justification (NB1):** abrigo HAS a `master`, but it is **stale — 141 commits behind** this branch and 0 ahead; ALL of abrigo Phases 11–18 (the live two-leg strategist deploy + the published `somnia-strategist-deployment.json` + the Panoptic/executor work) exist ONLY on `feat/somnia-strategist-live-deploy`, never merged to `master`. Migrating from `master` would LOSE the entire backend. So the feature-branch tip IS the de-facto trunk and is the correct base; it becomes the backend baseline in the monorepo. (Optionally fast-forward/merge it → abrigo `master` first for tidiness, but since `master` is 141 behind that's a cosmetic rename, not a gate.)

1. `git init` fresh local `d2p`; first commit = root scaffold (`package.json`, `pnpm-workspace.yaml`, `.gitignore` §4, `README.md`).
2. Subtree-merge each source into a subdir (preserves commits in the DAG; `subtree add` ≡ `read-tree --prefix` + `merge -s ours --allow-unrelated-histories`):
   - `git subtree add --prefix=packages/frontend <frontend-remote> main`
   - `git subtree add --prefix=packages/backend <abrigo-remote> feat/somnia-strategist-live-deploy`
   - Sources are read-only `git fetch` inputs — never written to (reversibility).
3. Apply the §3a submodule re-registration, §3/§4 path + tooling + .gitignore changes, §6 `.planning` move — as follow-up commits.
4. Push `d2p` → `wvs-finance/d2p`.

## §3 Workspace & tooling

- **`pnpm-workspace.yaml`:** `packages: ['packages/frontend']`. `packages/backend` is NOT a pnpm member (no consumable JS package) — it's present for `forge`/codegen/CI, referenced by relative path.
- **Root `package.json` scripts** (one command from root; the frontend package is named **`d2p-frontend`** — use `--filter d2p-frontend`, NOT `--filter frontend` which silently no-ops):
  - `"contracts:build": "forge build --root packages/backend/contracts"`
  - `"contracts:test": "forge test --root packages/backend/contracts"`
  - `"contracts:gen": "pnpm run contracts:build && pnpm --filter d2p-frontend run contracts:gen"`
  - `"build|dev|test": "pnpm --filter d2p-frontend <x>"`
- **Versions:** carry frontend's `packageManager`/`.nvmrc`; Foundry via `foundryup` (README + CI).

### §3a Vendor all Foundry lib deps (the v4 recipe — supersedes submodule re-registration)
The backend `forge build` needs **14** `lib/*` deps; only 6 are tracked submodules, the other 8 (`forge-std, v4-core, panoptic-v2-core, solmate, v3-core, v3-periphery, openzeppelin-contracts, clones-with-immutable-args`) are gitignored local checkouts in no git history. To make `git clone d2p && forge build` work with no submodule/forge-install step:
1. In `packages/backend/contracts/`: **`git rm --cached` the 6 submodule gitlinks** and **delete the inherited `.gitmodules`** (no submodules anywhere in the monorepo).
2. **Un-ignore `lib/`** — edit `packages/backend/contracts/.gitignore` to remove the blanket `lib/` ignore (keep `out/ cache/ broadcast/` anchored-ignored per §4).
3. **Commit all 14 `lib/<name>` dirs as plain files** (sourced from the backend working tree, which has them populated; strip any nested `.git`/`.gitmodules` inside the vendored deps so they are plain trees, not nested repos).
4. Verify `forge build --root packages/backend/contracts` passes, then verify from a **fresh plain `git clone`** (NO `--recurse-submodules`) that `forge build` still passes (the real reproducibility gate).
- Trade-off (accepted): bigger repo, deps frozen at current SHAs (update via re-vendor). This is the delivery-robust choice (clone-and-build).

### §3b Foundry-required codegen (M2)
`contracts/out/` is gitignored/untracked (Foundry build dir) — a clean clone has no ABIs until `forge build`. So `pnpm contracts:gen` REQUIRES Foundry + initialized submodules. The frontend-only `pnpm build` does NOT require Foundry — it uses the committed `packages/frontend/lib/contracts/generated.ts` (this is why Vercel works). Two distinct pipelines, never conflated (§10).

## §4 Codegen seam + artifacts + .gitignore union

- `packages/frontend/wagmi.config.ts`: change the absolute `/home/.../abrigo-somnia/contracts` project path → relative **`../backend/contracts`** (resolves to `packages/backend/contracts`; output `lib/contracts/generated.ts` shape unchanged, stays committed).
- **Deployment artifacts (MINOR-1 corrected):** the ONLY committed frontend mirror today is `packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json` (the build input; `artifact-loader.ts` statically imports just this). **`somnia-strategist-deployment.json` is NOT a committed frontend mirror** — it lives on the backend branch at `contracts/script/out/` and arrives via the backend subtree at `packages/backend/contracts/script/out/somnia-strategist-deployment.json`. A root `scripts/sync-artifacts.sh` refreshes the frontend mirror(s) from `packages/backend/contracts/script/out/*.json` after a backend provision/deploy. **Phase 11** decides whether the live-Somnia wiring reads `somnia-strategist-deployment.json` directly from the backend tree or introduces a committed frontend mirror (the route currently has those inputs pinned in `agent1-inputs.ts`, so a committed mirror is optional). The frontend never depends on the backend's gitignored `out/`.
- **Root `.gitignore` union (per-package-anchored — M3):** keep Foundry hygiene ignores scoped under the backend package — `packages/backend/contracts/out/`, `/cache/`, `/broadcast/` — using anchored paths, NOT a bare `out/` (a bare `out/` would wrongly sweep any `out/` under `packages/frontend/`). Keep the frontend's anchored ignores as-is. The committed deployment JSONs live outside any `out/` → not affected.

## §5 CI (single workflow, two lanes)

- `.github/workflows/ci.yml`, two jobs:
  - **backend:** plain `actions/checkout` (NO submodules — libs are vendored as committed files, §3a) → install Foundry → `forge fmt --check` + `forge build` + `forge test` (`--root packages/backend/contracts`; fork suites stay keyless-gated as today).
  - **frontend:** pnpm install → biome + tsc + vitest + playwright (e2e/a11y) on a local prod build, using the COMMITTED generated ABIs (no Foundry, no submodules in this lane).
  - Path filters so docs-only changes skip forge (optional).
- **Lighthouse** on the Vercel preview (unchanged).

## §6 GSD `.planning` continuity

- Frontend `.planning/` (183 tracked files) → monorepo **root `.planning/`** via `git mv packages/frontend/.planning .planning` (rename-detection preserves history) — the canonical GSD home going forward. **Verify (was Q4):** run one read-only GSD command from the root layout to confirm `.planning` resolves from repo root before relying on it.
- `packages/backend/.planning/` (abrigo's ~175 files) preserved as the contracts GSD history/reference (not the active root). MILESTONES.md carried from frontend at root.

## §7 Vercel re-link

- Point the Vercel project at `wvs-finance/d2p` with **Root Directory = `packages/frontend`** (Vercel monorepo support) → existing Next.js build works unchanged.
- Carry `NEXT_PUBLIC_*` (RPC_CELO/ETH/BASE/ARB/OP_PRIMARY, WALLETCONNECT_ID, APP_URL) + server-only `SOMNIA_OPERATOR_PK`/`AGENT1_ROUTE_SECRET` (Production+Preview; server-only NEVER `NEXT_PUBLIC_`). Setting the `NEXT_PUBLIC_*` vars is **expected to** close the long-standing preview-deploy gap (PRs #4–#8) — **gated on an actual green preview build** (§8 step 4), not assumed. (CLAUDE.md also notes velite/turbopack bundling history — confirm the preview is green before archival.)
- Decommission the old Vercel project after the new one builds green.

## §8 Cutover sequence (verified, reversible)

1. **Merge PR #8** → `frontend/main` (clean linear base).
2. Build `d2p` locally: scaffold → subtree both → §3a submodules → §3/§4 paths/tooling/.gitignore → §6 `.planning` move.
3. **Verify (two pipelines, fresh PLAIN clone — no submodules):**
   - `git clone d2p && pnpm install && pnpm build` (frontend, committed ABIs, NO Foundry) → green.
   - `forge build && forge test --root packages/backend/contracts` (Foundry; libs vendored, no submodule init, non-fork lanes) → green.
   - `pnpm --filter frontend test` (vitest) + playwright e2e → green.
   - One read-only GSD command from root resolves `.planning` (§6).
4. **Enumerate required env from code (M-A):** `grep -rEn "process\.env|env\." packages/frontend/{app,lib} | grep -oE "(NEXT_PUBLIC_[A-Z0-9_]+|[A-Z][A-Z0-9_]{3,})"` (+ check `lib/env.ts` t3 schema) → the authoritative server+public var set; confirm EVERY one is set in the new Vercel project (server-only NEVER `NEXT_PUBLIC_`). A missing server-only var (e.g. `AGENT1_ROUTE_SECRET`) yields a GREEN build but a runtime-broken `/api/abrigo/agent1` — the typecheck-green/runtime-broken class. Then push `d2p`; set up CI; create + GREEN the new Vercel project (preview build green = the §7 gate).
5. **Archive** the two old repos read-only (GitHub Archive + README pointer to `d2p`). Do NOT delete.
6. Update local working dirs + memory to the new path.

**Rollback:** until step 5 the old repos are untouched source-of-truth (subtree only `fetch`es them); abort by discarding `d2p`. After step 5, un-archive. No history rewrite anywhere (we chose subtree, not filter-repo), so no throwaway-clone caveat applies.

## §9 Phase 11 preview (separate spec)

Full-live cornerstone integration in the monorepo: `DEFAULT_MODE='live'` (Agent-1 live Somnia via the existing `/api/abrigo/agent1` route + the mirrored `somnia-strategist-deployment.json`; Agent-2 live BuildBear mint), replay/mock graceful fallback; school MOVES shown live (SHILLER↔PKE); Agent-2 mint live for PKE only (fork-proven 360360), SHILLER decision → honest "execution pending fork-proof" affordance; flip the Phase-9 ⊘ live row to ✓ via Evidence Collector. Cross-repo backend TODOs (now intra-repo, filed via Software Architect): `--no-mint`/fresh-executor BuildBear provisioning; fork-prove the SHILLER arm.

## §10 Acceptance (what must be TRUE — Phase 10)

- `d2p` exists with `packages/frontend` + `packages/backend`; **both histories DAG-reachable** (`git log --all` shows the originals; the subtree-merge commit's second parent reaches each source history). NOTE: path-scoped `git log -- packages/...` / blame begins at the subtree merge — per-file follow across the prefix is NOT guaranteed (subtree, no rewrite).
- **Frontend pipeline (no Foundry):** plain `git clone && pnpm install && pnpm build` green using committed `generated.ts`.
- **Backend pipeline (Foundry, vendored libs):** plain `git clone && forge build && forge test --root packages/backend/contracts` (non-fork) green — all 14 `lib/*` deps present as committed files; NO `.gitmodules`, NO submodule init.
- `pnpm --filter frontend test` (vitest) + playwright e2e green; `wagmi.config.ts` points at `../backend/contracts` (no absolute `/home/...`).
- Single CI workflow runs both lanes (backend lane `submodules: recursive`); Vercel new project preview GREEN with env set.
- Root `.planning/` is the canonical GSD home (resolves from root); `packages/backend/.planning/` preserved; MILESTONES carried.
- Root `.gitignore` keeps `packages/backend/contracts/{out,cache,broadcast}` ignored (anchored) while the committed frontend deployment JSONs stay tracked.
- Old repos archived read-only with pointer; nothing deleted; no secrets committed (`.env` stays ignored); server-only env stays server-only.

## §11 Open items for review
1. **Repo name/remote:** `wvs-finance/d2p` — confirm name + that creating it is authorized (only external/irreversible-ish step besides archival).
2. **Non-contracts backend trees** (`keeper/ indexing/ subgraphs/ openspec/ python`) come along with the whole-backend subtree — confirm OK to carry as-is now (optional prune is a later cleanup, out of scope).
3. **abrigo `.github/` workflows** land under `packages/backend/.github/` and are inert (only root `.github/workflows` runs on GitHub) — confirm we leave them (history) vs delete in a follow-up commit.
