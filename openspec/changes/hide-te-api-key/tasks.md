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
- [ ] 2.2 Add Layer-2 proxy route table `keeper/routes.json` (`proxyPath → {teEndpoint, extract, output}`) for the 10 probed endpoints
- [ ] 2.3 Test asserting Layer-1 (`TECatalog`) ↔ Layer-2 (`routes.json`) consistency (every `proxyPath` matches; decimals/kind agree)

## 3. Keyless HTTP proxy (makes the key-hidden data agent-callable)

- [ ] 3.0 **Prerequisite:** decide + provision a public **HTTPS** proxy endpoint reachable by Somnia validators (localhost is not) [gate M3-RC]
- [ ] 3.1 Specify the proxy behavior tree + fast-check properties FIRST: key never in response/logs/errors (incl. upstream URL); route table drives extraction; normalized `{value,unit,ts}`
- [ ] 3.2 Implement `keeper/proxy.ts` (zero-dep): keyless `proxyPath` → route → `fetchTE` → extract → normalize; reuse `redact`/typed-`Result`; never log key or upstream URL; generic errors only
- [ ] 3.3 Implement the **scaling authority**: round half-away-from-zero to pinned `decimals`; negative-into-`Uint` → typed error; out-of-range → typed error [gate M3]
- [ ] 3.4 Implement the **spend ceiling + per-path rate limit**: cap upstream TE calls per window, serve cached/stale once exhausted, `429` per-path on abuse [gate B2]
- [ ] 3.5 Tests: keyless request → normalized scalar; response/logs contain no key/upstream URL; unknown path → 404; rate-limit + budget-cap enforced; scaling edge cases
- [ ] 3.6 Live smoke (requires 3.0): `curl` a catalog path against the deployed HTTPS proxy → `{value,unit,ts}`, no key in response

## 4. CI / secrets (backed by spec requirements)

- [ ] 4.1 `pull_request` job: keeper + proxy mocked tests, NO secret, least-privilege `permissions: contents: read`
- [ ] 4.2 `workflow_dispatch` live job behind a protected Environment holding `TRADING_ECONOMICS_API_KEY`; never `pull_request_target` [gate M1]
- [ ] 4.3 Document the secret setup in `keeper/README.md`

## 5. Documentation / blockers

- [ ] 5.1 Record the three blockers (TE license no-redistribution; public keyless-proxy-URL = obscurity + sacrificial-quota-capped; calendar 403) in `keeper/README.md` and contract NatSpec
- [ ] 5.2 Note the zkTLS trust-minimization upgrade path (`IMacroProofVerifier`) as a future change
- [ ] 5.3 Flag (for the convex-instrument change) that a snapshot-derived `LatestValue−PreviousValue` surprise is an UNVALIDATED proxy for the 403'd calendar `Actual−Forecast` — to be proven, not assumed [gate M6]
