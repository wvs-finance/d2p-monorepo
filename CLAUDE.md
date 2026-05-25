# abrigo-somnia

Substrate for the **`K_AI` (agent-payment) leg** of the Abrigo cost model defined in `../abrigo-analytics/notes/SOMNIA_DRAFT.md` — Somnia L1, SOMI-denominated obligations, IAgentRequester escrow, plus Somnia agent UX glue and Reactive Network cross-chain bridging back to the `K_D` leg.

Sibling repos:
- `../abrigo-x402` — `K_D` (data) leg: x402-on-Celo, USDC, Graph/Agora pricing
- `../abrigo-analytics` — joint empirical validation + structural econometrics
- `../abrigo-marketing` — narrative & positioning

## Git workflow — fork/upstream model

Two remotes, identical pattern to `abrigo-x402` / `abrigo-analytics`:

| Remote | URL | Role |
|---|---|---|
| `origin` | `https://github.com/JMSBPP/abrigo-somnia.git` | personal fork — all `git push` targets this |
| `upstream` | `https://github.com/wvs-finance/abrigo-somnia.git` | canonical repo — receives PRs from `origin` |

Rules:
1. **All pushes go to `origin`** (`JMSBPP/abrigo-somnia`). Never push directly to `upstream`.
2. **PRs target `upstream`**: branches on `origin` are opened as PRs into `wvs-finance/abrigo-somnia:master`.
3. **Sync from upstream** before starting new work:
   ```bash
   git fetch upstream
   git rebase upstream/master   # or: git merge upstream/master
   git push origin master
   ```
4. **Opening a PR** (from a feature branch on `origin`):
   ```bash
   gh pr create --repo wvs-finance/abrigo-somnia \
     --base master --head JMSBPP:<branch-name> \
     --title "..." --body "..."
   ```

## Domain non-negotiables (from SOMNIA_DRAFT)

- Unit of account: `X = USD`; agent-payment unit `Y_AI = 1 SOMI`.
- **Three agent classes** with prices in SOMI/call (canonical, absolute form — *not* the earlier reciprocal draft):
  - `json-fetch` — 0.03
  - `llm-inference` — 0.07
  - `llm-parse-website` — 0.10
- **IAgentRequester** (`emrestay/somnia-agents-skills`, commit `e15d4e9`, fetched 2026-05-23):
  - mainnet impl `0x5E5205CF39E766118C01636bED000A54D93163E6`
  - `minPerAgentDeposit = 0.01 SOMI`, `subSize_default = 3`
  - `msg.value ≥ minPerAgentDeposit·subSize + p_i·subSize`
  - `getRequestDeposit()` is a **lower bound** (operations-reserve floor), not the true execution cost.
- **Gas floor**: `GasUnitPrice ≥ 6.16e-10 USD/gas` at ≥400 TPS; base `6.16e-9 USD/gas`. Validator-vote congestion adjuster halves/doubles the base fee at 95 ms block-execution threshold over a 10-block window.
- **50/50 burn/validator fee split** — gross fee is an upper bound on net cost. Burn-induced rebate is negligible for non-whale analyst; validator payout requires self-stake ≥ `5e6 SOMI`.
- **Somnia gas pricing on `docs.somnia.network/agents/invoking-agents/gas-fees` is labelled "stop-gap"** with no effective-date metadata — treat as volatile, re-fetch each milestone.
- **No native SOMI/USD on-chain oracle as of 2026-05-23.** Protofire-Chainlink on Somnia publishes USDC/USD, ETH/USD, BTC/USD only; DIA and API3 do not publish SOMI/USD either. Cross-rate `ρ_{Y_AI/Y_D} = ρ_{SOMI/USDC}` must come from off-chain (CoinGecko / CoinMarketCap / Messari) until a native feed ships.
- **Convex perpetual (Panoptic) strictly dominates linear hedge** on the SOMI-leg variance whenever any of: vol-of-vol > 0, positive skew/fat tails, Hawkes self-excitation, or stablecoin depeg in the cross-rate path.
- **Unverified items inherited from SOMNIA_DRAFT.md** — keep tracked:
  1. Exact rebate equation in the deployed `AgentRequester` impl (interface confirms `NativeTransferFailed` path; closed form requires bytecode read).
  2. Validator-emission 10% cap — attested in Bitget/OKX/Messari secondary sources, not directly on docs.somnia.network.

## What this repo holds

To be defined as the iteration matures. Likely surface area:
- Solidity wrappers over `IAgentRequester` / `IAgentRequesterHandler` covering the three agent classes.
- Off-chain SOMI/USD oracle adapter (CoinGecko / Messari) feeding on-chain consumers until a native feed ships.
- Somnia-agent UX components — the open question from SOMNIA_DRAFT.md §OPEN (agent-driven UI to Abrigo).
- Reactive Network cross-chain glue: event-driven bridge between Celo (`abrigo-x402`) and Somnia (this repo) so a single Abrigo position can settle on both legs.
- Settlement reconciliation against the IAgentRequester escrow-refund channel.
