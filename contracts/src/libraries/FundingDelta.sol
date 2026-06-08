// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {BalanceDelta, toBalanceDelta} from "v4-core/types/BalanceDelta.sol";


library FundingDeltaLib {
    function fromCollateralRequirements(uint256[4] memory balancesAndRequired) internal pure returns(BalanceDelta marginDelta) {
	int256 delta0 =
            int256(balancesAndRequired[0]) -
            int256(balancesAndRequired[1]);

        int256 delta1 =
            int256(balancesAndRequired[2]) -
            int256(balancesAndRequired[3]);

        return toBalanceDelta(
            int128(delta0),
            int128(delta1)
        );
    }
}
