// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {PoolId} from "v4-core/types/PoolId.sol";
import {StateLibrary} from "v4-core/libraries/StateLibrary.sol";

library PoolIdMappersLib {
    function panopticPoolIdFromUniV4PoolId(PoolId uniV4PoolId, uint8 vegoid, int24 tickSpacing) internal pure returns(uint64 panopticPoolId) {
        panopticPoolId = uint40(uint256(PoolId.unwrap(uniV4PoolId))) + uint64(uint256(vegoid) << 40);
        panopticPoolId += uint64(uint24(tickSpacing)) << 48;
    }
}
