> Scope note: Group 1 delivers the **off-chain key-custody primitive only**. The
> end-to-end "key never on-chain" guarantee is NOT demonstrated until Group 3 (proxy)
> + a live Somnia smoke test exist. On-chain Solidity lives under `contracts/`.

## 1. Off-chain key-hidden query primitive (keeper) — DONE

- [x] 1.1 Create `keeper/` TypeScript project (Node ≥24, zero runtime deps, `node:test`)
- [x] 1.2 `loadKey` with env + robust `.env` fallback (`export`/quotes/whitespace) + typed `MissingKeyError`
- [x] 1.3 `buildUrl` (server-side key + `f=json`) and `parseEnv`
- [x] 1.4 Encoding-aware `redact` — raw + `encodeURIComponent` + **URLSearchParams wire-form** (fixes the `+`/`%21` wire-form leak)
- [x] 1.5 `fetchTE` returning a typed `Result` (missing_key/http/network/timeout/parse), redacting all errors incl. `cause`
- [x] 1.6 fast-check properties (redaction over a charset incl. spaces + `* ! ( ) '`; parseEnv round-trip) + concrete tests; 8/8 GREEN
- [x] 1.7 Live-verify against the real API with the key hidden (`country/colombia`)
- [x] 1.8 Redact the **success payload** too (not just errors) inside `fetchTE`, with a test where the mocked TE body echoes the request query (wire-form) [gate M7]

## 2. Verified TE endpoint catalog (under `contracts/`)

- [x] 2.0 Commit the live-probe evidence (`openspec/changes/hide-te-api-key/probe-log.md`) backing the 10 endpoints + pinned decimals [gate M5]
- [ ] 2.1 Finalize the Solidity `TECatalog` library + `Endpoint`/`MacroClass` types in `contracts/src/MacroOracle.sol` (sketch exists; pin testnet platform/agent) [gate M4]
- [x] 2.2 Add Layer-2 proxy route table `keeper/routes.json` (`proxyPath → {teEndpoint, extract, decimals, kind, unit}`) for the 10 probed endpoints
- [x] 2.3 Test asserting Layer-1 (`TECatalog`) ↔ Layer-2 (`routes.json`) consistency (`keeper/test/routes.consistency.test.ts`: every `proxyPath` matches; decimals/kind agree)

## 3. Keyless HTTP proxy (makes the key-hidden data agent-callable)

- [ ] 3.0 **Prerequisite:** decide + provision a public **HTTPS** proxy endpoint reachable by Somnia validators (localhost is not) [gate M3-RC]
- [x] 3.1 Behavior spec written FIRST as `keeper/test/proxy.test.ts` (routing, normalize, rate-limit, spend-ceiling, no-leak) — RED before impl
- [x] 3.2 Implement `keeper/src/proxy.ts` (zero-dep): keyless `proxyPath` → route → `fetchTE` → extract → normalize; reuses typed-`Result`; never logs key or upstream URL; generic errors only; + `node:http` server wrapper
- [x] 3.3 Implement the **scaling authority** in `keeper/src/catalog.ts` (`scaleToInt`/`roundHalfAwayFromZero`/`extractScalar`/`normalize`): round half-away-from-zero to pinned `decimals`; negative-into-`Uint` → typed error; out-of-range → typed error; TDD'd in `keeper/test/catalog.test.ts` (incl. fast-check sign-symmetry property) [gate M3]
- [x] 3.4 **Spend ceiling + per-path rate limit** in `makeProxy`: cap upstream TE calls per window, serve cached once exhausted (`quota_exhausted` if uncached), `429` per-path on abuse [gate B2]
- [x] 3.5 Tests (`proxy.test.ts` + `catalog.test.ts`): keyless request → normalized scalar; no key in body/errors (echoed upstream field stripped); unknown path → 404; rate-limit + budget-cap + window-reset enforced; scaling edge cases. 28/28 green.
- [ ] 3.6 Live smoke (requires 3.0): `curl` a catalog path against the deployed HTTPS proxy → `{value,unit,ts}`, no key in response

## 4. CI / secrets (backed by spec requirements)

- [x] 4.1 `.github/workflows/keeper-ci.yml` — `pull_request`+`push` job runs `npm test` (mocked, NO secret), least-privilege `permissions: contents: read`
- [x] 4.2 `.github/workflows/keeper-live.yml` — `workflow_dispatch`-only live job behind protected Environment `live-api` holding `TRADING_ECONOMICS_API_KEY`; no `pull_request_target` (GitHub Environment is a one-time manual setup, documented in README) [gate M1]
- [x] 4.3 Document the secret setup in `keeper/README.md`

## 5. Documentation / blockers

- [x] 5.1 Record the three blockers (TE license no-redistribution; public keyless-proxy-URL = obscurity + sacrificial-quota-capped; calendar 403) in `keeper/README.md` and `contracts/src/MacroOracle.sol` NatSpec
- [x] 5.2 Note the zkTLS trust-minimization upgrade path (`IMacroProofVerifier`) as a future change (README + MacroOracle.sol)
- [x] 5.3 Flag (for the convex-instrument change) that a snapshot-derived `LatestValue−PreviousValue` surprise is an UNVALIDATED proxy for the 403'd calendar `Actual−Forecast` — recorded in `design.md` Open Questions [gate M6]
