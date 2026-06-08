// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// =============================================================================
// ProvisionBuildBearDemo — Wave-0 cold-deploy SPIKE (Task 2)
// =============================================================================
// This is the Phase-15 (15-01) provisioning script targeting a HOSTED BuildBear
// Sandbox (a Polygon fork the Vercel UI can reach). BuildBear forks Polygon at
// LATEST and RE-CHAINS the fork to chainId 31337; the cold deploy only needs the
// block-invariant wCOP / USDC / v4-PoolManager addresses to have code — NOT the
// 86.9M pin the in-VM fork test uses.
//
// `spike()` is the ISOLATED de-risking entrypoint: it INLINES the body of
// `panoptic-v2-core/script/DeployProtocol.s.sol` (the metadata-pointer loop +
// the SFPM/Guardian/BuilderFactory/RiskEngine/CollateralTracker/PanopticFactoryV4
// constructions) under ONE broadcast. It does NOT instantiate-and-run the
// DeployProtocol script object:
//   - that script's run() opens its OWN vm.startBroadcast()/stopBroadcast() => a
//     nested-broadcast hard error if called from inside another broadcast, AND
//   - run() DISCARDS the `new PanopticFactoryV4(...)` return => no address handle.
// Inlining lets us READ BACK the live factory / riskEngine addresses (a fresh
// sandbox deploy lands them at DIFFERENT addresses than the in-VM snapshot
// snapshot address constants) and thread them downstream.
//
// The in-VM cold path produced the committed allocs snapshot, so the deploy works
// IN-VM — but it has NEVER run against a HOSTED node. `spike()` is the single
// biggest unknown; Tasks 3-4 (full run() + the runner) are GATED on it passing.
//
// SECRETS: this file reads UNIV4_POOL_MANAGER / UNIV3_FACTORY / GUARDIAN_ADMIN /
// TREASURER from the REAL OS env (exported by the runner before the forge call) —
// NO private key or RPC URL is ever hardcoded here.
// =============================================================================

import "forge-std/Script.sol";

import {PanopticFactoryV4} from "@contracts/PanopticFactoryV4.sol";
import {CollateralTrackerV2} from "@contracts/CollateralTracker.sol";
import {RiskEngine} from "@contracts/RiskEngine.sol";
import {BuilderFactory} from "@contracts/Builder.sol";
import {PanopticGuardian} from "@contracts/PanopticGuardian.sol";
import {PanopticPoolV2} from "@contracts/PanopticPool.sol";
import {ISemiFungiblePositionManager} from "@contracts/interfaces/ISemiFungiblePositionManager.sol";
import {SemiFungiblePositionManagerV4} from "@contracts/SemiFungiblePositionManagerV4.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Pointer, PointerLibrary} from "@types/Pointer.sol";

// --- full run() additions: pool + executor + deposit-on-behalf + mint ---
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IRiskEngine} from "@contracts/interfaces/IRiskEngine.sol";
import {CollateralTrackerV2} from "@contracts/CollateralTracker.sol";
import {IERC20Partial} from "@tokens/interfaces/IERC20Partial.sol";
import {PanopticQuery} from "@panoptic-periphery/PanopticQuery.sol";
import {TokenId, TokenIdLibrary} from "@types/TokenId.sol";

import {RiskManagement} from "../src/RiskManagement.sol";
import {MacroHedgeExecutor} from "../src/MacroHedgeExecutor.sol";
import {HedgeMandate} from "../src/types/HedgeMandate.sol";
import {IRegimeOracle} from "../src/interfaces/IRegimeOracle.sol";
import {IMacroThesis} from "../src/interfaces/IMacroThesis.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";

import {MockRegimeOracle} from "../test/mocks/MockRegimeOracle.sol";
import {MockSurpriseOracle} from "../test/mocks/MockSurpriseOracle.sol";
import {MockPlatform} from "../test/mocks/MockPlatform.sol";

contract ProvisionBuildBearDemo is Script {
    using TokenIdLibrary for TokenId;
    using PoolIdLibrary for PoolKey;

    struct PointerInfo {
        uint256 codeIndex;
        uint256 end;
        uint256 start;
    }

    /// @dev Packs the read-back deploy result so run()'s console2.log block reads from ONE local
    ///      (avoids "stack too deep" — the inline deploy + pool + executor + mint exceeds the EVM
    ///      stack slot budget when every address is a separate live local in a single frame).
    struct ProvisionResult {
        address factory;
        address riskEngine;
        address pool;
        address riskManagement;
        address executor;
        int24 strike;
        uint256 legs;
    }

    // --- Polygon constants (block-invariant on the fork — only need to have code) ---
    address constant POLYGON_POOL_MANAGER = 0x67366782805870060151383F4BbFF9daB53e5cD6;
    address constant POLYGON_USDC = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359; // 6 decimals
    address constant POLYGON_WCOP = 0x8a1D45e102e886510e891d2Ec656a708991e2D76; // 18 decimals

    // --- 9-arg executor ctor TEMPLATE values (mirror _deployExecutorWith) ---
    uint256 constant DEFAULT_FUND_USD = 10_000e6;
    uint256 constant DEFAULT_FUND_COP = 10_000e18;

    /// @notice Wave-0 cold-deploy spike: inline the DeployProtocol core deploy and prove it
    ///         lands the factory + riskEngine with non-zero code against a HOSTED BuildBear
    ///         sandbox, with the metadata file resolving and the Polygon PoolManager present.
    function spike() external {
        vm.startBroadcast();
        (PanopticFactoryV4 factory, RiskEngine riskEngine) = _deployCore();
        vm.stopBroadcast();

        console2.log("FACTORY_ADDRESS=", address(factory));
        console2.log("RISK_ENGINE_ADDRESS=", address(riskEngine));
        require(address(factory).code.length > 0, "core deploy failed: factory");
        require(address(riskEngine).code.length > 0, "core deploy failed: riskEngine");
    }

    /// @notice The FULL provisioning under ONE broadcast (Task 3): inline the core deploy (read-back
    ///         factory/riskEngine LOCALS — NEVER the in-VM snapshot address
    ///         constants), thread them into deployNewPool + the 9-arg executor ctor, deposit-on-behalf
    ///         (receiver=executor — the EOA broadcast sender is pre-funded by the runner via
    ///         buildbear_ERC20Faucet BEFORE this broadcast, so no forge-test cheat is interleaved),
    ///         and mint at strike 360360 via resolveFromMandate.
    /// @dev The chainId guard SELF-SATISFIES: _demoMandate() sets chainId=uint32(block.chainid)=31337 on
    ///      the sandbox and the sink reads block.chainid=31337 — do NOT reconfigure the sandbox chainId.
    ///      B1 funding = the runner's buildbear_ERC20Faucet on the EOA BEFORE the broadcast; B2 = this
    ///      inlined read-back deploy (no nested broadcast, no --load-state). NO forge-test cheat / multi-broadcast.
    function run() external {
        vm.startBroadcast();
        ProvisionResult memory r = _provision();
        vm.stopBroadcast();

        // the read-back locals + result — the runner greps these `*=` lines into the artifact.
        console2.log("FACTORY_ADDRESS=", r.factory);
        console2.log("RISK_ENGINE_ADDRESS=", r.riskEngine);
        console2.log("POOL_ADDRESS=", r.pool);
        console2.log("RISK_MANAGEMENT_ADDRESS=", r.riskManagement);
        console2.log("EXECUTOR_ADDRESS=", r.executor);
        console2.log("MINTED_STRIKE=", int256(r.strike));
        console2.log("NUMBER_OF_LEGS=", r.legs);
        require(r.legs > 0, "mint failed: executor owns no leg");
    }

    /// @dev The full provisioning body — runs INSIDE run()'s single broadcast. Returns a packed
    ///      ProvisionResult so run() logs from ONE local (stack-depth budget).
    function _provision() internal returns (ProvisionResult memory r) {
        // (1) INLINE the core deploy — read-back LOCALS, never the snapshot constants.
        (PanopticFactoryV4 factory, RiskEngine riskEngine) = _deployCore();

        // (2) thread the LOCALS into the pool deploy (currency0=USDC, currency1=WCOP, fee 3000, ts 60).
        PoolKey memory wcopUsdcKey = PoolKey({
            currency0: Currency.wrap(POLYGON_USDC),
            currency1: Currency.wrap(POLYGON_WCOP),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });
        PanopticPoolV2 pool = factory.deployNewPool(wcopUsdcKey, IRiskEngine(address(riskEngine)), 0);
        RiskManagement riskManagement = new RiskManagement(new PanopticQuery(), pool);

        // (3) deploy the executor — the EXACT 9-arg ctor values from _deployExecutorWith, threading the
        //     read-back riskEngine LOCAL for vegoid() (NOT the constant).
        MacroHedgeExecutor exec = _deployExecutor(pool, riskManagement, riskEngine);

        // (4) deposit-on-behalf (receiver=exec). The EOA broadcast sender pays; the executor owns the
        //     4626 shares — exactly as the in-VM prank+deposit, but with no forge-test cheat.
        {
            CollateralTrackerV2 ct0 = pool.collateralToken0();
            CollateralTrackerV2 ct1 = pool.collateralToken1();
            IERC20Partial(POLYGON_USDC).approve(address(ct0), type(uint256).max);
            IERC20Partial(POLYGON_WCOP).approve(address(ct1), type(uint256).max);
            ct0.deposit(DEFAULT_FUND_USD, address(exec));
            ct1.deposit(DEFAULT_FUND_COP, address(exec));
        }

        // (5) mint via the proven mandate path (strike 360360, Fix C).
        HedgeMandate memory mandate = HedgeMandate({
            economicTheory: IMacroThesis(address(uint160(0x6))), // POST_KEYNESIAN sentinel
            underlyingMarket: wcopUsdcKey.toId(),
            targetNotional: 50_000,
            chainId: uint32(block.chainid),
            isLong: true
        });
        TokenId positionId = exec.resolveFromMandate(mandate, 0, 1e6);
        int24 strike = positionId.strike(0);
        BalanceDelta marginDelta = exec.quoteMargin(positionId, strike);
        marginDelta; // basic read — no magnitude assertion (honesty: read-back only)

        r = ProvisionResult({
            factory: address(factory),
            riskEngine: address(riskEngine),
            pool: address(pool),
            riskManagement: address(riskManagement),
            executor: address(exec),
            strike: strike,
            legs: pool.numberOfLegs(address(exec))
        });
    }

    /// @dev The 9-arg executor ctor (mirrors _deployExecutorWith) — STRESS regime, TEMPLATE betas,
    ///      vegoid() off the read-back riskEngine LOCAL (NOT the snapshot constant).
    function _deployExecutor(PanopticPoolV2 pool, RiskManagement riskManagement, RiskEngine riskEngine)
        internal
        returns (MacroHedgeExecutor exec)
    {
        MockRegimeOracle oracle = new MockRegimeOracle();
        oracle.set(IRegimeOracle.Regime.Stress); // demo the STRESS regime-conditional width
        exec = new MacroHedgeExecutor(
            address(new MockPlatform(0.01 ether)),
            pool,
            riskManagement,
            IRiskEngine(address(riskEngine)).vegoid(),
            0.10e18, // β₁(TRANQUIL) TEMPLATE
            0.35e18, // β₁(STRESS) TEMPLATE
            0.15e18, // target devaluation (15% OTM) TEMPLATE
            14_400, // baseVol — TICK-SPACE
            oracle,
            new MockSurpriseOracle() // SHILLER surprise source (live mock)
        );
    }

    /// @dev INLINED DeployProtocol body (V4 leg only) — returns the read-back factory + riskEngine
    ///      locals. Called INSIDE the caller's single broadcast (spike() / run()); it does NOT open
    ///      its own broadcast (a nested broadcast would hard-error).
    function _deployCore() internal returns (PanopticFactoryV4 factory, RiskEngine riskEngine) {
        IPoolManager uniPoolManager = IPoolManager(vm.envAddress("UNIV4_POOL_MANAGER"));

        string memory metadata = vm.readFile("./metadata/out/MetadataPackage.json");

        bytes[] memory bytecodes = vm.parseJsonBytesArray(metadata, ".bytecodes");
        address[] memory pointerAddresses = new address[](bytecodes.length);

        for (uint256 i = 0; i < bytecodes.length; i++) {
            bytes memory code = bytecodes[i];
            address pointer;
            assembly {
                pointer := create(0, add(code, 0x20), mload(code))
                if iszero(extcodesize(pointer)) {
                    revert(0, 0)
                }
            }
            pointerAddresses[i] = pointer;
        }

        PointerInfo[][] memory pointerInfo = abi.decode(
            vm.parseJson(metadata, ".pointers"),
            (PointerInfo[][])
        );
        Pointer[][] memory pointers = new Pointer[][](pointerInfo.length);
        for (uint256 i = 0; i < pointerInfo.length; i++) {
            pointers[i] = new Pointer[](pointerInfo[i].length);
            for (uint256 j = 0; j < pointerInfo[i].length; j++) {
                pointers[i][j] = PointerLibrary.createPointer(
                    pointerAddresses[pointerInfo[i][j].codeIndex],
                    uint48(pointerInfo[i][j].start),
                    uint48(pointerInfo[i][j].end)
                );
            }
        }

        string[] memory propsStr = vm.parseJsonStringArray(metadata, ".properties");
        bytes32[] memory props = new bytes32[](propsStr.length);
        for (uint256 i = 0; i < propsStr.length; i++) {
            props[i] = bytes32(bytes(propsStr[i]));
        }
        string[][] memory indicesStr = new string[][](propsStr.length);
        for (uint256 i = 0; i < propsStr.length; i++) {
            string memory path = string.concat(".indices[", vm.toString(i), "]");
            indicesStr[i] = vm.parseJsonStringArray(metadata, path);
        }
        uint256[][] memory indices = new uint256[][](indicesStr.length);
        for (uint256 i = 0; i < indicesStr.length; i++) {
            indices[i] = new uint256[](indicesStr[i].length);
            for (uint256 j = 0; j < indicesStr[i].length; j++) {
                indices[i][j] = vm.parseUint(indicesStr[i][j]);
            }
        }

        SemiFungiblePositionManagerV4 sfpm = new SemiFungiblePositionManagerV4(
            uniPoolManager,
            21 * 10 ** 20,
            21 * 10 ** 20,
            10000
        );

        PanopticGuardian panopticGuardian = new PanopticGuardian(
            vm.envAddress("GUARDIAN_ADMIN"),
            vm.envAddress("TREASURER")
        );

        BuilderFactory builderFactory = new BuilderFactory(address(panopticGuardian));

        // risk engine MED — bind the local (DeployProtocol DISCARDS it; we read it back).
        riskEngine = new RiskEngine(
            10_000_000,
            10_000_000,
            address(panopticGuardian),
            address(builderFactory)
        );

        address collateralTracker = address(new CollateralTrackerV2());

        // bind the local (DeployProtocol DISCARDS it; we read it back).
        factory = new PanopticFactoryV4(
            sfpm,
            uniPoolManager,
            address(new PanopticPoolV2(ISemiFungiblePositionManager(address(sfpm)))),
            collateralTracker,
            props,
            indices,
            pointers
        );

        // NOTE: the V3 factory / SFPMv3 leg of DeployProtocol is INTENTIONALLY omitted — the
        // demo mint is a V4 PanopticPoolV2 path; the V3 leg only inflates the cold deploy.
    }
}
