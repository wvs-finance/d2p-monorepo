// @vitest-environment node
// Wave 0 RED stub — 06-03 flips this GREEN (MCP tools land).
// Modules @/lib/mcp-tools/get-hedge-decisions and get-latest-macro-print do NOT exist yet.
// Import is indirected so tsc --noEmit passes pre-commit while the modules are absent.
// This file is excluded from tsconfig.json until 06-03 creates the modules.
// MCP pattern: single ZodObject outputSchema + dual content+structuredContent.

import { describe, expect, test } from 'vitest'

const GET_HEDGE_MODULE = '@/lib/mcp-tools/get-hedge-decisions'
const GET_MACRO_MODULE = '@/lib/mcp-tools/get-latest-macro-print'

describe.skip('get_hedge_decisions MCP tool — 06-03 (deferred RED)', () => {
  test('returns decisions as structuredContent with status "found"', async () => {
    // Un-skipped and implemented in Plan 06-03.
    // Expected: registerGetHedgeDecisions registers a tool that returns
    //   structuredContent.status === 'found' and structuredContent.decisions.length === 2
    const { registerGetHedgeDecisions } = (await import(GET_HEDGE_MODULE)) as {
      registerGetHedgeDecisions: (server: unknown) => void
    }
    expect(registerGetHedgeDecisions).toBeDefined()
  })

  test('uses single ZodObject outputSchema (not array/union)', async () => {
    // Un-skipped and implemented in Plan 06-03.
    // The MCP SDK normalizeObjectSchema requires a ZodObject, not ZodArray or ZodUnion.
    const { registerGetHedgeDecisions } = (await import(GET_HEDGE_MODULE)) as {
      registerGetHedgeDecisions: (server: unknown) => void
    }
    expect(registerGetHedgeDecisions).toBeDefined()
  })
})

describe.skip('get_latest_macro_print MCP tool — 06-03 (deferred RED)', () => {
  test('returns latest print as structuredContent with status "found"', async () => {
    // Un-skipped and implemented in Plan 06-03.
    // Expected: structuredContent.status === 'found', .print.scaledValue is a string
    //   (BigInt serialized for JSON) representing 568
    const { registerGetLatestMacroPrint } = (await import(GET_MACRO_MODULE)) as {
      registerGetLatestMacroPrint: (server: unknown) => void
    }
    expect(registerGetLatestMacroPrint).toBeDefined()
  })
})
