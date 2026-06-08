# abrigo-somnia

Substrate for the **Somnia-side stack** of Abrigo — the `K_AI` (agent-payment) leg of the cost model defined in `../abrigo-analytics/notes/SOMNIA_DRAFT.md`.

## Position in the abrigo family

| Repo | Cost leg | Substrate |
|---|---|---|
| `abrigo-x402` | `K_D` (data) | x402-on-Celo, USDC-denominated, Graph/Agora-priced |
| **`abrigo-somnia`** | **`K_AI` (agent)** | **Somnia L1, SOMI-denominated, IAgentRequester escrow** |
| `abrigo-analytics` | joint estimation | Hawkes/NHPP, Carr–Madan replication |
| `abrigo-marketing` | positioning | narrative, GTM |

## Scope (per SOMNIA_DRAFT.md)

1. **K_AI substrate** — Solidity wrappers over `IAgentRequester` (mainnet impl `0x5E5205CF39E766118C01636bED000A54D93163E6`), accounting for the three agent classes:
   - `json-fetch` — 0.03 SOMI/call
   - `llm-inference` — 0.07 SOMI/call
   - `llm-parse-website` — 0.10 SOMI/call
2. **SOMI/USD oracle adapter** — off-chain feed until a native on-chain oracle ships (Protofire-Chainlink on Somnia covers USDC/ETH/BTC only as of 2026-05-23).
3. **Somnia agent UX use cases** — agent-driven user interfaces to Abrigo (the open question in SOMNIA_DRAFT.md §OPEN).
4. **Reactive Network cross-chain glue** — event-driven bridge between the Celo-side x402 substrate (`abrigo-x402`) and the Somnia-side agent calls.

## Status

Iteration 0 — scaffolding. Planning under GSD (`/gsd:new-project`).
