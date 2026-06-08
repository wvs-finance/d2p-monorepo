# 15-RESEARCH — Forked-Env / Simulation Sandbox Landscape (broad survey + decision matrix)

**Date:** 2026-06-07 · **Deadline target:** ENCODE×Somnia Agentathon ~June 11 2026
**Scope:** the BROADER landscape of forked-env / simulation sandboxes and a comparative best-fit decision for our architecture. (A sibling agent covers Scaffold-ETH 2 + Tenderly Virtual TestNets in depth; Tenderly appears here only as a comparison row from public docs.)

## The fit target (our architecture)

- **Frontend:** custom Next.js 16 + wagmi 2 + viem 2 app (`d2p-frontend`, `/home/jmsbpp/apps/d2p/frontend`) — NOT a Scaffold-ETH monorepo. Deployed to **Vercel via a prebuilt/serverless pipeline** → it **cannot host a long-running node**. Has a live Somnia-testnet (chain 50312) read leg; needs a Polygon-fork **mint leg shown IN THE BROWSER**.
- **Contracts:** Foundry repo `abrigo-somnia`. `MacroHedgeExecutor.resolveFromMandate(...)` mints a real wCOP/USDC Panoptic-V2 position at tick **360360** on a **Polygon fork pinned at block 86_900_000**.
- **Demo:** the fork mint VISIBLE FROM THE UI (not a CLI/test recording).

### What `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol` proves the env must support
- Fork Polygon at **block 86_900_000** (`vm.createSelectFork(rpcUrl("polygon"), 86_900_000)`).
- **Deploy the Panoptic V2 core** to the forked state via `DeployProtocol().run()` — at 86.9M the core is NOT on Polygon mainnet; the factory/risk-engine constants (`FACTORY_V4_ADDR 0x978e…D90`, `RISK_ENGINE_ADDR 0x416C…7Ae6`) only exist because the deterministic deploy lands them there. **Read-back is asserted** (`FACTORY_V4_ADDR.code.length > 0`).
- **Fund arbitrary contracts with wCOP (`0x8a1D45e102e886510e891d2Ec656a708991e2D76`, thin) + USDC (`0x3c49…3359`, 6dec)** — the test uses `deal()` (a forge-only cheatcode) at ~`10_000e18` COP / `10_000e6` USDC, then `collateralToken.deposit()`. Outside forge, `deal()` is unavailable → the env must provide an equivalent.
- The `--load-state` snapshot path (`vm.loadAllocs`) is a forge-internal optimization, NOT something a hosted node exposes; `anvil --fork-url` + `--load-state` is broken upstream (**foundry#8493** — `--fork-url` and `--load-state` are incompatible). So a hosted env must instead **persist a deployed-core sandbox** (deploy once, keep it alive) rather than rely on dump/load.

## Two hard BLOCKERS (rank on these)
1. **BLOCKER-1 — ERC20 funding on a fork** without `deal()`: fund an arbitrary executor with real wCOP + USDC.
2. **BLOCKER-2 — deploy core + address read-back**: deploy Panoptic V2 to the env and surface its real addresses to the UI (no hardcoded constant; `anvil --load-state` broken).
Plus: reachable from a **Vercel serverless browser dApp** → needs a **public hosted RPC**; coexist with Somnia (50312); free/cheap; achievable by June 11.

---

## Candidate findings

### 1. BuildBear Sandboxes — **HOSTED public RPC** · GA
- **What:** hosted private forked testnet ("Sandbox") with persistent RPC URL, block explorer, native+ERC20 faucet, and full hardhat/anvil cheat RPCs. Forks any EVM chain incl. **Polygon**, **"from any block number"** (pinned fork confirmed). [docs.buildbear.io, buildbear.io/docs/sandbox/create-a-sandbox]
- **BLOCKER-1: YES.** Custom RPC **`buildbear_ERC20Faucet`** mints arbitrary ERC20 to any address (plus pre-mapped + custom token-address faucet). This is the exact `deal()`-replacement — works for the thin wCOP token because it writes balance directly, no whale impersonation needed. Also exposes `hardhat_setBalance`, `hardhat_setStorageAt`, `hardhat_impersonateAccount`/`anvil_impersonateAccount`. [buildbear.io/docs/json-rpc]
- **BLOCKER-2: YES.** It's a normal node — deploy `DeployProtocol` against the sandbox RPC with `forge script --broadcast --rpc-url <sandbox>` (or via the existing keeper), read deployed addresses from the broadcast receipt / explorer, and feed them to the UI. Sandbox **persists** (paid tier) so the deployed core stays live — sidesteps foundry#8493 entirely (no dump/load).
- **Vercel-fit: YES.** Persistent hosted HTTPS RPC + a hosted explorer URL — the serverless dApp just adds a `defineChain` (Polygon-fork chainId BuildBear assigns) transport pointing at the sandbox RPC. Explorer gives the judges a clickable tx link for the mint.
- **Somnia-fit: YES.** Just another chain in the wagmi config alongside 50312.
- **Cost/free-tier:** Free "Explorer" tier = **2 sandboxes, each lives only 3 DAYS**, 10M RU/month. Persistent sandboxes require **Developer $49/mo** (5 persistent) — see Honesty note. [buildbear.io/pricing]
- **Effort by June 11:** LOW. Create sandbox → set env RPC → run existing deploy script → faucet the executor → point wagmi at it. Days, not weeks.

### 2. Tenderly Virtual TestNets — **HOSTED** · GA (comparison row; sibling covers in depth)
- **BLOCKER-1: YES** but **gated on the ADMIN RPC.** `tenderly_setErc20Balance` (and the unlimited faucet UI / 100+ tokens) writes ERC20 balance directly — but it is **NOT available on the Public RPC**; only the Admin RPC exposes balance manipulation. The Public RPC is what a browser would use. [docs.tenderly.co/virtual-testnets/admin-rpc, unlimited-faucet]
- **BLOCKER-2: YES.** Deploy core to the Virtual TestNet, read addresses back; persistent TestNet keeps it alive.
- **Vercel-fit:** YES — has a documented wagmi integration and a public RPC for the browser; explorer included. But the funding step must run server-side / in CI (Admin RPC), which fits our prebuilt+GitHub-Actions pipeline but adds a secret-management step.
- **Somnia/cost:** coexists fine; free tier exists, paid plans for persistence/seats. Strong, comparable to BuildBear; the Admin-vs-Public RPC split is the main ergonomic wrinkle for a pure-browser funding demo.

### 3. Hardhat 3 (2025) — **LOCAL-only by default**
- **What:** Foundry-compatible Solidity tests, `edr-simulated` vs `http` networks, multichain, OP-stack sim. Forking needs a JSON-RPC URL. [hardhat.org/docs/explanations/network-management, /guides/forking]
- **Hosted?** **No native hosted/public fork.** Simulated networks "do not expose the JSON-RPC API through HTTP"; you can `network.createServer()` to expose it locally, but that's a process on your machine — **a Vercel serverless function cannot keep it running.** Third-party "hosted hardhat" add-ons (QuickNode) exist but that's just renting someone else's node.
- **BLOCKER-1: YES locally** (`hardhat_setBalance`/standard cheats). **BLOCKER-2: YES locally.** But **fails the Vercel-reachability constraint** — local-only. Useful for the test harness, not the live browser demo.

### 4. prool (wevm) — **TEST-HARNESS only, not a live UI env**
- Programmatic pool of HTTP test instances (anvil, bundlers, etc.) for Vitest-style suites. [github.com/wevm/prool, docs.pimlico.io]
- Relevant to the **TEST harness** (spin anvil-fork instances in CI), **NOT** the live browser demo — it's a library you run in a Node process, not a hosted public RPC. Does not by itself satisfy Vercel-reachability or persistence. Could complement Anvil-on-a-VM but adds nothing the hosted options don't.

### 5. Rivet (paradigmxyz, not wevm) — **browser DEVTOOLS/wallet, not an env**
- Browser-extension developer wallet + devtools for **Anvil** (inspect/modify accounts, blocks, contracts). [github.com/paradigmxyz/rivet] Actively maintained (no deprecation found). Note: it is a Paradigm project, not wevm.
- Relevance to "visible from the UI": it connects a **developer** to an Anvil node and can fund/impersonate via the extension — but it requires the user to install an extension and still needs a reachable Anvil endpoint. **Not a fit** for a judge-facing Vercel dApp that should "just work" in a normal browser; it solves a different problem (dev inspection) than a hosted demo RPC.

### 6. Anvil self-hosted (Fly.io / Railway / small VM behind public RPC) — **HOSTED if you build it**
- `anvil --fork-url <polygon> --fork-block-number 86900000` on a VM, exposed over HTTPS.
- **BLOCKER-1: YES** (`anvil_setBalance`, `anvil_setStorageAt`, impersonation — `deal()`-equivalents over RPC). **BLOCKER-2: YES** (deploy core, read back). **`--load-state` is broken with `--fork-url` (foundry#8493)** so you must keep the single process ALIVE (deploy once, never restart) — fragile: a crash/restart loses the deployed core.
- **Vercel-fit:** YES if you add TLS + permissive CORS yourself. **Effort:** MEDIUM-HIGH — you own uptime, CORS, TLS, restart-resilience, and the deploy-on-boot script. This is the honest local/DIY fallback, strictly dominated by BuildBear for our timeline.

### 7. Conduit / Caldera / Gelato RaaS — **REJECT (wrong category)**
- These are Rollup/appchain-as-a-Service (launch a persistent L2/L3), **not fork-simulation**. They cannot fork Polygon mainnet state at block 86.9M with live wCOP/USDC liquidity and the Uniswap v4 PoolManager already deployed — that pre-existing forked state is exactly what we need. **Not a fit.** (Confirmed by category, not deep-dived.)

### 8. Alchemy forking / Sandbox; Otterscan
- **Alchemy:** provides the underlying **archive RPC** we already use for the forge fork (`ALCHEMY_API_KEY`, `rpcUrl("polygon")`). Alchemy's own "fork/sandbox" offering is comparable to Tenderly but the in-repo use is just the archive node feeding the fork — **not** a hosted writable fork with an ERC20 faucet for the browser. Keep Alchemy as the **fork data source** under BuildBear/Anvil, not as the demo env itself.
- **Otterscan:** lightweight explorer over an Anvil/erigon node — only relevant if we self-host Anvil and want a local explorer; redundant once BuildBear (which ships an explorer) is chosen.

---

## COMPARATIVE DECISION MATRIX

| Candidate | Hosted public RPC | BLOCKER-1 (ERC20 fund, mechanism) | BLOCKER-2 (deploy core + read-back) | Vercel-fit | Somnia coexist | Cost / free-tier | Effort by Jun 11 |
|---|---|---|---|---|---|---|---|
| **BuildBear Sandboxes** | **YES** (persistent HTTPS RPC + explorer) | **YES** — `buildbear_ERC20Faucet` (+ hardhat/anvil cheats) | **YES** — deploy via forge script, read from receipt/explorer; sandbox persists (no load-state) | **YES** (`defineChain` → sandbox RPC; explorer link for judges) | YES | Free=2 sandboxes×**3-day TTL**, 10M RU/mo; persistent=**$49/mo** | **LOW** |
| **Tenderly Virtual TestNets** | YES (Public RPC) — funding via **Admin RPC** | YES — `tenderly_setErc20Balance` / unlimited faucet, **Admin-RPC only** (not public) | YES — deploy + read-back; persistent | YES (wagmi docs) but funding is server/CI-side | YES | Free tier + paid for persistence/seats | LOW-MED |
| **Hardhat 3** | **NO** (local; `createServer` is a local process) | YES locally (`hardhat_setBalance`) | YES locally | **NO** (serverless can't host node) | n/a | Free (OSS) | n/a for live demo |
| **prool** | NO (test-harness lib) | YES in-test | YES in-test | NO | n/a | Free (OSS) | n/a for live demo |
| **Rivet** | NO (extension over Anvil) | YES via extension/Anvil | via Anvil | **NO** (needs extension + reachable Anvil) | n/a | Free (OSS) | poor fit |
| **Anvil self-hosted (VM)** | YES if you build TLS+CORS | YES — `anvil_setBalance`/storage | YES — but keep process ALIVE (foundry#8493) | YES with DIY CORS/TLS | YES | VM ~$5-10/mo | **MED-HIGH** |
| **Conduit/Caldera/Gelato RaaS** | YES (appchain) | n/a — not a fork | **NO** — can't fork Polygon@86.9M | n/a | n/a | varies | REJECT |
| **Alchemy fork/Sandbox** | (archive RPC; not a writable hosted fork+faucet) | partial | partial | as data-source only | YES | usage-based | keep as fork SOURCE |

---

## RECOMMENDATION

**#1 — BuildBear Sandboxes.** It is the only candidate that satisfies BOTH blockers AND the Vercel-serverless-browser constraint with the LEAST custom infrastructure:
- **BLOCKER-1** is solved by a single browser/CI-callable RPC method (`buildbear_ERC20Faucet`) — no whale impersonation against the thin wCOP token, no forge-only `deal()`.
- **BLOCKER-2** is solved because BuildBear is a real persistent node: run the existing `DeployProtocol` script against the sandbox RPC, read the deployed factory/risk-engine addresses from the broadcast receipt, and inject them into the UI config. Persistence sidesteps the broken `anvil --load-state` path (foundry#8493) — deploy once, the core stays live for the whole demo window.
- **Vercel-fit:** the Next.js app adds one `defineChain` + http transport pointing at the persistent sandbox RPC; the bundled **block explorer URL** gives judges a clickable, verifiable mint transaction — directly answering "the fork mint VISIBLE FROM THE UI." Coexists trivially with Somnia 50312 as another wagmi chain.

This is the option that best makes the Polygon-fork mint visible in the existing Vercel-deployed Next.js UI by the deadline: point wagmi at the BuildBear sandbox RPC, surface the deployed-core addresses + the mint tx hash, and link the BuildBear explorer.

**Runner-up — Tenderly Virtual TestNets.** Functionally equivalent on both blockers (`tenderly_setErc20Balance` + unlimited faucet, deploy/read-back, public RPC, documented wagmi integration). It drops to #2 only because **balance manipulation is restricted to the Admin RPC** (not the public RPC the browser uses), so the funding step must run server-side/CI rather than from the browser — one extra secret-management hop. If BuildBear's free-tier TTL or `buildbear_ERC20Faucet` behavior disappoints during integration, switch to Tenderly with near-zero architectural change.

**DIY fallback — Anvil on a small VM** (with `anvil_setBalance` + DIY CORS/TLS, deploy-on-boot, keep-alive). Honest, free-ish, but you own uptime and the foundry#8493 restart-fragility. Use only if both hosted options are unavailable.

## Honesty notes / half-flow risks (do NOT gloss)
- **BuildBear free-tier TTL is 3 DAYS per sandbox** and only 2 sandboxes. For a June-11 demo a single sandbox can fit inside 3 days, but if it's created early and the deployed core expires the day before judging, the demo breaks. **Mitigate:** either (a) create the sandbox within 3 days of the demo and script the deploy+faucet so it can be re-stood-up in minutes, or (b) pay the $49 Developer tier for one persistent sandbox for the hackathon month. Recommend (b) — $49 buys removing the single biggest demo-day failure mode.
- **CORS from a Vercel browser dApp to the sandbox RPC is UNCONFIRMED in docs** — BuildBear is marketed for "connect dApps and wallets," but I did not find an explicit CORS statement. **Verify early** by a browser fetch from a preview deploy; if blocked, proxy the RPC through a Next.js route handler (we already run a keeper-proxy pattern for Somnia) — small, known effort.
- **Deployed-core address read-back must NOT be hardcoded.** The fork test hardcodes `FACTORY_V4_ADDR`/`RISK_ENGINE_ADDR` because the deterministic deploy lands there at block 86.9M; on a fresh BuildBear sandbox the deploy is also deterministic from the same block + deployer nonce, so the constants *should* reproduce — but this is an ASSUMPTION to verify on the actual sandbox, and the UI should read addresses from the deploy artifact, not trust the constant.
- **`deal()` does not exist outside forge** — confirmed; `buildbear_ERC20Faucet` is the replacement and must be exercised against the real thin wCOP token (`0x8a1D…2D76`) early, since direct balance-write must target the right storage slot for that specific token.

## Sources
- BuildBear docs / faucet / json-rpc / sandbox / pricing: https://docs.buildbear.io/docs/intro , https://www.buildbear.io/docs , https://www.buildbear.io/docs/json-rpc , https://www.buildbear.io/docs/sandbox/create-a-sandbox , https://www.buildbear.io/pricing , https://medium.com/buildbear/erc20-token-faucet-for-any-testnet-pre-mapped-and-custom-token-address-6ee6f3eda6e3
- Tenderly Virtual TestNets / admin-rpc / unlimited faucet: https://docs.tenderly.co/virtual-testnets , https://docs.tenderly.co/virtual-testnets/admin-rpc , https://docs.tenderly.co/virtual-testnets/unlimited-faucet , https://docs.tenderly.co/virtual-testnets/dapp-ui/wagmi
- Hardhat 3 network management / forking: https://hardhat.org/docs/explanations/network-management , https://hardhat.org/docs/guides/forking , https://hardhat.org/docs/explanations/edr-simulated-networks
- prool: https://github.com/wevm/prool , https://docs.pimlico.io/guides/how-to/testing/prool
- Rivet: https://github.com/paradigmxyz/rivet , https://www.paradigm.xyz/2023/08/rivet
- Foundry #8493 (anvil --fork-url + --load-state incompatible): https://github.com/foundry-rs/foundry/issues/8493
- Tenderly Sandbox / Alchemy comparison: https://www.alchemy.com/dapps/alternatives/tenderly-sandbox

## AI-Agent + Somnia Compatibility Filter

This is a HARD pass/fail gate that the final fork-env recommendation MUST respect. It is independent of, and overrides, the fork-tooling ergonomics survey above. Scope: the ENCODE×Somnia cornerstone is a TWO-LEG, TWO-CHAIN AI-agent flow — Agent-1 runs LIVE on Somnia testnet (chain 50312) and calls Somnia-native on-chain LLM-inference; Agent-2 mints a wCOP/USDC Panoptic position on a Polygon fork. The app carries the `HedgeMandate` between legs (no bridge).

### Ground truth 1 — Somnia (chain 50312) is NOT forkable by any hosted tool
- **Tenderly Virtual TestNets**: supported-networks list (105+ chains) includes Polygon (137, full VNet support) but does NOT list Somnia (50312) anywhere. Source: https://docs.tenderly.co/supported-networks
- **BuildBear**: marketed supported chains are Ethereum/Sepolia/Holesky/Polygon/Arbitrum/Optimism/Avalanche/BSC etc.; Somnia (50312) is not in the list. Polygon IS supported. Sources: https://www.buildbear.io/docs , https://chainlist.org/chain/50312
- Both hosted fork tools key off an internal archive-node/chain registry; you cannot point them at an arbitrary `--fork-url`. So neither can fork Somnia.
- **anvil / Hardhat 3** fork by arbitrary RPC URL, so in principle could `--fork-url <Somnia RPC>` — but see Ground truth 2: that fork would be inert for the AI leg.

### Ground truth 2 — the Somnia AI primitives CANNOT survive a fork (the decisive fact)
`inferString` / `inferNumber` / `inferToolsChat` are NOT pure EVM opcodes. They are **consensus-validated AI inference**: when a Somnia contract issues an inference request, the live Somnia validator set re-runs the AI model (and any API/website fetch) in parallel and bakes the agreed output into block consensus; the answer is delivered through the agent platform + `IAgentRequester` escrow + the server-side keeper-proxy whose URL the validators publish. Source: https://blog.somnia.network/p/building-on-the-agentic-l1-a-developers , https://somnia.network/agents

Consequence: a fork of Somnia (even a hypothetical anvil `--fork-url` Somnia fork) copies only EVM storage. It has NO validator set re-running inference, NO agent platform, NO keeper-proxy answering off-chain. An `inferString` call on a forked Somnia would never receive a fulfilled response — the request escrow would sit unanswered. **Forking Somnia is therefore not merely unsupported, it is meaningless for the AI leg.** Agent-1 MUST run on the real Somnia testnet (50312), full stop. This is already the project's state (LLM-inference agent ID 12847293847561029384 proven live in Phase 11; keeper-proxy at keeper-eta-pied.vercel.app).

### The honest split (this is the architecture the recommendation must encode)
- **Agent-1 (Somnia AI-inference leg)** → stays on **real Somnia testnet 50312**. Never forked. The fork-env choice does not touch Somnia at all.
- **Agent-2 (Panoptic mint leg)** → runs on the **Polygon fork** (provided by whichever fork tool the sibling survey selects). This leg never calls a Somnia primitive, so the fork env never needs Somnia support.
- The two legs are decoupled by design: the app carries the `HedgeMandate` struct from Agent-1's Somnia output into Agent-2's Polygon-fork mint. No bridge, no cross-chain message — just app-level state hand-off. This is why "the chosen Polygon-fork env doesn't need Somnia" is the honest reality, not a workaround.

### Per-candidate verdict on the AI-agent + Somnia filter
The filter has two independent tests: (A) **does it need to fork Somnia?** — answer is NO for every candidate, because Agent-1 stays live; so failure to fork Somnia is NOT disqualifying. (B) **is the Polygon-fork env agent-driveable** (public stable RPC + programmatic ERC20/native funding + no human-in-the-loop secret) so an autonomous agent / the browser can fund the executor and submit `resolveFromMandate`?

- **Tenderly Virtual TestNets — PASS.** Polygon (137) fully supported for VNets. Public HTTPS RPC per TestNet, admin-RPC cheats (`tenderly_setBalance`, `tenderly_setErc20Balance`) and an unlimited faucet — all callable programmatically by an agent, no interactive secret beyond an access key held server-side. Cannot fork Somnia — but does not need to (Agent-1 is live). Sources: https://docs.tenderly.co/virtual-testnets/admin-rpc , https://docs.tenderly.co/virtual-testnets/unlimited-faucet
- **BuildBear — PASS.** Polygon supported. Public sandbox RPC + JSON-RPC cheats `buildbear_nativeFaucet` and `buildbear_ERC20Faucet` — directly agent/browser-callable for funding the executor with wCOP/USDC, then a normal `eth_sendRawTransaction` for `resolveFromMandate`. Cannot fork Somnia — does not need to. (TTL / CORS caveats already noted above are ergonomics, not filter failures.) Sources: https://www.buildbear.io/docs/json-rpc
- **Self-hosted anvil — PASS (with caveat).** Forks Polygon by `--fork-url`; `anvil_setBalance` / `anvil_setStorageAt` give programmatic funding via raw JSON-RPC only (no REST faucet, ERC20 funding needs the right storage slot for the thin wCOP token). Agent-driveable but you own the public-RPC exposure (TLS/CORS) and uptime. Does not need Somnia.
- **Hardhat 3 — PASS for local sim, FAIL as the demo fork-RPC.** EDR-simulated/forked Polygon is fine for tests, but Hardhat's node is a local dev process, not a hosted PUBLIC RPC an autonomous agent or a Vercel browser can reach for a live demo without you self-hosting+exposing it (same exposure burden as anvil, with less mature long-running-node ergonomics). Usable as a CI sim layer; not the right public demo endpoint.
- **SE-2 / prool / Rivet** — drivers/wrappers over anvil/Hardhat, not independent fork backends; they inherit the underlying node's filter verdict. None changes the Somnia conclusion.

### DISQUALIFIED by this filter
- **None of the Polygon-fork candidates is disqualified for lacking Somnia support** — that requirement is void because Agent-1 must stay live regardless. The only soft elimination is **Hardhat 3 as the public demo RPC endpoint** (it is a local node, not a hosted public RPC); keep it only as a CI/test sim layer, not the agent/browser-facing fork.

### Coexistence (Q4) — CONFIRMED feasible
A wagmi/viem multi-chain config trivially holds BOTH chains in the same Next.js app: define `somniaTestnet` (id 50312, real RPC `api.infra.testnet.somnia.network`) for Agent-1 reads AND the Polygon-fork chain (Tenderly/BuildBear sandbox id+RPC, or a fork chain id) for Agent-2 — `createConfig({ chains: [somniaTestnet, polygonFork], transports: {...} })`, switching per-leg with the chain id. The fork env is a separate `http()` transport on a different chain id; it cannot interfere with the live Somnia transport. Tenderly explicitly documents a wagmi recipe for its VNets (https://docs.tenderly.co/virtual-testnets/dapp-ui/wagmi). Nothing in the fork env touches the Somnia leg, so the existing live Somnia path is unaffected.

## FREE-tier Polygon-fork options (Tenderly-free-excludes-Polygon)

**Date:** 2026-06-07 (live web-verified). **Need:** fork Polygon 137 @ pinned block 86,900,000; faucet arbitrary ERC20 (USDC + thin wCOP `0x8a1D45e102e886510e891d2Ec656a708991e2D76`); public HTTPS RPC a Vercel serverless browser dApp can hit (CORS-OK); deploy + read back; on a FREE tier; by ~June 11 2026.

### RANKED RECOMMENDATION

**#1 — BuildBear Sandboxes (FREE tier). The only genuinely-free HOSTED option that meets every requirement.**
- Forks Polygon (137) at a custom block — Polygon is an officially supported fork source. (https://www.buildbear.io/docs/sandbox/create-a-sandbox, https://www.buildbear.io/)
- Exposes `buildbear_ERC20Faucet` — a custom JSON-RPC method on the sandbox RPC that mints arbitrary ERC20 to any address (no whale impersonation, no storage-slot hunt). Documented as "available for all EVM networks" BuildBear provides, so it works for both USDC and the thin wCOP token. (https://www.buildbear.io/docs/json-rpc, https://www.buildbear.io/docs/json-rpc/ethereum/buildbear_ERC20Faucet)
- Gives a public HTTPS RPC URL + a hosted block explorer per sandbox — designed for browser dApps, so CORS is permitted on the public RPC (this is BuildBear's core use case: dApp testing from a browser). VERIFY at first boot with a browser `eth_chainId` fetch.
- **Free-tier limits (the catch):** **2 sandboxes**, **3-day TTL each** (sandbox auto-expires/needs recreation after 72h). Source confirms free = 2 sandboxes / 3-day lifetime + limited historical-block access. (https://www.buildbear.io/pricing)
  - Operational consequence: a sandbox created >3 days before June 11 will expire. **Create/recreate the demo sandbox within 72h of the demo** and re-fund + re-deploy (cheap, scriptable). Fork Polygon at LATEST — the historical 86.9M pin is free-tier-invalid here (line 157: "limited historical-block access") and unnecessary: the fresh cold deploy needs only the block-invariant wCOP/USDC/v4-PoolManager addresses; the 86.9M pin stays only on the in-VM/Alchemy regression test.
  - RPC per-request rate cap on free tier is **NOT published** — FLAG: not confirmed. Assume a modest cap; a single-user demo is fine, but do not hammer it from CI loops.

**#2 (runner-up) — Self-hosted anvil + Cloudflare Tunnel (cloudflared).** Free and unlimited, but local-only-until-tunneled and more moving parts.
- `anvil --fork-url <polygon-archive-rpc> --fork-block-number 86900000` forks Polygon at the pinned block. Native funding via `anvil_setBalance`. **ERC20 funding has NO native faucet** — two paths: (a) `anvil_setStorageAt` on the token's `balanceOf` mapping slot (slot = `keccak256(abi.encode(holder, balanceSlot))`; find the slot via `eth_createAccessList`, cf. viem-deal / forge `deal`), or (b) `anvil_impersonateAccount` a known whale + transfer. Path (a) is the cheat equivalent of BuildBear's faucet and works for arbitrary tokens incl. thin wCOP. (https://github.com/Rubilmax/viem-deal, https://github.com/foundry-rs/foundry/issues/2341)
- Vercel browser → local anvil requires a tunnel. **Prefer cloudflared** (Cloudflare Tunnel): free, unlimited bandwidth, no session cap, gives a public HTTPS URL. (https://developers.cloudflare.com/cloudflare-one/faq/cloudflare-tunnels-faq/)
  - **ngrok free is worse for a demo:** random URL (changes each restart), **2-hour session timeout**, 1 GB/mo bandwidth, restrictive rate limits as of 2026. Survives a demo but the URL churn + 2h cap is a live-demo hazard. (https://ngrok.com/docs/pricing-limits/free-plan-limits)
  - CORS: anvil itself permits CORS; with cloudflared you control headers at origin. VERIFY browser fetch through the tunnel before demo day.
- Why #2 not #1: depends on a machine staying up during judging + a working Polygon archive RPC for the fork source (you already have Alchemy keys); BuildBear collapses all of that into one hosted URL.

### REJECTED for the free-tier public-RPC browser demo

- **Tenderly Virtual TestNets — REJECT (free tier unusable for this).** Tenderly's platform technically forks 100+ chains incl. Polygon, BUT the **FREE plan has NO API access** ("No API access on Free," single-transaction simulation + UI access only) and write-operations on a Virtual TestNet consume Tenderly Units (free = small TU bucket; a write burns ~2000 TU). A persistent public RPC for a Virtual TestNet is a **Pro-plan** feature (Pro: up to 20 TestNets, 1 Admin + 1 Public RPC). So the free tier does not give you the programmatic public RPC + funding flow this demo needs. (https://tenderly.co/pricing, https://docs.tenderly.co/virtual-testnets/pricing) — This matches the limitation the team hit (free is effectively UI/simulation, not a Polygon public-RPC fork you can drive from a browser). NOTE: the original report framed it as "free forks Ethereum-only"; the *more accurate* gate is **no free public RPC / no free API access**, not a chain whitelist.
- **Chainstack — REJECT.** Offers Polygon RPC nodes, debug/trace, and *testnet* faucets — but NOT a hosted mainnet-fork sandbox with an ERC20 cheat. Forking + arbitrary ERC20 minting is not a Chainstack product. (https://chainstack.com/how-to-get-polygon-rpc-endpoint-2026/, https://docs.chainstack.com/docs/polygon-methods)
- **Alchemy — REJECT for hosted demo.** No persistent hosted fork with a public RPC + ERC20 faucet; its fork features are local-dev / Sandbox-SDK oriented, not a standing browser-reachable Polygon-fork URL on free. (Use Alchemy only as the *archive RPC source* feeding anvil's `--fork-url`.)
- **Conduit / LocalChain (Phylax) — REJECT.** Conduit is for launching rollups (not ad-hoc mainnet forks); Phylax LocalChain is local tooling, not a free hosted public-RPC fork.

### Bottom line
Use **BuildBear free** as primary (one hosted URL = fork + `buildbear_ERC20Faucet` + explorer; just script sandbox (re)creation inside the 72h TTL window, forking Polygon at LATEST — the 86.9M historical pin is free-tier-invalid here and unnecessary for the fresh cold deploy). Keep **anvil + cloudflared** as the fully-free fallback if BuildBear's free rate cap or TTL bites. Avoid ngrok-free for the live demo (2h cap + random URL). Tenderly-free is out (no API/public-RPC on free, not a chain restriction).

**Unconfirmed / verify before demo:** (1) BuildBear free-tier RPC rate cap (unpublished); (2) exact `buildbear_ERC20Faucet` param order — confirm against the live sandbox; (3) browser CORS through BuildBear public RPC and through cloudflared — one `eth_chainId` fetch each.
