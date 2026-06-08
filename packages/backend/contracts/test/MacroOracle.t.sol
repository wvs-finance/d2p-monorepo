// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockPlatform} from "./mocks/MockPlatform.sol";
import {MacroOracle, TECatalog, ValueKind, Endpoint} from "../src/MacroOracle.sol";
import {IJsonApiAgent, Response, ResponseStatus} from "../src/interfaces/ISomniaAgents.sol";

/// @dev BTT spec: test/spec/MacroOracle.tree
contract MacroOracleTest is Test {
    MockPlatform internal platform;
    MacroOracle internal oracle;

    uint256 internal constant FLOOR = 0.03 ether;
    string internal constant BASE = "https://keeper-eta-pied.vercel.app/";

    bytes32 internal kInflation; // Uint
    bytes32 internal kTrade; // Int (can be negative)

    event MacroRequested(uint256 indexed requestId, bytes32 indexed dataKey);
    event MacroReceived(bytes32 indexed dataKey, int256 scaledValue);
    event MacroFailed(uint256 indexed requestId, bytes32 indexed dataKey, ResponseStatus status);

    function setUp() public {
        platform = new MockPlatform(FLOOR);
        oracle = new MacroOracle(address(platform), BASE);
        kInflation = TECatalog.keyInflation();
        kTrade = TECatalog.keyTradeBalance();
    }

    function _req(bytes32 k) internal returns (uint256) {
        return oracle.requestMacro{value: FLOOR}(k);
    }

    function _resp(bytes memory result, ResponseStatus s) internal view returns (Response[] memory) {
        return platform.oneResponse(result, s);
    }

    /*//////////////////////////////////////////////////////////////
                              requestMacro
    //////////////////////////////////////////////////////////////*/

    function test_RevertWhen_UnknownKey() public {
        vm.expectRevert(abi.encodeWithSelector(MacroOracle.UnknownKey.selector, bytes32("nope")));
        oracle.requestMacro{value: FLOOR}(bytes32("nope"));
    }

    function test_Uint_SendsFetchUintPayload() public {
        _req(kInflation);
        bytes memory p = platform.lastPayload();
        assertEq(bytes4(p), IJsonApiAgent.fetchUint.selector, "fetchUint selector");
        (string memory url, string memory sel, uint8 dec) = _decodePayload(p);
        assertEq(url, string.concat(BASE, "te/colombia/inflation"), "PROXY_BASE+proxyPath");
        assertEq(sel, "value", "bare selector (no dot)");
        assertEq(dec, 0, "decimals 0 (proxy pre-scales)");
    }

    function test_Int_SendsFetchIntPayload() public {
        _req(kTrade);
        bytes memory p = platform.lastPayload();
        assertEq(bytes4(p), IJsonApiAgent.fetchInt.selector, "fetchInt selector for Int kind");
        (, string memory sel, uint8 dec) = _decodePayload(p);
        assertEq(sel, "value");
        assertEq(dec, 0);
    }

    function test_MarksPendingAndEmits() public {
        vm.expectEmit(true, true, false, false, address(oracle));
        emit MacroRequested(1, kInflation);
        uint256 id = _req(kInflation);
        assertTrue(oracle.pendingRequests(id), "pending");
    }

    /*//////////////////////////////////////////////////////////////
                                onResult
    //////////////////////////////////////////////////////////////*/

    function test_Uint_Success_StoresValue() public {
        uint256 id = _req(kInflation);
        vm.expectEmit(true, false, false, true, address(oracle));
        emit MacroReceived(kInflation, int256(568));
        platform.fulfill(address(oracle), id, _resp(abi.encode(uint256(568)), ResponseStatus.Success), ResponseStatus.Success);
        (, int256 v,, uint64 deliveredAt) = oracle.latest(kInflation);
        assertEq(v, 568);
        assertGt(deliveredAt, 0);
    }

    function test_Int_Success_StoresNegative() public {
        uint256 id = _req(kTrade);
        platform.fulfill(address(oracle), id, _resp(abi.encode(int256(-84)), ResponseStatus.Success), ResponseStatus.Success);
        (, int256 v,,) = oracle.latest(kTrade);
        assertEq(v, -84, "signed value preserved");
    }

    function test_Failed_StoresNothing() public {
        uint256 id = _req(kInflation);
        vm.expectEmit(true, true, false, true, address(oracle));
        emit MacroFailed(id, kInflation, ResponseStatus.TimedOut);
        platform.fulfill(address(oracle), id, _resp("", ResponseStatus.TimedOut), ResponseStatus.TimedOut);
        (, int256 v,,) = oracle.latest(kInflation);
        assertEq(v, 0, "nothing stored");
    }

    function test_MalformedPayload_RoutesToFailed() public {
        uint256 id = _req(kInflation);
        // length != 32 (string encoding) -> MacroFailed, no revert
        platform.fulfill(address(oracle), id, _resp(abi.encode(string("x")), ResponseStatus.Success), ResponseStatus.Success);
        (, int256 v,,) = oracle.latest(kInflation);
        assertEq(v, 0, "no value from malformed payload");
        assertFalse(oracle.pendingRequests(id), "pending cleared (not bricked)");
    }

    function test_Uint_OverflowIntoNegative_RoutesToFailed() public {
        uint256 id = _req(kInflation);
        // uint > int256.max must not silently wrap to a negative int256
        platform.fulfill(
            address(oracle), id, _resp(abi.encode(uint256(type(int256).max) + 1), ResponseStatus.Success), ResponseStatus.Success
        );
        (, int256 v,,) = oracle.latest(kInflation);
        assertEq(v, 0, "rejected, not wrapped");
    }

    /// Catalog invariant: no String-kind endpoint is seeded, so requestMacro's UnsupportedKind
    /// branch is structurally unreachable today. If a future change adds a String route, this
    /// fails and forces wiring the String path (+ its own test) before it can ship.
    function test_Catalog_HasNoStringKind() public pure {
        (, Endpoint[] memory eps) = TECatalog.seed();
        for (uint256 i; i < eps.length; ++i) {
            assertTrue(eps[i].kind != ValueKind.String, "no String endpoint without a wired path");
        }
    }

    function test_RevertWhen_ProxyBaseHasNoTrailingSlash() public {
        vm.expectRevert(MacroOracle.BadProxyBase.selector);
        new MacroOracle(address(platform), "https://host"); // missing trailing "/"
    }

    /// @dev decode the (url, selector, decimals) args after the 4-byte agent selector.
    function _decodePayload(bytes memory p) internal pure returns (string memory url, string memory sel, uint8 dec) {
        bytes memory args = new bytes(p.length - 4);
        for (uint256 i = 0; i < args.length; ++i) {
            args[i] = p[i + 4];
        }
        (url, sel, dec) = abi.decode(args, (string, string, uint8));
    }
}
