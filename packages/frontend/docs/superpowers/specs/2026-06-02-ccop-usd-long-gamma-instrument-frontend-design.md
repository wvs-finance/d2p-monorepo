# cCOP/USD Long-Gamma Instrument — Frontend Slice (Design)

**Date:** 2026-06-02
**Status:** Design — revised after two-step review (Reality Checker + Frontend Developer); pending user sign-off
**Module:** `apps/abrigo/instruments/ccop-usd-long-gamma`

---

## 0. Review resolution (what changed after review)

Both reviewers returned **NEEDS WORK**. Resolutions folded into this revision:

- **No fork-test export pipeline exists** and the fork numbers are **mock-pool test seeds, not
  market data.** Decision: values are **hand-authored** in the frontend, every one labeled
  **`fork-fixture` — "test-seeded mock pool, not market"**, citing `CcopUsdcPool.t.sol`. The
  `fork-verified` tier is removed. (RC B1/B2)
- **The convex payoff closed-form does not exist** and deriving it is a separate task. Decision:
  render an **explicitly-labeled schematic convex shape** ("schematic — not a contract-derived
  settlement function"); faithful derivation deferred to a later module. (RC M2 / FE M4)
- **Residual formula was wrong** (double-counted). Corrected to match the backend's own rule. (RC B3)
- **Wallet would falsely show `CONNECTED_READY`** on Base; **JSON-LD fabricated** strike/slope.
  Both fixed with variant-aware, read-only mechanisms. (FE B1/B2)
- **Base `PayoffDiagram` currently fails live verification** (0-height, contrast, hydration). Its
  fix is folded into the payoff-component rewrite — it is a **precondition** of this slice. (RC M1)
- Discriminated-union blast radius, `PoolStatePanel` adapter, bigint-as-string, GitBook/Velite
  collision, Phase-8 status accuracy, WCAG criteria, wave ordering — all addressed below.

## 1. Context

The d2p frontend is the DS2P Labs umbrella site. Phase 5 (read-first wallet + DeFi surface) is
mid-flight and ships a chain-scoped instrument-detail route
(`/apps/abrigo/instruments/[id]/[chain]`), `PayoffDiagram`, `InstrumentParams`, `PoolStatePanel`,
`RiskCallout`, `WalletPanel`, `InstrumentJsonLd`. The registry (`lib/apps/abrigo/instruments.ts`)
currently holds **one uncommitted temp fixture** (`fixture-celo-01`) and is otherwise empty — "no
Abrigo contracts deployed."

The `abrigo-somnia` prototype produced a **long-gamma cCOP/USD hedge** on borrowed Panoptic V2
contracts, validated on a **Base fork** against a **self-deployed MockCcop/USDC Uniswap V4 pool**
(Phase 7 — COMPLETE). The cash-flow wrapper is **Phase 8 — partially built** (open path
`deposit`/`mintLong` is fork-green; the close path `recordStreamia`/`syncSurviving`/`burnLong`/
`claimResidual` reverts "not impl"); the metered data-cost is **Phase 9 — unbuilt**.

This slice extends the Phase-5 DeFi surface to represent that instrument as a **read-first,
simulated, honestly-labeled** surface — no live deployment, no transact path. It is **module 1** of
a piece-by-piece build; the Somnia agent-payment (K_AI) leg is a separate later module.

## 2. Goal & success criteria

A visitor (human or agent) on the cCOP/USD long-gamma page can:

1. See an **explicitly-labeled schematic convex payoff** ("schematic — not a contract-derived
   settlement function"), conveying positive-gamma shape — **not** the current piecewise-linear put.
2. Read the **premium → (informational: streamia, commission already netted) → metered data-cost →
   residual-claim** cash-flow, with each value's status (`spec` / `pre-deploy`) marked.
3. See the **Panoptic-V2 fork-test parameters** (chunk strike, width, tickSpacing, pair, fork block)
   labeled **`fork-fixture` — test-seeded mock pool, not market**.
4. Never be misled: a **SIMULADO / SIMULATED** badge above the fold; every number carries a
   provenance pill; unknowns are em-dash (never 0); the wallet shows a **read-only** state that
   cannot read `CONNECTED_READY`; no transact affordance; no fabricated numbers in JSON-LD.
5. Read it in **es-CO and en**, pass **axe WCAG 2.2 AA** (named criteria in §9), and survive
   **Evidence Collector live verification**.

A GitBook documentation page for the module is published from the repo.

## 3. Provenance tiers (the central honesty mechanism)

Every displayed value is tagged with exactly one tier; pills always encode **color + icon + text**
(+ an `aria-label` carrying the full provenance sentence):

| Tier | Meaning | Applies to |
|------|---------|-----------|
| `fork-fixture` | **Test-seeded mock pool, not market data.** Hand-authored from `CcopUsdcPool.t.sol`. | rate, tickSpacing, seeded liquidity, chunk strike/width, fork block |
| `spec` | Specified in abrigo-somnia ROADMAP / Phase-8 plans; **not yet on-chain** (close path unbuilt; data-cost is Phase 9). | streamia, commission, data-cost, residual |
| `schematic` | **Illustrative shape, not a contract-derived function.** | the payoff curve |

The page-level **SIMULADO** badge sits next to `RiskCallout`, above the fold at 360px. There is no
`fork-verified` tier — nothing here is a verified market or on-chain read.

## 4. Architecture (modules within this slice)

```
lib/apps/abrigo/
  fixture.ts           NEW — hand-authored, provenance-tagged values (fork-fixture + spec tiers)
  instruments.ts       EXTEND — discriminated union; remove temp fixture; +1 simulated entry
  payoff.ts            EXTEND — add a `schematic` convex generator returning PayoffPoint[]
  cashflow.ts          NEW — backend-correct cash-flow (spec tier; residual ≠ double-count)

components/defi/
  PayoffDiagram.tsx    EXTEND — accept PayoffPoint[] + ref props; FIX 0-height/contrast/hydration;
                       schematic curve (type="monotone"/dense sampling); curve-aware sr-only table
  CashFlowWaterfall.tsx NEW — premium + informational reads + residual; spec-tier pills; no card-in-card
  ProvenanceBadge.tsx  NEW — SIMULADO badge + reusable per-field pill (fork-fixture/spec/schematic)
  SnapshotPoolPanel.tsx NEW — fork-fixture pool fields (rate/tickSpacing/liquidity) w/ provenance
  InstrumentParams.tsx EXTEND — variant-aware; Panoptic params + per-row provenance
  InstrumentJsonLd.tsx EXTEND — variant-aware; simulated branch emits provenance + simulated:true,
                       NO fabricated strike/slope/address
  WalletPanel.tsx      EXTEND — `readOnly` prop forces a read-only state (no switch CTA, no READY)

lib/wallet/state.ts    EXTEND — read-only/simulated path that cannot resolve CONNECTED_READY

app/(defi)/apps/abrigo/instruments/[id]/[chain]/page.tsx
                       EXTEND — branch on `simulated` BEFORE aggregateAllChains/getInstrumentPoolState
                       (never pass a simulated entry to the multicall); narrow union at every
                       strike/slope/address read; mount SIMULADO badge + CashFlowWaterfall +
                       SnapshotPoolPanel; pass WalletPanel readOnly

docs/book/             NEW — GitBook root (.gitbook.yaml + SUMMARY.md), excluded from Velite/prebuild
  apps/abrigo/instruments/ccop-usd-long-gamma.md   NEW — module doc page
```

### 4.1 Fixture data — `fixture.ts`

Hand-authored, **dated**, provenance-tagged. On-chain integer quantities are **bigint-as-string**
(no JS `number` for ticks/liquidity — precision); `number` only for derived display ratios.

```ts
export interface FixtureValue<T> {
  value: T
  tier: 'fork-fixture' | 'spec'
  source: string        // e.g. "CcopUsdcPool.t.sol L74–91" or "08-RESEARCH §residual"
  note?: string         // e.g. "author-chosen seed; ordering sanity check, not a market rate"
}

export interface LongGammaFixture {
  capturedFrom: string  // "abrigo-somnia Phase-7 fork tests @ <commit>"
  forkBlock: FixtureValue<string>          // "46700000" (Base) — fork-fixture
  pair: { token0: string; token1: string } // "MockCcop" / "USDC"
  pool: {
    humanRate: FixtureValue<number>        // ≈4000, note: synthetic seed, not market
    tickSpacing: FixtureValue<string>      // "10"
    seededLiquidity: FixtureValue<string>  // bigint as string
  }
  chunk: {
    strike: FixtureValue<string>           // tick value as string; note: +2000-offset fork artifact
    width: FixtureValue<string>            // "2"; note: width=2 to clear InvalidTickBound
  }
  cashflow: {                              // all `spec` tier
    premium: FixtureValue<number>
    streamia: FixtureValue<number>         // informational — already netted into surviving
    commission: FixtureValue<number>       // informational — already netted into surviving
    dataCost: FixtureValue<number>         // Phase-9 unbuilt → may be em-dash
  }
}
```

Each value's `note` makes the fork-test-artifact nature explicit (mock token, synthetic seed,
tick-alignment offsets). No value is presented as a market or verified on-chain read.

### 4.2 Registry — `instruments.ts` (discriminated union)

`AbrigoInstrument` becomes a discriminated union on a `kind` field:

```ts
type AbrigoInstrument =
  | { kind: 'live'; id; name; nameEn; chainId; address; deployedAt; strike; slope }   // existing shape
  | { kind: 'simulated'; id; name; nameEn; chainId; fixtureKey; /* no address/strike/slope */ }
```

- Remove the uncommitted `fixture-celo-01` temp fixture.
- Add one `kind: 'simulated'` entry: `id: 'ccop-usd-long-gamma'`, `chainId: 8453`,
  `fixtureKey: 'ccop-usd-long-gamma'`.
- **Every call site that reads `strike`/`slope`/`address`/`deployedAt` must narrow on `kind`
  first** (enumerated, all must compile under the `tsc` pre-commit gate):
  - `page.tsx` — the `find()` lookup; `currentPrice = instrument.strike` (line 116); the
    `PayoffDiagramClient` call (lines 150–155); `generateMetadata` (id/name/chainId only — safe).
  - `InstrumentParams.tsx` — strike/slope rows → variant-aware.
  - `InstrumentJsonLd.tsx` — see §5.
  For a simulated entry: `address`/`deployedAt` render em-dash or the fork block; never undefined,
  never fabricated.

### 4.3 Payoff — `payoff.ts` (schematic)

`payoff.ts` already returns `PayoffPoint[]`. Add a **schematic** convex generator (positive-gamma
shape — a smooth convex curve net of premium) that returns `PayoffPoint[]`, and **clearly mark its
output as schematic** at the component layer. The existing linear-put generator stays for `live`
instruments. The faithful Panoptic-V2 closed-form is **explicitly deferred** to a later module
(its own derivation + Solidity review). No claim that the schematic is a settlement function.

### 4.4 Cash-flow — `cashflow.ts` (backend-correct)

Per `08-RESEARCH` + `LongGammaWrapper.claimResidual` NatSpec: **surviving collateral is already net
of streamia + commission** (the pool's share-burn nets them). Therefore:

```
residual = max(survivingCollateral − wrapperMeteredDataCost, 0)
```

- `streamia` and `commission` are shown as **informational reads**, NOT as residual subtractions.
- `wrapperMeteredDataCost` is **Phase 9 — unbuilt** → `spec` tier, em-dash until it exists.
- All values `spec` tier. Source cited as `08-RESEARCH §residual` (NOT `MATH.md`, a sketch).

## 5. Components (key mechanics)

- **`PayoffDiagram`** — new props: `data: PayoffPoint[]`, `strikeRef?: number`,
  `currentPriceRef?: number`, `ariaLabel: string` (plain serializable values — cross the
  RSC→`PayoffDiagramClient`→dynamic boundary like the existing `t.raw` discipline). **Fix the
  05-04 BLOCKER:** keep a *resolved* fixed `h-*` parent (0-height bug), raise the curve stroke to a
  token meeting **4.5:1** (current 3.44:1 fail), eliminate the hydration #418 mismatch. Use
  `type="monotone"` and/or dense sampling near curvature so the convex shape doesn't read as
  linear. Curve-aware sr-only table (sampled points, not a single kink). Labeled **schematic**.
- **`CashFlowWaterfall`** (new) — `<dl>` of: premium (deposit) → informational streamia/commission
  (marked "already netted") → metered data-cost (em-dash, Phase-9) → residual. Spec-tier pill on
  the section header; em-dash for unknowns; no card-in-card; reading order correct (WCAG 1.3.2).
- **`ProvenanceBadge`** (new) — page-level SIMULADO badge + reusable per-field pill for
  `fork-fixture`/`spec`/`schematic`; color + icon + text; `aria-label` = full provenance sentence;
  non-text contrast ≥3:1 (WCAG 1.4.11).
- **`SnapshotPoolPanel`** (new, replaces "reuse PoolStatePanel") — renders the fork-fixture pool
  fields (humanRate, tickSpacing, seededLiquidity) each with a provenance pill. `PoolStatePanel`
  (live `InstrumentState`) is left untouched for `live` instruments; no wrong-field shoehorning.
- **`InstrumentParams`** — variant-aware; for simulated, Panoptic params with per-row provenance and
  "fork-test parameters" copy; chain row (8453) co-located with the fork-block qualifier, never a
  bare "Base".
- **`InstrumentJsonLd`** — variant-aware; the simulated branch emits `simulated: true` + provenance
  and **no `strike`/`slope`/`address`** (no fabricated numerics in the agent surface).
- **`WalletPanel` / `lib/wallet/state.ts`** — add a `readOnly` path: a dedicated read-only status
  (pill + "sin transacción — fork simulado" / "no transactions — simulated fork"), **no
  switch-network CTA**, and it **cannot resolve `CONNECTED_READY`**. The detail page passes
  `readOnly` for simulated instruments.
- **Detail page** — branch on `kind === 'simulated'` **before** any aggregator call; build pool
  display from `fixture.ts` via `SnapshotPoolPanel`; a simulated entry is **never** passed to
  `aggregateAllChains`/`getInstrumentPoolState`/the multicall path; mount SIMULADO badge +
  `CashFlowWaterfall`; pass `WalletPanel readOnly`.

## 6. Honesty / anti-fishing (non-negotiable)

- SIMULADO badge above the fold; copy: "Base fork — mock pool, sin despliegue."
- Three tiers (§3); **no `fork-verified`**. `fork-fixture` copy states the pool + token are mocks
  and the rate is a synthetic seed.
- `chainId: 8453` reused only for viem/wagmi compatibility; **always** co-located with the
  fork-block qualifier + provenance; never rendered as a bare live "Base" fact; wallet read-only.
- Every number shows its tier; unknowns em-dash, never 0.
- Payoff labeled schematic; cash-flow shows streamia/commission as informational (not subtracted).
- No transact button. Failure/uncertainty at equal visual weight.

## 7. i18n

- es-CO first, en second; no machine translation. **Native-reviewer sign-off in
  `docs/copy-review.md` is a blocking sub-task before the route ships.**
- Enumerate new `instruments` keys: `simulated.badge`, `provenance.fork_fixture`,
  `provenance.spec`, `provenance.schematic`, `cashflow.{premium,streamia,commission,data_cost,
  residual,already_netted}`, `params.{chunk_strike,width,tick_spacing,pair,fork_block}`,
  `wallet.read_only_*`. Avoid reusing `params.strike`/`params.slope` for the simulated variant.

## 8. GitBook documentation

- `.gitbook.yaml` at repo root: `root: ./docs/book/`, `structure: { readme: README.md,
  summary: SUMMARY.md }`. **Verify `docs/book/` is excluded from Velite globbing
  (`velite.config.ts`) and does not perturb the `prebuild`/Next build** (CLAUDE.md).
- `docs/book/SUMMARY.md` + `docs/book/apps/abrigo/instruments/ccop-usd-long-gamma.md` — module page:
  what the instrument is, the three tiers, the schematic payoff, the corrected cash-flow, the
  fork-only/mock caveat, link to the live route.
- Internal `docs/superpowers/` stays OUT of the GitBook root.

## 9. Testing & verification

- **Precondition:** the 05-04 `PayoffDiagram` render failures (0-height, 3.44:1 contrast, hydration
  #418) are fixed as part of §5 — this slice does not ship on a chart that doesn't paint.
- Unit: schematic payoff (convex/monotone curvature, premium shift), `cashflow.ts` residual
  arithmetic (asserts streamia/commission are NOT subtracted), fixture type-guards (bigint-string).
- Component render test: payoff curve paints, cash-flow waterfall, SIMULADO badge, provenance pills.
- e2e (Playwright): route renders SIMULADO + waterfall + payoff in both locales; wallet shows
  read-only state (never `CONNECTED_READY`).
- a11y (axe + manual): WCAG **1.3.2** (waterfall reading order), **1.4.1** (pills color+icon+text),
  **1.4.11** (pill/icon non-text contrast), **1.4.3** (curve stroke 4.5:1).
- **Evidence Collector live verification** after commit (CLAUDE.md mandatory): each claim vs. DOM +
  screenshots, including that no fabricated numbers appear and the wallet never reads ready.

## 10. Out of scope (this module)

- Live transact / write path. The Somnia agent-payment (K_AI) leg.
- The **faithful** Panoptic-V2 payoff closed-form (deferred — later module, own math review).
- A fork-state **export script** in abrigo-somnia (deferred; values hand-authored for now).
- Phase-8 close-path / Phase-9 data-cost live reads. Multi-instrument / multi-chain.
- Editing any abrigo-somnia contract (backend locked).

## 11. Wave order (data freezes before consumers)

1. `fixture.ts` shape + `payoff.ts` schematic generator + `cashflow.ts` + the `instruments.ts`
   union — land and pass unit tests; **freeze the data shapes and the union discriminant first**.
2. Component EXTEND/NEW (PayoffDiagram fix + CashFlowWaterfall + ProvenanceBadge + SnapshotPoolPanel
   + InstrumentParams/JsonLd/WalletPanel variants).
3. Detail-page branch + i18n keys + GitBook page.
4. Tests green → commit → Evidence Collector live verification.

## 12. Open items for planning

1. **GSD mapping** — new sub-plan in Phase 5 (`05-05`) or new decimal phase (`05.1`). Decide with
   user at planning time.
2. **GitBook README** — new `docs/book/README.md` vs. reuse existing content.
3. Confirm the in-flight 05-04 checkpoint state is reconciled before/within this slice.

## 13. Process

Per the project two-step reviewer rule, this **revised** spec re-enters review only if the user
requests it; otherwise it proceeds to user sign-off, then GSD planning (`/gsd:plan-phase` or
sub-plan) — not a standalone plan. The original review found NEEDS WORK; all BLOCKERs/MAJORs are
resolved above or explicitly deferred to out-of-scope with a recorded dependency.
