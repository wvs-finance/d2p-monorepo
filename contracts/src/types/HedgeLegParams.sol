// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolId} from "v4-core/types/PoolId.sol";
import {IMacroThesis} from "../interfaces/IMacroThesis.sol";
import {PayoffTerms} from "./PayoffTerms.sol";

struct HedgeLegParams{
    PoolId underlyingMarket;
    uint256 strikeWAD;
    uint256 size;
    IMacroThesis economicTheory;
    uint32 chainId;
    bool isLong;
    PayoffTerms payoffTerms; // typed payoff terms (vol/horizon/tickSpacing/asset/riskPartner)
}

    
