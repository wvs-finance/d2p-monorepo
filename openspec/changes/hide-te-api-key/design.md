## Context

A Somnia smart contract consumes paid Trading Economics (TE) data via the JSON API Request agent. Two EVM facts (verified, cited 2026-06-01) make a fully-on-chain solution impossible: on-chain state is public (`private` ≠ confidential), and the EVM cannot perform network I/O. The Somnia json-fetch agent fetches a **public** URL through validators who record it on-chain — so a paid `client:secret` placed in the request leaks instantly. Confidential-EVM (Sapphire/ROFL), FHE, and zkTLS all relocate but never eliminate the off-chain key-holder. Therefore exactly one thing is irreducibly off-chain: **custody the key + make the authenticated HTTPS call.** Everything else is Solidity.

## Goals / Non-Goals

**Goals:**
- The paid TE key never appears on-chain, in logs, or in errors (raw or URL-encoded).
- On-chain consumers query TE data points by name; the key stays server-side.
- A verified catalog of queryable TE endpoints, deterministic on-chain scaling.

**Non-Goals:**
- Trust-minimization (proving the data is authentic without trusting the off-chain holder) — that is a later zkTLS phase.
- The escrow, the convex instrument, settlement (separate capabilities/changes).
- Economic-calendar / surprise data (not in this key's plan — 403).

## Decisions

- **Off-chain key-holder in TypeScript (`keeper`), not Solidity.** Forced by the two EVM facts above. Pure functions + result unions; zero runtime deps (Node ≥24 built-in `fetch`/test runner). *Alternative considered:* Chainlink Functions encrypted secrets — rejected (not on Somnia, sunsetting 2026-09); TEE/zkTLS — deferred (heavier, later phase).
- **Proxy normalizes each endpoint to `{value, unit, ts}`.** The on-chain selector stays a trivial `.value`, sidestepping the unverified richness of the json-fetch agent's selector syntax and isolating TE's messy array shapes off-chain. *Alternative:* on-chain JSONPath into raw TE arrays — rejected (fragile, agent-selector-dependent).
- **Two-layer catalog.** Layer 1 (Solidity): `mapping(bytes32 => Endpoint{proxyPath, selector, decimals, kind})` keyed by `keccak256(name)`. Layer 2 (off-chain JSON): `proxyPath → {teEndpoint, extract}`. Values are scaled integers `round(value · 10^decimals)`; `Int` where naturally negative (GDP growth, trade balance), else `Uint`.
- **Redaction masks the exact wire-form.** Redact the raw key, the `encodeURIComponent` form, AND the **URLSearchParams wire-form** that `buildUrl` actually emits — the two serializers disagree (space `+`/`%20`, `!` `%21`/`!`), and masking only the encodeURIComponent form leaked the wire-form (caught by a widened fast-check property; fixed). The property's char set includes spaces + `* ! ( ) '`.
- **On-chain consumer = `MacroOracleConsumer` (in `contracts/`), reusing the `SomniaAgentConsumer` request→callback paradigm.** It looks up an `Endpoint` from `TECatalog` by `keccak256(name)` and builds `fetchUint(PROXY_BASE + proxyPath, ".value", decimals)`. Pinned to the **Somnia testnet** platform `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776` + JSON API agent `13174292974160097713` (CLAUDE.md's mainnet `0x5E5205CF…` is a different deployment). On-chain Solidity lives under `contracts/` (supersedes the earlier `onchain/` path).
- **No on-chain key interface.** A Solidity function returning the key (the rejected `IZK_Keeper.complete()`) would publish it. The off-chain proxy is the only key-holder; the future `IMacroProofVerifier` is a *verifier* of a zkTLS proof, never a retriever. FHE/Fhenix is excluded (no network I/O; off-chain decryption).
- **Proxy access is obscurity, so the control is a spend ceiling.** The keyless proxy URL is public once on-chain; rather than pretend a rotating path is access control, the proxy enforces its own upstream TE budget + per-path rate limit so public abuse cannot exhaust the paid quota. Demo-only, documented.
- **On-chain scaling rounds half-away-from-zero, proxy is the single rounding authority.** Avoids JS `Math.round` sign-asymmetry; negative-into-`Uint` and out-of-range scaled values are typed errors, never silent wrap/truncation.

## Risks / Trade-offs

- [TE license forbids redistribution / on-chain publication] → private demo only; documented blocker, not shippable as-is without an Enterprise/redistribution license.
- [The keyless proxy URL is public on-chain and the json-fetch agent sends no auth header, so anyone reading the chain can call the proxy → free TE redistribution + paid-quota burn (financial DoS killing the downstream)] → this is **obscurity, not access control**, and is accepted as demo-only; the real protection is a proxy-enforced **upstream spend ceiling + per-path rate limit** so abuse cannot exceed a documented TE budget (serve cached/stale once exhausted).
- [The proxy must be reachable by Somnia validators over public **HTTPS** — `node:http` on localhost is not reachable] → provisioning a public HTTPS endpoint is a hard prerequisite of the live smoke test, decided before group-3 build (not deferred).
- [Economic Calendar returns 403 — not in this key's plan] → surprise-based calibration blocked until plan upgrade or alternate source; out of scope here.
- [TE response shapes / `decimals` drift] → Layer-1 pins decimals for deterministic on-chain scale; the proxy may read the live `decimals` field to stay in sync; re-probe each milestone (TE pricing/data is "stop-gap").
- [Trust: the off-chain holder could fabricate data] → accepted for this capability; trust-minimization (zkTLS proof verified on-chain) is a separate later change.

## Migration Plan

Additive — no existing behavior changes. `keeper/` (TS) already exists and passes; this change adds the keyless proxy + places the Solidity `TECatalog` library + the proxy route table. CI secret wiring is a follow-up task.

## Open Questions

- Proxy hosting target for the live demo (serverless fn vs small Node server) — decide at the proxy task.
- Whether to derive a surprise proxy from `LatestValue` vs `PreviousValue` (both available in the country snapshot) given the calendar 403 — deferred to the convex-instrument change.
