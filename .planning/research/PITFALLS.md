# M1 External Pitfalls Research

**Domain:** EIP-1967 proxy event indexing on a high-TPS EVM L1 (Somnia, chain 5031), with sub-second-block off-chain FX joining, Solidity 0.8.28 bytecode decompilation, and Parquet cost-panel materialization for downstream econometrics.
**Researched:** 2026-05-25
**Confidence:** HIGH for (a)/(b)/(d)/(e) — grounded in graph-node GitHub issue numbers, polars issue numbers, heimdall-rs issue numbers, and a 2022 ACM-TOSEM empirical study of EVM decompilers. MEDIUM for (c) — Somnia-specific block-time/FX-cadence pitfalls are derived by composition (general CoinGecko API behavior × Somnia's sub-second cadence); no direct post-mortem of an analogous SOMI panel exists.

This file is **scoped to external pitfalls** — issues other teams encountered doing analogous work but that PROJECT.md's pre-flight scout, KPDs (1–16), and inherited open questions do not already cover. Pitfalls already addressed in PROJECT.md (per-impl ABI resolver KPD-01, gas_payment_bucket KPD-02, Ormi-vs-RPC parity KPD-04, FX fallback adapter KPD-05, unresolved-topic0 contingency KPD-06, no-upgrade edge KPD-07, safe_block_depth validation KPD-09, partition compaction KPD-10, batch manifest KPD-11, case-study mode KPD-12, M2 ingest contract KPD-13, volume-distribution KPD-14, scout-archive KPD-16) are **out of scope** for this document.

---

## Surface (a) — EIP-1967 proxy event indexing across implementation transitions

### Pitfall A1: "Ghost-state" rows survive impl upgrade and contaminate per-impl distributions

**What goes wrong:** When the impl is upgraded, legacy storage written under the old impl's layout persists in the proxy's storage. If the new impl interprets the same slot differently (e.g. a `uint256 lastPrice` slot becomes a `mapping(address => uint256) lastPriceByCaller` head), early post-upgrade `RequestCreated` rows can carry stale or aliased semantics — the event topic0 and ABI may be unchanged, but the *meaning* of decoded fields shifts. STATS-01's per-impl-segment inequality #1/#7 binding analysis can show a spurious regime break that is actually a storage-layout aliasing artifact, not a runner-behavior change.

**Why it happens:** EIP-1967 only standardizes the *implementation-pointer* slot (`0x360...bbc`). Application state layout is the impl author's responsibility, and there is no on-chain attestation that new-impl's storage layout is a strict superset of old-impl's. Reviewers flagged the "ghost state" problem for *contract security*; the indexing equivalent is event-semantics drift.

**Warning sign:** Within a 100-block window straddling an `Upgraded(address)` event, the empirical distribution of `gross_residual` (KPD-02 column) shifts by > 0.5 σ AND `executionCost_i` cap-saturation rate (inequality #7 binding rate) changes by > 5 percentage points. Either alone is plausible; both together within a narrow window indicates aliased decoding, not runner behavior.

**Prevention:** EVENT-01 must define a `decode_stability_check` that, on every observed `Upgraded` event, **quarantines** the next ±10 blocks of events into `_pending_impl_transition` until the field-layout hash for the new impl is resolved against bytecode (BYTECODE-01 Tier-B output, OR explicit human attestation that the same field layout was retained). Without that resolution, those rows enter STATS-01 with `decode_status = 'unresolved_impl_transition'`, never silently typed as the previous impl's schema. This extends KPD-01's `(impl, topic0)` resolver with a temporal guard — KPD-01 says "do not silently use e15d4e9 schema for unmatched (impl, topic0)"; A1 adds "do not use ANY impl's schema for the transition window until field-layout hash is verified."

**Requirement / KPD mapping:** IMPL-01 + EVENT-01. Extends KPD-01 (per-impl resolver) and KPD-07 (no-upgrade edge case) by adding a transition-window quarantine band.

**Source:** [Zealynx 2026 proxy security guide on ghost-state](https://www.zealynx.io/blogs/upgrade-patterns-security); composition with KPD-01's field-layout-hash design.

---

### Pitfall A2: `Upgraded(address)` event missed because the proxy itself isn't a registered data source

**What goes wrong:** Subgraph manifests list event handlers per `(address, event-signature)` pair. The standard pattern for IAgentRequester is to register the proxy address as a data source for the *business* events (`RequestCreated`, `ResponseReceived`, `NativeTransferFailed`). It is common to **forget** to also register a handler on the same proxy address for the EIP-1967 `Upgraded(address indexed implementation)` event (topic0 `0xbc7cd75...`). When an upgrade happens, the subgraph silently keeps indexing the new impl with the old impl's ABI assumptions — IMPL-01's `impl_history.parquet` shows only one row covering `[deployment_block, ∞)` and you never know the upgrade happened until STATS-01 produces nonsense.

**Why it happens:** `Upgraded` is emitted by the proxy *itself*, not by the implementation. Developers reason "the proxy doesn't have business logic, why would it emit events I care about?" and omit the data source. Compounding: EIP-1967 also defines `AdminChanged` and `BeaconUpgraded` topics — all three need registration for a complete provenance picture.

**Warning sign:** Indexing succeeds, `impl_history.parquet` has exactly one row, but the impl bytecode hash at the head block differs from the bytecode hash at the deployment block (verifiable independently via `eth_getCode` + `keccak256`). This is the canary that an upgrade happened and IMPL-01 missed it.

**Prevention:** INDEX-01 / KPD-08 (Ormi subgraph authorship) must list the proxy address as a data source for all three EIP-1967 administrative topics (`Upgraded`, `AdminChanged`, `BeaconUpgraded`) in `subgraphs/iagentrequester/subgraph.yaml`, with topic0 hashes hardcoded. Independent verification: at every batch boundary, compute `keccak256(eth_getCode(proxy, latest))` and assert it equals the bytecode hash recorded in the most recent `impl_history.parquet` row — fail the batch if they diverge.

**Requirement / KPD mapping:** IMPL-01 + KPD-08. Net-new prevention: bytecode-hash assertion at batch boundary.

**Source:** Composition of [EIP-1967 spec](https://eips.ethereum.org/EIPS/eip-1967) (three admin events) with [graph-node issue #3891 (some events not indexed)](https://github.com/graphprotocol/graph-node/issues/3891). Direct evidence that subgraphs silently miss event categories they didn't explicitly register.

---

### Pitfall A3: Beacon-proxy or diamond-proxy hidden behind an EIP-1967 façade

**What goes wrong:** A contract can be EIP-1967-storage-slot-compliant at the proxy layer while the actual implementation is a *beacon* (the proxy's "impl" slot points to a beacon contract that itself stores the real impl) or a *diamond* (multiple implementations indexed by function selector). The scout confirmed the EIP-1967 slot reads `0x9AF5...3EdD`, but did not verify whether `0x9AF5...3EdD` is itself the executable logic or a beacon/diamond router. If it's a beacon, the real impl can change *without* an `Upgraded` event at the proxy — only `BeaconUpgraded` (which itself may be at the beacon, not the proxy) signals it.

**Why it happens:** The EIP-1967 BEACON_SLOT (`0xa3f0...50`) is rarely checked; the assumption that "EIP-1967 = transparent or UUPS" is convention, not enforcement.

**Warning sign:** `eth_getStorageAt(proxy, 0xa3f0ad74c1bf...50)` returns a non-zero address. OR the impl at `0x9AF5...3EdD` itself has an EIP-1967 implementation slot populated (a proxy-pointing-at-a-proxy pattern).

**Prevention:** Pre-flight scout addendum (one-time, blocks INDEX-01): probe the beacon slot at the proxy AND probe whether `0x9AF5...3EdD` is itself a proxy. If beacon: register `BeaconUpgraded` at the beacon address, not the proxy. If diamond: IMPL-01's "implementation_address" is a fiction and the schema must carry per-selector dispatch — a larger architectural change.

**Requirement / KPD mapping:** IMPL-01 + Pre-flight Scout addendum. Resolution required in plan-phase before subgraph manifest is finalized.

**Source:** [EIP-1967 spec, beacon slot definition](https://eips.ethereum.org/EIPS/eip-1967); [Zealynx UUPS vs Transparent vs Beacon Proxy 2026 guide](https://www.zealynx.io/blogs/upgrade-patterns-security).

---

## Surface (b) — Subgraph / Ormi indexing on a high-TPS EVM chain

### Pitfall B1: Indexed dynamic-type event fields are returned as keccak hashes, silently corrupting cost rows

**What goes wrong:** Solidity `event Foo(string indexed agentClass, ...)` does not emit the string itself in the topic — it emits `keccak256(agentClass)`. graph-node returns this as `bytes32`, not as the original string. If TOPIC-01's keccak-match against NatSpec discovers that `agentClass` (or any other discriminator field needed to bucket the three agent classes) is declared `indexed` AND has dynamic type (`string`, `bytes`, dynamic arrays), the panel can never recover the human-readable value from log data alone — it has to round-trip through the `RequestCreated` calldata, which requires fetching the transaction body, not just the receipt.

**Why it happens:** This is the [longest-standing limitation in graph-node (#731, #913)](https://github.com/graphprotocol/graph-node/issues/731) — "Indexed strings and arrays are not parsed correctly." It is *fundamental* to EVM log encoding, not a graph-node bug, but it is consistently surprising to people writing their first subgraph.

**Warning sign:** TOPIC-01 keccak-matching yields a `RequestCreated` event signature with at least one `indexed` field of dynamic type. STATS-01 cannot bucket rows by agent class because the topic carries an opaque 32-byte hash.

**Prevention:** During TOPIC-01 plan-phase (before INDEX-01 schema is locked), for each resolved `(impl, topic0)` pair, enumerate the field types from the NatSpec ABI and **flag every `indexed` dynamic-typed field**. If `agentClass` (or anything STATS-01 needs to bucket by) is indexed and dynamic, INDEX-01 must additionally fetch transaction calldata for those rows and decode it server-side (Ormi exposes `transaction.input` via the `_transaction` field). EVENT-01 schema must then split the column into `agent_class_hash` (from topic) and `agent_class_decoded` (from calldata), with a per-row `agent_class_decode_source` provenance column. Acceptance: every row in PANEL-01 with `agent_class_hash` populated also has `agent_class_decoded` populated; otherwise the row is `decode_status = 'agent_class_dynamic_indexed_missing_calldata'`.

**Requirement / KPD mapping:** TOPIC-01 + EVENT-01 + KPD-03 (DDL committed). Net-new: the dynamic-indexed-field enumeration check, plus calldata fetch path in INDEX-01.

**Source:** [graph-node issue #731 — Indexed strings and arrays are not parsed correctly](https://github.com/graphprotocol/graph-node/issues/731); [graph-node issue #913 — Differentiate indexed and non-indexed dynamic-array event fields](https://github.com/graphprotocol/graph-node/issues/913); [viem issue #197 — decodeEventLog silently fails when indexed param differs](https://github.com/wevm/viem/issues/197) (showing this is a cross-tool failure mode).

---

### Pitfall B2: Subgraph stuck-forever on falsely-detected reorg, no upstream notification

**What goes wrong:** [graph-node issue #5586](https://github.com/graphprotocol/graph-node/issues/5586) documents subgraphs getting stuck *forever* after the indexer falsely detects a reorg — the indexer marks blocks as needing replay but its replay path fails, head no longer advances, and there is no metric exposed that distinguishes "subgraph is healthy and just slow" from "subgraph is wedged." Issue #4599 documents the related "block has already been processed" failure under genuine reorgs. On a high-TPS chain, false-reorg detection is more likely because the indexer's chain-tip polling can race with rapid block production.

**Why it happens:** graph-node uses head-block polling + parent-hash linkage to detect reorgs. If two adjacent polls catch the chain at inconsistent moments (one polls block N, the next polls block N+5 but the indexer's cached head was a now-uncled block N), it interprets the discontinuity as a reorg. On Somnia (sub-second blocks, ~20 ms consensus tick), the poll-interval-vs-block-time ratio is unfavorable.

**Warning sign:** Ormi subgraph's `_meta.block.number` stops advancing for > 5 minutes while [`eth_blockNumber` at the RPC](https://docs.getblock.io/api-reference/somnia) continues to advance. Or Ormi reports it is N blocks behind head but the gap is not closing.

**Prevention:** INDEX-01 / KPD-04 (Ormi-vs-RPC parity) must also include a **liveness probe**: every 5 minutes, query Ormi's `_meta { block { number } }` and compare to `eth_blockNumber`. If gap > 60 blocks AND not decreasing across 3 consecutive probes, escalate (page the operator, fail the next batch). This is a separate failure mode from KPD-04's *correctness* parity check — KPD-04 catches "Ormi returned wrong count for a window," this catches "Ormi stopped returning anything." Liveness probe state goes into the batch manifest.

**Requirement / KPD mapping:** INDEX-01. Extends KPD-04 with a liveness-failure detection band.

**Source:** [graph-node issue #5586 — Subgraph stuck forever after falsly detecting a reorg](https://github.com/graphprotocol/graph-node/issues/5586); [graph-node issue #4599 — subgraph has already processed block failure under reorg](https://github.com/graphprotocol/graph-node/issues/4599).

---

### Pitfall B3: Ormi subgraph silently drops events when they share topic0 with a different contract that also has the same `address: null` listening

**What goes wrong:** If the subgraph manifest lists `address: null` (catch-all on topic0) — a pattern some indexers use to gracefully handle proxies — events from ANY contract on Somnia matching the IAgentRequester `RequestCreated` topic0 enter the panel. This poisons PANEL-01 with rows from unrelated contracts. The dual mistake (listing only the proxy and assuming Upgraded events from other proxies don't collide) is less common but possible if the user opts into `address: null` to "future-proof" against proxy changes.

**Why it happens:** Topic0 is keccak of the event signature only — `keccak256("RequestCreated(uint256,address,bytes32,uint256)")` is a global namespace value, not contract-scoped. Multiple unrelated contracts can share it.

**Warning sign:** PANEL-01 has `RequestCreated` rows whose `tx.to` (or the contract address in the log) is not in `{proxy, impl}`. KPD-04's per-window parity check between Ormi and direct-RPC `eth_getLogs(address=proxy)` will catch this — Ormi count > RPC count for at least one window.

**Prevention:** KPD-08 (Ormi subgraph authorship): the `subgraph.yaml` MUST pin `address: 0x5E5205CF...163E6` (the proxy), never `address: null`. EVENT-01 schema MUST include the source-contract address column, and PANEL-01 write-time validation MUST assert `log.address == proxy_address` for every row (fail-loud on mismatch, do not silently drop).

**Requirement / KPD mapping:** INDEX-01 + KPD-08 + EVENT-01. Net-new: the source-contract-address write-time assertion.

**Source:** Composition of EIP-1967 (proxy is the canonical event source) + general subgraph manifest semantics; corroborated by [graph-node issue #2052 — Feature Request: Support indexed argument filtering](https://github.com/graphprotocol/graph-node/issues/2052) (which documents the topic0-only filtering model graph-node uses).

---

## Surface (c) — Off-chain FX joining at sub-second block cadence

### Pitfall C1: CoinGecko OHLCV timestamp is candle-CLOSE, not candle-OPEN — LOCF rule reversed

**What goes wrong:** PROJECT.md FX-01 specifies "last-observation-carried-forward, strictly `t_price < t_block_timestamp`." This is correct *if* the timestamp on each CoinGecko OHLC row is the candle's **open**. But [CoinGecko's official OHLC documentation](https://docs.coingecko.com/reference/coins-id-ohlc) explicitly states the returned timestamp is the candle's **close** time. If the panel implementation treats the timestamp as the open, then a CoinGecko row for hour H=`2026-04-06 14:00:00Z` actually represents the candle `[13:00:00Z, 14:00:00Z)` — and the LOCF rule `t_price < t_block` becomes a *look-ahead bias of up to 1 hour* (using a price candle that closed AFTER the block was mined, because the indexer thought 14:00 was the candle's start).

**Why it happens:** Different OHLCV providers use different timestamp conventions. Binance uses open-time; CoinGecko uses close-time. The convention is rarely tested explicitly, and on a sub-second-block chain the error is only visible as a small bias, not a catastrophic mismatch.

**Warning sign:** For blocks mined at `XX:00:30Z` (just after a candle boundary), the LOCF-joined `fx_source_ts_utc` is `XX:00:00Z` (the just-closed candle) — this is *correct* under close-time convention but *look-ahead* under open-time convention. Test: pick 100 blocks mined at `XX:59:55Z` (just before a candle boundary) and 100 at `XX:00:05Z` (just after); check that `fx_lag_seconds` distribution shifts by ~3600 s across the boundary if the convention is misread.

**Prevention:** FX-01 / KPD-05 must add: (i) explicit `fx_candle_timestamp_convention ∈ {open, close}` field in the adapter table, documented per source; (ii) the LOCF rule rewritten as `candle_close_ts < block_ts` (for CoinGecko) explicitly, with the conversion `candle_open_ts = candle_close_ts - 3600s` for CoinMarketCap if its convention differs; (iii) unit test asserting that for a block at `XX:00:30Z`, the joined CoinGecko hourly row has timestamp `XX:00:00Z` (candle that just closed), not `XX:00:00Z + 1h`.

**Requirement / KPD mapping:** FX-01 + KPD-05 (fallback adapter contract). Net-new: timestamp-convention field per source.

**Source:** [CoinGecko OHLC reference docs — timestamp = candle close](https://docs.coingecko.com/reference/coins-id-ohlc); [CoinAPI 2025 note on forward-fill induced look-ahead bias in OHLCV](https://www.coinapi.io/blog/ohlcv-data-explained-real-time-updates-websocket-behavior-and-trading-applications).

---

### Pitfall C2: FX series has multi-hour gaps during low-liquidity windows; LOCF + 4h stale flag is too permissive

**What goes wrong:** CoinGecko's hourly OHLCV is only emitted when trades occurred in the underlying CEXes during that hour. For a low-cap token like SOMI (TGE 2025-09-02), early-period or low-volume hours can be missing entirely — not "stale" but "absent." LOCF then carries a price forward across an arbitrary gap. KPD-05 already tightens the stale threshold to 90 minutes and adds `fx_very_stale` at >4h, but does not address the case where the gap arises from *missing source data* rather than from *staleness in observation*. In a per-block dataset of N=234k rows on a sub-second chain, even a 0.1% rate of LOCF-across-gap rows is ~235 contaminated rows; with low-volume periods early in TGE, the rate could be substantially higher.

**Why it happens:** OHLCV APIs return whatever hours they have, with no explicit "no data this hour" marker. The consumer has to detect gaps by checking that consecutive timestamps differ by exactly the expected interval. This check is easy to forget.

**Warning sign:** Distribution of `(fx_ts[n] - fx_ts[n-1])` in the cached FX series has a heavy tail at multiples of 3600s. Or: blocks in the early TGE window (Sep–Nov 2025) have `fx_lag_seconds` clustered at exactly 3600/7200/10800 etc., suggesting LOCF across a multi-hour outage.

**Prevention:** FX-01 / KPD-05 must compute a `fx_gap_origin ∈ {fresh, lcf_within_source_cadence, lcf_across_source_gap}` column per row. `lcf_across_source_gap` triggers when the LOCF candle is from a non-adjacent hour (gap of > 1.5 × expected interval). STATS-01 headline numbers must additionally exclude `lcf_across_source_gap` rows, and report `pct_lcf_across_gap` as a top-line diagnostic. Without this distinction, the existing `fx_stale`/`fx_very_stale` flags conflate observation lag with source-data absence — two different identification problems.

**Requirement / KPD mapping:** FX-01 + KPD-05. Net-new: gap-origin column and STATS-01 exclusion rule.

**Source:** [CoinGecko historical data limits — hourly data only when available](https://support.coingecko.com/hc/en-us/articles/4538747001881-What-granularity-do-you-support-for-historical-data); [CoinGecko API rate limits & 90-day-per-request historical range](https://docs.coingecko.com/changelog) (which forces multi-request stitching, the primary source of gap-injection bugs in custom adapters).

---

### Pitfall C3: Block timestamp is consensus-chain time but FX is exchange wall-clock — drift accumulates at sub-second cadence

**What goes wrong:** Somnia's data-chain block timestamps come from the validator producing that data chain; the consensus chain's final ordering uses a pseudorandom-but-deterministic interleaving algorithm. The block timestamp recorded on-chain is therefore the validator's local clock at data-block production, not the consensus-chain finalization wall-clock. CoinGecko candles, by contrast, are aligned to UTC exchange wall-clocks. On a chain with sub-second cadence, even ~100 ms of clock drift between a validator and UTC exchange time causes the LOCF rule to potentially pick the wrong candle for blocks within ~100 ms of a candle boundary. KPD-09 calls out finality validation but does not address timestamp-source clock semantics.

**Why it happens:** EVM `block.timestamp` is a soft constraint (Ethereum tolerates ±15 s) — validators can lie by a small amount without slashing. Somnia's MultiStream architecture inherits this. At Ethereum's 12-second block time the error is invisible to FX joining; at Somnia's sub-second cadence it can be a meaningful fraction of the indexing window per candle.

**Warning sign:** Distribution of block-N timestamp minus block-(N-1) timestamp has negative values (validator clocks running backward) or values much smaller than the consensus tick (~20 ms). Or: in a window of 1000 blocks, the implied per-block wall-clock spread exceeds the expected production rate by > 5%.

**Prevention:** EVENT-01 must carry both `block_ts_utc` (from `block.timestamp`) AND an `_indexer_observed_ts_utc` (wall-clock when the indexer first saw the block). The FX-01 join uses `block_ts_utc` but the panel exposes both, so STATS-01 can sanity-check the spread. For FX-join precision: only flag rows as "FX boundary risk" (`fx_boundary_risk = true`) when `|block_ts_utc − candle_close_ts| < 5 seconds`. Those rows carry a known-unknown timestamp-precision contribution that STATS-01 reports separately.

**Requirement / KPD mapping:** EVENT-01 + FX-01. Net-new: dual timestamp columns and boundary-risk flag. Touches KPD-03 (DDL definition).

**Source:** [Somnia MultiStream Consensus docs — data chain timestamps are per-validator](https://docs.somnia.network/somnia-blockchain/multistream-consensus); [Somnia Blog: Multistream Consensus Explained — pseudorandom interleaving](https://blog.somnia.network/somnia-s-new-multistream-consensus-explained).

---

## Surface (d) — Heimdall / panoramix decompilation of the 18.5 KB Solidity 0.8.28 impl

### Pitfall D1: Heimdall-rs recovers fewer event signatures than alternative decompilers — Tier-B may "succeed" while missing exactly the event we need

**What goes wrong:** A 2024 academic comparison ([arxiv 2409.11157](https://arxiv.org/pdf/2409.11157) — "The Incredible Shrinking Context in a Decompiler Near You") found heimdall-rs recovers 959 event signatures across a benchmark where a competing decompiler recovers 1049. Heimdall's symbolic-execution approach uses a bounded number of execution paths and **misses events that are only emitted on rare branches**. For IAgentRequester, the rebate path is likely on a less-frequented branch (`NativeTransferFailed` is documented as firing only when the happy-path rebate transfer fails). The successful-rebate event — the one BYTECODE-01 Tier-B most needs to find — may be exactly the kind of event Heimdall misses.

**Why it happens:** Symbolic execution times out or path-explodes on contracts with many branches; the decompiler returns what it has, presenting an *apparently complete* ABI that is actually a subset.

**Warning sign:** Heimdall output ABI contains `RequestCreated`, `ResponseReceived`, `NativeTransferFailed` but **no** explicit success-path rebate event. This looks like "the rebate path emits nothing on success" (a plausible design) but could equally be "Heimdall missed the rare-branch event."

**Prevention:** BYTECODE-01 Tier-B must use **at minimum two decompilers** within the 1-day timebox — Heimdall plus one other (panoramix is already named in PROJECT.md; consider also Ethervm.io or Dedaub). Cross-check: the union of event signatures across decompilers becomes the candidate set; events found by only one decompiler are flagged `decode_confidence = 'single_decompiler'` and validated against TOPIC-01's observed topic0 list. If both decompilers agree that no success-path rebate event exists AND no fourth topic0 shows up in TOPIC-01's quarantine list, accept the conclusion. Otherwise, fall through to Tier-C unaffected.

**Requirement / KPD mapping:** BYTECODE-01. Net-new: minimum-two-decompiler rule with cross-validation against TOPIC-01.

**Source:** [Arxiv 2409.11157 — "The Incredible Shrinking Context in a Decompiler Near You" (decompiler comparison, 2024)](https://arxiv.org/pdf/2409.11157); [Heimdall-rs Roadmap noting decompile module is experimental](https://github.com/Jon-Becker/heimdall-rs/wiki/Roadmap); [Heimdall issue #269 — feat(decompile): support nested mappings](https://github.com/Jon-Becker/heimdall-rs/issues/269) (showing 1D-mapping limitation).

---

### Pitfall D2: Heimdall handles only 1D mappings — nested-mapping storage reads in the rebate path will produce uncompilable pseudocode

**What goes wrong:** [Heimdall issue #269](https://github.com/Jon-Becker/heimdall-rs/issues/269) confirms Heimdall only supports flat `mapping(K => V)` storage. The IAgentRequester impl almost certainly uses `mapping(requestId => Request)` where `Request` is a struct containing `Response[]` — i.e. nested mappings or struct-of-array layouts via keccak-based slot computation. Heimdall will emit pseudocode that reads from slots like `keccak256(abi.encode(requestId, slot)) + offset` without correctly recognizing the struct-field semantics. The output looks valid Solidity but misnames or misindexes the rebate-relevant fields.

**Why it happens:** Nested-mapping slot computation requires symbolic recognition of `keccak256(key || keccak256(key || slot))` patterns — a known hard problem for symbolic-execution decompilers. Heimdall has it as a roadmap item, not a current feature.

**Warning sign:** Heimdall's decompiled rebate-path pseudocode contains `storage[keccak(...)]` reads with unresolved variable names like `var_a` or `stor_45`, or references to slot offsets that don't appear in any documented public state variable.

**Prevention:** BYTECODE-01 Tier-B success criterion is **not** "Heimdall produces compilable Solidity" — that bar is too high and false-positive-prone (Heimdall can emit incorrect-but-compilable code). Instead, the success criterion is: "the rebate equation extracted from decompilation reproduces the observed `gross_residual` distribution from Tier-C within ±2% on a 200-row holdout sample." This treats Tier-B as a hypothesis to validate against Tier-C, never as authority over it. PROJECT.md's framing of Tier-C as primary is preserved; Tier-B becomes a candidate explanation that must beat the empirical distribution.

**Requirement / KPD mapping:** BYTECODE-01 + KPD-02 (gas_payment_bucket residual). Net-new: explicit Tier-B-validates-against-Tier-C success criterion.

**Source:** [Heimdall issue #269 — nested mappings not supported](https://github.com/Jon-Becker/heimdall-rs/issues/269); [Heimdall-rs Modules wiki — decompile module marked experimental](https://github.com/Jon-Becker/heimdall-rs/wiki/Modules); [Empirical study of EVM decompilers (CSSLAB-USTC 2022)](https://csslab-ustc.github.io/publications/2022/sol-decompiler.pdf) — broad-evidence of decompiler precision limits.

---

### Pitfall D3: panoramix is unmaintained for Solidity 0.8 features and may fail silently or return pre-0.8 semantics

**What goes wrong:** panoramix (the Etherscan decompiler) was last meaningfully updated around 2020 and predates Solidity 0.8's checked-arithmetic-by-default change. The IAgentRequester impl is Solidity 0.8.28. panoramix's output may show `unchecked` semantics where the actual bytecode uses checked semantics, or vice versa — meaningfully wrong for any analysis of how `executionCost_i` interacts with `perAgentBudget` near the cap (where overflow/clamp semantics matter). panoramix may also fail entirely on contracts that use opcodes introduced after its last update (`PUSH0` from Solidity 0.8.20+, `MCOPY` from Cancun, etc.).

**Why it happens:** panoramix is community-maintained, no longer actively developed. The 0.8.28 compiler emits modern opcode patterns that older decompilers don't recognize.

**Warning sign:** panoramix output is dramatically shorter than Heimdall's for the same impl, or panoramix raises an exception on specific functions while Heimdall completes. OR: panoramix and Heimdall disagree on the *direction* of an inequality in the rebate calculation (suggesting a checked-vs-unchecked semantic mismatch).

**Prevention:** BYTECODE-01 should not rely on panoramix as authoritative for any Solidity-0.8-specific arithmetic semantics. Treat panoramix output as a *control-flow sketch* only; trust Heimdall over panoramix when they disagree on arithmetic. If even Heimdall fails on PUSH0/MCOPY-bearing functions, the timebox expires and Tier-C ships unconditionally. This is already PROJECT.md's fall-through path; the addition here is the explicit "do not use panoramix output for any post-0.8 arithmetic" rule.

**Requirement / KPD mapping:** BYTECODE-01. Net-new: panoramix-control-flow-only rule.

**Source:** [Heimdall 0.8.0 release notes — modern Solidity support](https://www.jbecker.dev/research/heimdall-0-8-0); composition with [Solidity 0.8 release notes / known bugs](https://docs.soliditylang.org/en/latest/bugs.html) (checked-arithmetic-default since 0.8.0, PUSH0 since 0.8.20, MCOPY since 0.8.24).

---

## Surface (e) — Parquet cost-panel materialization for downstream econometrics

### Pitfall E1: Polars `scan_parquet` schema-inference from a single file fails on partitions with null-typed columns

**What goes wrong:** [Polars issue #12781](https://github.com/pola-rs/polars/issues/12781) confirms that when scanning a multi-file Parquet dataset, Polars infers schema from one file. If the first file Polars opens has a column where all values are null (`list[null]` or `null` dtype) — which is common in early-window partitions where, say, no `Upgraded` events occurred yet, so `implementation_address` is the same for every row — subsequent partitions with that column populated as `list[Utf8]` or `Utf8` will fail to load, OR will load as null entirely. STATS-01's M2 ingest test (KPD-13) silently sees zero impl transitions even when `impl_history.parquet` shows several.

**Why it happens:** Parquet stores per-file schemas. Polars defaults to first-file schema. The "null in early file, populated later" pattern is universal in event-driven datasets where some events are rare.

**Warning sign:** `polars.scan_parquet(".../block_date=*/*.parquet").select("implementation_address").unique().collect()` returns a single value when `impl_history.parquet` shows multiple. Or the M2 ingest test (KPD-13) returns mean `gross_cost_usd` per agent class but the impl-segment breakdown shows only one impl.

**Prevention:** PANEL-01 / KPD-10 (partition compaction) must explicitly **write a schema manifest alongside the partitions** — a pyarrow `_common_metadata` file at the partition-root, OR a polars `schema.json` committed alongside the partition tree. Every batch write asserts the data conforms to the committed schema (no implicit null-type columns). On read, use `pl.scan_parquet(..., schema=...)` with the explicit schema, never relying on inference. Add a unit test that creates a fixture with a null-only column in the first partition and a populated column in a later partition, and asserts the merged read returns the populated values.

**Requirement / KPD mapping:** PANEL-01 + KPD-10 + KPD-11 (batch manifest schema) + KPD-13 (M2 ingest contract). Net-new: explicit schema file at partition root and explicit-schema read API.

**Source:** [Polars issue #12781 — list[null] vs list[f64] cross-file schema mismatch](https://github.com/pola-rs/polars/issues/12781); [Polars issue #14980 — Parquet reader fails when file has fewer columns than reader_schema](https://github.com/pola-rs/polars/issues/14980); [Polars 2025 schema-evolution post — missing_columns="insert", ScanCastOptions](https://pola.rs/posts/schema-evolution/); [Polars issue #20926 — schema evolution in scan_parquet](https://github.com/pola-rs/polars/issues/20926).

---

### Pitfall E2: Tiny-file storm from per-batch writes blows up read latency for STATS-01 and M2

**What goes wrong:** PROJECT.md's incremental-write design (KPD-10's `_staging` sub-partition + promotion) emits one or more Parquet files per indexer batch. At 234k+ rows across ~270 days and typical batch sizes, the panel can easily end up with thousands of tiny files (~MB each). Polars and pyarrow open each file's metadata on scan; with > 500-1000 row groups across files the metadata-read overhead can exceed the actual data-read time by an order of magnitude. STATS-01 acceptance does not directly measure read time, so the problem only surfaces at M2 when parametric fits time out.

**Why it happens:** Per-batch writes optimize for write-side simplicity; readers pay the cost. Compaction is not a default behavior — KPD-10 calls for weekly compaction "older than T days," but the precise file-size target and row-group-count target are unspecified.

**Warning sign:** Reading PANEL-01's full window via `polars.scan_parquet` takes > 30 s on a developer machine. Per-partition file count > 50. Average file size < 5 MB.

**Prevention:** KPD-10's compaction policy must specify **explicit targets**: target file size 64–256 MB per file, target row-groups per file ≤ 100. Compaction frequency tightened from "weekly for partitions older than T days" to "any partition with > 10 files AND no writes in the last 6 hours" (catches mid-week excursions). Add a daily cron metric: `n_files_per_partition` distribution; alert if p99 > 20. Add a STATS-01 read-time SLO: full-window scan must complete in < 10 s on the M2 acceptance environment.

**Requirement / KPD mapping:** PANEL-01 + KPD-10 + KPD-13. Net-new: explicit file-size and row-group targets, plus read-time SLO in M2 acceptance.

**Source:** [bneijt blog — Polars and Hive Datasets, small-files problem](https://bneijt.nl/blog/polars-and-hive-datasets-why-i-wrote-polario/); [Modexa Medium — 7 Parquet Partition Designs That Actually Work, micro-batch storms](https://medium.com/@Modexa/7-parquet-partition-designs-that-actually-work-69a2a0811ea8); [datamonkeysite — using Arrow Dataset to compact old partitions](https://datamonkeysite.com/2022/12/18/using-apache-arrow-dataset-to-compact-old-partitions/).

---

### Pitfall E3: Hive-partition by `block_date` plus polars/pyarrow predicate pushdown asymmetry

**What goes wrong:** PANEL-01 partitions by `block_date` (Hive-style). When STATS-01 or M2 queries a date range with a filter like `pl.col("block_date").is_between(...)`, polars *can* push that down to skip partitions. But [polars issue #4347 and discussion](https://github.com/pola-rs/polars/issues/4347) and [Bneijt's analysis](https://bneijt.nl/blog/polars-and-hive-datasets-why-i-wrote-polario/) show that when polars consumes a pyarrow dataset, the predicate pushdown is *not* always wired correctly — pyarrow scans all object names first, only filtering after, which on cloud storage is catastrophic. Locally it's less catastrophic but still slow at scale.

**Why it happens:** Polars-to-pyarrow predicate-pushdown is a known asymmetry; the `pyarrow_options={"partitioning": "hive"}` pattern doesn't fully propagate filters into the pyarrow scan.

**Warning sign:** Filtering on `block_date` shows linear scan time in total number of partitions, not in filtered partitions. Read time for `block_date = '2025-09-02'` is the same as read time for `block_date BETWEEN '2025-09-02' AND '2026-05-25'`.

**Prevention:** PANEL-01 should NOT use pyarrow-Dataset → polars conversion for read paths. Use `pl.scan_parquet("**/*.parquet", hive_partitioning=True)` directly (polars-native Hive support, fully predicate-pushdown-aware as of polars 0.20+). The M2 ingest contract test (KPD-13) must assert that a `block_date`-filtered scan reads ≤ 2× the number of files in the filtered date range (allowing for compaction-boundary slack).

**Requirement / KPD mapping:** PANEL-01 + KPD-13. Net-new: explicit polars-native scan path, not pyarrow-Dataset.

**Source:** [Polars issue #4347 — Support hive style partitioning of parquet file scans](https://github.com/pola-rs/polars/issues/4347); [Polars Hive user guide](https://docs.pola.rs/user-guide/io/hive/); [bneijt — Polars and Hive Datasets predicate pushdown limitations](https://bneijt.nl/blog/polars-and-hive-datasets-why-i-wrote-polario/).

---

### Pitfall E4: Schema-version column without a registry — silent v1↔v2 contamination when SHARED-SCHEMA-01 evolves

**What goes wrong:** PROJECT.md's SHARED-SCHEMA-01 (intersection schema + K_AI extension) and PANEL-01's `schema_version` column anticipate evolution. But there is no registry mapping `schema_version` → concrete DDL — only a Markdown spec file. When K_D ships and the intersection schema bumps to v2, downstream consumers reading a mixed-version Parquet tree have no machine-readable way to know which rows are v1 and which are v2, beyond a string. polars/pyarrow happily union-read mixed-version files using broadest schema, silently turning v1's absent columns into nulls in v2 rows.

**Why it happens:** Markdown is not a schema registry. Without a `schema_v1.json` / `schema_v2.json` artifact loadable by polars/pyarrow, the contract is enforced by hope and code review.

**Warning sign:** Two batches written under different schema versions both end up in the same Hive partition (block_date doesn't separate by schema version). The read schema is the union. `pct_null` for columns added in v2 is high when reading the merged dataset, but rows from v1 batches have NO indication they predate v2's column.

**Prevention:** KPD-11 (batch manifest schema) extended: every schema version `vN` is committed as `schemas/abrigo_cost_panel_intersection_v{N}.json` (polars/pyarrow-loadable JSON schema, not just Markdown). The batch manifest includes `schema_version_sha256`. PANEL-01 write-time validation uses the JSON schema, not Markdown. Reads of a multi-version tree MUST go through a per-version filter: `pl.scan_parquet(...).filter(pl.col("schema_version") == "v1").collect()` then re-collected with v2 schema; the two are joined explicitly with documented null-handling. Cross-version reads without explicit version filter are a write-time-rejected anti-pattern.

**Requirement / KPD mapping:** PANEL-01 + SHARED-SCHEMA-01 + KPD-11. Net-new: JSON-schema artifacts (not just Markdown) plus per-version read pattern.

**Source:** [Polars 2025 schema-evolution post — explicit schema control](https://pola.rs/posts/schema-evolution/); [Polars issue #20926 — Allow for schema evolution in scan_parquet](https://github.com/pola-rs/polars/issues/20926); [Polars issue #17418 — Provide more control over the Parquet schema when writing](https://github.com/pola-rs/polars/issues/17418).

---

## Pitfall-to-Requirement-and-KPD Mapping (consolidated)

| Pitfall | Surface | Owning requirement(s) | Extends KPD | Phase ordering implication |
|---------|---------|----------------------|-------------|----------------------------|
| A1 — Ghost-state aliased decoding across impl transitions | (a) | IMPL-01 + EVENT-01 | KPD-01, KPD-07 | Transition-window quarantine must land before STATS-01 |
| A2 — Missed `Upgraded` event because proxy not registered for admin topics | (a) | IMPL-01 + INDEX-01 | KPD-08 | Subgraph manifest authoring phase |
| A3 — Hidden beacon/diamond beneath EIP-1967 façade | (a) | Pre-flight Scout addendum + IMPL-01 | Scout phase | **Blocks** subgraph manifest finalization |
| B1 — Indexed dynamic-type field encoded as keccak hash | (b) | TOPIC-01 + EVENT-01 + INDEX-01 | KPD-03 | TOPIC-01 plan-phase must enumerate indexed dynamic fields |
| B2 — Subgraph stuck-forever on false-reorg, no notification | (b) | INDEX-01 | KPD-04 | Liveness probe in same phase as parity check |
| B3 — Topic0-collision with unrelated contracts | (b) | INDEX-01 + EVENT-01 | KPD-08 | Manifest authoring + write-time assertion |
| C1 — CoinGecko close-time-vs-open-time LOCF reversal | (c) | FX-01 | KPD-05 | FX adapter implementation phase |
| C2 — LOCF across multi-hour source-data gaps | (c) | FX-01 + STATS-01 | KPD-05 | Gap-origin column landed before STATS-01 |
| C3 — Block-timestamp clock drift at sub-second cadence | (c) | EVENT-01 + FX-01 | KPD-03 | Schema phase |
| D1 — Heimdall misses rare-branch events | (d) | BYTECODE-01 | — | Tier-B execution phase, hard timebox |
| D2 — Heimdall nested-mapping limitation produces uncompilable pseudocode | (d) | BYTECODE-01 | KPD-02 | Tier-B validates against Tier-C, not the other way |
| D3 — panoramix is pre-0.8 and may invert arithmetic semantics | (d) | BYTECODE-01 | — | Tier-B execution phase |
| E1 — Polars schema inference fails on null-typed columns in early partitions | (e) | PANEL-01 | KPD-10, KPD-11, KPD-13 | Schema artifact landed before first batch write |
| E2 — Tiny-file storm degrades read latency | (e) | PANEL-01 + STATS-01 | KPD-10, KPD-13 | Compaction policy + read-time SLO in M2 acceptance |
| E3 — Hive partition predicate pushdown asymmetry | (e) | PANEL-01 | KPD-13 | Read-path code uses polars-native, not pyarrow-Dataset |
| E4 — Schema-version column without machine-readable registry | (e) | PANEL-01 + SHARED-SCHEMA-01 | KPD-11 | JSON-schema artifacts at schema-definition phase |

---

## Cross-cutting "Looks Done But Isn't" verification checklist

These checks should run in CI or pre-PANEL-01-batch-promotion. They catch pitfalls that pass each individual requirement's local acceptance but fail the cross-requirement contract.

- [ ] **A2**: `keccak256(eth_getCode(proxy, head_block)) == impl_history[max(block) WHERE block <= head_block].impl_bytecode_hash` — proves no silent upgrade slipped past IMPL-01.
- [ ] **A3**: `eth_getStorageAt(proxy, 0xa3f0ad74c1bf...50) == 0x00` AND `eth_getStorageAt(impl, 0x3608...2bbc) == 0x00` — proves no beacon and no proxy-of-proxy.
- [ ] **B1**: For every `(impl, topic0)` in the resolver, the NatSpec ABI has zero `indexed` fields of dynamic type, OR the calldata-decode column is populated for 100% of rows.
- [ ] **B3**: `SELECT COUNT(*) FROM panel WHERE log_address != proxy_address` returns 0.
- [ ] **C1**: For 100 sample blocks at `XX:00:30Z`, `joined_fx_candle_close_ts == block_ts.floor('1H')`; for 100 sample blocks at `XX:59:30Z`, same. If different rule applies on either side of the boundary, the convention is misread.
- [ ] **C2**: `pct_lcf_across_gap == 0` in headline STATS-01 numbers (those rows excluded), AND reported as a separate diagnostic.
- [ ] **D2**: If Tier-B ships, `|reconstructed_rebate - tier_c_empirical_residual|.quantile(0.95) / tier_c_empirical_residual.median() < 0.02`.
- [ ] **E1**: `polars.scan_parquet(panel_root, schema=explicit_v1_schema).select(['implementation_address']).unique().count() == impl_history.row_count`.
- [ ] **E2**: Full-window `polars.scan_parquet(...).collect()` wall-time < 10 s on the M2 acceptance environment.
- [ ] **E3**: Filtered scan (`block_date = 'YYYY-MM-DD'`) reads ≤ 2× the file count actually in that partition.
- [ ] **E4**: Reading a synthetic mixed-version tree without explicit `schema_version` filter raises a write-time-rejected error.

---

## Recovery cost summary (when prevention fails)

| Pitfall | Recovery cost | Recovery steps |
|---------|---------------|----------------|
| A1 | HIGH | Re-run TOPIC-01 + BYTECODE-01 for each impl-segment; re-build per-impl-segment STATS-01 numbers; partition-quarantine the affected blocks |
| A2 | MEDIUM | Re-deploy subgraph with admin-event handlers; backfill from deployment block; PANEL-01 batch re-promotion |
| A3 | HIGH | Architectural — schema changes to per-selector dispatch; subgraph manifest rewrite |
| B1 | MEDIUM | Re-fetch transaction calldata for affected rows; backfill decoded columns; bump schema version |
| B2 | LOW–MEDIUM | `graphman rewind` to last-known-good block; restart indexing; manifest stays stable |
| B3 | LOW | Filter affected rows from PANEL-01; re-promote batch; manifest unchanged |
| C1 | LOW | Re-run FX adapter with corrected convention; re-join PANEL-01; STATS-01 re-run |
| C2 | LOW | Compute gap-origin column from cached FX series; filter STATS-01; no re-fetch needed |
| C3 | LOW | Add dual-timestamp columns; backward-compatible schema bump |
| D1, D2, D3 | LOW | Tier-C ships unconditionally; Tier-B failure is acceptable |
| E1 | MEDIUM | Write explicit schema artifact; re-write affected partitions through the explicit-schema write path |
| E2 | LOW | Trigger compaction immediately; tune targets going forward |
| E3 | LOW | Switch reader code from pyarrow-Dataset to polars-native Hive |
| E4 | MEDIUM | Backfill JSON-schema artifacts retroactively; per-version filtering applied at read time |

---

## Sources

- [graph-node issue #5586 — Subgraph stuck forever after falsely detecting a reorg](https://github.com/graphprotocol/graph-node/issues/5586)
- [graph-node issue #4599 — block-already-processed under reorg](https://github.com/graphprotocol/graph-node/issues/4599)
- [graph-node issue #3891 — Some events not indexed by subgraphs](https://github.com/graphprotocol/graph-node/issues/3891)
- [graph-node issue #2052 — Indexed argument filtering feature request](https://github.com/graphprotocol/graph-node/issues/2052)
- [graph-node issue #913 — Differentiate indexed/non-indexed dynamic-array event fields](https://github.com/graphprotocol/graph-node/issues/913)
- [graph-node issue #731 — Indexed strings and arrays not parsed correctly](https://github.com/graphprotocol/graph-node/issues/731)
- [graph-node issue #1568 — Reindexing blockchain fails without notice](https://github.com/graphprotocol/graph-node/issues/1568)
- [viem issue #197 — decodeEventLog silent decode failure on indexed-param mismatch](https://github.com/wevm/viem/issues/197)
- [polars issue #12781 — list[null] / list[f64] cross-file schema mismatch](https://github.com/pola-rs/polars/issues/12781)
- [polars issue #14980 — Parquet reader fails when file has fewer columns than reader_schema](https://github.com/pola-rs/polars/issues/14980)
- [polars issue #17418 — More control over Parquet schema on write](https://github.com/pola-rs/polars/issues/17418)
- [polars issue #20926 — Allow schema evolution in scan_parquet](https://github.com/pola-rs/polars/issues/20926)
- [polars issue #4347 — Hive-style partitioning of parquet file scans](https://github.com/pola-rs/polars/issues/4347)
- [polars 2025 schema-evolution post — missing_columns, ScanCastOptions, diagonal_relaxed](https://pola.rs/posts/schema-evolution/)
- [bneijt — Polars and Hive Datasets, polario rationale](https://bneijt.nl/blog/polars-and-hive-datasets-why-i-wrote-polario/)
- [Heimdall-rs issue #269 — nested mappings not supported](https://github.com/Jon-Becker/heimdall-rs/issues/269)
- [Heimdall-rs Modules wiki — decompile module experimental](https://github.com/Jon-Becker/heimdall-rs/wiki/Modules)
- [Heimdall-rs Roadmap](https://github.com/Jon-Becker/heimdall-rs/wiki/Roadmap)
- [Heimdall 0.8.0 release notes](https://www.jbecker.dev/research/heimdall-0-8-0)
- [Arxiv 2409.11157 — The Incredible Shrinking Context in a Decompiler Near You (2024)](https://arxiv.org/pdf/2409.11157)
- [CSSLAB-USTC 2022 — Empirical study of EVM decompilers](https://csslab-ustc.github.io/publications/2022/sol-decompiler.pdf)
- [EIP-1967 specification (admin events, beacon slot)](https://eips.ethereum.org/EIPS/eip-1967)
- [Zealynx 2026 — UUPS vs Transparent vs Beacon Proxy security guide](https://www.zealynx.io/blogs/upgrade-patterns-security)
- [CoinGecko OHLC API reference — timestamp = candle close](https://docs.coingecko.com/reference/coins-id-ohlc)
- [CoinGecko historical data granularity](https://support.coingecko.com/hc/en-us/articles/4538747001881-What-granularity-do-you-support-for-historical-data)
- [CoinGecko API changelog (90-day-per-request constraint)](https://docs.coingecko.com/changelog)
- [CoinAPI — OHLCV forward-fill induced look-ahead bias](https://www.coinapi.io/blog/ohlcv-data-explained-real-time-updates-websocket-behavior-and-trading-applications)
- [Somnia MultiStream Consensus docs](https://docs.somnia.network/somnia-blockchain/multistream-consensus)
- [Somnia Blog — MultiStream Consensus Explained](https://blog.somnia.network/somnia-s-new-multistream-consensus-explained)
- [Ormi Labs — best blockchain indexers 2026](https://blog.ormilabs.com/best-blockchain-indexers-in-2025-real-time-web3-data-and-subgraph-platforms-compared/)
- [Solidity 0.8.x known bugs](https://docs.soliditylang.org/en/latest/bugs.html)
- [Modexa — 7 Parquet Partition Designs That Actually Work](https://medium.com/@Modexa/7-parquet-partition-designs-that-actually-work-69a2a0811ea8)
- [datamonkeysite — Using Apache Arrow Dataset to compact old partitions](https://datamonkeysite.com/2022/12/18/using-apache-arrow-dataset-to-compact-old-partitions/)

---

*Pitfalls research for M1 empirical Somnia cost panel. Surfaces (a)–(e). All findings cross-checked against PROJECT.md to ensure no pitfall is already covered by KPD-01 through KPD-16 or by the scout-bounded findings.*
