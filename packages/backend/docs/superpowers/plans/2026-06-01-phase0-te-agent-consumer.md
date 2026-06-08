# Phase 0 — TE Agent Consumer (Minimal First Proof) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **⚠️ GATE:** Per repo `CLAUDE.md`, this plan must pass the three-step planning-review gate (Studio Producer selector → Reality Checker + domain reviewer → verdict) BEFORE execution. Do not start Task 1 until the gate returns PASS/PASS.

**Goal:** Prove, on Somnia testnet, that a Solidity contract can encapsulate a JSON API Request agent call and receive the result via callback — first against a keyless public endpoint (0a), then against Trading Economics via the public `guest:guest` credential (0b).

**Architecture:** One reusable paradigm — an abstract `SomniaAgentConsumer` (async request-callback) that `_sendRequest`s to the Somnia platform and dispatches verified callbacks to a virtual `_onResult`. A `JsonApi` payload-encoder library wraps `IJsonApiAgent`. A concrete `TEFeed` consumer exercises both 0a and 0b. Logic is unit-tested against a `MockAgentPlatform`; the real (async, validator-executed) callback is verified by a live-testnet deploy+invoke+observe script.

**Tech Stack:** Foundry (`forge`, `forge-std`), Solidity ^0.8.24, Somnia testnet (chain 50312, platform `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`, JSON API agent id `13174292974160097713`). New project isolated under `onchain/`.

**Non-negotiables carried from the design (`DRAFT.md`):**
- The paid TE key NEVER appears on-chain. 0b uses `?c=guest:guest` only (TE's public demo credential).
- Document the guest-restriction and paid-key-deferral in NatSpec.

---

### Task 1: Foundry project scaffold under `onchain/`

**Files:**
- Create: `onchain/foundry.toml`
- Create: `onchain/.gitignore`
- Create: `onchain/remappings.txt`

- [ ] **Step 1: Initialize Foundry libs (forge-std) without overwriting repo files**

Run:
```bash
cd /home/jmsbpp/apps/d2p/abrigo/abrigo-somnia && mkdir -p onchain/src onchain/test onchain/script && forge install foundry-rs/forge-std --root onchain --no-git
```
Expected: `onchain/lib/forge-std/` populated.

- [ ] **Step 2: Write `onchain/foundry.toml`**

```toml
[profile.default]
src = "src"
test = "test"
out = "out"
libs = ["lib"]
solc = "0.8.24"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
somnia_testnet = "https://api.infra.testnet.somnia.network"
```

- [ ] **Step 3: Write `onchain/remappings.txt`**

```
forge-std/=lib/forge-std/src/
```

- [ ] **Step 4: Write `onchain/.gitignore`**

```
out/
cache/
broadcast/
.env
```

- [ ] **Step 5: Verify the toolchain builds (empty project)**

Run: `cd onchain && forge build`
Expected: compiles with no errors (0 contracts or only forge-std).

- [ ] **Step 6: Commit**

```bash
git add onchain/foundry.toml onchain/remappings.txt onchain/.gitignore
git commit -m "chore(onchain): foundry scaffold for Phase-0 agent consumer"
```

---

### Task 2: Vendor the platform interface (`ISomniaAgents`)

**Files:**
- Create: `onchain/src/interfaces/ISomniaAgents.sol`

The Phase-0 contracts need `IAgentRequester`, the `Request`/`Response` structs, the enums, and `IJsonApiAgent`. Copy them verbatim from the canonical example (`agentathon/somnia-agents-examples/contracts/interfaces/ISomniaAgents.sol`) so on-chain ABI matches the live platform exactly.

- [ ] **Step 1: Create the interface file**

Copy the full contents of `agentathon/somnia-agents-examples/contracts/interfaces/ISomniaAgents.sol` into `onchain/src/interfaces/ISomniaAgents.sol` (the `enum ConsensusType`, `enum ResponseStatus`, `struct Response`, `struct Request`, `interface IAgentRequester`, `interface IJsonApiAgent`, `interface ILLMAgent`, `interface IParseWebsiteAgent` — all of it, unmodified, pragma `^0.8.24`).

- [ ] **Step 2: Verify it compiles**

Run: `cd onchain && forge build`
Expected: compiles; `IAgentRequester`, `IJsonApiAgent` present.

- [ ] **Step 3: Commit**

```bash
git add onchain/src/interfaces/ISomniaAgents.sol
git commit -m "feat(onchain): vendor ISomniaAgents platform interface (matches live ABI)"
```

---

### Task 3: `JsonApi` payload-encoder library

**Files:**
- Create: `onchain/src/lib/JsonApi.sol`
- Test: `onchain/test/JsonApi.t.sol`

- [ ] **Step 1: Write the failing test**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {JsonApi} from "../src/lib/JsonApi.sol";
import {IJsonApiAgent} from "../src/interfaces/ISomniaAgents.sol";

contract JsonApiTest is Test {
    function test_fetchUint_encodes_selector_and_args() public pure {
        bytes memory got = JsonApi.fetchUint("https://x/y", "a.b", 8);
        bytes memory want = abi.encodeWithSelector(
            IJsonApiAgent.fetchUint.selector, "https://x/y", "a.b", uint8(8)
        );
        assertEq(keccak256(got), keccak256(want));
    }

    function test_fetchString_encodes_selector_and_args() public pure {
        bytes memory got = JsonApi.fetchString("https://x/y", "a.b");
        bytes memory want = abi.encodeWithSelector(
            IJsonApiAgent.fetchString.selector, "https://x/y", "a.b"
        );
        assertEq(keccak256(got), keccak256(want));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd onchain && forge test --match-contract JsonApiTest -vv`
Expected: FAIL — `JsonApi` source not found / does not compile.

- [ ] **Step 3: Write minimal implementation**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IJsonApiAgent} from "../interfaces/ISomniaAgents.sol";

/// @title JsonApi — ABI payload encoders for the JSON API Request agent
/// @notice Builds the `bytes payload` consumed by IAgentRequester.createRequest.
library JsonApi {
    function fetchUint(string memory url, string memory selector, uint8 decimals)
        internal pure returns (bytes memory)
    {
        return abi.encodeWithSelector(IJsonApiAgent.fetchUint.selector, url, selector, decimals);
    }

    function fetchString(string memory url, string memory selector)
        internal pure returns (bytes memory)
    {
        return abi.encodeWithSelector(IJsonApiAgent.fetchString.selector, url, selector);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd onchain && forge test --match-contract JsonApiTest -vv`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add onchain/src/lib/JsonApi.sol onchain/test/JsonApi.t.sol
git commit -m "feat(onchain): JsonApi payload-encoder library (fetchUint/fetchString)"
```

---

### Task 4: `MockAgentPlatform` test double

**Files:**
- Create: `onchain/test/mocks/MockAgentPlatform.sol`

A local stand-in for the platform: records the last `createRequest` args, returns deterministic ids, exposes `fulfill(...)` to simulate the validator callback (calling the consumer's `handleResponse` AS the platform). This is the only way to exercise the callback locally — the real callback is async/off-chain.

- [ ] **Step 1: Write the mock**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    IAgentRequester, Request, Response, ResponseStatus, ConsensusType
} from "../../src/interfaces/ISomniaAgents.sol";

contract MockAgentPlatform is IAgentRequester {
    uint256 public depositAmount = 0.01 ether;
    uint256 public nextId = 1;

    // last-call capture
    uint256 public lastAgentId;
    address public lastCallback;
    bytes4  public lastSelector;
    bytes   public lastPayload;
    uint256 public lastValue;

    function setDeposit(uint256 d) external { depositAmount = d; }
    function getRequestDeposit() external view returns (uint256) { return depositAmount; }
    function getAdvancedRequestDeposit(uint256) external view returns (uint256) { return depositAmount; }

    function createRequest(
        uint256 agentId,
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata payload
    ) external payable returns (uint256 requestId) {
        lastAgentId = agentId;
        lastCallback = callbackAddress;
        lastSelector = callbackSelector;
        lastPayload = payload;
        lastValue = msg.value;
        requestId = nextId++;
    }

    function createAdvancedRequest(
        uint256, address, bytes4, bytes calldata, uint256, uint256, ConsensusType, uint256
    ) external payable returns (uint256) { return nextId++; }

    function hasRequest(uint256) external pure returns (bool) { return true; }
    function getRequest(uint256) external pure returns (Request memory r) { return r; }

    /// @notice Simulate the platform callback with a single uint256 result.
    function fulfillUint(address consumer, uint256 requestId, uint256 value, ResponseStatus status) external {
        Response[] memory rs = new Response[](1);
        rs[0] = Response({
            validator: address(this),
            result: abi.encode(value),
            status: status,
            receipt: 0,
            timestamp: block.timestamp,
            executionCost: 0
        });
        Request memory empty;
        (bool ok, ) = consumer.call(
            abi.encodeWithSelector(lastSelector, requestId, rs, status, empty)
        );
        require(ok, "callback reverted");
    }

    /// @notice Simulate a failure callback (no responses).
    function fulfillFailure(address consumer, uint256 requestId, ResponseStatus status) external {
        Response[] memory rs = new Response[](0);
        Request memory empty;
        (bool ok, ) = consumer.call(
            abi.encodeWithSelector(lastSelector, requestId, rs, status, empty)
        );
        require(ok, "callback reverted");
    }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd onchain && forge build`
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add onchain/test/mocks/MockAgentPlatform.sol
git commit -m "test(onchain): MockAgentPlatform double with fulfill helpers"
```

---

### Task 5: `SomniaAgentConsumer` abstract base (the paradigm)

**Files:**
- Create: `onchain/src/SomniaAgentConsumer.sol`
- Test: `onchain/test/SomniaAgentConsumer.t.sol`

The base must allow injecting the platform address for tests (constructor arg defaulting is not used; the concrete contract passes the address). This avoids hard-coding the live platform into unit tests.

- [ ] **Step 1: Write the failing test**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SomniaAgentConsumer} from "../src/SomniaAgentConsumer.sol";
import {MockAgentPlatform} from "./mocks/MockAgentPlatform.sol";
import {Response, ResponseStatus} from "../src/interfaces/ISomniaAgents.sol";

// Minimal concrete consumer for testing the base.
contract ProbeConsumer is SomniaAgentConsumer {
    uint256 public lastValue;
    bool public failed;
    constructor(address platform) SomniaAgentConsumer(platform) {}
    function send(uint256 agentId, bytes calldata payload) external payable returns (uint256) {
        return _sendRequest(agentId, payload);
    }
    function _onResult(uint256, Response[] memory responses, ResponseStatus status) internal override {
        if (status == ResponseStatus.Success && responses.length > 0) {
            lastValue = abi.decode(responses[0].result, (uint256));
        } else {
            failed = true;
        }
    }
}

contract SomniaAgentConsumerTest is Test {
    MockAgentPlatform platform;
    ProbeConsumer consumer;

    function setUp() public {
        platform = new MockAgentPlatform();
        consumer = new ProbeConsumer(address(platform));
    }

    function test_send_reverts_when_value_below_deposit() public {
        platform.setDeposit(0.01 ether);
        vm.expectRevert(bytes("insufficient deposit"));
        consumer.send{value: 0.005 ether}(1, hex"00");
    }

    function test_send_forwards_deposit_and_tracks_pending() public {
        platform.setDeposit(0.01 ether);
        uint256 id = consumer.send{value: 0.01 ether}(42, hex"1234");
        assertEq(platform.lastAgentId(), 42);
        assertEq(platform.lastValue(), 0.01 ether);
        assertEq(platform.lastCallback(), address(consumer));
        assertTrue(consumer.pendingRequests(id));
    }

    function test_send_refunds_excess() public {
        platform.setDeposit(0.01 ether);
        uint256 balBefore = address(this).balance;
        consumer.send{value: 0.03 ether}(1, hex"00");
        // 0.02 refunded to this test contract
        assertEq(address(this).balance, balBefore - 0.01 ether);
    }

    function test_handleResponse_rejects_non_platform() public {
        platform.setDeposit(0.01 ether);
        uint256 id = consumer.send{value: 0.01 ether}(1, hex"00");
        Response[] memory rs = new Response[](0);
        vm.expectRevert(bytes("only platform"));
        consumer.handleResponse(id, rs, ResponseStatus.Success, _emptyReq());
    }

    function test_handleResponse_rejects_unknown_request() public {
        // platform calls back for an id we never created
        vm.expectRevert(bytes("unknown request"));
        platform.fulfillUint(address(consumer), 999, 5, ResponseStatus.Success);
    }

    function test_success_callback_decodes_and_stores() public {
        platform.setDeposit(0.01 ether);
        uint256 id = consumer.send{value: 0.01 ether}(1, hex"00");
        platform.fulfillUint(address(consumer), id, 123456, ResponseStatus.Success);
        assertEq(consumer.lastValue(), 123456);
        assertFalse(consumer.pendingRequests(id));
    }

    function test_failure_callback_sets_failed_flag() public {
        platform.setDeposit(0.01 ether);
        uint256 id = consumer.send{value: 0.01 ether}(1, hex"00");
        platform.fulfillFailure(address(consumer), id, ResponseStatus.Failed);
        assertTrue(consumer.failed());
        assertFalse(consumer.pendingRequests(id));
    }

    function _emptyReq() internal pure returns (Request memory r) { return r; }
    receive() external payable {}
}
```

Add the import `Request` to the test's import line:
```solidity
import {Response, ResponseStatus, Request} from "../src/interfaces/ISomniaAgents.sol";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd onchain && forge test --match-contract SomniaAgentConsumerTest -vv`
Expected: FAIL — `SomniaAgentConsumer` source not found.

- [ ] **Step 3: Write minimal implementation**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRequester, Request, Response, ResponseStatus} from "./interfaces/ISomniaAgents.sol";

/// @title SomniaAgentConsumer — async request/callback base (THE project paradigm)
/// @notice Every Somnia-agent-calling contract inherits this. Subclasses implement `_onResult`.
abstract contract SomniaAgentConsumer {
    IAgentRequester public immutable PLATFORM;
    mapping(uint256 => bool) public pendingRequests;

    event AgentRequested(uint256 indexed requestId, uint256 indexed agentId);

    constructor(address platform) {
        PLATFORM = IAgentRequester(platform);
    }

    function _sendRequest(uint256 agentId, bytes memory payload) internal returns (uint256 requestId) {
        uint256 deposit = PLATFORM.getRequestDeposit();
        require(msg.value >= deposit, "insufficient deposit");
        requestId = PLATFORM.createRequest{value: deposit}(
            agentId, address(this), this.handleResponse.selector, payload
        );
        pendingRequests[requestId] = true;
        emit AgentRequested(requestId, agentId);
        if (msg.value > deposit) {
            payable(msg.sender).transfer(msg.value - deposit);
        }
    }

    /// @notice Platform-invoked callback. Guarded; dispatches to `_onResult`.
    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory /* details */
    ) external {
        require(msg.sender == address(PLATFORM), "only platform");
        require(pendingRequests[requestId], "unknown request");
        delete pendingRequests[requestId];
        _onResult(requestId, responses, status);
    }

    function _onResult(uint256 requestId, Response[] memory responses, ResponseStatus status) internal virtual;

    receive() external payable {}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd onchain && forge test --match-contract SomniaAgentConsumerTest -vv`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add onchain/src/SomniaAgentConsumer.sol onchain/test/SomniaAgentConsumer.t.sol
git commit -m "feat(onchain): SomniaAgentConsumer async request/callback base + tests"
```

---

### Task 6: `TEFeed` concrete consumer (0a public + 0b TE guest)

**Files:**
- Create: `onchain/src/TEFeed.sol`
- Test: `onchain/test/TEFeed.t.sol`

- [ ] **Step 1: Write the failing test**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TEFeed} from "../src/TEFeed.sol";
import {MockAgentPlatform} from "./mocks/MockAgentPlatform.sol";
import {IJsonApiAgent} from "../src/interfaces/ISomniaAgents.sol";
import {ResponseStatus} from "../src/interfaces/ISomniaAgents.sol";

contract TEFeedTest is Test {
    MockAgentPlatform platform;
    TEFeed feed;

    function setUp() public {
        platform = new MockAgentPlatform();
        platform.setDeposit(0.01 ether);
        feed = new TEFeed(address(platform));
    }

    function test_0a_requestPublicPrice_uses_json_agent_and_fetchUint() public {
        feed.requestPublicPrice{value: 0.01 ether}("bitcoin");
        assertEq(platform.lastAgentId(), 13174292974160097713);
        // payload must start with the fetchUint selector
        bytes4 sel = bytes4(_slice4(platform.lastPayload()));
        assertEq(sel, IJsonApiAgent.fetchUint.selector);
    }

    function test_0b_requestTEGuestUint_builds_guest_url() public {
        feed.requestTEGuestUint{value: 0.01 ether}(
            "https://api.tradingeconomics.com/country/mexico", "[0].GDP", 2
        );
        assertEq(platform.lastAgentId(), 13174292974160097713);
        bytes4 sel = bytes4(_slice4(platform.lastPayload()));
        assertEq(sel, IJsonApiAgent.fetchUint.selector);
    }

    function test_result_is_stored_on_success() public {
        uint256 id = feed.requestPublicPrice{value: 0.01 ether}("bitcoin");
        platform.fulfillUint(address(feed), id, 4200050000000, ResponseStatus.Success);
        assertEq(feed.latestValue(), 4200050000000);
        assertGt(feed.lastUpdatedAt(), 0);
    }

    function _slice4(bytes memory b) internal pure returns (bytes4 out) {
        assembly { out := mload(add(b, 32)) }
    }
    receive() external payable {}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd onchain && forge test --match-contract TEFeedTest -vv`
Expected: FAIL — `TEFeed` source not found.

- [ ] **Step 3: Write minimal implementation**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SomniaAgentConsumer} from "./SomniaAgentConsumer.sol";
import {JsonApi} from "./lib/JsonApi.sol";
import {Response, ResponseStatus} from "./interfaces/ISomniaAgents.sol";

/// @title TEFeed — Phase-0 minimal proof of JSON-API-agent encapsulation.
/// @notice 0a fetches a keyless public price (CoinGecko). 0b fetches a single
///         Trading Economics value via the PUBLIC `guest:guest` credential.
/// @dev PRODUCTIONIZATION BLOCKER: the paid TE key is NEVER used here. 0b uses
///      `?c=guest:guest` (TE's public demo credential), which is heavily
///      restricted (limited countries/indicators). The real key enters later
///      ONLY via the off-chain keeper-proxy (Slice A), never on-chain.
contract TEFeed is SomniaAgentConsumer {
    uint256 public constant JSON_API_AGENT_ID = 13174292974160097713;

    uint256 public latestValue;     // scaled by the requested decimals
    uint256 public lastUpdatedAt;

    event ValueReceived(uint256 indexed requestId, uint256 value);
    event RequestFailed(uint256 indexed requestId, ResponseStatus status);

    constructor(address platform) SomniaAgentConsumer(platform) {}

    /// @notice 0a — keyless public endpoint (CoinGecko), proves the pipe.
    function requestPublicPrice(string calldata coinId) external payable returns (uint256 requestId) {
        string memory url = string.concat(
            "https://api.coingecko.com/api/v3/simple/price?ids=", coinId, "&vs_currencies=usd"
        );
        string memory selector = string.concat(coinId, ".usd");
        return _sendRequest(JSON_API_AGENT_ID, JsonApi.fetchUint(url, selector, 8));
    }

    /// @notice 0b — Trading Economics via PUBLIC guest:guest. `baseUrl` must be a
    ///         guest-accessible endpoint; the guest credential is appended here so
    ///         no caller can inject a paid key.
    function requestTEGuestUint(
        string calldata baseUrl, string calldata selector, uint8 decimals
    ) external payable returns (uint256 requestId) {
        string memory url = string.concat(baseUrl, "?c=guest:guest&f=json");
        return _sendRequest(JSON_API_AGENT_ID, JsonApi.fetchUint(url, selector, decimals));
    }

    function _onResult(uint256 requestId, Response[] memory responses, ResponseStatus status) internal override {
        if (status == ResponseStatus.Success && responses.length > 0) {
            latestValue = abi.decode(responses[0].result, (uint256));
            lastUpdatedAt = block.timestamp;
            emit ValueReceived(requestId, latestValue);
        } else {
            emit RequestFailed(requestId, status);
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd onchain && forge test --match-contract TEFeedTest -vv`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite**

Run: `cd onchain && forge test -vv`
Expected: all tests PASS (Tasks 3, 5, 6).

- [ ] **Step 6: Commit**

```bash
git add onchain/src/TEFeed.sol onchain/test/TEFeed.t.sol
git commit -m "feat(onchain): TEFeed Phase-0 consumer (0a public + 0b TE guest:guest)"
```

---

### Task 7: Live-testnet deploy + invoke + observe script

**Files:**
- Create: `onchain/script/DeployTEFeed.s.sol`
- Create: `onchain/script/InvokeTEFeed.s.sol`
- Create: `onchain/README.md`

The async callback cannot be asserted in `forge test`. This task verifies the real end-to-end flow against the live platform.

- [ ] **Step 1: Write the deploy script**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {TEFeed} from "../src/TEFeed.sol";

contract DeployTEFeed is Script {
    address constant PLATFORM = 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776;
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        vm.startBroadcast(pk);
        TEFeed feed = new TEFeed(PLATFORM);
        vm.stopBroadcast();
        console2.log("TEFeed deployed at:", address(feed));
    }
}
```

- [ ] **Step 2: Write the invoke script**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {TEFeed} from "../src/TEFeed.sol";

contract InvokeTEFeed is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        TEFeed feed = TEFeed(payable(vm.envAddress("TEFEED_ADDR")));
        uint256 deposit = feed.PLATFORM().getRequestDeposit();
        vm.startBroadcast(pk);
        // 0a: keyless public price
        feed.requestPublicPrice{value: deposit}("bitcoin");
        vm.stopBroadcast();
        console2.log("Requested. Deposit sent:", deposit);
    }
}
```

- [ ] **Step 3: Write `onchain/README.md` (manual run + observe procedure)**

````markdown
# onchain — Phase 0 (TE Agent Consumer)

Async-callback paradigm: a `SomniaAgentConsumer` requests a JSON API Request agent
call on Somnia testnet and stores the result via the platform callback.

## Test (local, mocked platform)
```bash
cd onchain && forge test -vv
```

## Live testnet (real async callback — cannot be unit-tested)
Prereqs: a funded Somnia testnet (chain 50312) key with STT. Set env:
```bash
export DEPLOYER_PK=0x...        # testnet key only; never a mainnet key
```
Deploy:
```bash
forge script script/DeployTEFeed.s.sol --rpc-url somnia_testnet --broadcast
# note the printed TEFeed address
export TEFEED_ADDR=0x<printed>
```
Invoke (0a public price):
```bash
forge script script/InvokeTEFeed.s.sol --rpc-url somnia_testnet --broadcast
```
Observe (after validators reach consensus — async, may take seconds):
```bash
cast call $TEFEED_ADDR "latestValue()(uint256)"   --rpc-url somnia_testnet
cast call $TEFEED_ADDR "lastUpdatedAt()(uint256)" --rpc-url somnia_testnet
```
Expected: `latestValue` becomes non-zero (BTC price × 1e8) and `lastUpdatedAt` > 0.

## 0b — TE guest
Repeat the invoke against a guest-accessible TE endpoint, e.g.:
`requestTEGuestUint("https://api.tradingeconomics.com/country/mexico", "<selector>", <decimals>)`
NOTE: guest:guest is heavily restricted; confirm the chosen country/indicator is
guest-accessible and that the selector resolves to a numeric field. The paid key is
NEVER used here.

## ⚠️ Blocker
The paid TE key must never appear on-chain (validators publish the fetched URL).
0b uses only the public `guest:guest` credential. The paid key enters later via the
off-chain keeper-proxy (see `../DRAFT.md` §2.2, blocker #2).
````

- [ ] **Step 4: Verify scripts compile**

Run: `cd onchain && forge build`
Expected: compiles (scripts included).

- [ ] **Step 5: Commit**

```bash
git add onchain/script/DeployTEFeed.s.sol onchain/script/InvokeTEFeed.s.sol onchain/README.md
git commit -m "feat(onchain): Phase-0 deploy/invoke scripts + live-testnet observe procedure"
```

---

## Self-Review notes (author)

- **Spec coverage:** Covers `DRAFT.md` §3.5 (paradigm = `SomniaAgentConsumer`), §3.6 0a (Task 6 `requestPublicPrice`) and 0b (Task 6 `requestTEGuestUint`, guest:guest), and the Phase-0 success criterion (Task 7 observe). Gas readout: add `--gas-report` to the `forge test` run when recording.
- **Key safety:** the paid key never appears in any contract, script, or test; only `guest:guest`. `.env`/`DEPLOYER_PK` are testnet-only and gitignored.
- **Async reality:** the callback is verified only on live testnet (Task 7), never asserted in `forge test` — the mock exists solely to exercise the consumer's local logic/guards.
- **Out of scope (correctly deferred):** escrow, payment split, convex books, Panoptic, cross-chain — all later slices.
