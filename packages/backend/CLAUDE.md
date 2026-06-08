# abrigo-somnia

Substrate for the **`K_AI` (agent-payment) leg** of the Abrigo cost model defined in `../abrigo-analytics/notes/SOMNIA_DRAFT.md` — Somnia L1, SOMI-denominated obligations, IAgentRequester escrow, plus Somnia agent UX glue and Reactive Network cross-chain bridging back to the `K_D` leg.

Sibling repos:
- `../abrigo-x402` — `K_D` (data) leg: x402-on-Celo, USDC, Graph/Agora pricing
- `../abrigo-analytics` — joint empirical validation + structural econometrics
- `../abrigo-marketing` — narrative & positioning

## Planning-review protocol (non-negotiable)

Every planning document produced in this repo — `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `PLAN.md`, phase plans, `RESEARCH.md`, `UI-SPEC.md`, or any artifact that will cause downstream execution — must pass a **three-step automated review pipeline before commit and before any execute step**. The pipeline runs in addition to the built-in GSD approval prompts. Do not skip it in `--auto` / YOLO mode. Do not bypass it by manually picking the second reviewer — the selection is itself an agent-driven step.

### Step 1 — Agent selection (automated)

Dispatch the `Studio Producer` agent (canonical selector — chosen for "high-level creative and technical project orchestration, resource allocation"). Fallback selector if Studio Producer underperforms on prior plans: `Agents Orchestrator`. The selector receives the draft path, prior planning artifacts, and the full agent roster, and returns strict JSON:

```json
{
  "primary": "<exact agent name from roster>",
  "fallback": "<exact agent name from roster, distinct from primary>",
  "rationale": "<one sentence on the technical-surface match>",
  "primary_risks_to_check": ["<risk 1>", "<risk 2>", "..."]
}
```

The orchestrator validates that `primary` and `fallback` are real names. Invalid → re-dispatch once with error context; still invalid → surface to user.

### Step 2 — Parallel review (automated)

Dispatch in a single message, two `Agent` tool uses, in parallel:

- **Reviewer A — `Reality Checker`** (fixed). Prompt: "Surface fantasy, unrealistic assumptions, half-flows, broken handoffs, magical thinking. Default verdict: NEEDS WORK. Require evidence before any PASS."
- **Reviewer B — `<selector.primary>`** (dynamic). Prompt: "Review for technical-surface correctness in your domain. Surface incorrect premises, missed dependencies, infeasible steps. Treat `selector.primary_risks_to_check` as your priority list. Default verdict: NEEDS WORK."

Each gets the draft path, referenced prior artifacts, and returns `PASS` or `NEEDS WORK` plus a bulleted findings list.

### Step 3 — Verdict gate

- Both `PASS` → proceed to the workflow's commit step.
- Either `NEEDS WORK` → surface findings, revise plan, re-run Steps 1–3 from scratch (the selector re-evaluates; a substantive revision can change the right reviewer).
- `selector.primary` errors or inconclusive → re-dispatch with `selector.fallback`. If still no convergence, surface to user.

The selector's JSON output is logged alongside the reviews so the audit trail explains why each reviewer was chosen. The point of the gate is to land plans in reality before spending execution tokens — a plan that looks coherent but rests on broken assumptions is far more expensive to discover during execution than during review.

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
- **IAgentRequester** (`emrestay/somnia-agents-skills`, blob SHA `e15d4e9` (git blob SHA of references/interfaces/IAgentRequester.sol — not a commit SHA; reproduced by git hash-object), fetched 2026-05-23):
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
