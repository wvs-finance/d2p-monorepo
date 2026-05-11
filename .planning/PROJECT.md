# WVS Finance Frontend (d2p/frontend)

## What This Is

The public-facing web surface for **WVS Finance / DS2P Labs** — a research lab that designs and ships permissionless convex-hedge instruments on EVM ecosystems, targeting macro-risk exposure for wage earners in frontier and emerging markets (Colombia as the first empirical case). The frontend serves four overlapping audiences from a single application: external researchers and developers exploring the lab's outputs, protocol participants interacting with live hedging instruments (the **Abrigo** family), AI agents that need programmatic and conversational access to protocol state, and the internal team monitoring iteration status across the research pipeline.

This is the FIRST UI for the org — there is no prior frontend in production. The codebase lives at `~/apps/d2p/frontend/` as a sibling of `~/apps/d2p/abrigo/` (the empirical-validation half).

## Core Value

**Make the lab's research outputs and live hedging instruments accessible — to humans browsing, to participants transacting, and to AI agents consuming — through a single coherent surface that treats agent-first interaction as a primary design constraint, not an afterthought.**

If everything else fails, this must work: an agent or a human can land on the site, understand what Abrigo is, see the current state of every (Y, M, X) iteration, and either interact with a deployed instrument or read the structural evidence that justifies it.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Public research-lab presence: lab story, mission, links to org repos, team
- [ ] Abrigo instrument catalog: every (Y, M, X) iteration with status (PASS / FAIL / PARKED / IN PROGRESS), structural evidence summary, links to notebooks
- [ ] Live protocol dashboard: deployed contracts, pool state, LP positions, settlement status across chains
- [ ] Econometric results surface: charts, β estimates, confidence intervals, sensitivity bands sourced from `abrigo-analytics`
- [ ] Agent-accessible API + tool surface: structured endpoints + an MCP server (or equivalent) so AI agents can query iteration state, instrument terms, and on-chain positions
- [ ] Conversational interface: a chat shell that lets users ask "what is Pair D?" / "what's the current COP/USD hedge?" and get grounded answers from the lab's own corpus
- [ ] Wallet connection + transact path for deployed instruments (read-first; transact gated behind explicit safety review)
- [ ] Vercel-hosted deployment with preview environments per PR
- [ ] Design system grounded in `impeccable` skill + `design-os` process (no SaaS-template slop). **Style reference:** https://panoptic.xyz/ (structure / typography / spacing only — NOT colors). **Color anchor:** the wvs-finance ∂²Π logo (https://avatars.githubusercontent.com/u/243258665) — monochrome ink-on-cream academic-math register; one accent to be chosen in Phase 2 `/gsd:ui-phase` from the candidate palette (ink-blue / muted-ochre / forest / burgundy)
- [ ] Responsive: works on phone (frontier-market users are mobile-first), tablet, and desktop
- [ ] Accessible (WCAG 2.2 AA) and i18n-ready (Spanish + English at minimum — Colombian users are first-class)

### Out of Scope

- Mobile native apps (iOS/Android) — web-first, defer native to later milestone
- DEX aggregator / general trading UI — this is a hedging-instrument surface, not a swap router
- Custodial features (account creation, KYC, fiat on-ramps) — protocol is permissionless; off-ramp/on-ramp is out of band
- Speculative leverage products — explicit anti-feature; the lab targets hedging, not leverage seekers
- Email/notification infrastructure (transactional emails, marketing) — defer
- Admin / governance UI (parameter changes, multisig) — deferred to later milestone
- Heavy 3D / WebGL hero animations — counter to `impeccable` anti-patterns
- Server-side rendering of trading state — wallet state is client-only

## Context

**Organizational context:**
- WVS Finance org on GitHub: https://github.com/wvs-finance (12 repos, public + private)
- Parent: DS2P (Data + Domain to Protocol) Labs
- Core thesis: convex hedges for wage-earner macro risks that block the wage→capital transition, validated through structural econometrics before deployment
- Anti-fishing discipline: pre-committed specs, decision-citation blocks, HALT-on-spec-conflict — this culture must show through in the UI's epistemic honesty (show failures as prominently as successes)

**Technical ecosystem to surface:**
- `ThetaSwap-core` (Angstrom) — Rust protocol core
- `reactive-hooks` — Uniswap v4 cross-chain event hooks
- `clamm-squared`, `gammaDEX`, `typed-uniswap-v4` — protocol variants
- `abrigo-analytics` — Python + notebooks producing the structural evidence
- `cfmm-lean` — Lean 4 formalization of CFMM theory
- `lps-econometrics`, `volume-soldk`, `liq-soldk`, `ts-cli` — SDKs and analytics

**Design inspiration / tooling:**
- `pbakaus/impeccable` — frontend design skill with 23 commands, 7 reference domains (typography, color, motion, spatial, interaction, responsive, UX writing), 27 deterministic anti-pattern rules
- `buildermethods/design-os` — guided design-process tool (product planning → design system → section design → export)
- These will inform the design system; we do not vendor them, we use them as authoring tools

**Hosting and ops:**
- Vercel is the assumed deployment target; alternatives (Cloudflare Pages, Netlify, self-hosted) to be evaluated by research phase
- Preview deployments per PR are expected
- Live data sources: on-chain RPCs (Celo first, then other EVM chains), HuggingFace dataset for econometric panels, potentially a thin BFF for caching/aggregation

**Empirical state (snapshot from `abrigo-analytics` README):**
- Pair D iteration: **PASS** (β = +0.137, p ≈ 1.5×10⁻⁸) — Colombian young-worker services × COP/USD lagged 6-12mo
- dev-AI Stage-1: in progress (Section J × COP/USD)
- FX-vol-on-CPI-surprise: **CLOSED FAIL** — retained as worked-example of disciplined failure
- Phase-A.0 remittance: **CLOSED EXIT_NON_REMITTANCE**
- P1 Bittensor SN18: **PARKED**
- The UI must render these states with equal narrative weight — passing and failing iterations are both scientific output

**Agent-first observation (from user):**
The user explicitly questions whether traditional web UI is the right primary surface in 2026, given that AI agents now mediate much of how technical/financial information is consumed. The answer chosen: build for **all four user types simultaneously** — humans browsing, participants transacting, agents querying, internal team monitoring — with the architecture leaning toward agent-accessibility as a primary constraint (structured data, MCP/tool surfaces, semantic markup, predictable URLs).

## Constraints

- **Tech stack**: Vercel-deployable (Next.js most likely, alternatives in research) — narrows server-component / streaming options
- **Performance**: Mobile-first frontier-market users — assume 3G connections at p50, must keep LCP under 2.5s on mid-range Android
- **Compatibility**: EVM wallets via standard connectors (RainbowKit / wagmi / viem class) — no proprietary wallet integrations
- **Security**: Read-first; any transact path requires explicit threat-model review before exposing (protocol funds are real)
- **i18n**: Spanish (Colombian) and English at launch; copy must be authorable in both without retrofitting
- **Accessibility**: WCAG 2.2 AA — non-negotiable for a frontier-market public good
- **Design discipline**: Apply `impeccable` anti-pattern rules — no Inter-for-everything, no purple-to-blue gradients, no card-nested-in-card, no gray-on-color text
- **Epistemic honesty**: Failures (FAIL / PARKED iterations) must render with the same visual weight as passes; no marketing-style success-selection
- **Deadline awareness**: From user memory — Proof of Ship MVP ~May 2 (already past), Uniswap Hook Incubator Cohort 9 Hookathon ~June 2 (~3 weeks out) — first milestone must align with hackathon demo readiness

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build a single coherent surface for all four user types (researcher / participant / agent / internal) rather than separate sites | User explicitly chose "all of the above" — splitting now means three sites to maintain with no shared design system or data layer | — Pending |
| Treat agent-accessibility as a first-class design constraint, not a documentation afterthought | User's instinct that "perhaps not much people are accessing the web interfaces like the way it was done before" — agent surfaces (MCP, structured data, predictable URLs) inform IA and routing | — Pending |
| Vercel as default deployment target; revisit during research phase | User stated; matches Next.js ecosystem assumption and preview-per-PR workflow | — Pending |
| Use `impeccable` skill + `design-os` process as authoring tools, not vendored libraries | Both are design-process aids that output project-owned artifacts; vendoring would lock us to their release cadence | — Pending |
| Borrow style/structure from panoptic.xyz; lock palette to the ∂²Π logo's academic-math register (cream + ink + one muted accent) | Panoptic gets the DeFi-volatility-derivatives editorial register right; the ∂²Π logo IS the brand and IS the product (gamma = second partial derivative of payoff) — palette must honor it, not fight it | — Pending |
| Accent color decision deferred to Phase 2 `/gsd:ui-phase` | Candidates: ink-blue / muted-ochre / forest / burgundy — all academic-register, all impeccable-compatible. Picking now would short-circuit the UI-SPEC process | — Pending |
| Phase 2 begins with `/gsd:ui-phase 2` (UI-SPEC contract) BEFORE `/gsd:plan-phase 2` | Lab presence + iteration catalog is the first real UI work; design-os outputs and panoptic-derived tokens must be specified before plans are written | — Pending |
| Render passes and failures with equal weight | Mirrors the lab's anti-fishing discipline — selecting only passes would betray the science | — Pending |
| Spanish + English at launch, mobile-first, WCAG 2.2 AA | Frontier-market wage earners are the lab's stated beneficiaries; designing English-desktop-first would exclude them | — Pending |

---
*Last updated: 2026-05-11 after initialization*
