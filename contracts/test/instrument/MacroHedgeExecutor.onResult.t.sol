// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {PoolId} from "v4-core/types/PoolId.sol";

import {MockPlatform} from "../mocks/MockPlatform.sol";
import {SomniaAgentConsumer} from "../../src/SomniaAgentConsumer.sol";
import {Request, Response, ResponseStatus} from "../../src/interfaces/ISomniaAgents.sol";
import {MacroHedgeExecutor} from "../../src/MacroHedgeExecutor.sol";
import {HedgeLegParams} from "../../src/types/HedgeLegParams.sol";
import {PayoffTerms} from "../../src/types/PayoffTerms.sol";
import {IMacroThesis} from "../../src/interfaces/IMacroThesis.sol";
import {IRegimeOracle} from "../../src/interfaces/IRegimeOracle.sol";
import {ISurpriseOracle} from "../../src/interfaces/ISurpriseOracle.sol";
import {PolygonPools} from "../../src/libraries/PolygonPools.sol";
import {PanopticPoolV2} from "@contracts/PanopticPool.sol";
import {RiskManagement} from "../../src/RiskManagement.sol";
import {TokenId} from "@types/TokenId.sol";

/// @dev BTT spec: test/instrument/MacroHedgeExecutor.onResult.tree
/// @notice EXEC-01 _onResult unit suite — MockPlatform-driven, NO fork, NO live Somnia. Proves the
///         corrected decode `abi.decode(responses[0].result, (HedgeLegParams))` routes to the mint
///         sink (the probe RECORDS the decoded params and SKIPS pool.dispatch — so the decode is
///         proven IN ISOLATION; the production _onResult→real-mint edge is NOT executed here) and the
///         inherited NotPlatform / UnknownRequest auth+replay guards hold.
contract MacroHedgeExecutorOnResultTestdecodeAndAuth is Test {
    MockPlatform internal platform;
    MacroHedgeExecutorDecodeProbe internal probe;

    uint256 internal constant FLOOR = 0.01 ether;
    uint256 internal constant SEND = 0.22 ether; // over-fund: floor + 0.07*subSize(3) for llm-inference

    function setUp() public {
        platform = new MockPlatform(FLOOR);
        // Unit test (no fork): dummy pool/riskManager — neither is dereferenced on the decode/auth
        // path because the probe overrides the mint sink to skip pool.dispatch.
        probe = new MacroHedgeExecutorDecodeProbe(
            address(platform), PanopticPoolV2(address(0)), RiskManagement(address(0)), 0
        );
        vm.deal(address(this), 1000 ether);
    }

    /*//////////////////////////////////////////////////////////////
                                HELPERS
    //////////////////////////////////////////////////////////////*/

    /// @dev The demo HedgeLegParams — underlyingMarket anchored to the Plan-01 constant.
    function _demoLegParams() internal view returns (HedgeLegParams memory legParams) {
        PayoffTerms memory terms =
            PayoffTerms({vol: 14_400, horizonBlocks: 100, tickSpacing: 60, asset: 0, riskPartner: 0});
        legParams = HedgeLegParams({
            underlyingMarket: PolygonPools.POLYGON_WCOP_USDC_POOL_ID(),
            strikeWAD: uint256(4.1e18),
            size: 100,
            economicTheory: IMacroThesis(address(0)),
            chainId: uint32(block.chainid),
            isLong: true,
            payoffTerms: terms
        });
    }

    function _emptyReq() internal pure returns (Request memory r) {
        return r;
    }

    /*//////////////////////////////////////////////////////////////
                              DECODE ROUTING
    //////////////////////////////////////////////////////////////*/

    function test_WhenThePlatformDeliversAResponseWhoseResultIsAnAbiEncodedHedgeLegParams() external {
        HedgeLegParams memory legParams = _demoLegParams();
        bytes memory raw = abi.encode(legParams); // the consensus RESULT bytes (NOT the Response wrapper)
        Response[] memory rs = platform.oneResponse(raw, ResponseStatus.Success);

        // REGISTER a pending request via the TEST-ONLY seedPending → _sendRequest → MockPlatform,
        // so the subsequent fulfill does NOT revert UnknownRequest.
        uint256 reqId = probe.seedPending{value: SEND}(probe.LLM_AGENT_ID(), raw);

        // deliver against that exact reqId (mock replays handleResponse as the platform → CEI clears
        // pending → _onResult → the probe's overridden sink records the decoded params, skips dispatch).
        platform.fulfill(address(probe), reqId, rs, ResponseStatus.Success);

        // it should decode the result bytes into a well formed HedgeLegParams + route to the sink.
        assertTrue(probe.didRecord(), "the decoded params routed to the mint sink");
        (
            PoolId underlyingMarket,
            uint256 strikeWAD,
            uint256 size,
            ,
            uint32 chainId,
            bool isLong,
        ) = probe.recorded();
        assertEq(PoolId.unwrap(underlyingMarket), PoolId.unwrap(legParams.underlyingMarket), "underlyingMarket decoded");
        assertEq(strikeWAD, legParams.strikeWAD, "strikeWAD decoded");
        assertEq(size, legParams.size, "size decoded");
        assertEq(chainId, legParams.chainId, "chainId decoded");
        assertEq(isLong, legParams.isLong, "isLong decoded");
    }

    /*//////////////////////////////////////////////////////////////
                                  AUTH
    //////////////////////////////////////////////////////////////*/

    function test_WhenACallbackCallerIsNotThePlatform() external {
        HedgeLegParams memory legParams = _demoLegParams();
        Response[] memory rs = platform.oneResponse(abi.encode(legParams), ResponseStatus.Success);
        // a direct call from address(this) (NOT routed through MockPlatform.fulfill) → NotPlatform.
        vm.expectRevert(abi.encodeWithSelector(SomniaAgentConsumer.NotPlatform.selector, address(this)));
        probe.handleResponse(1, rs, ResponseStatus.Success, _emptyReq());
    }

    /*//////////////////////////////////////////////////////////////
                           REPLAY / UNKNOWN ID
    //////////////////////////////////////////////////////////////*/

    modifier whenAnUnknownOrReplayedRequestIdIsDelivered() {
        _;
    }

    function test_GivenTheRequestIdWasNeverRegistered() external whenAnUnknownOrReplayedRequestIdIsDelivered {
        HedgeLegParams memory legParams = _demoLegParams();
        Response[] memory rs = platform.oneResponse(abi.encode(legParams), ResponseStatus.Success);
        // an id never seedPending-ed → UnknownRequest.
        vm.expectRevert(abi.encodeWithSelector(SomniaAgentConsumer.UnknownRequest.selector, uint256(999)));
        platform.fulfill(address(probe), 999, rs, ResponseStatus.Success);
    }

    function test_GivenTheRequestIdWasAlreadyDeliveredAndClearedByTheCallback()
        external
        whenAnUnknownOrReplayedRequestIdIsDelivered
    {
        HedgeLegParams memory legParams = _demoLegParams();
        bytes memory raw = abi.encode(legParams);
        Response[] memory rs = platform.oneResponse(raw, ResponseStatus.Success);

        uint256 reqId = probe.seedPending{value: SEND}(probe.LLM_AGENT_ID(), raw);
        platform.fulfill(address(probe), reqId, rs, ResponseStatus.Success); // first delivery clears pending (CEI)

        // a second delivery of the same id → UnknownRequest (pending was cleared).
        vm.expectRevert(abi.encodeWithSelector(SomniaAgentConsumer.UnknownRequest.selector, reqId));
        platform.fulfill(address(probe), reqId, rs, ResponseStatus.Success);
    }
}

/// @notice TEST-ONLY subclass: (a) overrides the internal mint sink to RECORD the decoded legParams
///         and SKIP pool.dispatch (so the decode is asserted in ISOLATION), and (b) adds an explicit
///         request-seeding entrypoint because `pendingRequests` is INTERNAL to SomniaAgentConsumer
///         and the PRODUCTION MacroHedgeExecutor exposes NO public request entrypoint. Declared AFTER
///         the test contract so bulloak anchors the tree root on the test contract.
contract MacroHedgeExecutorDecodeProbe is MacroHedgeExecutor {
    HedgeLegParams public recorded; // the decoded struct, asserted by the test
    bool public didRecord;

    constructor(address platform, PanopticPoolV2 _pool, RiskManagement _riskManager, uint8 _vegoid)
        payable
        MacroHedgeExecutor(
            platform,
            _pool,
            _riskManager,
            _vegoid,
            0.10e18,
            0.35e18,
            0.15e18,
            14_400,
            IRegimeOracle(address(0)),
            ISurpriseOracle(address(0))
        )
    {}

    /// @notice TEST-ONLY — populate pendingRequests[reqId] through the inherited _sendRequest (which
    ///         forwards msg.value to the mock platform and registers the returned id). The PRODUCTION
    ///         executor must NOT get a public request entrypoint; this lives ONLY on the probe.
    function seedPending(uint256 agentId, bytes calldata payload) external payable returns (uint256 reqId) {
        return _sendRequest(agentId, payload);
    }

    /// @dev Override the renamed Fix-C sink: RECORD the decoded params, SKIP pool.dispatch. Proves the
    ///      decode in isolation — the production _onResult→real-mint edge is NOT executed here. The
    ///      strike param arrives pre-snapped (the rerouted _onResult computes it from strikeWAD); we
    ///      ignore it here — the decode-isolation proof only inspects the decoded HedgeLegParams.
    function _resolveAndMintAtStrike(HedgeLegParams memory legParams, uint256, uint128, uint256, int24)
        internal
        override
        returns (TokenId)
    {
        recorded = legParams;
        didRecord = true;
        return TokenId.wrap(0);
    }
}
