// IAgentRequester AssemblyScript mappings (INDEX-01, KPD-08).
//
// TOOLCHAIN NOTE: `graph codegen` generates ./generated/{schema,IAgentRequester}.ts
// (the Request entity class + typed event classes) at deploy time (Plan 03-04);
// graph-cli is NOT vendored in CI, so these generated imports resolve only after
// codegen. The static manifest-lint (tests/test_index01_manifest.py) parses this
// file as text and does not compile it.
//
// Architecture B: NO in-subgraph getRequest eth_call. sumExecutionCost is left
// NULL here and filled by the off-chain post-pass (Plan 03-04).

import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  RequestCreated,
  RequestFinalized,
  CommitteeDepositFailed,
} from "../generated/IAgentRequester/IAgentRequester";
import { Request } from "../generated/schema";

/// Load an existing Request or construct a fresh one with the CommitteeDepositFailed
/// accumulators initialised to 0 / BigInt.zero(), so a later increment is always
/// well-defined regardless of which handler first creates the entity.
function loadOrCreateRequest(id: string): Request {
  let req = Request.load(id);
  if (req == null) {
    req = new Request(id);
    req.committeeDepositFailedCount = 0;
    req.committeeDepositFailedAttemptedTotal = BigInt.zero();
  }
  return req as Request;
}

export function handleRequestCreated(event: RequestCreated): void {
  let id = event.params.requestId.toString();
  let req = loadOrCreateRequest(id);

  req.agentId = event.params.agentId;
  req.perAgentBudget = event.params.perAgentBudget;
  req.subcommittee = event.params.subcommittee.map<Bytes>((a) => a as Bytes);

  // Arrival key: (blockNumber, logIndex). blockTimestamp is coarse-secondary.
  req.blockNumber = event.block.number;
  req.logIndex = event.logIndex;
  req.txHash = event.transaction.hash;
  req.blockTimestamp = event.block.timestamp;

  req.save();
}

export function handleRequestFinalized(event: RequestFinalized): void {
  let id = event.params.requestId.toString();
  // A finalize without a previously-seen create is still a valid row (the create
  // may sit before startBlock, or be processed out of order on reorg replay).
  // loadOrCreateRequest initialises the two CommitteeDepositFailed accumulators
  // to 0 / zero so a later CommitteeDepositFailed increment stays well-defined.
  let req = loadOrCreateRequest(id);

  // status is the ResponseStatus enum (uint8): Success=2 / Failed=3 / TimedOut=4.
  req.status = event.params.status;
  req.finalizedBlock = event.block.number;
  req.finalizedLogIndex = event.logIndex;

  // Architecture B: do NOT call getRequest here — Σ executionCost is off-chain.
  req.save();
}

export function handleCommitteeDepositFailed(event: CommitteeDepositFailed): void {
  // CommitteeDepositFailed is a structural invariant (NOT an error — Phase-2
  // note 2) AND retryable (NatSpec: fires when the committee-deposit call
  // reverts) → it can fire >1× per requestId. The fold is requestId-keyed and
  // ACCUMULATES; a scalar overwrite would lose retry attempts. The entity count
  // stays 1 per requestId (the counter is a field, not a new entity).
  let id = event.params.requestId.toString();
  let req = loadOrCreateRequest(id);

  req.committeeDepositFailedCount = req.committeeDepositFailedCount + 1;
  req.committeeDepositFailedAttemptedTotal = req.committeeDepositFailedAttemptedTotal.plus(
    event.params.attemptedAmount
  );
  req.committeeDepositFailedLastAmount = event.params.attemptedAmount;

  req.save();
}
