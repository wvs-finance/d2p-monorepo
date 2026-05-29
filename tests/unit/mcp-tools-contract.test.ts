// @vitest-environment node
// Wave 0 contract test — pure schema assertions, node env (no DOM).

import * as dashboardContract from '@/lib/dashboard/contract'
import {
  AppEntryOut,
  DashboardResponseSchema,
  IterationDetailOut,
  NotDeployedEnvelope,
  ResearchEntryOut,
  StatusResponseSchema,
  UnavailableEnvelope,
  dateToIso,
} from '@/lib/mcp-tools/contract'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

describe('canonical REST schemas (B3 single source of truth)', () => {
  it('extendZodWithOpenApi ran exactly once — z.string().openapi is a function', () => {
    // After importing dashboard/contract (the only extend site), z is extended.
    expect(typeof z.string().openapi).toBe('function')
  })

  it('DashboardResponseSchema parses a valid version:1 envelope', () => {
    expect(() =>
      DashboardResponseSchema.parse({
        version: 1,
        app: 'abrigo',
        status: 'ok',
        chains: [],
        fetchedAt: '2026-05-29T00:00:00.000Z',
      }),
    ).not.toThrow()
  })

  it('StatusResponseSchema parses a valid version:1 envelope', () => {
    expect(() =>
      StatusResponseSchema.parse({
        version: 1,
        status: 'ok',
        build: 'abc',
        timestamp: '2026-05-29T00:00:00.000Z',
        chains: [],
        apps: {},
      }),
    ).not.toThrow()
  })

  it('re-exported schemas are referentially identical to the dashboard/contract source (no re-declaration)', () => {
    expect(DashboardResponseSchema).toBe(dashboardContract.DashboardResponseSchema)
    expect(StatusResponseSchema).toBe(dashboardContract.StatusResponseSchema)
  })
})

describe('tool-only envelopes', () => {
  it('NotDeployedEnvelope parses with null terms/pool', () => {
    expect(() =>
      NotDeployedEnvelope.parse({
        status: 'not_deployed',
        instrument_id: 'x',
        chain: 'celo',
        terms: null,
        pool: null,
        note: '…',
      }),
    ).not.toThrow()
  })

  it('NotDeployedEnvelope FAILS when terms is a fabricated object (anti-fishing)', () => {
    expect(
      NotDeployedEnvelope.safeParse({
        status: 'not_deployed',
        instrument_id: 'x',
        chain: 'celo',
        terms: {},
        pool: null,
        note: '…',
      }).success,
    ).toBe(false)
  })

  it('UnavailableEnvelope parses', () => {
    expect(() =>
      UnavailableEnvelope.parse({ status: 'unavailable', app: 'abrigo', panel: 'p', note: '…' }),
    ).not.toThrow()
  })
})

describe('AppEntryOut (B2 — no fabricated description)', () => {
  it('parses without a description key', () => {
    expect(() =>
      AppEntryOut.parse({
        slug: 'abrigo',
        name: 'Abrigo',
        status: 'active',
        external_url: 'https://x.com/d2pfinabrigo',
      }),
    ).not.toThrow()
  })

  it('parses with optional description_key and null external_url', () => {
    expect(() =>
      AppEntryOut.parse({
        slug: 'abrigo',
        name: 'Abrigo',
        status: 'active',
        external_url: null,
        description_key: 'apps.abrigo.description',
      }),
    ).not.toThrow()
  })

  it('has NO `description` property in its shape', () => {
    expect(Object.keys(AppEntryOut.shape)).not.toContain('description')
  })
})

describe('ResearchEntryOut + date round-trip (B1)', () => {
  const base = {
    slug: 'pair-d-dispatch-brief',
    title_es: '…',
    title_en: '…',
    type: 'decision-memo' as const,
    track: 'abrigo-hedge-design' as const,
    authors: ['…'],
    summary_es: '…',
    summary_en: '…',
    external_url: 'https://github.com/…',
    arxiv_id: null,
  }

  it('parses with an ISO string date', () => {
    expect(() =>
      ResearchEntryOut.parse({ ...base, date: '2026-01-01T00:00:00.000Z' }),
    ).not.toThrow()
  })

  it('dateToIso normalizes a real Date to its ISO string and parse succeeds', () => {
    const iso = dateToIso(new Date('2026-04-30T00:00:00.000Z'))
    expect(iso).toBe('2026-04-30T00:00:00.000Z')
    expect(() => ResearchEntryOut.parse({ ...base, date: iso })).not.toThrow()
  })

  it('FAILS when a raw Date object is passed as date (boundary is real, not bypassed)', () => {
    expect(
      ResearchEntryOut.safeParse({ ...base, date: new Date('2026-04-30T00:00:00.000Z') }).success,
    ).toBe(false)
  })

  it('has NO beta/pValue/version/replication_hash/notebook_url keys', () => {
    const keys = Object.keys(ResearchEntryOut.shape)
    for (const banned of [
      'beta',
      'pValue',
      'p_value',
      'version',
      'replication_hash',
      'notebook_url',
    ]) {
      expect(keys).not.toContain(banned)
    }
  })
})

describe('IterationDetailOut', () => {
  it('extends ResearchEntryOut with a nullable body', () => {
    expect(() =>
      IterationDetailOut.parse({
        slug: 's',
        title_es: '…',
        title_en: '…',
        type: 'paper',
        track: 'cfmm-microstructure',
        date: '2026-01-01T00:00:00.000Z',
        authors: ['…'],
        summary_es: '…',
        summary_en: '…',
        external_url: null,
        arxiv_id: 'arxiv:1234',
        body: null,
      }),
    ).not.toThrow()
  })
})
