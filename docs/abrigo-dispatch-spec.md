# abrigo-analytics — frontend content sync dispatch workflow

This document specifies the GitHub Actions workflow that must be added MANUALLY to
`wvs-finance/abrigo-analytics` so that pushes to its `main` branch trigger the
`wvs-finance/frontend` `sync-abrigo-content.yml` workflow.

This plan (02-08) cannot push to `wvs-finance/abrigo-analytics` — the user must add this file.

---

## File to add

**Path in wvs-finance/abrigo-analytics:** `.github/workflows/dispatch-frontend-sync.yml`

```yaml
name: Dispatch frontend content sync

on:
  push:
    branches: [main]
    paths:
      - 'scratch/**/*.md'
      - 'scratch/**/*.mdx'
      - 'docs/**/*.md'
      - 'docs/**/*.mdx'
      - 'notebooks/**/*.ipynb'

jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - name: Dispatch repository_dispatch event to frontend
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.FRONTEND_DISPATCH_PAT }}
          repository: wvs-finance/frontend
          event-type: abrigo-content-updated
          client-payload: '{"ref": "${{ github.sha }}"}'
```

---

## Required secrets

| Repo | Secret name | Scope | Purpose |
|------|-------------|-------|---------|
| `wvs-finance/abrigo-analytics` | `FRONTEND_DISPATCH_PAT` | Classic PAT, scope `repo` on `wvs-finance/frontend` | Allows dispatching `repository_dispatch` events to the frontend repo |
| `wvs-finance/frontend` | `ABRIGO_READ_PAT` | Classic PAT, scope `repo:read` on `wvs-finance/abrigo-analytics` | Allows `actions/checkout` of abrigo source in the sync workflow |

To create a classic PAT: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic).

---

## Event contract

- **Event type:** `abrigo-content-updated` (must match verbatim in both repos)
- **Client payload:** `{ "ref": "<commit SHA>" }`
- The frontend workflow uses `github.event.client_payload.ref` to checkout the exact same SHA, ensuring atomic sync (no race between the push and the checkout)

---

## CI gate on the resulting PR

When the sync job creates a PR with branch `auto/sync-abrigo-content`, the existing `ci.yml` workflow fires automatically (it triggers on `pull_request:` without branch restrictions). The PR's merge gate is:

- `lint` — biome check
- `typecheck` — tsc --noEmit + velite build
- `test-unit` — vitest
- `impeccable` — impeccable detect
- `test-e2e` + `test-a11y` + `test-lighthouse` — on deployment_status (Vercel preview)

---

## Verification steps (after adding the workflow + PATs)

1. Push a trivial change to `wvs-finance/abrigo-analytics/scratch/test-sync.md` (delete after)
2. In abrigo-analytics Actions tab: confirm `Dispatch frontend content sync` runs successfully
3. In frontend Actions tab: confirm `Sync abrigo content` fires via `repository_dispatch` event
4. A PR titled `content: sync iteration and research content from abrigo-analytics` should appear in frontend
5. The PR's CI jobs should all pass (green checks)
6. Delete the test PR and `test-sync.md` commit from abrigo-analytics

---

## Path routing note

The sync step copies abrigo content into `content/research/`:

```
_abrigo/scratch/ → content/research/scratch/
_abrigo/docs/    → content/research/docs/
```

If the Velite `research` collection schema reads from `content/research/`, this routing is correct.
If future plans change the target directory, update the rsync step in `.github/workflows/sync-abrigo-content.yml`.
