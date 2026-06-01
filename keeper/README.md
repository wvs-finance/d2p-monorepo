# keeper

Off-chain, key-holding side of the agentic data cooperative. Holds the paid
**Trading Economics** API key server-side and exposes **key-free** query helpers, so
the key never reaches the chain or any caller. TypeScript, **zero runtime deps**,
Node ≥24 (TS type-stripping + `node:test`).

## Run

```bash
npm ci
npm test                       # node --test (mocked, keyless) — no API key needed
node src/teClient.ts country/colombia   # live query; reads the key locally, hides it
```

## The API key — never on-chain, never in logs

- **Local:** `TRADING_ECONOMICS_API_KEY=<client:secret>` in a gitignored `.env` at the
  repo root (see `.env.example`). `teClient` injects it server-side and redacts it
  (raw / `encodeURIComponent` / URLSearchParams wire-form) from every value, log, and error.
- **CI:** unit tests run **keyless** on every push/PR (`keeper-ci.yml`, no secret —
  fork PRs cannot read secrets). The real key is used only by `keeper-live.yml`
  (`workflow_dispatch` only), bound to a **protected GitHub Environment `live-api`**.
  - Setup (one-time, on GitHub): create Environment `live-api` with a required reviewer
    and/or branch restriction → add secret `TRADING_ECONOMICS_API_KEY`. Never use
    `pull_request_target`.

## Layout

- `src/teClient.ts` — `fetchTE(path)` → typed `Result`; the key-hiding primitive.
- `src/catalog.ts` — route types + `extractScalar` + the deterministic scaling
  authority (`scaleToInt`, half-away-from-zero; negative-into-`Uint`/overflow → typed errors).
- `routes.json` — Layer-2 route table (proxyPath → TE endpoint + extractor + decimals/kind),
  consistent with `contracts/src/MacroOracle.sol` `TECatalog` (asserted in tests).

## Productionization blockers (demo-only — documented, not solved)

1. **TE license:** Standard plan is *no-data-distribution* — re-serving TE data / publishing
   it on-chain needs a negotiated Enterprise/redistribution license. This is a private demo.
2. **Public proxy URL:** the keyless proxy URL is recorded on-chain → publicly callable
   (obscurity, not access control). Mitigated by an upstream **spend ceiling + per-path
   rate limit** so abuse can't exhaust the paid quota; demo-only.
3. **Economic Calendar:** 403 on this plan — `Actual − Forecast` surprise data is unavailable
   until a plan upgrade or alternate source.

## Trust-minimization (future)

The contract trusts this proxy today. The upgrade path is **zkTLS** (`IMacroProofVerifier`
in `contracts/src/MacroOracle.sol`): the off-chain prover (holding the key) proves the TE
value is authentic and the contract **verifies the proof** — never receiving the key.
