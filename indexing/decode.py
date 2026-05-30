"""Pure ``getRequest`` tuple-decode + Σ executionCost + dtype-discipline helpers.

INDEX-01 Wave 0 (Plan 03-01). This is the CI-fixtured, network-free decode path
the LIVE state-fill in Plan 03-04 builds on. It makes the *aggregate-only Σ
executionCost* decision (03-CONTEXT.md decision 1) executable.

The on-chain ``getRequest(uint256)`` (selector ``0xc58343ef``) returns a
``Request`` tuple. The aggregate we want is::

    Σ responses[].executionCost   ==   sum(r[5] for r in request_tuple[5])

Two index traps are pinned as named constants so the decode site can never
silently confuse them:

  * ``RESPONSE_EXECUTION_COST_INDEX = 5`` — the self-reported, ``perAgentBudget``-
    capped cost. This is what we sum.
  * ``RESPONSE_RECEIPT_INDEX = 3`` — an off-chain receipt id, NOT a cost. Reading
    field 3 as the cost is the Pitfall-3 trap; the synthetic fixture's structural
    mis-slice guard catches it.

DTYPE DISCIPLINE (schemas/event_schema_v1.md DTYPE SCOPE RULE, verbatim):
  uint256 / keccak / topic-derived ids (request_id, agent_id) are ``pl.Utf8``
  ONLY (up to 78 digits > Decimal128's 38). Bounded wei amounts provably ≤ 38
  digits (per_agent_budget_native ≈ 17–18 digits) may be ``pl.Decimal(38,0)``.

ALL functions here are PURE: no network, no file IO. The fixture is loaded by the
test harness and the raw hex passed in.
"""

from __future__ import annotations

from eth_abi import decode as _abi_decode

# getRequest(uint256) selector — keep in lockstep with probes.somnia_rpc.get_request.
GETREQUEST_SELECTOR = "0xc58343ef"

# The eth_abi tuple type for the IAgentRequester `Request` struct (SOURCE order;
# enums -> uint8; the nested Response[] is the 6th member, field index 5).
REQUEST_TUPLE_TYPE = (
    "(uint256,address,address,bytes4,address[],"
    "(address,bytes,uint8,uint256,uint256,uint256)[],"
    "uint256,uint256,uint256,uint256,uint256,uint8,uint8,uint256,uint256)"
)

# Field indices inside the Request tuple.
RESPONSES_FIELD_INDEX = 5  # Request.responses (the Response[] array)

# Field indices inside each Response tuple.
RESPONSE_RECEIPT_INDEX = 3  # off-chain receipt id — NOT a cost (Pitfall-3 trap)
RESPONSE_EXECUTION_COST_INDEX = 5  # self-reported, capped at perAgentBudget


def decode_get_request(raw_hex: str) -> tuple:
    """Decode a raw ``getRequest`` ``eth_call`` return hex into the Request tuple.

    Strips an optional ``0x`` prefix and ABI-decodes against ``REQUEST_TUPLE_TYPE``.
    Pure — no network, no file IO.
    """
    payload = raw_hex[2:] if raw_hex.startswith("0x") else raw_hex
    return _abi_decode([REQUEST_TUPLE_TYPE], bytes.fromhex(payload))[0]


def per_member_execution_costs(request_tuple: tuple) -> list[int]:
    """Per-member ``responses[].executionCost`` (field index 5), element-wise.

    Used by the STRUCTURAL mis-slice guard: each element must be ≤ the request's
    ``perAgentBudget``. A responses[3]=receipt mis-slice substitutes the receipt
    ids (large non-cost values > budget), which the element-wise bound catches.
    """
    responses = request_tuple[RESPONSES_FIELD_INDEX]
    return [r[RESPONSE_EXECUTION_COST_INDEX] for r in responses]


def sum_execution_cost(request_tuple: tuple) -> int:
    """Σ ``responses[].executionCost`` — the aggregate cost (decision 1).

    Returns a Python ``int`` (arbitrary precision; never coerce to float). A
    legitimate Failed/TimedOut finalized request with no successful responses
    sums to 0 — that is NOT an error (the strict ``0 < Σ`` bound is dropped; the
    non-strict real-return bound is a 03-04 concern).
    """
    responses = request_tuple[RESPONSES_FIELD_INDEX]
    return sum(r[RESPONSE_EXECUTION_COST_INDEX] for r in responses)


def to_uint256_utf8(value: int) -> str:
    """The documented uint256→``pl.Utf8`` path: the decimal string of the id.

    request_id / agent_id are ``pl.Utf8`` ONLY (up to 78 digits > Decimal128's
    38). Returning ``str(value)`` is the lossless, overflow-proof representation.
    """
    return str(value)


def wei_to_decimal_str(value: int) -> str:
    """A ``pl.Decimal(38,0)``-safe decimal string for a bounded wei amount.

    Only valid for amounts provably ≤ 38 digits (per_agent_budget_native,
    gross_cost_native ≈ 17–18 digits). Does NOT apply to uint256 ids.
    """
    return str(value)
