A pooled-escrow **data cooperative** on Somnia: users pay SOMI to query the three agent classes (json-fetch 0.03, llm-inference 0.07, llm-parse-website 0.10) over a **deterministic fetch workflow**
(the `fetchString/fetchUint/…` surface in the author's notes); each payment **splits** into an agent deposit + an escrow premium; a shared off-chain **cache** mutualizes paywalled / rate-limited / bad-UI macro sources so many queriers are served cheaply. On top of the escrow sits a **two-book convex-payoff instrument**: Book A self-insures the cooperative against spikes in its own data cost; Book B is a **real Panoptic long-gamma position** expressing convex exposure to **cCOP/USD** (≈ COP/USD EM-FX vol), timed/sized by TE Colombia macro surprises and reached across chains. Heavy work (fetch, cache, surprise computation, sizing) is off-chain; on-chain is escrow bookkeeping + Panoptic/closed-form settlement only.

Data accesibility

    -------------                         ---------
   | contract    |  ------------------>  |  REST  | ------> Keeper Server ---> TE API ---> TE server
   |             |  <-- (json)--------   |  API   |   |
    --------------                        ---------   |
	                                                  |
                                                   --------------      
          |                                        |   Request   |   
          V                                        |   Adapter   |
                                                   --------------
 ----------------------------------------------------------------------------------
|  function fetchString(string url, string selector) returns (string)                       | 
|  function fetchUint(string url, string selector, uint8 decimals) returns (uint256)        |
|  function fetchInt(string url, string selector, uint8 decimals) returns (int256)          |
|  function fetchBool(string url, string selector) returns (bool)
|  function fetchStringArray(string url, string selector) returns (string[])                |
|  function fetchUintArray(string url, string selector, uint8 decimals) returns (uint256[]) |
 -------------------------------------------------------------------------------------------


| Slice | Chain | What it is | Depends on |
|---|---|---|---|
| **A — Somnia cooperative** | Somnia testnet (50312) | AgentRouter + EscrowTreasury + payment split + off-chain keeper/cache (open data + TE-private) + **Book A** | none |
| **B — Convex Panoptic leg** | EVM mainnet-**fork** (Foundry) | Real Panoptic long-gamma on a liquid pair; **Book B**; cCOP/USD documented target; TE-calibrated sizing | none |
| **C — Cross-chain layer** | Reactive Network ↔ Somnia ↔ EVM (+ Celo signal) | First-class enabler: carries messages/value/signals between A, B, and the Celo cCOP/USD price | A + B |


- Have a CI that run the most important tests on key leakage and server liveness on upsrtream
- Note that superfluid, panoptic and reactive-netwrok all share ethereum as shared chain if there is, then we must prioritize building there.

	
	
## Status (2026-06-01) — request-adapter component BUILT

The "Keeper Server / REST API" box (the **request adapter**) is built + live:
- `keeper/` — key-hidden TE query (`teClient`), deterministic scaling (`catalog`), keyless HTTP proxy (`proxy`); 31/31 tests; **deployed on Vercel** via a quota-free prebuilt CI/CD; returns `{value,unit,ts}`, paid key never on-chain.
- **Factor API**: `te/<domain>/<slug>` routes anchored on TE stable symbols (`HistoricalDataSymbol`/`Symbol`); on-chain `TECatalog` keys `keccak256(name) → Endpoint{proxyPath, ".value", decimals, kind, class}`. Incl. `te/colombia/capacity-utilization` (COLOMBIACAPUTI → 775).
- **Somnia integration — PROVEN end-to-end (2026-06-01), scoped**: `SomniaProbe` on testnet had the json-fetch agent fetch the public proxy and store the callback value (`latestUint=568` on the **`te/colombia/inflation`** route — distinct from the `capacity-utilization`=775 example used in unit tests; the e2e self-calibrates so it's route-agnostic), asserted vs the live proxy. Confirmed: `fetchUint(url,"value",0)` coerces the proxy's quoted-string to uint256; selector `"value"` (no dot), decimals 0, over-fund 0.12 STT/call (no TimedOut). **Still unverified** (do not overstate): the deployed `AgentRequester` rebate closed-form (CLAUDE.md unverified #1 — needs bytecode read; if it doesn't rebate to the callback contract, full-forward donates the surplus), the real callback arg-order beyond this one live path, and the 0.07/0.10 agent classes. Vercel Deployment Protection is OFF (done) so validators reach the proxy.

## 3.5 Architecture paradigm (NON-NEGOTIABLE — stick with it everywhere)

**Async request-callback consumer** — the pattern `agentathon/somnia-agents-examples/contracts/PriceOracle.sol` demonstrates, adopted as the single paradigm every contract inherits:
- Abstract **`SomniaAgentConsumer`** (BUILT; 18/18 tests): `PLATFORM = 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776` (testnet); `_sendRequest(agentId, payload)` requires `msg.value ≥ getRequestDeposit()` (the floor) and **forwards the WHOLE `msg.value`** to `createRequest{value: msg.value}(agentId, address(this), this.handleResponse.selector, payload)` — **no refund**: the over-fund surplus (caller sends floor + `pᵢ·subSize`) IS the `perAgentBudget`; forwarding only the floor → budget 0 → `TimedOut`. Tracks `pendingRequests`; `handleResponse(requestId, Response[], status, Request)` guarded by `msg.sender == PLATFORM` + `pendingRequests[id]`, clears pending **before** dispatch (CEI/no-replay), dispatches to virtual `_onResult(...)`. `receive()` takes platform rebates; **owner-only `sweep(to)`** is the egress so rebates are never trapped.
- Typed payload-encoder libraries per agent class — `JsonApi.fetchUint/fetchString/…`, `Llm.*`, `ParseWebsite.*` — wrapping `IJsonApiAgent` / `ILLMAgent` / `IParseWebsiteAgent` (signatures in `agentathon/…/interfaces/ISomniaAgents.sol`).
- All consumers (`SomniaProbe` now; later `MacroOracleConsumer` / `AgentRouter` / escrow) **inherit `SomniaAgentConsumer`**. One paradigm, reused across all three agent classes — but the per-class price term (`pᵢ·subSize`) must come from the price table, not a hardcoded constant, when a non-json-fetch consumer ships.

## 3.6 Phase 0 — minimal first proof (START HERE)

Two independently-verifiable rungs on Somnia testnet (50312):
- **0a — toolchain proof:** a `SomniaAgentConsumer` against a **keyless public** endpoint (CoinGecko, per the example). Verifies deploy → `createRequest` → `handleResponse` → rebate. Zero key risk.
- **0b — TE encapsulation proof (via keeper-proxy):** `?c=guest:guest` is **discontinued** (live-verified 2026-06-01: every endpoint returns "guest account has been discontinued"). The **paid key works** (HTTP 200 on `/country/colombia`, returns DANE-sourced series) but **cannot go on-chain** (validators publish the fetched URL). **Decided:** 0b fetches a real TE value through a **keeper-proxy** — a server-side endpoint (serverless fn) that holds the paid key in its own env and exposes a *keyless* URL the json-fetch agent calls; the proxy injects `?c=<key>` server-side and returns the trimmed field. Only the keyless proxy URL ever appears on-chain.
- **Proxy caveat (documented, demo-only):** the keyless proxy URL is public on-chain, and the json-fetch agent passes only a URL (no auth header), so anyone reading the chain can call the proxy → free TE redistribution (blocker #1) + abuse vector. Mitigate with an unguessable/rotating path + server-side rate-limit; demo-only, not shippable. The paid key itself never touches chain.
- **Phase-0 success:** a TE-sourced scalar lands on-chain in `SomniaProbe` (`latestUint`/`latestString`) via callback; gas readout recorded; guest-restriction + paid-key-deferral documented in NatSpec. **Done 2026-06-01** (inflation route, value 568).

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
