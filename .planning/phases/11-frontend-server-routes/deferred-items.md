## Deferred (out-of-scope) — discovered during 11-03 execution

- `packages/frontend/tests/unit/anti-patterns.test.ts` (`impeccable anti-pattern detector`) intermittently times out at the default 30s in the FULL `vitest run` because it spawns the external `impeccable` binary (~27s). Passes 9/9 in isolation (`vitest run tests/unit/anti-patterns.test.ts`). Pre-existing, unrelated to the 11-03 cornerstone/workflow-engine changes. Fix candidate (not done here, out of scope): raise this suite's per-test `testTimeout` or guard it behind `SKIP_IN_CI` consistently. — 2026-06-09
