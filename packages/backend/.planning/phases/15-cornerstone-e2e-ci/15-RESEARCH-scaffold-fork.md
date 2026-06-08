# 15-RESEARCH — Scaffold-ETH-2 fork patterns, Tenderly, and a UI-visible Polygon-fork mint

Research for Phase 15 (Cornerstone E2E + CI). Deliverable: ONE Scenario-1 demo where the
Polygon-fork wCOP/USDC Panoptic-V2 mint is **visible from the browser UI**, deployable on the
Vercel-prebuilt pipeline, keeping the live Somnia read leg. Two blockers to resolve:

- **BLOCKER 1 — ERC20 funding:** the fork test funds the executor with `deal()` (forge cheatcode,
  test-only). On a real fork node the executor has 0 wCOP/USDC → deposit/mint reverts. wCOP
  (`0x8a1D45e102e886510e891d2Ec656a708991e2D76`) is thin; whale-impersonation may not find a 10k holder.
- **BLOCKER 2 — core deploy + address read-back:** at Polygon block 86.9M the Panoptic V2 core is
  NOT on mainnet — the test DEPLOYS it (`DeployProtocol`) and caches to allocs JSON. `anvil --fork-url`
  + `--load-state` is documented-incompatible (foundry-rs/foundry#8493). The test hardcodes
  `FACTORY_V4_ADDR = 0x978e...8D90`. A node the UI hits must deploy the core AND surface the *actual*
  deployed addresses.

---

## Local ground truth (files read)

- `/home/jmsbpp/apps/d2p/frontend/package.json` — name `d2p-frontend`, **custom Next.js 16** (`next 16.2.6`,
  `react 19.2.4`), `wagmi ^2.19.5` + `viem ^2.48.11` + RainbowKit. NOT a SE-2 monorepo (no `packages/`,
  no hardhat/foundry workspace). Scripts: `contracts:gen` = `wagmi generate`; deploy to Vercel is
  prebuilt (per repo memory: GitHub Actions runs `vercel build` + `vercel deploy --prebuilt`).
- `/home/jmsbpp/apps/d2p/frontend/wagmi.config.ts` — `@wagmi/cli` `foundry` plugin pointed at
  `../abrigo` `out/`, `react` plugin → generates hooks into `lib/contracts/generated.ts`. This is the
  read-back seam (the SE-2 `deployedContracts.ts` analogue).
- `/home/jmsbpp/apps/d2p/frontend/lib/wagmi/config.ts` — `getDefaultConfig` (RainbowKit), 5 chains
  (celo/mainnet/base/arbitrum/optimism), `ssr:false`, per-chain `fallback([http,http])`. **No Polygon,
  no fork chain yet.** Adding one is a localized edit.
- `/home/jmsbpp/apps/d2p/frontend/lib/apps/abrigo/somnia/chain.ts` — Somnia testnet is **already**
  wired via viem `defineChain({ id: 50312, ... rpc api.infra.testnet.somnia.network })` +
  `createPublicClient`, deliberately ISOLATED from the 5-chain wagmi config (a read-only client, not a
  wagmi `targetNetwork`). Confirms custom-chain support works fine in this stack.
- `lib/apps/abrigo/somnia/deployments.json` — Somnia addrs (oracle/strategist/platform), `llmAgentId`,
  `keeperProxy https://keeper-eta-pied.vercel.app/`. Agent-1 leg already reads live.
- `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol`:
  - `:194` `FACTORY_V4_ADDR = 0x978e3286EB805934215a88694d80b09aDed68D90` (hardcoded constant).
  - `_deployCore()` `:254` sets env (`UNIV4_POOL_MANAGER`, `UNIV3_FACTORY`, `GUARDIAN_ADMIN`,
    `TREASURER`) then `new DeployProtocol().run()`; `require(FACTORY_V4_ADDR.code.length>0)` — relies on
    **deterministic CREATE addresses at the pinned block** so the deploy lands on the constant.
  - `:233` `vm.loadAllocs(STATE_FILE)` to reuse a prior deploy, else `:241` `vm.dumpState(STATE_FILE)`.
  - `_init_world()` `:283-298` funds via `deal(POLYGON_USDC,...)` / `deal(POLYGON_WCOP,...)` for both the
    test contract and the resolver harness, then approves+deposits collateral. `:393-394` same `deal`
    for the executor. **All funding is `deal()` — the exact thing that doesn't exist on a real node.**
- `contracts/fork-state/polygon-panoptic.json` — `vm.dumpState` allocs (account code/storage), the
  cached core. This is forge-test state format, NOT directly `anvil --load-state` compatible.

---

## Q1 — Scaffold-ETH-2 forked-env mechanics

SE-2 is a Hardhat/Foundry + Next.js monorepo (`packages/foundry`, `packages/nextjs`).

- **`yarn fork`** runs anvil in fork mode: `anvil --fork-url <RPC>` (chainId stays **31337** even when
  forking — confirmed in SE-2 issue #524 discussion). It is a **local, long-running** process.
- **`yarn deploy` → `deployedContracts.ts` read-back:** after deploy, SE-2 auto-generates
  `packages/nextjs/contracts/deployedContracts.ts` containing the **actual deployed addresses + ABIs**;
  the frontend reads them via `useScaffoldReadContract` / `useScaffoldWriteContract` (which look up
  address+abi by contract name, per chainId). **This pattern is exactly the answer to BLOCKER 2**:
  deploy the core to the fork, write the real addresses to a generated TS file, and the UI reads them
  back instead of trusting a hardcoded constant.
- **`/debug` page (Debug Contracts):** SE-2 ships a generic UI that renders every deployed contract's
  read/write functions as forms, letting the browser call any method. Directly relevant to "mint
  visible from the UI" — a debug-style panel can invoke `resolveFromMandate(...)` and read the position.
- **Burner wallet + faucet:** SE-2 includes a burner wallet (auto-generated EOA in localStorage) and a
  local faucet that tops up **native ETH** on the local/fork chain. The faucet uses the unlocked anvil
  dev accounts (or `anvil_setBalance`) to send gas. **It funds native gas, NOT arbitrary ERC20s.** So
  SE-2's own faucet does NOT solve BLOCKER 1 for wCOP/USDC out of the box — you'd still need anvil's
  `anvil_impersonateAccount` + a whale, or a deploy-time mint, or (the clean path) Tenderly's
  `tenderly_setErc20Balance`. SE-2 doesn't ship ERC20 funding.

Net: SE-2 cleanly solves BLOCKER 2 (deploy→read-back→debug UI) but only partially BLOCKER 1 (native gas
only). It also assumes a long-running anvil — incompatible with Vercel hosting (see Q3).

## Q2 — SE-2 "extensions" (what the user called "skills")

`npx create-eth@latest -e <extension>` scaffolds curated **extensions** — pre-built add-on packages
layered onto the base template at creation time (e.g. `subgraph`, `ponder`, `eip-712`, `erc-20`,
`challenge-*` variants, Foundry-vs-Hardhat selection). They are template overlays, NOT runtime plugins
or installable-after-the-fact "skills." There is no extension that magically hosts a fork on Vercel or
solves ERC20 funding; "fork" is a built-in `yarn fork` script, not an extension. The selection between
Foundry and Hardhat tooling is itself an extension-style choice at scaffold time. **Verdict: extensions
are creation-time scaffolding overlays; none materially changes the BLOCKER analysis.**

## Q3 — Vercel compatibility (THE crux)

Vercel is serverless: no long-running process, so it **cannot host an anvil fork node**. A Vercel-
deployed UI must reach a fork over the network. Two shapes:

- **(a) Local-only demo:** `yarn fork` + `yarn start` (or our `next dev`) on the dev machine, browser at
  localhost, recorded. Works, zero hosting cost, but the *deployed* Vercel URL can't reproduce it — the
  "visible from the UI" deliverable becomes a recorded local capture, not a live hosted demo.
- **(b) Hosted fork RPC** the deployed UI's wagmi config points at. This is the path that makes the
  Vercel build itself demoable. The best fit is **Tenderly Virtual TestNets**.

### Tenderly Virtual TestNets — the recommended hosted fork

Confirmed capabilities (Tenderly docs):

- **Fork Polygon** (105 networks supported; Tenderly is now an official Polygon public-RPC provider) at
  a chosen state; you set a **custom chain id** (docs recommend a unique id to prevent replay) or inherit
  the parent's. Pinned-block selection is the standard "fork at block" creation option.
- **Public RPC** — a shareable HTTPS JSON-RPC endpoint "you'll use to integrate into your dapp's UI when
  you're ready to demo externally," supporting all standard methods. Docs explicitly describe running a
  dapp on a "long-running, publicly accessible Virtual TestNet so users can test with an unlimited
  faucet" and an **Add to Wallet / MetaMask** flow. This is browser-usable. (Caveat below.)
- **Admin RPC ("god mode")** — funding methods that **solve BLOCKER 1 cleanly**:
  - `tenderly_setBalance` / `tenderly_addBalance` — native (gas).
  - `tenderly_setErc20Balance` — writes token balance directly to storage (no event).
  - `tenderly_addErc20Balance` — adds tokens AND emits a synthetic `Transfer` (indexer-friendly).
  - `tenderly_setMaxErc20Balance`, `tenderly_setStorageAt`, `evm_snapshot/revert`, `evm_increaseTime`.
  → Fund the executor (and any test EOA) with arbitrary wCOP + USDC in one admin call. **No whale, no
  10k-holder hunt, no `deal()`.** This is the decisive advantage over bespoke anvil.
- **Deploy custom contracts** to the TestNet (Foundry/Hardhat deploy guides) → run `DeployProtocol`
  against the Tenderly RPC, capture the **actual** deployed factory/risk-engine/pool addresses, write
  them into the frontend's generated/deployments file. **Solves BLOCKER 2** without `vm.dumpState`/
  `loadAllocs` and without trusting the hardcoded `FACTORY_V4_ADDR` (the CREATE-determinism assumption
  may not hold against a fresh Tenderly fork; read the addresses back instead of asserting the constant).

**Auth/CORS caveats to verify at build time (flagged, not yet hard-confirmed):**
- The Public RPC URL embeds a per-TestNet token/slug (`https://virtual.polygon.rpc.tenderly.co/<uuid>`).
  It is *shareable* and browser-usable for a demo, but it is effectively a bearer secret — anyone with
  the URL can transact on your faucet-funded testnet. For a hackathon demo that's acceptable; do NOT put
  the Admin RPC in client code (admin = full god-mode). Put only the **Public RPC** in the browser
  wagmi transport; do funding via Admin RPC from a script/CI step, never the browser.
- CORS for browser use: Tenderly's docs describe the Public RPC as the dapp-UI integration endpoint and
  the MetaMask Add-to-Wallet flow, implying browser CORS is allowed — but I did NOT find an explicit
  CORS-headers statement. **Verify with a one-line `fetch` from the browser before committing the path.**
- Virtual TestNets can be free-tier limited / time-boxed; confirm the plan keeps the TestNet alive
  through June 11 (or be ready to re-create it and re-run the deploy+fund script — idempotent).

### Alternatives (briefly)
- **Alchemy/Infura forks:** Alchemy has no general public hosted-fork-with-cheatcodes product usable by a
  browser; their fork tooling is local (`anvil --fork-url <alchemy>`). No `setErc20Balance` over a hosted
  public RPC. Doesn't solve BLOCKER 1 hosted.
- **Self-hosted anvil on Railway/Fly/small VM behind a public HTTPS RPC:** feasible — run
  `anvil --fork-url <polygon> --fork-block-number 86900000`, then a startup script that
  `anvil_impersonateAccount` a whale or `anvil_setStorageAt` to fund wCOP/USDC, deploy the core, expose
  the addresses. Solves both blockers but you OWN the funding hack (storage-slot fund for thin wCOP),
  CORS config, TLS, and uptime. More moving parts than Tenderly for the same outcome by June 11.

## Q4 — Somnia compat

- viem/wagmi custom-chain support is proven in this repo: `chain.ts` already does
  `defineChain({ id: 50312, ... })` for Somnia testnet. Multi-chain is straightforward — viem/wagmi
  handle arbitrary chains via `defineChain` + a transport per chain id.
- The current app keeps Somnia as an **isolated read client** (`createPublicClient`), separate from the
  RainbowKit `getDefaultConfig`. For Scenario-1 we don't even need Somnia in the wagmi write config —
  Agent-1's Somnia leg is a READ (consensus/decision) that's already live; only the Polygon-fork chain
  needs to be added to the wagmi `chains`+`transports` for the Agent-2 mint write. So the multi-chain
  story is: Somnia read client (exists) + add ONE fork chain (`defineChain({ id: <tenderly id>, rpc:
  <public RPC> })`) to the wagmi config for the mint. No conflict.
- SE-2's `scaffold.config.ts targetNetworks` does support arbitrary custom chains (it takes viem
  `Chain` objects), so a custom Somnia/fork chain would work there too — but this is moot since we are
  NOT adopting SE-2.

## Q5 — Realistic integration for OUR custom app (ranked)

1. **(RECOMMENDED) Borrow SE-2 patterns into the existing Next.js app, pointed at a Tenderly Virtual
   TestNet.** Add a Polygon-fork chain via `defineChain` to `lib/wagmi/config.ts` transports; keep
   Somnia read leg as-is. A small "mint panel" (the debug-page idea, but bespoke and scoped to
   `resolveFromMandate` + a position read) renders the Agent-2 mint and the read-back. Addresses come
   from a generated/deployments JSON written by the deploy step (the `wagmi generate` /
   `deployedContracts.ts` read-back analogue) — NOT the hardcoded constant.
2. **Full SE-2 adoption** — rewrite the frontend as an SE-2 monorepo. **Too heavy for June 11** and it
   still doesn't host on Vercel (long-running anvil) nor solve ERC20 funding. Reject.
3. **Local anvil + recorded demo** — fallback only. Works offline, but the deployed Vercel URL can't
   reproduce it and you own the wCOP funding hack. Keep as a safety net if Tenderly CORS/uptime fails.

### Recommended concrete path (resolves both blockers, Vercel-safe, keeps Somnia)

1. **Create a Tenderly Virtual TestNet** forking Polygon at block **86_900_000** with a custom chain id.
   Enable the Public RPC (+ optional public explorer for judges to inspect the mint tx).
2. **Deploy the Panoptic V2 core** to the TestNet by running `DeployProtocol` against the Tenderly RPC
   (a Foundry script run in CI / locally — NOT in the browser, NOT on Vercel). **Capture the actual
   deployed addresses** (factory, risk engine, pool/query) and write them to a frontend deployments file
   (e.g. `lib/apps/abrigo/polygon/deployments.json`, mirroring the Somnia one). → **BLOCKER 2 solved**
   by deploy-then-read-back; drop reliance on `FACTORY_V4_ADDR`.
3. **Fund** the executor + demo EOA with wCOP + USDC via **`tenderly_setErc20Balance`** (Admin RPC, from
   the same script) and native MATIC via `tenderly_setBalance`. → **BLOCKER 1 solved**; no whale, no
   `deal()`.
4. **Frontend:** add the fork chain to `lib/wagmi/config.ts` (`http(<public RPC>)`); add a scoped mint
   panel that (a) shows Agent-1's live Somnia consensus/`HedgeMandate` (existing read leg), (b) on click
   calls `MacroHedgeExecutor.resolveFromMandate(...)` on the fork chain, (c) reads back the minted
   position. The browser uses ONLY the Public RPC; Admin/funding stays server-side.
5. **Vercel:** the deployed UI points its fork transport at the long-running Tenderly Public RPC — works
   with the prebuilt pipeline (no node to host). The deploy+fund script runs in GitHub Actions (or
   locally before the demo), idempotent so the TestNet can be re-seeded.

### Fantasy / half-flow flags
- "Just `anvil --load-state polygon-panoptic.json`" — **fantasy**: forge `vm.dumpState` format is not
  `anvil --load-state` compatible with `--fork-url` (foundry#8493). Re-deploy on the target node instead.
- "Trust `FACTORY_V4_ADDR` on a Tenderly fork" — **fragile**: CREATE-address determinism depends on the
  deployer nonce/sender; against a fresh fork it may drift. Read addresses back.
- "SE-2 burner faucet will fund wCOP" — **false**: SE-2 faucet is native-gas only. ERC20 funding needs
  Tenderly admin RPC (or a self-owned impersonation/storage hack).
- "Public RPC is fully open/unauthenticated" — **half-true**: it's shareable but the URL is a bearer
  secret and may have free-tier/time limits; verify CORS + uptime through June 11.
- Whale-impersonation for wCOP — **risky**: thin token, may lack a single 10k holder; storage-slot
  funding or `setErc20Balance` is more reliable.

### Effort vs June-11
- Tenderly setup + deploy/fund script: ~half a day (the Foundry `DeployProtocol` already exists; point
  it at a new RPC + add the `tenderly_setErc20Balance` calls).
- Frontend mint panel + fork chain wiring: ~1 day in the existing app (read leg + ABI gen already exist).
- Total ~1.5–2 days, comfortably inside the deadline, with the local-anvil recorded demo as fallback.

---

## Sources
- Scaffold-ETH-2: https://github.com/scaffold-eth/scaffold-eth-2 ,
  https://github.com/scaffold-eth/scaffold-eth-2/blob/main/AGENTS.md , https://docs.scaffoldeth.io ,
  SE-2 fork chainId-31337 note: https://github.com/scaffold-eth/scaffold-eth-2/issues/524
- create-eth extensions: https://github.com/scaffold-eth/scaffold-eth-2 (create-eth `-e` extensions)
- Tenderly Virtual TestNets: https://docs.tenderly.co/virtual-testnets ,
  https://docs.tenderly.co/virtual-testnets/quickstart ,
  https://docs.tenderly.co/virtual-testnets/admin-rpc (setBalance/setErc20Balance/addErc20Balance) ,
  https://docs.tenderly.co/faq/virtual-testnets (Public RPC = dapp-UI endpoint, unlimited faucet,
  MetaMask Add-to-Wallet) , https://docs.tenderly.co/virtual-testnets/develop/fork-testnet ,
  https://docs.tenderly.co/virtual-testnets/develop/deploy-contracts
- Tenderly = Polygon public RPC provider:
  https://blog.tenderly.co/changelog/tenderly-is-a-polygon-public-rpc-provider/
- Foundry dumpState/load-state + fork incompat: foundry-rs/foundry#8493
- Local files: frontend `package.json`, `wagmi.config.ts`, `lib/wagmi/config.ts`,
  `lib/apps/abrigo/somnia/chain.ts`, `deployments.json`; contracts
  `test/fork/DemoMacroHedgeExecutor.fork.t.sol`, `fork-state/polygon-panoptic.json`.
