# Feature Research

**Domain:** Agent-first DeFi research-lab frontend (hedging instruments, empirical finance, frontier markets)
**Researched:** 2026-05-11
**Confidence:** HIGH for table stakes and anti-features; MEDIUM for agent-surface specifics (MCP hosting patterns still maturing); LOW for RAG conversational shell (protocol-state grounding is novel territory)

---

## Constraints That Apply to Every Feature

Mobile-first, i18n (es-CO + en), and WCAG 2.2 AA are not features — they are delivery constraints that every feature must satisfy. They are called out here once so they are not listed again per-feature, but they must appear in every phase's acceptance criteria. Colombian mobile users are on mid-range Android with 3G at p50; every feature must remain usable at that baseline.

---

## Audience 1: Research-Lab Presence

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Lab homepage with mission and "what is Abrigo" explainer | Any visitor landing here has no prior context; without a clear explainer the site is incomprehensible | S | Must be readable without JS (static, SSG). Needs es-CO and en copy at launch. Agent-readable: plain semantic HTML + JSON-LD `ResearchOrganization`. |
| Team / contributor profiles linked to GitHub | Researchers and developers expect to verify the humans behind a lab; anonymous labs have no credibility | S | Pull from GitHub API or static YAML. No profile photos required at v1 — name, role, GitHub handle, key contributions are enough. |
| Publications page (papers, write-ups, decision memos) | Labs publish; visitors expect to find the outputs in one place | M | Source from `scratch/` directory in repo. Each document needs a stable, content-addressable URL (`/research/fx-vol-on-cpi-surprise`). Must list decision memos alongside papers — hiding the reasoning documents would betray the lab's discipline. PDF and HTML formats. |
| Org repository index | Developers expect to find the code; linking out to GitHub org is the minimum | S | Static list with brief descriptions. Can be generated from GitHub API. `wvs-finance` org has 12 repos — each should have a one-liner. |
| "What is Abrigo" dedicated explainer | The instrument family is the lab's core output; it needs its own explainer that doesn't assume DeFi or econometrics background | M | Separate from homepage. Needs payoff diagram, plain-language description, and clear disclaimer that this is hedging not leverage. Prerequisite to all audience-2 features. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Decision memo archive with HALT and FAIL citations | No other DeFi lab shows its reasoning trail. Publishing pre-committed specs and failure decisions signals anti-fishing discipline — this is the core credibility signal | M | Each memo must link forward to the iteration it spawned and backward to any predecessor memo. Not a blog; these are structured documents with iteration ID, date, disposition. |
| Pre-registration evidence surface | Shows that hypotheses were committed before data was seen; directly addresses the replication crisis concern that plagues DeFi "research" | M | Display preregistration hash + date alongside iteration results. Source from `make verify` Tier 1/2/3 hashes. |
| Press / talks / cohort page | Uniswap Hook Incubator Cohort 9 is actively in progress; Proof of Ship participation needs to be surfaced | S | Simple chronological list. Do not inflate with "press coverage" that does not exist. If the list is short, keep it short — an honest short list is better than a padded one. |

### Deferred (not MVP)

- Newsletter / RSS for new iterations: defer. The agent webhook feed (audience 3) covers the programmatic use case. A newsletter requires email infrastructure, unsubscribe handling, and GDPR/CASL/Colombian data-protection compliance — XL cost for unclear v1 return. Add when there are subscribers to justify it.

---

## Audience 2: Instrument Catalog and Dashboards

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| (Y, M, X) iteration catalog — every iteration with status | This is the lab's primary empirical output; without a complete catalog the site cannot fulfill its core purpose | M | Must include ALL iterations regardless of status: PASS, FAIL, PARKED, IN PROGRESS, CLOSED EXIT. Equal visual weight is non-negotiable. Status badge must be a first-class visual element, not a footnote. |
| Per-iteration detail page: spec → data → estimation → tests → disposition | Researchers and agents need the full evidence chain, not just the verdict | L | URL pattern: `/iterations/{slug}/v{n}`. Each section must be linkable by anchor. Must include: pair definition, sample period, β estimate, p-value, confidence interval, sensitivity bands, sample size, replication hash, linked notebook. |
| "Honest failure" rendering: FAIL / EXIT / PARKED as prominent as PASS | The lab's stated discipline; any asymmetry would be a credibility failure | M | FAIL iterations get the same card weight, same detail page depth, same chart treatment as PASS. The only difference is the status badge. Color: use neutral status semantics — not green/red which implies good/bad in a moral sense. Use lab-specific terminology (PASS / FAIL / PARKED / IN PROGRESS) consistently. |
| β estimate + confidence interval display | Econometrics literacy users (researchers, agents) expect to see the actual numbers, not just a verdict | M | Display: point estimate, 95% CI, p-value, sample size, estimation method. Source from `abrigo-analytics` output. Chart: coefficient plot with error bars. Do not round aggressively — show the precision the data supports. |
| Replication evidence (Tier 1/2/3 hashes from `make verify`) | Source of truth verification is a differentiator that also functions as table stakes for any serious researcher | M | Show hash + timestamp + tier alongside each result. Link to the verification notebook. "Verified" is not a marketing badge; it is a cryptographic assertion. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Historical β trajectory charts across iterations | No other DeFi protocol shows how its empirical estimates evolved over time. This makes the research process visible — a signal of genuine scientific practice | L | Line chart: β over iteration version, with CI bands. Shows whether the signal is stable or drifting. Source from all versioned iterations in the catalog. |
| Live on-chain dashboards: contracts, pool state, LP positions, settlement events | Connects the empirical research to actual deployed capital — makes the lab's claims falsifiable in real time | XL | Depends on wallet-connect infra (audience 4, read-only path). Data sources: Celo RPC + event indexer. Render current pool state, LP positions, recent settlement events. Must degrade gracefully when RPC is unavailable — show last-known state + staleness timestamp. |
| Cross-chain settlement view | Celo is live; other EVM chains may follow. A unified view across chains is rare and useful | XL | Post-Celo. Design the data model to be chain-agnostic from day one so the XL work is additive, not a rewrite. |
| Sensitivity band visualization | Shows how β estimate changes under alternative assumptions — gives researchers insight into robustness | L | Requires `abrigo-analytics` to export sensitivity sweep results. Fan chart or alternative-specification overlay. |
| Per-iteration link to notebooks | Directly connects published result to reproducible code — uncommon in DeFi, standard in good academic practice | S | Static links to GitHub-hosted notebooks. If notebooks are on HuggingFace, link there. |

### Deferred (not MVP)

- Cross-chain settlement view: start with Celo only; cross-chain is additive once the single-chain path works.
- Full LP position management: read-first views are MVP; write flows require separate threat-model review.

---

## Audience 3: Agent Surface

This audience is treated as first-class, not documentation-afterthought. The implication: structured data, predictable URLs, and tool endpoints must be designed BEFORE the visual layer, not retrofitted after.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Predictable, content-addressable URLs | Agents and researchers cite URLs; unpredictable URLs (UUIDs, query params) break citations and make crawling fragile | S | Pattern: `/iterations/{pair-slug}/v{n}`, `/instruments/{instrument-id}/{chain}`, `/research/{doc-slug}`. No session-dependent or JavaScript-gated content for any data that should be agent-accessible. |
| JSON-LD structured data per page | Google AI Overviews and LLM crawlers preferentially cite pages with structured semantic data; pages without it will be invisible to AI-mediated discovery | M | Use `ResearchOrganization`, `ScholarlyArticle`, `Dataset`, `FinancialProduct` schema types as applicable. Embed in `<script type="application/ld+json">` — does not touch frontend templates. Implement from page one, not as a retrofit. |
| `llms.txt` + `.well-known/` files | Emerging standard (2025-2026) for signaling to LLM crawlers what is authoritative content. Costs almost nothing; signals seriousness | S | `llms.txt` at root: index of key documents, their purposes, and the canonical URL pattern. `.well-known/mcp` if hosting an MCP server. |
| OpenAPI spec for all data endpoints | Any structured API without a machine-readable spec is undiscoverable to agents and developers | M | Auto-generate from route definitions (tRPC / Zod / OpenAPI 3.1). Publish at `/api/openapi.json`. Cover: iteration list, iteration detail, instrument terms, pool state, panel query. |
| MCP server: `list_iterations`, `get_iteration_state`, `get_instrument_terms`, `get_pool_state` | These are the four tools an agent needs to answer "what is the current state of Abrigo?" — they are the minimum viable agent surface | L | Hosted MCP server (not just a spec). Implement as a thin wrapper over the same data layer that powers the frontend. Authentication: read-only endpoints are public; no auth required for public data. OAuth 2.1 for any write or private paths. |
| Structured iteration data as machine-readable JSON | Agents that cannot parse HTML need raw JSON. Every iteration detail page should have a `?format=json` or `/api/` equivalent | M | Mirrors the HTML detail page structure. Include all fields: pair, vintage, status, β, CI, p-value, sample size, hashes, links. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| MCP tool: `query_econometric_panel` | Allows agents to run structured queries over the econometric dataset — goes beyond status lookups to actual research queries. Uncommon in DeFi contexts | XL | Requires HuggingFace dataset access or a thin BFF query layer. Must return structured results, not prose. Must cite the source dataset in every response. |
| Conversational chat shell grounded in lab corpus | A chat interface that can answer "what is Pair D?" without hallucinating — grounded in the actual papers, memos, and on-chain state | XL | RAG over docs + on-chain state. The key constraint: the chat shell must show its sources for every claim and must explicitly refuse to speculate about on-chain state it cannot verify. "I don't know" is better than a confident wrong answer. Defer to post-MVP if grounding quality cannot be validated before launch. |
| Webhook / event feed for new iteration verdicts | Agents and developers can subscribe to get notified when a new PASS/FAIL/PARKED verdict is issued — rare for a research lab | L | Simple webhook endpoint + event schema. Can be a thin Vercel serverless function publishing to a queue. Schema: `{iteration_id, verdict, timestamp, evidence_url}`. |
| `query_econometric_panel` with citation outputs | Every tool response includes the data source hash and notebook link — grounded, citable results for downstream agents | M | Build citation into the response schema from day one. Retrofitting this is painful. |

### Deferred (not MVP)

- Conversational chat shell: defer until a grounding validation process exists. Shipping an ungrounded chat shell that halluccinates protocol state would be worse than not having one. Implement after the RAG pipeline can be evaluated against known-correct answers.
- Webhook feed: defer to v1.x; implement once there are subscribers.

---

## Audience 4: Participant / Transact

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Read-first instrument views without wallet connect | Wallet connect should be optional for browsing. Gating information behind connect is a DeFi anti-pattern that excludes the majority of visitors who want to understand before committing | S | All instrument parameters, payoff diagrams, pool state, and participant data must be visible without connecting a wallet. Connect only gates write actions. |
| Per-instrument: parameters, payoff diagram, current state | Participants need to understand what they are doing before they do it. Payoff diagram is the minimum viable risk communication | M | Payoff diagram: static SVG or Canvas rendering of payoff at expiry across FX outcomes. Parameters: notional, strike, maturity, settlement token, chain. Current state: pool TVL, current β, last settlement. |
| Wallet connect (multi-chain, mobile-friendly) | Expected by any DeFi participant | M | Use wagmi + viem + RainbowKit or equivalent. Support at minimum: MetaMask, WalletConnect v2, Coinbase Wallet. Mobile: WalletConnect deep links. Celo first; chain-agnostic architecture from day one. |
| Risk disclosure surfaces | Hedging instruments carry real financial risk. Regulatory and ethical obligation to disclose before any transact path | M | Plain-language disclosures in both es-CO and en. Must appear before any deposit/mint/redeem action, not buried in footer. Explicit "this is hedging, not leverage" language. Link to the decision memos that justify the instrument design. Not a legal waiver — a genuine explanation. |
| Transaction history per address | Participants expect to see their own history | M | Read from chain: filter settlement and LP events by connected address. No backend required for read-only history — use RPC + event indexing. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Payoff diagram linked to current empirical state | Show the payoff curve AND overlay the current β estimate + CI bands — connects the instrument design to the structural evidence | L | Requires both the payoff diagram (audience 4) and the econometric display (audience 2). This is the unique feature: the instrument's design and the evidence for it on the same screen. |
| Participant-visible replication evidence | Show participants the same evidence the researchers see — "here is why we believe this hedge works" — directly on the instrument page | M | Link from instrument page to the iteration detail page. Summary: pair, β, CI, verdict, notebook. |
| Position management (LP positions, hedge legs) | Participants with open positions need a clear view of what they hold | L | Depends on on-chain dashboard (audience 2). Wallet-gated: show only the connected address's positions. |

### Post-MVP (Gated Behind Explicit Safety Review)

These features involve real protocol funds and require a threat model review before exposure:

| Feature | Why Deferred | Complexity |
|---------|--------------|------------|
| Deposit / mint flows | Protocol funds at risk; requires threat-model review, audit evidence surfacing, and careful UX to prevent user error | XL |
| Redeem flows | Same as deposit; plus cross-chain settlement complexity on Celo | XL |
| LP provision flows | Higher complexity than deposit/redeem; requires LP math UI (range selection, position sizing) | XL |

---

## Cross-Cutting Features

These are architectural constraints, not features. They appear here as a single reference so phases do not need to re-debate them.

| Constraint | Implementation Note | Complexity |
|------------|---------------------|------------|
| i18n (es-CO + en) | Use next-intl or equivalent. ALL copy in both languages at launch. Currency: COP and USD. Date format: ISO 8601 internally, locale-formatted in display. | M (if built from day 1 is cheap; retrofit is XL) |
| WCAG 2.2 AA | Semantic HTML, focus management, color contrast (4.5:1 minimum), keyboard navigation, screen reader testing. Run axe-core in CI. | M |
| Mobile-first responsive | Design at 360px wide first. No content hidden on mobile that is visible on desktop. Touch targets: 44x44px minimum. | M |
| Empty / loading / error states | Every data-fetching surface needs three states. Lab tone: epistemic, not marketing. Error state: "The RPC returned an error at [timestamp]. Last known state is shown." Not "Oops! Something went wrong." | S per surface |
| Status page | RPC health, indexer freshness, MCP server uptime. Needed for both human participants and agents monitoring data freshness. | M |
| Search across iterations, papers, code | Cross-entity search. Use a single search index (Algolia, Pagefind, or equivalent). Scope: iteration slugs, paper titles, memo slugs, instrument IDs. | M |
| Design system (impeccable discipline) | Typography: not Inter-for-everything. Color: no purple-to-blue gradients. Motion: no bounce/elastic. Layout: no card-nested-in-card. Gray-on-color: forbidden. | L (one-time, amortized across all phases) |

---

## Anti-Features

Features that have surface appeal but must be explicitly rejected with their rationale logged here, so they do not re-enter scope.

| Anti-Feature | Why Requested | Why Not | What Instead |
|--------------|---------------|---------|--------------|
| DEX aggregator / swap router | DeFi users expect swap functionality | This is a hedging instrument surface. Aggregators require price feed infrastructure, routing logic, and liquidity sourcing that are entirely orthogonal to the lab's purpose. Adding one would dilute focus and invite regulatory attention for the wrong reasons. | Link out to established DEXs if a user needs to acquire the settlement token. |
| Leverage / margin trading UI | Follows from having a financial instrument UI | The lab's thesis is explicitly anti-leverage. Shipping a leverage UI would contradict the mission statement and mislead frontier-market users for whom leverage is a serious wealth destruction risk. | The payoff diagram and risk disclosures should make clear that Abrigo instruments are hedges with bounded payoffs. |
| KYC / custody / fiat on-ramps | Participants need a way to enter the protocol | The protocol is permissionless. Fiat on-ramps require money transmitter licenses in every jurisdiction, custodial liability, and GDPR / data sovereignty compliance. This is a full startup in itself. | Document the off-chain path (Binance P2P, Bitso in Colombia, Transak) in the risk disclosure copy without integrating any of them. |
| "Trending" tokens / discovery feed | Makes the product feel like a real DeFi app | This would reposition the product as a casino-adjacent discovery surface. The target users are wage earners seeking hedges, not speculators looking for the next token. | The instrument catalog is the discovery surface — every iteration, every verdict. |
| AI chat that hallucinates protocol state | Conversational interface is expected in 2026 AI-first products | A chat shell that confidently states wrong on-chain data is worse than no chat shell. The risk is especially high for financial state (positions, settlement amounts). The grounding problem is real and unsolved at this fidelity. | Build the agent surface (MCP tools, OpenAPI) first. The chat shell should wrap those grounded tools, not bypass them. Defer until grounding can be validated. |
| "$X TVL" hero / vanity metric prominently displayed | DeFi credibility is often signaled with TVL | Vanity metrics are easily gamed and say nothing about the instrument's structural validity. A $10M TVL in a protocol with no empirical evidence is worth less than a $100K TVL in a protocol with a published PASS iteration. | Lead with the structural evidence (β, CI, replication hash). TVL is a secondary metric shown on the instrument detail page, not the hero. |
| Marketing-style success selection (showing only PASS) | Positive signals attract participants | This directly violates the lab's anti-fishing discipline. Showing only passes would make the catalog dishonest and would expose the lab to "selective reporting" criticism that undermines all its results. | Every iteration is listed. FAIL iterations are worked examples of disciplined science. |
| Bounce / elastic easing, purple-to-blue gradients, card-nested-in-card | These are contemporary design trends | They are explicitly named anti-patterns in the `impeccable` design skill the lab has committed to. They signal "I used a SaaS template" and undermine the credibility signals the design system is meant to build. | Defined typography scale, spatial rhythm, semantic color (not decorative), and restrained motion per `impeccable` commands. |
| Push notifications / addictive engagement loops | Retention metric | The lab is not optimizing for engagement time. These patterns are designed to create compulsive checking behavior — the opposite of the epistemic, research-oriented relationship the lab wants with its users. | Webhook feed for agents (programmatic, opt-in). Email newsletter only after there are subscribers who explicitly asked for it. |
| Admin / governance UI | Needed for multisig parameter changes | Out of scope for this milestone. Governance UIs require their own threat model, multi-party signing flows, and timelock displays. Ship separately when governance structures are defined. | Link to the relevant multisig on Gnosis Safe / equivalent. |

---

## Feature Dependencies

```
Instrument Catalog (A2)
    └──requires──> "What is Abrigo" Explainer (A1)
    └──requires──> Iteration Detail Page (A2)
                       └──requires──> β / CI Display (A2)
                       └──requires──> Replication Hash Display (A2)
                       └──requires──> Decision Memo Archive (A1)

On-chain Dashboard (A2)
    └──requires──> Wallet Connect infra [read-only path] (A4)
    └──requires──> RPC / event indexer layer [BFF or direct]

MCP Server (A3)
    └──requires──> Iteration Catalog data layer (A2)
    └──requires──> On-chain pool state [read-only] (A2)
    └──requires──> OpenAPI spec (A3)

Agent Chat Shell (A3)
    └──requires──> MCP tools (A3) [must wrap grounded tools, not bypass them]
    └──requires──> RAG pipeline over lab corpus
    └──requires──> Grounding validation process [gate: do not ship without]

Payoff Diagram + Empirical Overlay (A4 differentiator)
    └──requires──> Payoff Diagram (A4)
    └──requires──> β / CI Display (A2)

Deposit / Mint / Redeem flows (A4 post-MVP)
    └──requires──> Wallet Connect (A4)
    └──requires──> Threat-model review [explicit gate]
    └──requires──> On-chain dashboard [read path validated first]

Position Management (A4)
    └──requires──> Wallet Connect (A4)
    └──requires──> On-chain Dashboard (A2)

Status Page
    └──requires──> RPC health check
    └──requires──> Indexer freshness signal

JSON-LD structured data (A3)
    ──enhances──> Every A1, A2, A4 page (add per page, no dependency blocks)

i18n / WCAG / Mobile-first
    ──applies-to──> Every feature (constraint, not dependency)
```

### Dependency Notes

- **MCP Server requires Iteration Catalog data layer:** The MCP tools are wrappers; the data layer they wrap must exist and be tested before the MCP surface exposes it.
- **Agent Chat Shell requires grounding validation:** This is a hard gate, not a soft recommendation. Shipping an ungrounded chat shell that can hallucinate settlement amounts or position state is a trust-destroying event that could harm users.
- **Deposit/Mint/Redeem requires threat-model review:** Explicit gate. The on-chain dashboard read path being validated is not sufficient — write paths require adversarial review of transaction construction, fee handling, and error states.
- **On-chain Dashboard requires RPC/indexer layer:** This is the riskiest infrastructure dependency. Celo RPC reliability and indexer freshness must be monitored. The dashboard must degrade to "last known state + staleness" rather than failing silently.

---

## MVP Definition

Deadline context: Uniswap Hook Incubator Cohort 9 Hookathon ~June 2 (~3 weeks from research date). The MVP must be demo-ready by then.

### Launch With (v1) — Hookathon Demo Target

- [ ] Lab homepage with mission and "what is Abrigo" explainer — makes the site comprehensible to a new visitor
- [ ] Iteration catalog with all iterations rendered (PASS, FAIL, PARKED, IN PROGRESS) — demonstrates the lab's core output and epistemic discipline
- [ ] Per-iteration detail page for Pair D (PASS) and FX-vol-on-CPI-surprise (CLOSED FAIL) — shows both a success and a failure with equal depth
- [ ] β / CI display and replication hashes for the above iterations — structural evidence, not marketing
- [ ] Predictable content-addressable URLs — prerequisite for agent-accessibility and citations
- [ ] JSON-LD structured data on all pages — low cost, high agent-discoverability value
- [ ] `llms.txt` + OpenAPI spec — signals agent-first posture to the world
- [ ] MCP server with `list_iterations` and `get_iteration_state` tools — minimum viable agent surface
- [ ] Read-first instrument view for the deployed Abrigo instrument on Celo — lets participants browse without wallet
- [ ] Wallet connect (read-only path, no transact) — lets connected users see their own on-chain state
- [ ] Risk disclosure surface — ethical obligation, must ship with any financial content
- [ ] i18n es-CO + en for all MVP copy — Colombian users are first-class at launch, not a retrofit
- [ ] WCAG 2.2 AA for all MVP surfaces — non-negotiable for a public good
- [ ] Basic status page (RPC health, indexer freshness) — ops hygiene; agents need to know data freshness

### Add After Validation (v1.x)

- [ ] Full iteration catalog (all historical iterations with detail pages) — after confirming the data pipeline from `abrigo-analytics` is stable
- [ ] Historical β trajectory charts — after validating the per-iteration display
- [ ] MCP tools: `get_instrument_terms`, `get_pool_state` — after MCP server is live and tested
- [ ] Webhook event feed for new verdicts — after there are external consumers who need it
- [ ] Transaction history per connected address — after wallet connect is validated
- [ ] Search across iterations, papers, code — after content volume justifies a search index
- [ ] Publications page with decision memo archive — after document pipeline from `scratch/` is defined

### Future Consideration (v2+)

- [ ] Conversational chat shell — after RAG grounding can be validated against known-correct answers
- [ ] Deposit / mint / redeem flows — after explicit threat-model review
- [ ] Position management (LP positions, hedge legs) — after read path is validated
- [ ] Cross-chain settlement view — after Celo single-chain path is production-stable
- [ ] `query_econometric_panel` MCP tool — after HuggingFace dataset query layer is built
- [ ] Sensitivity band visualization — after `abrigo-analytics` exports sweep results
- [ ] Newsletter / RSS — after there are subscribers who explicitly asked for it
- [ ] Press / talks page — after there is content to put on it

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Lab homepage + "What is Abrigo" explainer | HIGH (universal entry point) | LOW | P1 |
| Iteration catalog (all statuses, equal weight) | HIGH (core output) | MEDIUM | P1 |
| Per-iteration detail page (spec → tests → disposition) | HIGH (evidence chain) | MEDIUM | P1 |
| β / CI display + replication hashes | HIGH (credibility signal) | MEDIUM | P1 |
| Predictable content-addressable URLs | HIGH (agent + citation foundation) | LOW | P1 |
| JSON-LD structured data | HIGH (agent discoverability) | LOW | P1 |
| `llms.txt` + OpenAPI spec | MEDIUM (agent signaling) | LOW | P1 |
| MCP server (list + get_iteration_state) | HIGH (agent-first differentiator) | MEDIUM | P1 |
| Read-first instrument view + payoff diagram | HIGH (participant entry) | MEDIUM | P1 |
| Risk disclosure surfaces | HIGH (ethical + legal) | LOW | P1 |
| Wallet connect (read-only) | MEDIUM (participant need) | MEDIUM | P1 |
| Status page (RPC health, indexer freshness) | MEDIUM (ops + agent freshness) | LOW | P1 |
| i18n es-CO + en | HIGH (first-class Colombian users) | MEDIUM | P1 |
| Historical β trajectory charts | MEDIUM (research differentiator) | LARGE | P2 |
| Decision memo archive | HIGH (credibility differentiator) | MEDIUM | P2 |
| Publications page | MEDIUM (research lab expectation) | MEDIUM | P2 |
| Transaction history per address | MEDIUM (participant expectation) | MEDIUM | P2 |
| MCP tools: instrument_terms, pool_state | HIGH (full agent surface) | MEDIUM | P2 |
| Search across iterations / papers | MEDIUM (discoverability) | MEDIUM | P2 |
| Payoff diagram + empirical overlay | HIGH (unique differentiator) | LARGE | P2 |
| On-chain dashboard (live pool state) | HIGH (live evidence) | LARGE | P2 |
| Conversational chat shell (RAG grounded) | HIGH if grounded; harmful if not | EXTRA LARGE | P3 |
| Deposit / mint / redeem flows | HIGH (participant completion) | EXTRA LARGE | P3 |
| `query_econometric_panel` MCP tool | MEDIUM (researcher differentiator) | EXTRA LARGE | P3 |
| Cross-chain settlement view | LOW at v1 (Celo only) | EXTRA LARGE | P3 |
| Newsletter / RSS | LOW (no subscribers yet) | LARGE | P3 |

---

## Reference Surface Analysis

No direct competitors exist in the specific intersection of (research lab + DeFi hedging + agent-first + frontier market + epistemic honesty). Closest reference surfaces and what to learn from each:

| Reference | What to Learn | What Not to Copy |
|-----------|---------------|------------------|
| DefiLlama | TVL display, protocol catalog organization, chain filtering | TVL-as-credibility-signal; casino-adjacent discovery feeds |
| Gauntlet / Chaos Labs risk dashboards | Econometric rigor surfaced to participants, parameter tables | B2B SaaS visual weight; paywall-gated evidence |
| OSF (Open Science Framework) | Pre-registration evidence display, study status tracking, failure as first-class output | Academic layout complexity; no agent surface |
| Ethena protocol site | Clean instrument explainer, real-time state display | Marketing-first framing; no failure/uncertainty display |
| AlphaVantage MCP | Financial MCP tool design patterns | Equity-market assumptions that do not port to DeFi |

---

## Sources

- Project context: `/home/jmsbpp/apps/d2p/frontend/.planning/PROJECT.md`
- MCP production practices (2026): [MCP Server Best Practices 2026](https://www.cdata.com/blog/mcp-server-best-practices-2026)
- MCP financial data patterns: [QuantMCP: Grounding LLMs in Verifiable Financial Reality](https://arxiv.org/html/2506.06622v1)
- Agent-accessible financial APIs: [Alpha Vantage MCP](https://mcp.alphavantage.co/)
- llms.txt standard: [Give Your AI Agents Deep Understanding With LLMS.txt](https://medium.com/google-cloud/give-your-ai-agents-deep-understanding-with-llms-txt-4f948590332b)
- JSON-LD in Next.js: [Next.js JSON-LD Guide](https://nextjs.org/docs/app/guides/json-ld)
- Structured data usage (2024 Web Almanac): [Web Almanac Structured Data](https://almanac.httparchive.org/en/2024/structured-data)
- Open science transparency (2025-2026): [Open Science in 2026](https://eldenhallresearch.com/insights/2Gakm3QRfEMrVet8JAZA)
- RAG hallucination mitigation: [How RAG Reduces AI Hallucinations](https://www.kernshell.com/how-rag-reduces-ai-hallucinations-and-improves-accuracy/)
- Colombia mobile finance context: [Top finance apps in Colombia 2026](https://grokipedia.com/page/Top_finance_apps_in_Colombia_2026)
- Fintech UX mobile best practices: [10 Best Fintech UX Practices for Mobile Apps in 2026](https://procreator.design/blog/best-fintech-ux-practices-for-mobile-apps/)
- DeFi dashboard references: [DefiLlama](https://defillama.com/)
- MCP roadmap and production readiness: [Model Context Protocol Roadmap 2026](https://thenewstack.io/model-context-protocol-roadmap-2026/)

---

*Feature research for: d2p Finance / DS2P Labs — agent-first DeFi research-lab frontend*
*Researched: 2026-05-11*
