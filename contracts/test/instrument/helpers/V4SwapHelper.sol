// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "v4-core/interfaces/callback/IUnlockCallback.sol";
import {IERC20Minimal} from "v4-core/interfaces/external/IERC20Minimal.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";

/// @title V4SwapHelper — deterministic fee generator for a UniV4 pool (the streamia source).
/// @notice Swaps a known amount through a pool via IPoolManager.swap inside an unlock callback so the
///         pool's `feeGrowthInside` advances and an in-range chunk earns LP fees. This is the SWAP
///         analogue of `V4LpHelper`: block advance alone does NOT accrue streamia (08-RESEARCH Pitfall 2);
///         only swaps crossing the chunk's tick band move fee growth (SFPM L1247-1276). The cCOP/USDC
///         pool's fee tier is 500 (0.05%, PoolKeyLib), so a swap of amount A generates ≈ A * 500 / 1e6 in
///         LP fees distributed by `feeGrowthInside`. Fund this helper with the INPUT token (deal/mint)
///         BEFORE calling so settle() can pay.
/// @dev Settlement is the INLINED sync→transfer→settle (debt) / take (credit) pattern, NOT the v4-core
///      test settler util — its relative `../../src/...` imports resolve to a DISTINCT compiler type from
///      the `v4-core/`-remapped `Currency`/`IPoolManager` (07-04 type-identity decision, Error 9553).
contract V4SwapHelper is IUnlockCallback {
    IPoolManager public immutable manager;

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

    /// @notice Swap `amountSpecified` of one direction through `key`, moving `feeGrowthInside` so an
    ///         in-range chunk earns LP fees (the streamia source). Fund this helper with the INPUT token
    ///         (deal/mint) before calling so settle() can pay.
    /// @param key The pool to swap in (the cCOP/USDC demo pool).
    /// @param zeroForOne true => sell currency0 for currency1 (price moves down); false => the reverse.
    /// @param amountSpecified Pass a NEGATIVE int256 for exact-input (the caller controls the sign).
    /// @return delta The BalanceDelta of this helper from the swap.
    function swapExactIn(PoolKey memory key, bool zeroForOne, int256 amountSpecified) external returns (BalanceDelta delta) {
        delta = abi.decode(manager.unlock(abi.encode(key, zeroForOne, amountSpecified)), (BalanceDelta));
    }

    /// @inheritdoc IUnlockCallback
    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        require(msg.sender == address(manager), "only manager");
        (PoolKey memory key, bool zeroForOne, int256 amountSpecified) =
            abi.decode(data, (PoolKey, bool, int256));

        // Swap to the price extreme in the chosen direction so the full `amountSpecified` executes
        // (the swap stops on amount, not on the price limit, for a well-funded in-range pool).
        uint160 priceLimit = zeroForOne ? (TickMath.MIN_SQRT_PRICE + 1) : (TickMath.MAX_SQRT_PRICE - 1);

        BalanceDelta delta = manager.swap(
            key,
            IPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: amountSpecified,
                sqrtPriceLimitX96: priceLimit
            }),
            ""
        );

        // settle the owed currency, take the credited currency (inlined settle/take; no v4-core test util — 07-04).
        _settleOrTake(key.currency0, delta.amount0());
        _settleOrTake(key.currency1, delta.amount1());

        return abi.encode(delta);
    }

    /// @dev Pay a debt (negative delta) via sync→transfer→settle, or take a credit (positive delta).
    ///      Inlined (no external settler util) to avoid the v4-core relative-import type-identity clash.
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
