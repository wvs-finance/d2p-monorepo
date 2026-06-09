# d2p — monorepo

Consolidated home for the **d2p** project: the Next.js frontend and the full
backend (Foundry contracts + keeper + indexing + subgraphs + research). Both
commit histories are preserved (DAG-reachable) via `git subtree`.

```
d2p-monorepo/
  package.json            # root workspace delegate scripts (--filter d2p-frontend)
  pnpm-workspace.yaml     # packages: ['packages/frontend']  (backend is non-JS)
  .gitignore              # per-package-anchored union (anchored Foundry ignores)
  .planning/              # canonical GSD home (moved from frontend/.planning)
  .github/workflows/ci.yml# two lanes: backend (forge) + frontend (pnpm)
  packages/
    frontend/             # Next.js app (subtree from wvs-finance/d2p-frontend@main)
    backend/              # whole abrigo-somnia (subtree, feat/somnia-strategist-live-deploy)
      contracts/          # Foundry — lib/* deps are VENDORED as committed plain files
                          # (no submodules anywhere; plain `git clone` builds)
```

## Plain-clone runbook (no submodules, no `forge install`)

The Foundry `lib/*` dependencies are **vendored as committed plain files** — there
are no git submodules and no `.gitmodules` in this repo. A plain clone builds both
lanes with no extra fetch step.

```bash
# clone (NO --recurse-submodules needed — there are no submodules)
git clone https://github.com/wvs-finance/d2p-monorepo.git
cd d2p-monorepo

# --- frontend lane (no Foundry required; uses committed generated ABIs) ---
pnpm install
cp packages/frontend/.env.example packages/frontend/.env   # fill values
pnpm build                                                   # = pnpm --filter d2p-frontend build

# --- backend lane (Foundry) ---
# install Foundry once if needed:
curl -L https://foundry.paradigm.xyz | bash && foundryup
forge build --root packages/backend/contracts
# Unit suite (keyless — what a fresh clone can run with no RPC env vars):
forge test  --root packages/backend/contracts --no-match-path '*fork*'
# Fork suites need RPC env vars (BASE_RPC_URL, etc.) + a fork-state/ dir; CI runs
# them on a separate lane. Plain `forge test` (no filter) will fail those 14 here.
```

### Codegen (regenerate ABIs from contracts)

```bash
pnpm contracts:gen   # forge build (backend) + wagmi generate (frontend)
```

`packages/frontend/wagmi.config.ts` resolves contracts at the relative path
`../backend/contracts` (no absolute machine paths). The committed
`packages/frontend/lib/contracts/generated.ts` is what lets the frontend build
without Foundry (this is how the Vercel deploy works).

## Notes

- **Foundry toolchain:** install via [`foundryup`](https://book.getfoundry.sh/getting-started/installation).
  The pinned toolchain is `forge 1.5.x` (solc 0.8.24, cancun).
- **`lib/v4-hooks-public`** is compile-`skip`ped in `foundry.toml` (nothing in
  `src/`/`test/`/`script/` imports it); its deep transitive `lib/` tree is not
  vendored to keep the repo lean. The hook sources under its `src/` remain present
  for the `v4-hooks/` remapping.
- **GSD planning:** the canonical `.planning/` lives at the repo root.
  `packages/backend/.planning/` is preserved as the contracts GSD reference.
