#!/usr/bin/env bash
# =============================================================================
# provision-buildbear-demo.sh — Phase-15 (15-01) hosted-fork demo provisioning
# =============================================================================
# Provisions the Scenario-1 mint against a HOSTED BuildBear Sandbox (a Polygon
# fork at LATEST, re-chained to chainId 31337, that the Vercel UI can reach).
#
# THE ONE BROADCAST-CORRECT SEQUENCE (B1 + B2 resolution):
#   B1 (funding)  — the deployer EOA (the broadcast sender) is funded wCOP + USDC
#                   via `buildbear_ERC20Faucet` on the SINGLE sandbox RPC BEFORE the
#                   broadcast (arbitrary ERC20 — no whale, no deal(), no prank).
#   B2 (core deploy) — ProvisionBuildBearDemo.run() INLINES the Panoptic-core deploy
#                   and reads back the live factory/riskEngine addresses (no nested
#                   broadcast, no state-load → foundry#8493 sidestepped).
# Then a SINGLE forge-script broadcast does: inlined core deploy + pool +
# 9-arg executor + deposit-on-behalf (receiver=executor) + mint at strike 360360.
#
# --no-mint VARIANT (Phase 10, PROV-01/PROV-04):
#   Passing `--no-mint` exports SKIP_MINT=true so ProvisionBuildBearDemo.run()
#   deploys a FRESH executor with numberOfLegs == 0 (no mint, no leg). On this
#   path the runner additionally:
#     - funds a DEDICATED DEMO_SIGNER_PK address (distinct from the deployer)
#       via hardhat_setBalance BEFORE capturing an evm_snapshot (so evm_revert
#       restores the signer's gas — Pitfall 2);
#     - captures an evm_snapshot id (quote-stripped — Pitfall 3);
#     - SKIPS the resolveFromMandate receipt-parse (there is no mint tx);
#     - writes buildbear-deployments.json DIRECTLY to the frontend artifact path
#       (via a runtime-asserted MONO_ROOT anchor) with mintTxHash: JSON null and
#       a snapshotId field — retiring the poisoned committed artifact.
#   NOTE: the LIVE --no-mint run + the snapshot round-trip proof are Plan 10-03
#   (operator-manual). This script only encodes the logic.
#
# The sandbox is created in the BuildBear DASHBOARD (free sandboxes live 3 DAYS —
# create within 72h of demo day); this runner TARGETS an existing sandbox via its
# single RPC, which carries the buildbear_* cheats — there is NO separate admin RPC.
#
# SECRETS: BUILDBEAR_RPC_URL is a bearer secret (server-side ONLY); both
# BUILDBEAR_DEPLOYER_PK and DEMO_SIGNER_PK are env-sourced from gitignored
# contracts/.env — NEVER hardcoded here, NEVER echoed. EOA addresses are DERIVED
# from the keys (cast wallet address), never literals.
#
# CORS caveat: the browser→BuildBear path may be CORS-blocked; verify with one
# eth_chainId fetch — if blocked, the frontend proxies the sandbox RPC through a
# Next.js route (the Somnia keeper-proxy pattern; sibling-repo's job, see Plan 03).
#
# Usage (from contracts/):   bash script/provision-buildbear-demo.sh [--no-mint]
# =============================================================================
set -euo pipefail

# --- 0) arg parse (Phase 10) ------------------------------------------------
NO_MINT=false
for arg in "$@"; do
  case "$arg" in
    --no-mint) NO_MINT=true ;;
  esac
done

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # the contracts/ dir
cd "$HERE"

# --- 1) env + secrets (gitignored contracts/.env) ---------------------------
if [[ -f .env ]]; then
  set -a; . ./.env; set +a
fi
: "${BUILDBEAR_RPC_URL:?missing BUILDBEAR_RPC_URL (sandbox RPC) in contracts/.env}"
: "${BUILDBEAR_DEPLOYER_PK:?missing BUILDBEAR_DEPLOYER_PK (broadcast sender key) in contracts/.env}"
RPC="$BUILDBEAR_RPC_URL"

# --no-mint REQUIRES the dedicated signer key — never fall back to the deployer key.
if [[ "$NO_MINT" == true && -z "${DEMO_SIGNER_PK:-}" ]]; then
  echo "FAIL: --no-mint requires DEMO_SIGNER_PK (gitignored contracts/.env); refusing to fall back to BUILDBEAR_DEPLOYER_PK" >&2
  exit 1
fi

# --- 2) Polygon constants + the OS env the inlined deploy reads -------------
USDC="0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"   # 6 decimals
WCOP="0x8a1D45e102e886510e891d2Ec656a708991e2D76"   # 18 decimals
# buildbear_ERC20Faucet `balance` is a WHOLE-TOKEN count (the faucet applies token decimals).
FUND_USDC_TOKENS="10000000"                          # 10M USDC tokens (ample headroom)
FUND_WCOP_TOKENS="10000000"                           # 10M wCOP tokens

# the deployer EOA is GUARDIAN_ADMIN/TREASURER for the demo (derived below).
export UNIV4_POOL_MANAGER="0x67366782805870060151383F4BbFF9daB53e5cD6"
export UNIV3_FACTORY="0x1F98431c8aD98523631AE4a59f267346ea31F984"

# --- 3) derive the broadcasting EOA + fund it BEFORE the broadcast ----------
EOA="$(cast wallet address --private-key "$BUILDBEAR_DEPLOYER_PK")"
export GUARDIAN_ADMIN="$EOA"
export TREASURER="$EOA"
echo "DEPLOYER_EOA=$EOA"

# native gas top-up (BuildBear pre-funds the test-junk EOA, but be safe; hardhat_setBalance
# WORKS on BuildBear — anvil_setBalance is rejected). 1e24 wei.
cast rpc hardhat_setBalance "$EOA" 0xd3c21bcecceda1000000 --rpc-url "$RPC" >/dev/null 2>&1 || true

# LIVE-VERIFIED faucet quirk: the fork's basefee (~40 gwei) makes the faucet's internal
# decimals() read revert GasPriceLessThanBasefee. Drop the next block's basefee to 0 and MINE
# it so the faucet's internal call succeeds. (One-time per provisioning run.)
cast rpc hardhat_setNextBlockBaseFeePerGas 0x0 --rpc-url "$RPC" >/dev/null 2>&1 || true
cast rpc evm_mine --rpc-url "$RPC" >/dev/null 2>&1 || true

# B1: arbitrary-ERC20 funding on the EOA via buildbear_ERC20Faucet, on the SAME single RPC.
# LIVE-VERIFIED param shape: a SINGLE map {token, address, balance} where `balance` is a
# WHOLE-TOKEN decimal count (NOT base units, NOT hex — the faucet applies token decimals).
echo "Funding EOA with USDC + wCOP via buildbear_ERC20Faucet ..."
erc20_faucet() {
  local token="$1" tokens="$2"
  local body
  body="$(printf '{"jsonrpc":"2.0","id":1,"method":"buildbear_ERC20Faucet","params":[{"token":"%s","address":"%s","balance":"%s"}]}' "$token" "$EOA" "$tokens")"
  local resp; resp="$(curl -s -X POST "$RPC" -H 'content-type: application/json' -d "$body")"
  echo "$resp" | grep -q '"result":"Success"' || { echo "FAIL: buildbear_ERC20Faucet $token -> $resp"; exit 1; }
}
erc20_faucet "$USDC" "$FUND_USDC_TOKENS"
erc20_faucet "$WCOP" "$FUND_WCOP_TOKENS"

# --- 4) the SINGLE forge broadcast (run() = deploy + pool + executor [+ mint]) -
# On --no-mint, export SKIP_MINT=true so run() deploys a fresh executor with no leg.
[[ "$NO_MINT" == true ]] && export SKIP_MINT=true
OUT="$(mktemp)"
trap 'rm -f "$OUT"' EXIT
echo "Broadcasting ProvisionBuildBearDemo.run() (NO_MINT=$NO_MINT) ..."
forge script script/ProvisionBuildBearDemo.s.sol \
  --rpc-url "$RPC" --broadcast --slow \
  --private-key "$BUILDBEAR_DEPLOYER_PK" 2>&1 | tee "$OUT"

# parse the read-back console2 `LABEL= 0x..` lines (forge prints the value after the label).
grab() { grep -F "$1" "$OUT" | tail -1 | grep -oE '0x[a-fA-F0-9]+|-?[0-9]+' | tail -1; }
FACTORY="$(grab 'FACTORY_ADDRESS=')"
RISK_ENGINE="$(grab 'RISK_ENGINE_ADDRESS=')"
POOL="$(grab 'POOL_ADDRESS=')"
RISK_MGMT="$(grab 'RISK_MANAGEMENT_ADDRESS=')"
EXECUTOR="$(grab 'EXECUTOR_ADDRESS=')"
MINTED_STRIKE="$(grab 'MINTED_STRIKE=')"
NUMBER_OF_LEGS="$(grab 'NUMBER_OF_LEGS=')"

CHAIN_ID="$(cast chain-id --rpc-url "$RPC")"

# --- 4b) --no-mint: fund the dedicated signer BEFORE the snapshot, then snapshot
SNAPSHOT_ID=""
if [[ "$NO_MINT" == true ]]; then
  # Derive the dedicated demo signer address (NEVER print the key).
  SIGNER_EOA="$(cast wallet address --private-key "$DEMO_SIGNER_PK")"
  echo "DEMO_SIGNER_EOA=$SIGNER_EOA"

  # Fund native gas for the signer — same hardhat_setBalance pattern as the deployer (NOT
  # anvil_setBalance, rejected on BuildBear). MUST precede evm_snapshot so evm_revert
  # restores the signer's gas (Pitfall 2: snapshot-before-funding loses signer gas on revert).
  cast rpc hardhat_setBalance "$SIGNER_EOA" 0xd3c21bcecceda1000000 --rpc-url "$RPC" >/dev/null 2>&1 || true

  # Capture the one-use snapshot AFTER signer funding, BEFORE any mint (there is no mint here).
  # cast rpc returns the result with quotes — strip them (Pitfall 3).
  SNAPSHOT_ID="$(cast rpc evm_snapshot --rpc-url "$RPC" | tr -d '"')"
  [[ "$SNAPSHOT_ID" =~ ^0x[0-9a-fA-F]+$ ]] \
    || { echo "FAIL: evm_snapshot returned unexpected value: $SNAPSHOT_ID" >&2; exit 1; }
  echo "SNAPSHOT_ID=$SNAPSHOT_ID"
fi

# --- 5) chainId-aware run-latest.json parse -> the resolveFromMandate tx hash -
# (FIX E) Only the MINT path has a resolveFromMandate tx to parse. On --no-mint there is no
# mint tx, so MINT_TX_HASH stays unset and the artifact write below uses --argjson null.
MINT_TX_HASH=""
if [[ "$NO_MINT" != true ]]; then
  RECEIPT="broadcast/ProvisionBuildBearDemo.s.sol/${CHAIN_ID}/run-latest.json"
  [[ -f "$RECEIPT" ]] || { echo "FAIL: broadcast receipt $RECEIPT not found"; exit 1; }
  MINT_TX_HASH="$(jq -r '.transactions[]
    | select(.function != null and (.function|test("resolveFromMandate")))
    | .hash' "$RECEIPT" | tail -1)"
fi

# --- 6) frontend-consumable deployments artifact ----------------------------
# Phase 10: write DIRECTLY to the frontend artifact path via a runtime-asserted MONO_ROOT
# anchor (eliminates the script/out manual-copy drift). script/ -> contracts/ -> backend/ ->
# packages/ -> monorepo root (four `..`).
MONO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
echo "MONO_ROOT=$MONO_ROOT"
# Hard anchor assertion: the resolved root MUST contain pnpm-workspace.yaml + both packages.
[[ -f "$MONO_ROOT/pnpm-workspace.yaml" && -d "$MONO_ROOT/packages/frontend" && -d "$MONO_ROOT/packages/backend" ]] \
  || { echo "FAIL: MONO_ROOT anchor wrong: $MONO_ROOT (expected pnpm-workspace.yaml + packages/{frontend,backend})" >&2; exit 1; }
FRONTEND_ART="$MONO_ROOT/packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json"
mkdir -p "$(dirname "$FRONTEND_ART")"

CAPTURED_AT="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

if [[ "$NO_MINT" == true ]]; then
  # --no-mint: mintTxHash + mintedStrike are JSON null (NOT empty strings — the validator
  # rejects ''); snapshotId carries the captured id. This retires the poisoned committed artifact.
  jq -n \
    --argjson chainId "$CHAIN_ID" \
    --arg executor "$EXECUTOR" \
    --arg pool "$POOL" \
    --arg riskManagement "$RISK_MGMT" \
    --arg factory "$FACTORY" \
    --arg riskEngine "$RISK_ENGINE" \
    --arg rpcUrl "$RPC" \
    --argjson mintTxHash null \
    --argjson mintedStrike null \
    --arg capturedAt "$CAPTURED_AT" \
    --arg snapshotId "$SNAPSHOT_ID" \
    '{chainId:$chainId, executor:$executor, pool:$pool, riskManagement:$riskManagement,
      factory:$factory, riskEngine:$riskEngine, rpcUrl:$rpcUrl, mintTxHash:$mintTxHash,
      mintedStrike:$mintedStrike, capturedAt:$capturedAt, snapshotId:$snapshotId,
      source:"abrigo-somnia --no-mint provision-buildbear-demo.sh"}' > "$FRONTEND_ART"
else
  # default (mint) path: preserve string mintTxHash, write to the SAME frontend path (no drift).
  jq -n \
    --argjson chainId "$CHAIN_ID" \
    --arg executor "$EXECUTOR" \
    --arg pool "$POOL" \
    --arg riskManagement "$RISK_MGMT" \
    --arg factory "$FACTORY" \
    --arg riskEngine "$RISK_ENGINE" \
    --arg rpcUrl "$RPC" \
    --arg mintTxHash "$MINT_TX_HASH" \
    --argjson mintedStrike "${MINTED_STRIKE:-0}" \
    --arg capturedAt "$CAPTURED_AT" \
    '{chainId:$chainId, executor:$executor, pool:$pool, riskManagement:$riskManagement,
      factory:$factory, riskEngine:$riskEngine, rpcUrl:$rpcUrl, mintTxHash:$mintTxHash,
      mintedStrike:$mintedStrike, capturedAt:$capturedAt,
      source:"abrigo-somnia 15-01 provision-buildbear-demo.sh"}' > "$FRONTEND_ART"
fi

# --- 7) final, explorer-verifiable summary block ----------------------------
echo "======================================================================"
echo "EXECUTOR_ADDRESS=$EXECUTOR"
echo "POOL_ADDRESS=$POOL"
echo "RPC_URL=$RPC"
if [[ "$NO_MINT" == true ]]; then
  echo "DEMO_SIGNER_EOA=$SIGNER_EOA"
  echo "SNAPSHOT_ID=$SNAPSHOT_ID"
  echo "NUMBER_OF_LEGS=$NUMBER_OF_LEGS"
  echo "ARTIFACT=$FRONTEND_ART"
  echo "--no-mint: executor is FRESH (numberOfLegs == 0, mintTxHash: null) — this overwrites/retires the poisoned committed artifact."
else
  echo "MINT_TX_HASH=$MINT_TX_HASH"
  echo "MINTED_STRIKE=$MINTED_STRIKE"
  echo "NUMBER_OF_LEGS=$NUMBER_OF_LEGS"
  echo "ARTIFACT=$FRONTEND_ART"
  echo "(verify MINT_TX_HASH in the per-sandbox BuildBear block explorer)"
fi
echo "======================================================================"
