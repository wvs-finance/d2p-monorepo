---
phase: 04-agent-surface-mcp
plan: 04
subsystem: api
tags: [openapi, zod, zod-to-openapi, js-yaml, llms-txt, mcp, agent-surface]

# Dependency graph
requires:
  - phase: 04-01
    provides: canonical Zod schemas in lib/dashboard/contract.ts (single extendZodWithOpenApi call site) re-exported via lib/mcp-tools/contract.ts
  - phase: 03
    provides: live /api/dashboard, /api/status, /api/health routes that type their bodies against the canonical schemas
provides:
  - "lib/openapi/schemas.ts — OpenAPIRegistry registering the canonical (imported) schemas + registerPath for /api/health, /api/dashboard, /api/status, /api/mcp/mcp"
  - "lib/openapi/generate.ts — generateOpenApiYaml() via OpenApiGeneratorV31 + js-yaml dump (openapi 3.1.0)"
  - "/.well-known/openapi.yaml route serving the generated, drift-proof spec"
  - "/llms.txt refreshed: correct primary URLs, MCP endpoint pointer, no 404 URLs"
affects: [04-05, 04-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OpenAPI spec generated from the canonical Zod registry (imported, never re-declared) so it cannot drift from live route bodies — proven by the conformance test"
    - "JSON-RPC endpoints documented in prose + one example body with a passthrough placeholder schema (OpenAPI cannot usefully type a method-dispatched JSON-RPC union)"

key-files:
  created:
    - lib/openapi/schemas.ts
    - lib/openapi/generate.ts
  modified:
    - app/.well-known/openapi.yaml/route.ts
    - app/llms.txt/route.ts
    - tests/api/openapi.test.ts

key-decisions:
  - "lib/openapi/schemas.ts imports the canonical schemas from @/lib/mcp-tools/contract and never re-declares them or re-calls the Zod OpenAPI extension (M6/B3); the architecture grep test asserts the single extend call site"
  - "JSON-RPC /api/mcp/mcp request/response content uses a z.object({}).passthrough() placeholder schema + concrete example (the generator requires a schema per content entry; the prose description + example carry the real contract)"
  - "openapi.yaml body is computed once at module load (force-static), matching the spec's static nature"

patterns-established:
  - "Boundary artifacts (OpenAPI spec) are generated from the same Zod the routes conform to; conformance test (tests/api/openapi-conformance.test.ts) is the anti-drift gate"

requirements-completed: [AGENT-08, AGENT-09]

# Metrics
duration: 6min
completed: 2026-05-29
---

# Phase 04 Plan 04: Drift-Proof OpenAPI 3.1 + llms.txt Refresh Summary

**Generated OpenAPI 3.1.0 spec built from the canonical Zod registry (imported from lib/mcp-tools/contract, no re-declaration, single extendZodWithOpenApi) via OpenApiGeneratorV31 + js-yaml, documenting /api/{health,dashboard,status} and the /api/mcp/mcp JSON-RPC endpoint with examples; llms.txt refreshed to live URLs.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-29T23:13:18Z
- **Completed:** 2026-05-29T23:19:06Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- `lib/openapi/schemas.ts`: registers the six canonical schemas (Chain/Instrument/Dashboard/Status/Health) imported from `@/lib/mcp-tools/contract`, plus four `registerPath` entries with response examples. `/api/health` example uses `runtime: 'node'` (M5, matches the live route). `/api/mcp/mcp` is documented in prose + one JSON-RPC example body (no garbled token).
- `lib/openapi/generate.ts`: `generateOpenApiYaml()` runs `OpenApiGeneratorV31(registry.definitions).generateDocument({ openapi: '3.1.0', ... })` and serializes with `js-yaml` `dump` (no hand-rolled YAML).
- `/.well-known/openapi.yaml` route now serves the generated spec (`force-static`, `application/yaml`), replacing the hardcoded YAML stub.
- `/llms.txt` refreshed: stale top-level `/dashboard` replaced with `/apps/abrigo/dashboard`; `/api/mcp/mcp` marked canonical with the SSE path noted as disabled (404); `/api/status`/`/api/health` listed under machine endpoints (no `/status` page URL).
- Un-skipped `tests/api/openapi.test.ts` (3.1.0 header, four paths, `runtime: node` not `nodejs`, YAML round-trip). The B3 conformance test (`tests/api/openapi-conformance.test.ts`) was already live and stays green.

## Task Commits

1. **Task 1: OpenAPI schemas (import canonical) + generator from Zod** - `cfdc40c` (feat)
2. **Task 2: Wire openapi.yaml route + refresh llms.txt** - `37b5793` (feat)

## Files Created/Modified
- `lib/openapi/schemas.ts` - OpenAPIRegistry + registerPath for four endpoints; imports canonical schemas, no re-declaration, no second extend
- `lib/openapi/generate.ts` - generateOpenApiYaml(): OpenApiGeneratorV31 → js-yaml dump
- `app/.well-known/openapi.yaml/route.ts` - serves generated spec (force-static, application/yaml)
- `app/llms.txt/route.ts` - corrected primary/agent/machine URL lists
- `tests/api/openapi.test.ts` - un-skipped + expanded assertions (runtime:node, yaml round-trip)

## Decisions Made
- The MCP JSON-RPC content blocks carry a `z.object({}).passthrough()` placeholder schema because `OpenApiGeneratorV31` requires a `schema` for every content entry; the method-dispatched JSON-RPC union is intentionally not modelled, and the real contract lives in the path `description` prose + the concrete example body.
- Comment wording in `schemas.ts` avoids the literal `extendZodWithOpenApi(` substring so the static-grep architecture test (`expect(matches).toHaveLength(1)`) keeps asserting the single call site in `lib/dashboard/contract.ts`.

## Deviations from Plan

None - plan executed exactly as written. (Minor implementation detail: a passthrough placeholder schema was required on the JSON-RPC content blocks to satisfy the generator's per-content `schema` requirement — this is the prose+example approach the plan prescribed, not a schema for the JSON-RPC union.)

## Issues Encountered
- The first generator run threw `Cannot use 'in' operator to search for '_def' in undefined`: the MCP path's request/response content entries had an `example` but no `schema`, which `OpenApiGeneratorV31` requires. Resolved by adding a `z.object({}).passthrough()` placeholder schema to those two content blocks (the example still carries the concrete JSON-RPC shape).
- The architecture grep test initially failed because an explanatory comment contained the literal `extendZodWithOpenApi(` substring (the test counts substring occurrences across lib/). Reworded the comment; the call-site count is back to exactly one (`lib/dashboard/contract.ts`).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Wave 2 complete. The OpenAPI spec and llms.txt now reflect the live agent surface.
- Wave 3 (04-05 wires MCP tools + disableSse; 04-06) has human-verify checkpoints to be handled in a separate run. The e2e `agent-stubs.spec.ts` MCP/SSE assertions remain `test.fixme` until 04-05 registers tools and sets `disableSse: true`.
- Live-browser verification deferred per the GSD execution constraints for this plan (no Playwright/live server); the route-handler unit test + B3 conformance test cover the generated spec, and the openapi.yaml route is a static-generated config surface.

---
*Phase: 04-agent-surface-mcp*
*Completed: 2026-05-29*

## Self-Check: PASSED

- Files: lib/openapi/schemas.ts, lib/openapi/generate.ts, app/.well-known/openapi.yaml/route.ts, app/llms.txt/route.ts, tests/api/openapi.test.ts, 04-04-SUMMARY.md — all FOUND
- Commits: cfdc40c, 37b5793 — all FOUND
