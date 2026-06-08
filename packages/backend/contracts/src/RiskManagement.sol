// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {PanopticQuery} from "@panoptic-periphery/PanopticQuery.sol";
import {TokenId} from "@types/TokenId.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {PanopticPoolV2} from "@core/PanopticPool.sol";
import {FundingDeltaLib} from "./libraries/FundingDelta.sol";
import {PositionInfo} from "./types/PositionInfo.sol";

library RiskManagementLib {
    function placeHolder(TokenId) internal pure returns (bytes memory) {}
}

    
struct RiskManagementStorage {
    mapping(PanopticPoolV2 => PositionInfo) positionLens;
}    


interface IRiskManagement {}

contract RiskManagement {

    PanopticQuery riskLens;
    PanopticPoolV2 clearingHouse;

    constructor(PanopticQuery _riskLens, PanopticPoolV2 _clearingHouse) {
	riskLens = _riskLens;
	clearingHouse = _clearingHouse;
	
    }

    function quoteCollateralRequirements(PositionInfo memory positionInfo, int24 strike) public view returns(BalanceDelta marginDelta) {
	// TODO: Check the owner is indeed the owner from the type directly
	PositionInfo memory validatedPosition = positionInfo;
	TokenId[] memory ids = new TokenId[](1);
	ids[0] = validatedPosition.Id;
	marginDelta = FundingDeltaLib.fromCollateralRequirements(
								 riskLens.checkCollateral(
											  clearingHouse,
											  validatedPosition.owner,
											  ids,
											  strike
								 )
	);
    }
}
