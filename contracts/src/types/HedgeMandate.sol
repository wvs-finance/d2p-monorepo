// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolId} from "v4-core/types/PoolId.sol";
import {IMacroThesis} from "../interfaces/IMacroThesis.sol";

/// @notice Agent 1's output: the hedge INTENT (school + direction + target notional), NOT the
///         leg geometry. Agent 2 (Phase 14) derives the moneyness, the option strike, the chunk
///         width and the feasible leg sizing from this mandate + a representativeness measure to
///         produce a HedgeLegParams. This type carries ONLY what Agent 2 needs to START that
///         derivation.
/// @dev Field TYPES mirror HedgeLegParams so the Phase-14 hand-off is near pass-through:
///      economicTheory (IMacroThesis), underlyingMarket (PoolId), chainId (uint32), isLong (bool)
///      copy across verbatim; targetNotional feeds the Phase-14 feasible-sizing derivation.
///      DELIBERATELY no derived-leg-shape members here — see HedgeLegParams for the geometry this
///      mandate is later expanded into (Agent 2 owns the moneyness, the width and the leg sizing).
struct HedgeMandate {
    IMacroThesis economicTheory;   // the prompt-inferred school's resolvable handle (drops into HedgeLegParams.economicTheory)
    PoolId       underlyingMarket; // = PolygonPools.POLYGON_WCOP_USDC_POOL_ID() — the cornerstone anchor (Agent 1 cannot mint a runtime PoolId)
    uint256      targetNotional;   // the cash-flow risk to hedge, in WHOLE USD notional units (NOT bps, NOT an optionRatio); Phase-14 maps it to a feasible optionRatio <= 127
    uint32       chainId;          // 137 (Polygon) — matches HedgeLegParams.chainId width
    bool         isLong;           // derived direction (Scenario 1: hedge COP depreciation -> long cCOP/USD call -> true)
}
