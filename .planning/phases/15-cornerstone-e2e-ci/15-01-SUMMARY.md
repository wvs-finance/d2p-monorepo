---
phase: 15-cornerstone-e2e-ci
plan: 01
subsystem: cornerstone-demo-provisioning
status: paused-at-checkpoint
tags: [e2e, buildbear, fork, provisioning, spike, live-mint]
requires:
  - "14-* cornerstone: resolveFromMandate fork-proven (strike 360360), 9-arg executor ctor"
  - "panoptic-v2-core DeployProtocol body (inlined, not run)"
provides:
  - "test_quoteMargin_basicReadAfterMint — E2E-01 in-VM basic-read leaf (committed 42b62d9)"
  - "ProvisionBuildBearDemo.spike() — Wave-0 cold-deploy de-risking entrypoint (committed 92a7e5d)"
  - "ProvisionBuildBearDemo.run() — full inlined deploy+pool+executor+deposit-on-behalf+mint (committed c500448)"
  - "provision-buildbear-demo.sh — EOA-funded-before-broadcast runner, LIVE-PROVEN mint (committed 6ad469b)"
  - "buildbear-deployments.json — frontend-consumable artifact w/ real MINT_TX_HASH (gitignored, ephemeral sandbox)"
affects:
  - "contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol"
  - "contracts/script/ProvisionBuildBearDemo.s.sol"
  - "contracts/script/provision-buildbear-demo.sh"
  - "contracts/.env.example"
tech-stack:
  added: ["BuildBear hosted Polygon-fork sandbox (chainId 31337)"]
  patterns: ["inline-DeployProtocol-body (no nested broadcast)", "read-back deployed addresses", "deposit-on-behalf (no deal/prank)", "EOA-fund-before-single-broadcast"]
key-files:
  created: ["contracts/script/ProvisionBuildBearDemo.s.sol", "contracts/script/provision-buildbear-demo.sh"]
  modified: ["contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol (42b62d9)", "contracts/.env.example (c500448)"]
decisions:
  - "Spike + run() inline only the V4 leg of DeployProtocol; the V3 factory/SFPMv3 leg is omitted (demo mint is V4-only)"
  - "buildbear_ERC20Faucet takes a SINGLE map {token,address,balance} with balance as a WHOLE-TOKEN decimal count, and needs a zero-basefee mined block first (live-verified, not the docs' positional shape)"
  - "buildbear-deployments.json is gitignored — a regenerable per-sandbox proof artifact; the sandbox is ephemeral (3-day free TTL)"
metrics:
  tasks_completed: 4
  tasks_total: 5
  files_touched: 4
  status: paused at the final blocking checkpoint (T5 — demo video)
---

# Phase 15 Plan 01: Cornerstone E2E demo provisioning — Summary (PAUSED at checkpoint T5)

E2E-01's in-VM basic-read leaf, the Wave-0 cold-deploy spike, the full `run()` provisioning, and the bash runner are all committed; the full deploy→fund→deposit→mint sequence has been **executed LIVE against the BuildBear sandbox and proven onchain** (tx `0x3297c4d2…`, status 1, executor owns 2 legs at strike 360360). Execution is PAUSED at the final blocking `checkpoint:human-verify` (T5) — the demo video, which only the human can record.

## Completed Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (auto, tdd) | quoteMargin basic-read leaf | `42b62d9` | contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol |
| 2 (checkpoint, spike) | ProvisionBuildBearDemo.spike() — inlined core deploy, LIVE-proven | `92a7e5d` | contracts/script/ProvisionBuildBearDemo.s.sol |
| 3 (auto) | full run() + .env.example | `c500448` | contracts/script/ProvisionBuildBearDemo.s.sol, contracts/.env.example |
| 4 (auto) | provision-buildbear-demo.sh runner — LIVE-PROVEN mint | `6ad469b` | contracts/script/provision-buildbear-demo.sh |

## Task detail

### T3 — full `run()` + `.env.example` (`c500448`)
Added `run()` to `ProvisionBuildBearDemo.s.sol`: under ONE broadcast it inlines the core deploy (read-back `factory`/`riskEngine` locals — never the snapshot constants), threads them into `deployNewPool` + the 9-arg executor ctor (vegoid off the read-back riskEngine), deposit-on-behalf (`receiver=executor`, no forge-test cheat), and mints at strike 360360 via `resolveFromMandate`. `.env.example` documents `BUILDBEAR_RPC_URL`/`BUILDBEAR_DEPLOYER_PK` + `UNIV4_POOL_MANAGER`/`UNIV3_FACTORY`/`GUARDIAN_ADMIN`/`TREASURER` (empty values). All T3 acceptance greps pass (word-boundary: the snapshot-constant identifiers and `deal(`/`prank` appear NOWHERE as code, only the required `*_ADDRESS` log labels).

### T4 — `provision-buildbear-demo.sh` (`6ad469b`) — EXECUTED LIVE
The runner derives the EOA from the key, funds it (wCOP+USDC via `buildbear_ERC20Faucet`) BEFORE a SINGLE `forge --broadcast` of `run()`, parses the chainId-aware (31337) `run-latest.json` selecting the `resolveFromMandate` tx for `MINT_TX_HASH`, writes `buildbear-deployments.json`, prints the explorer-verifiable summary.

**LIVE RESULT (sandbox `colossal-groot`, RPC `https://rpc.buildbear.io/colossal-groot-e8ea55ce`):**
- `ONCHAIN EXECUTION COMPLETE & SUCCESSFUL`
- `MINT_TX_HASH = 0x3297c4d2f0783b6a3b961c295151b06eed90b1d0c0bcaf1fcee7ccac576e7eb9` (independently confirmed: `cast receipt` status 1, block 88096890)
- `EXECUTOR = 0x091DA48B27E165de8c9D6BFDEeb5d10F84EF2e3A`, `POOL = 0x2a33880A9d0519624185Ce6007C5B197fC39eEd1`
- `MINTED_STRIKE = 360360`, `numberOfLegs(executor) = 2` (independent `cast call`)
- artifact `script/out/buildbear-deployments.json` written with all read-back addresses + sandbox RPC

## Deviations from Plan

**1. [Rule 3 - Blocking] Stack-too-deep in run() → struct + helpers**
- Found during: T3 `forge build`.
- Issue: the inline deploy + pool + executor + mint exceeded the EVM stack-slot budget in one frame.
- Fix: extracted `_provision()` (returns a packed `ProvisionResult` struct) + `_deployExecutor()`; `run()` now logs from ONE local. Compiles clean.
- Files: contracts/script/ProvisionBuildBearDemo.s.sol. Commit: `c500448`.

**2. [Rule 3 - Blocking] NatSpec-vs-grep token leaks (08-01/12-01/14-01 precedent)**
- The acceptance greps `! grep 'FACTORY_V4_ADDR…'` / `! grep 'deal('` / `! grep 'load-state'` / single-`--broadcast` were tripped by NatSpec comments naming those tokens. Reworded the comments (semantics preserved). Files: the script + the runner. Commits: `c500448`, `6ad469b`.

**3. [Rule 1 - Live finding] buildbear_ERC20Faucet param shape + basefee quirk**
- Found during: the live T4 run (the plan flagged this as a live-verify item).
- The docs' positional `(token, recipient, amount)` shape is WRONG — the faucet wants a SINGLE map `{token, address, balance}` where `balance` is a WHOLE-TOKEN DECIMAL count (the faucet applies decimals; NOT base units, NOT hex). It ALSO reverts `GasPriceLessThanBasefee` on its internal `decimals()` read until the fork's ~40-gwei basefee is dropped to 0 and a block is mined. The runner now does `hardhat_setNextBlockBaseFeePerGas 0x0` + `evm_mine` before fauceting.
- Files: contracts/script/provision-buildbear-demo.sh. Commit: `6ad469b`.

**4. [Tooling] jq was absent on the host**
- Installed via pacman (out-of-band, not a repo change) so the runner's JSON parse/write works. The runner's `jq` dependency is unchanged.

## Honesty preserved
No bridge; Agent-1 stays live on real Somnia testnet; the new in-VM leaf is a BASIC non-reverting `quoteMargin` read (no PnL/magnitude assertion); no `MacroHedgeExecutor` change; deposit-on-behalf (`receiver=executor`). The real-browser UI flow remains an explicitly sibling-repo-gated STRETCH — the MVP deliverable is this provisioning + the proven mint tx + the artifact + the video.

## Checkpoint / blocker
T5 is the final BLOCKING `checkpoint:human-verify` — the demo video. Everything Claude can automate is DONE and live-proven; only the human can record the screen capture. Execution STOPS here per the checkpoint protocol.

## Self-Check: PASSED
- FOUND: contracts/script/ProvisionBuildBearDemo.s.sol
- FOUND: contracts/script/provision-buildbear-demo.sh
- FOUND: contracts/script/out/buildbear-deployments.json (gitignored, ephemeral)
- FOUND commit: c500448 (T3)
- FOUND commit: 6ad469b (T4)
- forge build exit 0; bash -n runner exit 0
- LIVE mint tx 0x3297c4d2… confirmed status 1, numberOfLegs(executor)=2 @ strike 360360
