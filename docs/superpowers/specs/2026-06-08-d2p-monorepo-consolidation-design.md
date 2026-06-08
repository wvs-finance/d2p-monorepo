# d2p Monorepo Consolidation — design (Phase 10)

**Status:** DRAFT — pending 2-way review (Reality Checker + DevOps Automator) + user approval.
**Date:** 2026-06-08
**Sub-project 1 of 2.** Sub-project 2 = "Full-live cornerstone integration" (Phase 11) — specced separately once the monorepo paths are real (preview in §9).
**Decisions locked (brainstorm 2026-06-08):** umbrella monorepo `packages/frontend` + `packages/contracts`; PERMANENT (both migrate, dev moves here); migration via **git subtree-merge into a fresh `d2p` repo** preserving both histories; GSD `.planning` becomes root (frontend's), contracts' planning preserved under the subtree.

---

## §0 Goal & non-goals

**Goal:** Consolidate the two separate git repos — `d2p/frontend` (Next.js) and `d2p/abrigo/abrigo-somnia` (Foundry contracts) — into ONE permanent monorepo `d2p`, with both commit histories preserved, a working pnpm workspace, intra-repo codegen, a single CI, and a re-linked Vercel deploy. This is the foundation for delivering as a single repository and for the full-live integration (Phase 11), which turns the cross-repo seam into an intra-repo path.

**Non-goals (this phase):** the live cornerstone wiring (Phase 11); any contract changes; the backend `--no-mint`/SHILLER-fork-proof TODOs (Phase 11 cross-repo items); deleting the old repos (they are archived read-only, not deleted).

## §1 Target structure

```
d2p/                              # new repo (wvs-finance/d2p)
  package.json                    # root: workspace scripts, delegates to packages
  pnpm-workspace.yaml             # packages: ['packages/frontend']  (contracts is non-JS, see §3)
  .planning/                      # CANONICAL — moved from frontend/.planning (history preserved)
  MILESTONES.md                   # carried forward from frontend
  .github/workflows/ci.yml        # two lanes: contracts (forge) + frontend (pnpm)
  README.md                       # monorepo overview + run-it
  packages/
    frontend/                     # = the current frontend repo (subtree, full history)
      app/ lib/ components/ ...
      wagmi.config.ts             # repointed → ../contracts/out  (intra-repo)
      package.json (name: "frontend")
      .planning/  → REMOVED here (moved to root; see §6)
    contracts/                    # = abrigo-somnia (subtree, full history)
      foundry.toml src/ script/ test/ out/ lib/ ...
      .planning/                  # PRESERVED (abrigo-somnia's GSD history, read-reference)
```

## §2 Migration method (subtree-merge, history-preserving)

1. `git init` a fresh local `d2p`; first commit = root scaffold (root `package.json`, `pnpm-workspace.yaml`, `README.md`, `.gitignore` union).
2. Add each source repo as a remote and **subtree-merge into a subdirectory**, preserving history:
   - `git remote add fe <frontend>` ; `git fetch fe` ; `git merge -s ours --no-commit --allow-unrelated-histories fe/main` ; `git read-tree --prefix=packages/frontend/ -u fe/main` ; commit. (Equivalently `git subtree add --prefix=packages/frontend fe main`.)
   - Same for `contracts` from `abrigo-somnia` `feat/macro-hedge-agent` (its active branch) → `packages/contracts/`.
   - **Decision (open Q1):** which frontend branch is the base — `main` or the PR-#8 branch `feat/phase-09-cornerstone-live-tx`. Recommend: **merge PR #8 first**, then migrate from `main` (clean linear base) — see §8.
3. Push `d2p` to the new GitHub remote `wvs-finance/d2p`.

**Why subtree over filter-repo:** preserves full history under each subdir with standard git, no history rewrite, reversible (old repos untouched until archived). Trade-off: pre-migration commits show old top-level paths (acceptable — they predate the monorepo).

## §3 Workspace & tooling

- **`pnpm-workspace.yaml`:** `packages: ['packages/frontend']`. `packages/contracts` is a **Foundry project, NOT a pnpm workspace member** (it has no consumable `package.json`/JS exports) — it lives in the repo for `forge build` + codegen + CI, referenced by relative path, not by workspace resolution. (If contracts ever needs JS tooling, add a thin `package.json`; not now — YAGNI.)
- **Root `package.json` scripts** delegate, so one command works from root:
  - `"contracts:build": "forge build --root packages/contracts"`
  - `"contracts:test": "forge test --root packages/contracts"`
  - `"contracts:gen": "pnpm run contracts:build && pnpm --filter frontend run contracts:gen"` (frontend's wagmi codegen)
  - `"build": "pnpm --filter frontend build"`, `"dev": "pnpm --filter frontend dev"`, `"test": "pnpm --filter frontend test"`
- **Node/pnpm:** pin via root `packageManager` + `.nvmrc` (carry frontend's versions). **Foundry:** documented in README (`foundryup`); CI installs it.

## §4 Codegen seam (the cross-repo → intra-repo change)

- `packages/frontend/wagmi.config.ts`: change the `project`/include path from the absolute `/home/jmsbpp/apps/d2p/abrigo/abrigo-somnia/contracts` to the relative **`../contracts`** (resolves to `packages/contracts`). Codegen output `lib/contracts/generated.ts` is unchanged in shape.
- **Deployment artifacts:** the vendored `somnia-strategist-deployment.json` + `buildbear-deployments.json` currently mirrored under `packages/frontend/lib/apps/abrigo/cornerstone/` stay there (committed). A root script `scripts/sync-artifacts.sh` copies them from `packages/contracts/script/out/` → the frontend path (run after a contracts provision/deploy). This replaces the manual cross-repo mirror; documented in the runbook.
- **`pnpm contracts:gen` must run before `pnpm build`** (the frontend `prebuild` already chains velite; add the contracts gen note). Generated `lib/contracts/generated.ts` stays committed so a clean `pnpm build` works without Foundry installed (CI/Vercel parity — Vercel won't have Foundry).

## §5 CI (single workflow, two lanes)

- One `.github/workflows/ci.yml` with two jobs:
  - **contracts:** install Foundry → `forge fmt --check` + `forge build` + `forge test` (the fork suites stay keyless-gated as today).
  - **frontend:** pnpm install → biome + tsc + vitest + playwright (e2e/a11y) on a local prod build, using the COMMITTED generated ABIs (no Foundry needed in this lane).
  - Path filters so a docs-only change doesn't run forge, etc. (optional optimization).
- **Lighthouse** on the Vercel preview (unchanged).

## §6 GSD `.planning` continuity

- The **frontend `.planning/` moves to the monorepo root** `.planning/` (it's the canonical GSD home going forward — the milestone/roadmap/phases history). Subtree brings it in under `packages/frontend/.planning/`; a follow-up commit `git mv packages/frontend/.planning .planning` relocates it to root (history preserved through the move).
- **`abrigo-somnia/.planning/` stays under `packages/contracts/.planning/`** as the contracts GSD history/reference (not the active planning root). Its MILESTONES/ROADMAP are historical.
- New phases (10, 11, …) are authored in the root `.planning/`. Phase 10 itself is registered there post-migration (or pre-migration in the frontend repo and carried in — see §8).

## §7 Vercel re-link

- Create/point the Vercel project at `wvs-finance/d2p` with **Root Directory = `packages/frontend`** (Vercel monorepo support) — the existing Next.js build config then works unchanged.
- Carry the `NEXT_PUBLIC_*` env vars (RPC_CELO/ETH/BASE/ARB/OP_PRIMARY, WALLETCONNECT_ID, APP_URL) + the new server-only `SOMNIA_OPERATOR_PK`/`AGENT1_ROUTE_SECRET` into the new project (Production+Preview). **This also closes the long-standing deploy gap** (PRs #4–#8 had failing Vercel previews on missing env). Server-only vars never `NEXT_PUBLIC_`.
- The old Vercel project (linked to `frontend`) is decommissioned after the new one builds green.

## §8 Cutover sequence (verified, reversible)

1. **Merge PR #8** into `frontend/main` first (clean linear base for the subtree). [Q1]
2. Build the `d2p` monorepo locally (subtree-merge both; root scaffold; path/tooling/CI/.planning changes).
3. **Verify by clean clone:** `git clone d2p && pnpm install && pnpm contracts:gen && pnpm build` succeeds AND `forge test --root packages/contracts` (non-fork lanes) passes — BEFORE any old-repo archival.
4. Push `d2p`; set up CI; create + green the new Vercel project.
5. **Archive** the two old repos read-only (GitHub "Archive", + a README pointer to `d2p`). Do NOT delete.
6. Update local working dirs / memory to the new path.

**Rollback:** until step 5, the old repos are the source of truth and untouched; abort by discarding `d2p`. After step 5, un-archive.

## §9 Phase 11 preview (separate spec)

Full-live cornerstone integration in the monorepo: `DEFAULT_MODE='live'` (Agent-1 live Somnia via the existing `/api/abrigo/agent1` route + the mirrored `somnia-strategist-deployment.json`; Agent-2 live BuildBear mint), replay/mock graceful fallback; school MOVES shown live (SHILLER↔PKE); Agent-2 mint live for PKE only (fork-proven 360360), SHILLER decision → honest "execution pending fork-proof" affordance; flip the Phase-9 ⊘ live row to ✓ via Evidence Collector. Cross-repo backend TODOs (now intra-repo, filed via Software Architect): `--no-mint`/fresh-executor BuildBear provisioning; fork-prove the SHILLER arm.

## §10 Acceptance (what must be TRUE — Phase 10)

- `d2p` repo exists with `packages/frontend` + `packages/contracts`, **both histories preserved** (`git log packages/frontend` and `git log packages/contracts` show the originals).
- `pnpm install && pnpm contracts:gen && pnpm build` green from a clean clone; `forge test --root packages/contracts` (non-fork) green; `pnpm --filter frontend test` (vitest) + playwright e2e green.
- `wagmi.config.ts` points at `../contracts` (no absolute `/home/...` path); `lib/contracts/generated.ts` regenerates identically.
- Single CI workflow runs both lanes; Vercel new project builds green with env set (deploy gap closed).
- Root `.planning/` is the canonical GSD home; `packages/contracts/.planning/` preserved; MILESTONES carried.
- Old repos archived read-only with pointer; nothing deleted.
- No secrets committed; server-only env stays server-only.

## §11 Open questions for review
1. **Base branch / PR #8:** merge PR #8 before migrating (recommended) vs migrate from the PR branch vs migrate from `main` and carry #8 as an open PR against `d2p`.
2. **contracts `lib/` (Foundry submodules):** `packages/contracts/lib/*` are large vendored deps (some are git submodules). Confirm subtree brings them as plain files vs needing submodule re-init; decide whether to keep them in-tree (simplest) or as submodules.
3. **Repo name/remote:** `wvs-finance/d2p` — confirm name + that creating it is authorized.
4. **`.planning` at root vs `packages/frontend`:** root (recommended, canonical) — confirm the GSD tooling resolves `.planning` from the repo root when commands run from root.
