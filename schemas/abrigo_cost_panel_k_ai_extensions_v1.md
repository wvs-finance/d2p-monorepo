# SHARED-SCHEMA-01 — K_AI Sidecar Extension Schema (`abrigo_cost_panel_k_ai_extensions_v1.md`)

> **schema_version:** `abrigo_cost_panel_k_ai_extensions_v1`
> **schema anchor:** `v1-K_AI-anchored`
> **Requirement:** SHARED-SCHEMA-01 (K_AI sidecar).
> **Joins:** `schemas/abrigo_cost_panel_intersection_v1.md` on `(chain_id, tx_hash)`.
> **Source of truth:** `schemas/event_schema_v1.md` (EVENT-01 — dtypes MUST be
> consistent) + the `<interfaces>` block of `01-05-PLAN.md`.
> **Status:** the `K_AI`-leg sidecar for the joint-analysis panel. Read by PANEL-01
> (Phase 5).

This sidecar carries the `K_AI` (agent-payment, Somnia) leg-specific columns that
are **not** part of the strict cross-leg intersection
(`abrigo_cost_panel_intersection_v1`). Keeping these columns in a sidecar is what
makes the intersection source-agnostic and cross-leg. A joint-analysis consumer
joins this sidecar back to the intersection on `(chain_id, tx_hash)`.

Dtypes here are consistent with `schemas/event_schema_v1.md` (EVENT-01).

---

## K_AI extension columns

| column                    | polars dtype                                       | parquet physical    | nullability | note                                                                                                                  |
|---------------------------|----------------------------------------------------|---------------------|-------------|-----------------------------------------------------------------------------------------------------------------------|
| `agent_class`             | `pl.Utf8`                                          | BYTE_ARRAY          | NOT NULL    | resolved agent-class label (one of the three canonical classes below)                                                 |
| `implementation_address`  | `pl.Utf8`                                          | BYTE_ARRAY          | NOT NULL    | **NEVER null-type** (PITFALLS E1) — explicit dtype even when constant per partition; consistent with event_schema_v1.md |
| `subcommittee_size`       | `pl.UInt32`                                        | INT32               | NOT NULL    | `subSize_default = 3`; 1–5 members per request                                                                        |
| `per_agent_budget_native` | `pl.Utf8` (wei decimal) **or** `pl.Decimal(38,0)`  | BYTE_ARRAY / FIXED  | NOT NULL    | wei amount, SOMI wei ≈ 1e16–1e17 ≈ 17–18 digits, **provably ≤ 38** — Utf8 OR Decimal(38,0), **never Int64**; consistent with event_schema_v1.md (ABI `perAgentBudget`) |
| `request_id_kai`          | `pl.Utf8` (uint256 decimal string)                 | BYTE_ARRAY          | NOT NULL    | **Utf8 ONLY** — NEVER `Int64` AND NEVER `Decimal(38,0)`: uint256 id = up to **78** digits > Decimal128's 38, same rule as the intersection `request_id` |
| `agent_class_keccak`      | `pl.Utf8` (or `Binary(32)`)                        | BYTE_ARRAY          | nullable    | KPD-18 reservation; consistent with event_schema_v1.md                                                                |
| `agent_class_string`      | `pl.Utf8`                                          | BYTE_ARRAY          | nullable    | KPD-18 reservation; consistent with event_schema_v1.md                                                                |

**DTYPE SCOPE RULE (B1, verbatim — load-bearing, consistent with EVENT-01):**
> Decimal(38,0) permitted ONLY for wei amounts provably ≤ 38 digits;
> requestId/agentId/topic-derived ids are Utf8-only (uint256 = up to 78 digits >
> Decimal128's 38).

So `per_agent_budget_native` (wei) may be `pl.Utf8` OR `pl.Decimal(38,0)`, never
`Int64`; `request_id_kai` (uint256 id) is `pl.Utf8` ONLY, never `Decimal(38,0)`.

---

## Join key

**`(chain_id, tx_hash)` → `abrigo_cost_panel_intersection_v1`.**

This is a **SIDECAR**: it holds K_AI-specific columns that are NOT in the strict
intersection, joined back to the intersection panel on `(chain_id, tx_hash)`. A
consumer that only needs the cross-leg intersection never loads this sidecar; a
K_AI-leg analysis loads both and joins.

**Responses remain a separate child table.** Per EVENT-01 (KPD-03) and the Phase-5
KPD-PANEL-JOIN contract, per-member `Response[]` data is NOT exploded into the
panel primary-row surface — it remains a separate child table
(`responses`, PK `(chain_id, tx_hash, log_index, member_index)`, FK
`(chain_id, tx_hash) → requests`). This sidecar carries only the request-row K_AI
columns, never per-member response rows.

---

## Agent classes

The three canonical agent classes with their absolute SOMI/call prices (consistent
with EVENT-01 §KPD-18 reservations and the project domain non-negotiables):

| agent class         | price (SOMI/call) |
|---------------------|-------------------|
| `json-fetch`        | 0.03              |
| `llm-inference`     | 0.07              |
| `llm-parse-website` | 0.10              |

Recovery of `agent_class` from the on-chain event is **LIKELY `agent_id → class`
(a uint registry) or a `bytes payload` decode, NOT `keccak → string`** — the `main`
`IAgentRequester` interface has no indexed string field (`agentId` is an indexed
`uint256`). The `agent_class_keccak` / `agent_class_string` columns are cheap
insurance reservations; final per-`(impl, topic0)` enumeration is Phase 2
(TOPIC-01).

---

This sidecar is **`v1-K_AI-anchored`**, consistent with the intersection schema's
anchor. A K_D-driven change to the intersection (see the intersection schema's
breakage budget) does not necessarily touch this sidecar, which is K_AI-only by
construction.
