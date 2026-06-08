STATE_FILE := fork-state/polygon-panoptic.json

.PHONY: test-demo clean-state test-demo-fresh

test-demo:
	forge test --match-path "test/fork/DemoMacroHedgeExecutor.fork.t.sol" -vv

clean-state:
	rm -f $(STATE_FILE)

test-demo-fresh: clean-state test-demo
