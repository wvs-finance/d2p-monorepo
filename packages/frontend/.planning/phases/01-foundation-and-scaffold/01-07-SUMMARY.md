---
phase: "01"
plan: "07"
subsystem: env-validation-and-agent-accessibility
tags: [env, @t3-oss/env-nextjs, zod, mcp, agent-accessibility, openapi, llms.txt]
dependency_graph:
  requires:
    - "01-01: lib/env.ts minimal placeholder + next.config.ts import side-effect"
    - "01-05: wagmi config (partial client schema)"
  provides:
    - "lib/env.ts: full @t3-oss/env-nextjs server+client schema (NEXT_PUBLIC_APP_URL added)"
    - ".env.example: documented scope strategy for all 8 vars"
    - "app/api/health/route.ts: JSON health endpoint"
    - "app/llms.txt/route.ts: plaintext agent discovery"
    - "app/.well-known/mcp.json/route.ts: MCP discovery descriptor"
    - "app/.well-known/openapi.yaml/route.ts: OpenAPI 3.1 stub"
    - "app/api/mcp/[transport]/route.ts: mcp-handler stub (zero tools)"
    - "tests/api/health.test.ts: real vitest assertions for health endpoint"
    - "tests/e2e/agent-stubs.spec.ts: real Playwright assertions for 4 agent routes"
  affects:
    - "All downstream phases that import env vars via @/lib/env"
    - "Phase 4: registers tools in app/api/mcp/[transport]/route.ts"
tech_stack:
  added: []
  patterns:
    - "@t3-oss/env-nextjs server+client split with explicit runtimeEnv mapping"
    - "SKIP_ENV_VALIDATION env flag for test environments that cannot provide all vars"
    - "force-static for read-only agent-accessibility routes (llms.txt, well-known)"
    - "force-dynamic for health endpoint (returns live timestamp)"
    - "mcp-handler 3-arg form: createMcpHandler(initFn, serverOptions, config) — basePath in config (3rd arg), not serverOptions (2nd)"
key_files:
  created:
    - app/api/health/route.ts
    - app/llms.txt/route.ts
    - app/.well-known/mcp.json/route.ts
    - app/.well-known/openapi.yaml/route.ts
    - app/api/mcp/[transport]/route.ts
  modified:
    - lib/env.ts
    - .env.example
    - tests/api/health.test.ts
    - tests/e2e/agent-stubs.spec.ts
decisions:
  - "lib/env.ts expanded from Plan 01 minimal placeholder and Plan 05 partial schema — NEXT_PUBLIC_APP_URL added to complete the full client schema"
  - "app/api/mcp/[transport]/route.ts: basePath belongs in Config (3rd arg), not ServerOptions (2nd arg) — this is the mcp-handler 1.1.0 API"
  - "next.config.ts NOT modified — Plan 01's import side-effect remains canonical"
  - "app/api/mcp/[transport]/route.ts committed by Plan 06 (71e8764) as a Rule 1 bug fix during parallel Wave 2 execution"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 4
  commits: 2
---

# Phase 1 Plan 07: @t3-oss/env-nextjs full schema + agent-accessibility routes Summary

Full build-time env validation via @t3-oss/env-nextjs with server/client Zod split; four
agent-accessibility routes (/llms.txt, /.well-known/mcp.json, /.well-known/openapi.yaml,
/api/mcp/[transport]) return real 200 responses; /api/health confirms Node runtime works.

---

## What Was Built

### Task 1: Expand lib/env.ts with full @t3-oss/env-nextjs Zod schema

**Schema split:**

| Half | Variables |
|------|-----------|
| `server` (server-only) | `NODE_ENV` |
| `client` (NEXT_PUBLIC_*) | `NEXT_PUBLIC_RPC_CELO_PRIMARY`, `NEXT_PUBLIC_RPC_ETH_PRIMARY`, `NEXT_PUBLIC_RPC_BASE_PRIMARY`, `NEXT_PUBLIC_RPC_ARB_PRIMARY`, `NEXT_PUBLIC_RPC_OP_PRIMARY`, `NEXT_PUBLIC_WALLETCONNECT_ID`, `NEXT_PUBLIC_APP_URL` |

**runtimeEnv mapping:** All 8 vars listed explicitly. @t3-oss strips vars not listed.

**Important parallel execution note:** Plan 05 (wagmi config, Wave 2) had already partially
expanded lib/env.ts with 6 of the 7 NEXT_PUBLIC_ vars. Plan 07 added `NEXT_PUBLIC_APP_URL`
to complete the full schema. Both plans operated on the same file in the same wave; their
changes were merged without conflict.

**next.config.ts status:** NOT modified. Plan 01's `import './lib/env'` at line 1 remains
canonical. This plan only expanded the schema in lib/env.ts.

**.env.example:** Updated with a scope-strategy comment block explaining:
- `NEXT_PUBLIC_*` = safe to leak (chain IDs, public RPCs, WalletConnect ID, app URL)
- All other vars = server-only, never prefix with NEXT_PUBLIC_
- Vercel scopes: Production / Preview / Development
- All 7 NEXT_PUBLIC_ vars documented with example values and per-var comments

### Task 2: Ship four agent-accessibility route handlers + health endpoint

**Route inventory:**

| Route | File | Content-Type | Response |
|-------|------|--------------|----------|
| `GET /api/health` | `app/api/health/route.ts` | `application/json` | `{ status: 'ok', build, runtime: 'node', timestamp }` |
| `GET /llms.txt` | `app/llms.txt/route.ts` | `text/plain; charset=utf-8` | Plaintext: site title, license, URL inventory, MCP pointer |
| `GET /.well-known/mcp.json` | `app/.well-known/mcp.json/route.ts` | `application/json` | `{ mcp_servers: [{ url: '/api/mcp', transport: [...] }] }` |
| `GET /.well-known/openapi.yaml` | `app/.well-known/openapi.yaml/route.ts` | `application/yaml; charset=utf-8` | OpenAPI 3.1 stub with `/api/health` path definition |
| `GET/POST/DELETE /api/mcp/[transport]` | `app/api/mcp/[transport]/route.ts` | — | mcp-handler stub, zero tools (Phase 4 fills) |

**mcp-handler basePath requirement:**

The `createMcpHandler` function takes 3 arguments:
1. `initializeServer` — registers tools (empty for Phase 1)
2. `serverOptions` — MCP server options (`{}` in Phase 1)
3. `config` — handler config — `basePath` goes HERE (not in arg 2)

```typescript
const handler = createMcpHandler((_server) => {}, {}, { basePath: '/api/mcp' })
```

`basePath: '/api/mcp'` must equal the parent directory of `[transport]`. Phase 4 will
call `server.tool(...)` inside the first argument to register tools.

**Test updates:**
- `tests/api/health.test.ts`: Replaced `it.todo` stub with real Vitest assertions calling
  the route handler directly. Tests `status === 'ok'`, `runtime === 'node'`, presence of
  `build` and `timestamp` fields.
- `tests/e2e/agent-stubs.spec.ts`: Replaced `test.fixme` stubs with real Playwright
  assertions against the running dev server. Checks 200 status, correct Content-Type,
  and body content for all four agent routes. The JSON-LD test remains `.fixme` — it
  requires Plan 04's StructuredData component.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] NEXT_PUBLIC_APP_URL added to Plan 05's partial schema**
- **Found during:** Task 1
- **Issue:** Plan 05 (wagmi config) had already expanded lib/env.ts with 6 NEXT_PUBLIC_
  vars during parallel Wave 2 execution, but had not included `NEXT_PUBLIC_APP_URL`
  which this plan's spec required
- **Fix:** Added `NEXT_PUBLIC_APP_URL: z.string().url()` to client schema and its
  corresponding `runtimeEnv` entry
- **Files modified:** lib/env.ts
- **Commit:** bc1f765 (absorbed into Plan 03's commit due to parallel execution timing)

**2. [Rule 3 - Blocking] Stale tsconfig.tsbuildinfo caused spurious TS error**
- **Found during:** Task 2 commit (pre-commit typecheck hook)
- **Issue:** Old tsconfig.tsbuildinfo cache referenced `tests/unit/status-pill.test.ts`
  (Plan 01's Wave 0 stub) which Plan 02 had replaced with `status-pill.test.tsx`. The
  cache caused TypeScript to report parse errors for the old filename.
- **Fix:** Deleted tsconfig.tsbuildinfo to force a fresh incremental build
- **Commit:** Resolved before Task 2 commit

**3. [Rule 3 - Blocking] mcp-handler API: basePath in Config (3rd arg) not ServerOptions (2nd arg)**
- **Found during:** Task 2 TypeScript check
- **Issue:** Plan specification showed `createMcpHandler(fn, { basePath: '/api/mcp' })`
  (2-arg form), but the actual mcp-handler 1.1.0 API puts `basePath` in the `Config`
  type which is the 3rd argument. Putting it in the 2nd arg (ServerOptions) caused TS2353.
- **Fix:** Changed to `createMcpHandler(fn, {}, { basePath: '/api/mcp' })`
- **Note:** Plan 06 also encountered and fixed this same issue (commit 71e8764) during
  parallel Wave 2 execution — their fix was committed before this plan's commit
- **Files modified:** app/api/mcp/[transport]/route.ts

### Parallel Execution Notes

This plan ran in Wave 2 alongside Plans 02, 03, 05, and 06. Several files were modified by
multiple plans concurrently:
- `lib/env.ts`: Plan 05 expanded first, this plan added NEXT_PUBLIC_APP_URL
- `app/api/mcp/[transport]/route.ts`: Both this plan and Plan 06 created this file; Plan
  06's commit (71e8764) landed first with the correct 3-arg form
- `app/layout.tsx`: Plan 03 fixed the getLocale import (already correct when this plan's
  typecheck ran)

All concurrent modifications converged to correct final state without merge conflicts.

---

## Verification Results

| Check | Result |
|-------|--------|
| `test -f lib/env.ts && grep -q "createEnv" lib/env.ts` | PASS |
| `grep -q "NEXT_PUBLIC_RPC_CELO_PRIMARY" lib/env.ts` | PASS |
| `grep -q "NEXT_PUBLIC_APP_URL" lib/env.ts` | PASS |
| `head -1 next.config.ts` contains `./lib/env` | PASS |
| `test -f .env.example && grep -q "NEXT_PUBLIC_WALLETCONNECT_ID" .env.example` | PASS |
| `grep -q "^.env.local$" .gitignore` | PASS |
| `test -f app/api/health/route.ts` | PASS |
| `test -f app/llms.txt/route.ts` | PASS |
| `test -f app/.well-known/mcp.json/route.ts` | PASS |
| `test -f app/.well-known/openapi.yaml/route.ts` | PASS |
| `test -f "app/api/mcp/[transport]/route.ts"` | PASS |
| `grep -q "basePath: '/api/mcp'" "app/api/mcp/[transport]/route.ts"` | PASS |
| `grep -q "mcp_servers" "app/.well-known/mcp.json/route.ts"` | PASS |
| `grep -q "openapi: 3.1.0" "app/.well-known/openapi.yaml/route.ts"` | PASS |
| `pnpm vitest run tests/api/health.test.ts` exits 0 | PASS |
| `pnpm tsc --noEmit` exits 0 | PASS |
| `pnpm biome check` on all created files exits 0 | PASS |
| next.config.ts NOT modified by plan 07 | PASS |

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| app/api/health/route.ts exists | PASSED |
| app/llms.txt/route.ts exists | PASSED |
| app/.well-known/mcp.json/route.ts exists | PASSED |
| app/.well-known/openapi.yaml/route.ts exists | PASSED |
| app/api/mcp/[transport]/route.ts exists | PASSED |
| lib/env.ts exists with full schema | PASSED |
| .env.example exists with scope docs | PASSED |
| Task 1 commit 6b7a30e | FOUND |
| Task 2 commit 8b36310 | FOUND |
| `pnpm vitest run tests/api/health.test.ts` exits 0 | PASSED |
| `pnpm tsc --noEmit` exits 0 | PASSED |
| next.config.ts NOT modified | PASSED |
