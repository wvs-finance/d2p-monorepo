#!/usr/bin/env bash
# Reproducibly restore contracts/lib/ Foundry dependencies in a clean checkout.
#
# WHY THIS EXISTS: contracts/lib/ is gitignored and is NOT registered as git submodules
# (no .gitmodules), and foundry.lock records commit *revs* without repo *URLs*. So a clean
# checkout (CI, or a fresh `git clone`) CANNOT restore the deps via `forge install` — there
# is no manifest mapping lib/<dep> -> a GitHub repo. This script is that manifest: it clones
# each dependency at its pinned rev (the 7 from foundry.lock + forge-std, which the lock omits).
#
# Verified to produce a green `forge build` + keyless `forge test --no-match-path 'test/**/*fork*'`
# in a clean clone (2026-06-02).
#
# Usage (from contracts/ or anywhere):  bash script/ci-install-deps.sh
set -euo pipefail
cd "$(dirname "$0")/.."   # -> contracts/
mkdir -p lib

inst() {  # url dir rev
  local url="$1" dir="$2" rev="$3"
  if [ -d "lib/$dir/.git" ]; then echo "  lib/$dir already present — skip"; return; fi
  echo "  cloning $dir @ ${rev:0:10}"
  git clone -q "$url" "lib/$dir"
  # Some pinned revs are not reachable from the default branch tip — fetch the exact commit.
  git -C "lib/$dir" fetch -q origin "$rev" 2>/dev/null || true
  git -C "lib/$dir" checkout -q "$rev"
}

# forge-std is NOT in foundry.lock; pinned here to the CI-verified rev.
inst https://github.com/foundry-rs/forge-std                 forge-std                  b3bc8b154382a75d0b0ef22d7fd4a0a5f0feee0e
# the 7 deps recorded in foundry.lock (rev = the locked commit):
inst https://github.com/1inch/clones-with-immutable-args     clones-with-immutable-args 196f1ecc6485c1bf2d41677fa01d3df4927ff9ce
inst https://github.com/openzeppelin/openzeppelin-contracts  openzeppelin-contracts     0a25c1940ca220686588c4af3ec526f725fe2582
inst https://github.com/vectorized/solady                    solady                     adfad66656a6ef8c65b2a412d849bbf7f7a59842
inst https://github.com/transmissions11/solmate              solmate                    eaa7041378f9a6c12f943de08a6c41b31a9870fc
inst https://github.com/Uniswap/v3-core                      v3-core                    6562c52e8f75f0c10f9deaf44861847585fc8129
inst https://github.com/Uniswap/v3-periphery                 v3-periphery               b325bb0905d922ae61fcc7df85ee802e8df5e96c
# Panoptic V2 core (BUSL-1.1, non-production). Pinned to the canonical mirror of the
# Code4rena @fe55774 audit snapshot. ONLY contracts/ source is used — its own nested
# submodules are NOT needed (our remappings resolve v4-core/solmate/clones/solady/etc.
# to our top-level lib/). NB: like forge-std, this dep is intentionally absent from
# foundry.lock — this manifest is its source of truth.
inst https://github.com/panoptic-labs/panoptic-v2-core       panoptic-v2-core           d20b0aed127ab5d3e5ca17c5399782aad2f0ff4c

# v4-core needs its OWN submodules: the @openzeppelin/ remapping points INTO
# lib/v4-core/lib/openzeppelin-contracts (a nested dep), so a recursive init is required.
if [ ! -d lib/v4-core/.git ]; then
  echo "  cloning v4-core @ e50237c438 (+ recursive submodules for nested OZ)"
  git clone -q https://github.com/Uniswap/v4-core lib/v4-core
  git -C lib/v4-core checkout -q e50237c43811bd9b526eff40f26772152a42daba
  git -C lib/v4-core submodule update --init --recursive -q
else
  echo "  lib/v4-core already present — skip"
fi

echo "deps restored: $(ls lib | tr '\n' ' ')"
