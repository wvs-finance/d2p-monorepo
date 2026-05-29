# Scout Archive — On-chain event shapes (KPD-16 / TOPIC-01 evidence)

> Canonical KPD-16 record of the three live on-chain event **shapes** (topic0,
> topic count, data-byte length) emitted by the proxy. This is the inversion
> evidence for TOPIC-01: it records SHAPES, NOT roles. Definitive role/name
> assignment is Phase 2 (TOPIC-01), which keccak-resolves against the pinned
> commit `e15d4e9`. Re-confirm shapes via `probes/somnia_rpc.get_logs` on the
> proxy.

**Probe tooling:** `probes/somnia_rpc.py`
**Endpoint (source_url):** `https://api.infra.mainnet.somnia.network/`
**Proxy:** `0x5E5205CF39E766118C01636bED000A54D93163E6`
**utc_fetch_ts:** 2026-05-29T20:08Z

## The three live on-chain event shapes

| topic0 | #topics | data bytes | shape | source_url | utc_fetch_ts |
|---|---|---|---|---|---|
| `0xb62339927ed9948fd837358a55f5b9a824f7b047043faece66965593ed726889` | 3 (topic0 + 2 indexed) | 1120 | 2 indexed args + large dynamic payload (matches `RequestCreated`'s ABI shape) | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:08Z |
| `0x5c090ef48df2b4d8a01bd0639355d62c318b623aed749bdd12325f789e37a2cf` | 2 (topic0 + 1 indexed) | 32 | 1 indexed arg + 1 word | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:08Z |
| `0x65db1ef5b3bcd84fe4fb8dbbe1cadc9fe6643bb261ab2e01d65c281c3d466af2` | 2 (topic0 + 1 indexed) | 32 | 1 indexed arg + 1 word | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:08Z |

## Roles NOT assigned here

The scout addendum's topic0 role labels (`event_count_addendum.md`) are **likely
INVERTED.** That addendum called the `0x5c09`+`0x65db` 32-byte pair the
"request side" and `0xb623…` the "response side." The on-chain shapes contradict
that: the 3-topic / 1120-byte `0xb623…` matches the ABI shape of
`RequestCreated(uint256 indexed requestId, uint256 indexed agentId,
uint256 perAgentBudget, bytes payload, address[] subcommittee)` (2 indexed +
large dynamic payload), so `0xb623…` is the leading **RequestCreated** candidate,
NOT a response event.

**TOPIC-01 (Phase 2) resolves this definitively** by keccak-resolving all three
topic0s against the pinned commit `e15d4e9` ABI and matching topic-count +
data-length to each event's ABI shape. Do not hard-code these role guesses
anywhere; only the shapes above are settled.

**There is NO `ResponseReceived` event in the `main`-branch interface.** The
interface carries `RequestFinalized` + `SubcommitteePaid` (both 2-topic), and
per-member `Response[]` data lives in the `Request.responses` struct array — flag
for Phase 2: confirm whether per-member response data is event-emitted at all or
only state-readable before EVENT-01 treats the `responses` child table as
event-fillable. The 1120-byte payload on `0xb623…` may itself encode the
`address[] subcommittee` + response data.
