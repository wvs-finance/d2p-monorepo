Data accesibility

    -------------                         ---------
   | contract    |  ------------------>  |  REST  |
   |             |  <-- (json)--------   |  API   |
    --------------                        ---------

function fetchString(string url, string selector) returns (string)
function fetchUint(string url, string selector, uint8 decimals) returns (uint256)
function fetchInt(string url, string selector, uint8 decimals) returns (int256)
function fetchBool(string url, string selector) returns (bool)
function fetchStringArray(string url, string selector) returns (string[])
function fetchUintArray(string url, string selector, uint8 decimals) returns (uint256[])


- Deterministic workflow


- The target is then build a REST API for fecthcing all source of high quality macro data for
countries that make it difficiult by UI, IX or corporate walls to fetch macro data at available frequencie
	- For the colombian case Is there a bridge between, have people done, open source bridge between like the complex data sources like Danny, Ben Rep, this is a radio in Colombia and build an arrest API that helps fetch data that for the public ? 
	
	In case not, we need to look for other countries that have more democatized and advanced economies for people who have done the same thing. For example, the United States, although the Fed is relatively open-source and there is no need for that, there might be other countries, not the United States, that have difficult access to data and people have built open-source alternative resources to fetch that data under different mechanisms.
	

---
---

# DESIGN — Agentic Data Cooperative + Convex (Panoptic) Instrument

> The notes above are the author's original framing and are preserved verbatim. The design below operationalizes them.

**Status:** DESIGN DRAFT for review. Not yet through the repo's three-step planning-review gate (`CLAUDE.md` → Studio Producer selector → Reality Checker + domain reviewer → verdict). Do not execute until gated.
**Date:** 2026-06-01
**Track:** *Parallel primary thrust* (pivot). Runs alongside — and does **not** disturb — the gate-approved donor-transfer cost-function milestone (`.planning/RESCOPE-SOMI-LEG-2026-05-31-v2.md`).
**Artifacts this produces:** an economic-formalization doc + a decomposed testnet/fork PoC connected by cross-chain layers.

---

## ⚠️ Non-removable productionization blockers

Documented limitations of a private demo, not solved problems. They ride on every downstream artifact (spec, README, contract NatSpec).

1. **TRADING ECONOMICS LICENSE.** TE Standard ($199/mo) grants a *limited, personal, nontransferable, revocable* license to **analyse**, with **"No Data Distribution — You cannot share or distribute data in this plan"** (verbatim, archived TE API pricing). Re-serving TE results to third parties and publishing TE values on-chain are **prohibited** absent a negotiated Enterprise/redistribution license; immutable on-chain publication is additionally incompatible with the *revocable* grant; **no derived-data safe harbor** exists. → TE is confined to **private calibration / gap-filling**. The cooperative's **redistributable core is open official data** (see §2.1).
2. **TE KEY NEVER TOUCHES CHAIN.** The on-chain json-fetch agent fetches URLs via validators; a key in a payload is public instantly. TE is fetched **only by the off-chain keeper** via a keyless proxy that injects the key server-side.
3. **PANOPTIC ↔ cCOP/USD CHAIN CONFLICT (evidence-based).** Panoptic core is **not on Celo or Somnia** (Dune decoded-table null results; both chains well-indexed). The cCOP/USDT UniV3 pool is on **Celo** (`0x2ac5baa668a8a58fd0e302b9896717484fd217b0`, 0.01% fee) with **~$94k TVL, decaying** — too thin for options underwriting (Panoptic longs *remove* liquidity from the pool). → Convex leg runs **real Panoptic on a mainnet-fork of a chain Panoptic IS on** (Ethereum / Base / Unichain) against a **liquid** pair; **cCOP/USD is the documented production target**, reached via cross-chain layers (§6), calibrated off-chain from TE Colombia macro, pending a Panoptic-on-Celo deployment + sufficient pool liquidity.

---

## 1. The idea, in one paragraph

A pooled-escrow **data cooperative** on Somnia: users pay SOMI to query the three agent classes (json-fetch 0.03, llm-inference 0.07, llm-parse-website 0.10) over a **deterministic fetch workflow** (the `fetchString/fetchUint/…` surface in the author's notes); each payment **splits** into an agent deposit + an escrow premium; a shared off-chain **cache** mutualizes paywalled / rate-limited / bad-UI macro sources so many queriers are served cheaply. On top of the escrow sits a **two-book convex-payoff instrument**: Book A self-insures the cooperative against spikes in its own data cost; Book B is a **real Panoptic long-gamma position** expressing convex exposure to **cCOP/USD** (≈ COP/USD EM-FX vol), timed/sized by TE Colombia macro surprises and reached across chains. Heavy work (fetch, cache, surprise computation, sizing) is off-chain; on-chain is escrow bookkeeping + Panoptic/closed-form settlement only.

## 2. Data-sourcing layer (answers the author's notes)

### 2.1 Redistributable core = open official data
The legal core the cooperative re-serves is **public/open official macro data** — exactly the "hard to fetch by UI/UX/corporate walls" target in the notes:
- **Colombia:** DANE (national statistics) + BanRep (central bank). Research item **OPEN-BRIDGE-01** determines whether open-source bridges/REST APIs to DANE/BanRep already exist; if not, the cooperative *is* that bridge (and the json-fetch/llm-parse-website agents are how it scrapes bad UIs deterministically).
- **Fallbacks** where official access is hostile but a community has built open fetchers: surveyed in OPEN-BRIDGE-01 (the notes' "other countries" path; US/FRED is already open, so it's a calibration baseline, not a target).

### 2.2 TE = private premium layer
TE fills gaps the open sources don't cover and supplies the **surprise calibration** (Economic Calendar `Actual/Forecast/TEForecast/Previous/Revised` + point-in-time vintages → `(Actual − Forecast)`), used **off-chain only** per blocker #1. The 2 req/s + 500-series TE limits are the reason the shared cache exists.

## 3. Decomposition — slices connected by cross-chain layers

Each slice gets its own spec → review gate → build.

| Slice | Chain | What it is | Depends on |
|---|---|---|---|
| **A — Somnia cooperative** | Somnia testnet (50312) | AgentRouter + EscrowTreasury + payment split + off-chain keeper/cache (open data + TE-private) + **Book A** | none |
| **B — Convex Panoptic leg** | EVM mainnet-**fork** (Foundry) | Real Panoptic long-gamma on a liquid pair; **Book B**; cCOP/USD documented target; TE-calibrated sizing | none |
| **C — Cross-chain layer** | Reactive Network ↔ Somnia ↔ EVM (+ Celo signal) | First-class enabler: carries messages/value/signals between A, B, and the Celo cCOP/USD price | A + B |

## 3.5 Architecture paradigm (NON-NEGOTIABLE — stick with it everywhere)

**Async request-callback consumer** — the pattern `agentathon/somnia-agents-examples/contracts/PriceOracle.sol` demonstrates, adopted as the single paradigm every contract inherits:
- Abstract **`SomniaAgentConsumer`**: `PLATFORM = 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776` (testnet); `_sendRequest(agentId, payload)` (deposit via `getRequestDeposit()`; `createRequest{value:deposit}(agentId, address(this), this.handleResponse.selector, payload)`; track `pendingRequests`; refund excess); `handleResponse(requestId, Response[], status, Request)` guarded by `msg.sender == PLATFORM` + `pendingRequests[id]`, dispatching to a virtual `_onResult(...)`; `receive() external payable {}` for rebates.
- Typed payload-encoder libraries per agent class — `JsonApi.fetchUint/fetchString/…`, `Llm.*`, `ParseWebsite.*` — wrapping `IJsonApiAgent` / `ILLMAgent` / `IParseWebsiteAgent` (signatures in `agentathon/…/interfaces/ISomniaAgents.sol`).
- All consumers (`TEFeed`, later `AgentRouter` / escrow) **inherit `SomniaAgentConsumer`**. One paradigm, reused across all three agent classes.

## 3.6 Phase 0 — minimal first proof (START HERE)

Two independently-verifiable rungs on Somnia testnet (50312):
- **0a — toolchain proof:** a `SomniaAgentConsumer` against a **keyless public** endpoint (CoinGecko, per the example). Verifies deploy → `createRequest` → `handleResponse` → rebate. Zero key risk.
- **0b — TE encapsulation proof (via keeper-proxy):** `?c=guest:guest` is **discontinued** (live-verified 2026-06-01: every endpoint returns "guest account has been discontinued"). The **paid key works** (HTTP 200 on `/country/colombia`, returns DANE-sourced series) but **cannot go on-chain** (validators publish the fetched URL). **Decided:** 0b fetches a real TE value through a **keeper-proxy** — a server-side endpoint (serverless fn) that holds the paid key in its own env and exposes a *keyless* URL the json-fetch agent calls; the proxy injects `?c=<key>` server-side and returns the trimmed field. Only the keyless proxy URL ever appears on-chain.
- **Proxy caveat (documented, demo-only):** the keyless proxy URL is public on-chain, and the json-fetch agent passes only a URL (no auth header), so anyone reading the chain can call the proxy → free TE redistribution (blocker #1) + abuse vector. Mitigate with an unguessable/rotating path + server-side rate-limit; demo-only, not shippable. The paid key itself never touches chain.
- **Phase-0 success:** a TE-sourced scalar lands on-chain in `TEFeed` via callback; gas readout recorded; guest-restriction + paid-key-deferral documented in NatSpec.

## 4. Slice A — Somnia cooperative

- **`AgentRouter`** (payable). `query(agentClass, payload)`: computes the agent deposit (`pᵢ·subSize + minPerAgentDeposit·subSize`), forwards to the Somnia **testnet** platform `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776` via `createRequest`; routes the surplus **premium** to `EscrowTreasury`; callback captures result + rebate.
- **`EscrowTreasury`** — the "big escrow"; tracks cost float `C_t` (cumulative realized agent cost net of rebates = Book-A underlying); LP deposits/shares; **short side** of Book A.
- **`ConvexClaimToken`** (ERC-1155) — long-convexity claims; one id per epoch (Book A).
- **Keeper** (off-chain) — holds `TRADING_ECONOMICS_API_KEY`; runs keyless proxy + shared cache; fetches open official sources + TE; computes float + surprises; pushes per-epoch settlement.

**Book A — cost-hedge:** per-epoch `k·max(ΔC − K, 0)²` (quadratic long-gamma; **capped** at funded reserve), short side = single LP pool earning the premium slice.

## 5. Slice B — convex Panoptic leg

Foundry **mainnet-fork** of a Panoptic chain (CREATE3 factories: V1.0 `0x000000000000010a1dec6c46371a28a071f8bb01`, V1.1 `0x0000000000000cf008e9bf9d01f8306029724c80`; Sepolia SFPM `0x6cc590da842a730ffe8189afe9cc0edb277986cd`).
- Real long-gamma position via `PanopticPool.mintOptions` (long leg `isLong=1` → removes UniV3 liquidity = buying optionality) on a **liquid** pair; collateral via CollateralTracker ERC-4626 vaults; streaming "streamia" premium + mint commission.
- **Book B** intent = convex exposure to **cCOP/USD**; sized/timed from TE Colombia macro (CPI / BanRep surprise → σ, strikes). Standardized surprise `s = (Actual − Forecast)/σ`; intent payoff `notional·max(|s| − k, 0)²` realized via the Panoptic long-gamma profile.

## 6. Slice C — cross-chain layer (first-class, usable in test)

Per the author's direction, cross-chain is an **enabler, not an afterthought**, usable on testnets:
- Reactive Network (and/or general interop) carries: Somnia escrow events → fund/adjust the Slice-B Panoptic position; the **Celo cCOP/USD price** → the Panoptic chain as a signal; Panoptic settlement → back to the Somnia escrow.
- **Hard constraint:** cross-chain carries **messages / value / signals, not pool liquidity.** It cannot relocate the cCOP/USDT pool onto Panoptic's chain; Panoptic's underlying UniV3 pool must live where Panoptic is. cCOP/USD therefore enters as a *cross-chain price/oracle input*, not as Panoptic's literal underlying, until a Panoptic-on-Celo deployment exists.

## 7. Economic formalization (theory doc)

Split rule + float dynamics `C_t`; both payoffs + convexity proof; premium pricing that fairly compensates the LP pool (no-arbitrage); the **convex-dominates-linear** argument tied to the standing thesis (vol-of-vol, fat tails, Hawkes, depeg) instantiated on COP/USD's random-walk-with-drift profile; TE-calibration identification (σ, strikes) + weaknesses; licensing + liquidity + cross-chain-trust as boundary conditions.

## 8. Success criteria

**A:** pay once → agent fires on Somnia testnet → data returned → escrow grows; repeat query from cache (no second fetch); LP short / buyer long; epoch settle LP→holders; gas readout = bookkeeping + closed-form only. **B:** real Panoptic long-gamma opened + settled on a mainnet-fork liquid pair, sized from a TE-calibrated cCOP/USD surprise model, blockers in-code. **C:** a cross-chain message round-trips on testnets connecting an A event to a B action and back.

## 9. Out of scope

Production hardening; real external users / real money; decentralized oracle; mainnet IAgentRequester; Panoptic-on-Celo port; live cCOP/USDT underwriting; donor-transfer econometrics (parallel track, untouched).

## 10. Open decisions for plan-phase

- **A:** epoch length; `K`,`k`; LP-share accounting (ERC-4626 vs bespoke); cache invalidation; callback-failure/rebate edges; one vs all three agent classes.
- **B:** fork chain + liquid stand-in pair; Panoptic version (V1.x UniV3 vs V2 UniV4); collateral sizing; TE-calibrated `notional`/strike → Panoptic params; commission/streamia constants (read from source).
- **C:** interop layer choice (Reactive vs CCIP/LayerZero/Hyperlane); cross-chain auth/trust on callbacks; settlement reconciliation; testnet availability of the chosen layer across Somnia + the fork chain + Celo.

## 11. Research items still open

- **OPEN-BRIDGE-01** — survey open-source bridges / REST APIs to hard-to-access official macro data: Colombia (DANE, BanRep) first; else comparable democratized-data communities in other countries (the notes' fallback). Determines the redistributable data core. *(launched 2026-06-01)*
- **$199 tier contents** — confirm what the TE Standard plan actually grants (JS-rendered pricing; optionally Playwright the live page).

## 12. Evidence base

TE technical + licensing (two research passes 2026-06-01; archived TE pricing pages; `tradingeconomics.com/terms.aspx`). Panoptic deployments + integration (Panoptic docs/GitHub + Dune decoded tables; Celo/Somnia null; Sepolia SFPM). cCOP / UniV3-on-Celo / liquidity (Mento, CoinGecko, Uniswap Celo deployments, GeckoTerminal + Dune reserve reconstruction). Repo thesis + constraints (`CLAUDE.md`; `research/DATA_SOURCING.md`; `.planning/PROJECT.md`).
