## Why

A Somnia smart contract must consume paid **Trading Economics** data via the JSON API Request agent, but the agent fetches the request URL through validators who **publish it on-chain**, and the EVM cannot keep a secret (public state) — so a paid `client:secret` used directly would leak instantly. Research confirmed this boundary is irreducible (no Solidity/ZK/Somnia-native way to use the key on-chain). The key must be held and used **off-chain**, while on-chain consumers still receive the data. Hiding the API key is the project's **first feature** — every downstream capability (escrow, the convex instrument, settlement) depends on it.

## What Changes

- Add a **key-hidden TE query primitive** (off-chain TypeScript `keeper`): callers pass only a TE *path*; the key is read from env/`.env`, injected server-side, and never appears in return values, logs, or errors (raw, `encodeURIComponent`, or URLSearchParams wire-form). *(Implemented — the **off-chain key-custody primitive only**; 8/8 tests incl. a fast-check property that caught both the encoded-key and wire-form leaks. The end-to-end "key never on-chain" guarantee is NOT demonstrated until the proxy + a live Somnia smoke test exist.)*
- Add a **verified TE endpoint catalog** (two layers): a Solidity `Endpoint` mapping (in `contracts/`) the contract queries by `keccak256(name)`, and an off-chain proxy route table mapping each keyless path to its TE endpoint + extractor. 10 data points live-probed 2026-06-01 (Colombia macro, USD/COP, commodities) — evidence recorded in `probe-log.md`.
- Add a **keyless HTTP proxy** wrapping the primitive so the on-chain json-fetch agent calls a key-free URL; the proxy injects the key server-side and normalizes each endpoint to `{value, unit, ts}`. *(Next.)*
- **CI**: store the key as a GitHub Environment secret; mocked tests run keyless on every PR, an opt-in live job uses the secret. *(Later.)*

## Capabilities

### New Capabilities
- `te-key-hidden-access`: querying Trading Economics from on-chain consumers (via the Somnia json-fetch agent) without the paid API key ever appearing on-chain, in logs, or in errors — plus the verified catalog of queryable endpoints.

### Modified Capabilities
<!-- none — first capability in this repo's OpenSpec track -->

## Impact

- **New off-chain code**: `keeper/` (TypeScript, zero runtime deps, Node ≥24) — the irreducible off-chain key-holder. The keyless HTTP proxy is added here.
- **New on-chain artifact**: a Solidity `TECatalog` library + `MacroOracleConsumer` (the `Endpoint` mapping) under `contracts/` (`contracts/src/MacroOracle.sol`).
- **Secrets**: paid TE key in `.env` (gitignored) + a GitHub Environment secret; never committed, never on-chain.
- **Documented blockers (not solved here)**: (1) TE Standard license forbids redistribution / on-chain publication — private demo only; (2) the on-chain proxy URL is publicly callable, so anyone reading the chain can hit the keyless proxy (mitigate: unguessable/rotating path + rate-limit; demo-only); (3) the TE Economic Calendar is **not in this key's plan** (403) — blocks surprise-based calibration until a plan upgrade or alternate source.
- **Composes with**: `evm-tdd` (BTT specs + invariants) for the Solidity side; fast-check for the TS requirements; GSD retained only for milestone governance + the mandatory review gate.
