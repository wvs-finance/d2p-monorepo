// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "v4-core/interfaces/callback/IUnlockCallback.sol";
import {IERC20Minimal} from "v4-core/interfaces/external/IERC20Minimal.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";

/// @title V4LpHelper — minimal full-range liquidity provider for a UniV4 pool (M-1).
/// @notice Mints FULL-RANGE liquidity via IPoolManager.modifyLiquidity inside an unlock callback,
///         then settles the owed BalanceDelta. This is the audited test's V4RouterSimple shape:
///         NOT PositionManager.modifyLiquidities (Actions-encoding) and NOT SFPMV4.mintTokenizedPosition
///         (which needs SFPM.initializeAMMPool, not run at this plan stage). Fund this helper with BOTH
///         tokens (deal USDC + MockCcop.mint) BEFORE calling addFullRangeLiquidity so settle() can pay.
contract V4LpHelper is IUnlockCallback {
    IPoolManager public immutable manager;

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

    /// @notice Add full-range liquidity to `key`. Ticks are rounded to the pool's tickSpacing.
    /// @param key The pool to LP into.
    /// @param liquidityDelta Liquidity to add (must be positive). Stated large in the test for Plan 05 sizing.
    function addFullRangeLiquidity(PoolKey memory key, int128 liquidityDelta) external {
        manager.unlock(abi.encode(key, liquidityDelta));
    }

    /// @inheritdoc IUnlockCallback
    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        require(msg.sender == address(manager), "only manager");
        (PoolKey memory key, int128 liquidityDelta) = abi.decode(data, (PoolKey, int128));

        int24 tickLower = (TickMath.MIN_TICK / key.tickSpacing) * key.tickSpacing;
        int24 tickUpper = (TickMath.MAX_TICK / key.tickSpacing) * key.tickSpacing;

        (BalanceDelta callerDelta,) = manager.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: int256(liquidityDelta),
                salt: bytes32(0)
            }),
            ""
        );

        // Adding liquidity yields negative deltas (this helper owes both currencies) — settle each.
        // Any positive delta (a credit) is taken back to this helper.
        _settleOrTake(key.currency0, callerDelta.amount0());
        _settleOrTake(key.currency1, callerDelta.amount1());

        return "";
    }

    /// @dev Pay a debt (negative delta) via sync→transfer→settle, or take a credit (positive delta).
    ///      Inlined (no external CurrencySettler) to avoid the v4-core relative-import type-identity clash.
    function _settleOrTake(Currency currency, int128 amount) internal {
        if (amount < 0) {
            // owe `-amount` of `currency` to the manager
            uint256 owed = uint256(uint128(-amount));
            manager.sync(currency);
            IERC20Minimal(Currency.unwrap(currency)).transfer(address(manager), owed);
            manager.settle();
        } else if (amount > 0) {
            // credit: pull `amount` of `currency` back to this helper
            manager.take(currency, address(this), uint256(uint128(amount)));
        }
    }
}
