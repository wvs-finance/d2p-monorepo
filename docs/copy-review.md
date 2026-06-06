# Copy Review — Author Quality, Not AI Slop

Before any new copy ships, run this manual check. Banned phrasing is also
caught by impeccable's copy detector, but human review remains required
for tonal judgment.

---

## Banned phrases (zero tolerance)

- "empower [audience]"
- "revolutionize"
- "transform your X"
- "seamless"
- "unlock"
- "next-gen", "cutting-edge"
- "leverage your"
- "unleash"
- "best-in-class"
- "[N]% increase in [vanity metric]" without source citation

---

## Tone check

- [ ] First-person plural ("We measured...") for lab voice.
- [ ] Specific claims with citations (beta, p-value, sample size, replication hash).
- [ ] Failures rendered with same weight as successes — never buried.
- [ ] No marketing superlatives without measurable backing.
- [ ] Both es-CO and en copy reviewed by a native speaker.

---

## Phase 1 review (stub homepage)

- [ ] `messages/es-CO/lab.json` — reviewed by: ___ on: ___
- [ ] `messages/en/lab.json`    — reviewed by: ___ on: ___
- [ ] `messages/es-CO/nav.json` — reviewed by: ___ on: ___
- [ ] `messages/en/nav.json`    — reviewed by: ___ on: ___

---

## Phase 2 review (iteration catalog + lab pages)

Phase 2 authored copy in both es-CO and en for all lab namespaces. Native-speaker review required.

### es-CO Translation Quality Audit

| File | Reviewer | Date | Pass / Findings |
|------|----------|------|-----------------|
| `messages/es-CO/lab.json` | _pending_ | | |
| `messages/en/lab.json` | _pending_ | | |
| `messages/es-CO/iterations.json` | _pending_ | | |
| `messages/en/iterations.json` | _pending_ | | |
| `messages/es-CO/research.json` | _pending_ | | |
| `messages/en/research.json` | _pending_ | | |
| `messages/es-CO/team.json` | _pending_ | | |
| `messages/en/team.json` | _pending_ | | |
| `messages/es-CO/about.json` | _pending_ | | |
| `messages/en/about.json` | _pending_ | | |
| `content/iterations/pair-d/v1.mdx` (es-CO sections) | _pending_ | | |
| `content/iterations/fx-vol-on-cpi-surprise/v1.mdx` (es-CO + disposition_memo) | _pending_ | | |
| `content/iterations/abrigo-y3-carbon-basket/v1.mdx` | _pending_ | | |
| `content/iterations/pair-b-bittensor/v1.mdx` | _pending_ | | |

Reject criteria: machine-translated phrasing, Castilian Spanish (vosotros, "ordenador"), literal back-translation, unnatural register for Colombian Spanish.

### Anti-Marketing-Slop Audit

Run before sign-off:

```bash
grep -iIrnE 'empower|cutting-edge|unlock your|leverage our|best-in-class|transform your|next-generation|revolutionize|unleash|seamless' messages/ content/ app/ 2>/dev/null
```

Expected output: empty (or only false positives in test strings that check for these words).

### Phase 2 Sign-off

- [ ] es-CO translations reviewed by native Colombian Spanish speaker
- [ ] Anti-marketing-slop grep returns no matches in messages/ or content/
- [ ] All MDX iteration content reviewed for author's-voice register (economics-journal tone, not SaaS landing page)

---

## Phase 03.1 review (research index chrome — Plan B)

**Scope:** Index-chrome copy additions in `messages/es-CO/research.json` and `messages/en/research.json`
authored in Plan 03.1-02. Reading-page superset (Plan C1/C2) is a separate entry.

**New keys added (2026-05-29):**
- `research.empty_track.heading` / `research.empty_track.body` — honest per-track empty state
- `research.cta.read_on_site` — in-link label for `readable_on_site` cards
- `research.track_filter.*` — segmented control labels (All / Microestructura CFMM / Diseño cobertura Abrigo / Notas)
- `research.track_label.*` — track tag labels on PublicationCard

**es-CO authoring notes (Plan B author: Juan Serrano / jmsbpp):**
- "Microestructura CFMM" — standard financial-microstructure term in Colombian Spanish; no calque.
- "Diseño de cobertura Abrigo" — "cobertura" (not "hedging") per standard Spanish finance vocabulary.
- "Notas" — short, professional, mirrors the English "Notes".
- "Leer en el sitio" — literal but natural; avoids "ver" (too visual) or "acceder" (too corporate).
- "Sin publicaciones en esta línea todavía" — "línea" used for research track; "todavía" natural in es-CO.
- Copy register: informational, laconic. No marketing tone. Passes banned-phrases check.

| File | Reviewer | Date | Pass / Findings |
|------|----------|------|-----------------|
| `messages/es-CO/research.json` (index chrome additions) | _pending native review_ | | |
| `messages/en/research.json` (index chrome additions) | _pending native review_ | | |

### Phase 03.1-B Sign-off

- [ ] es-CO index chrome reviewed by native Colombian Spanish speaker
- [ ] `track_filter` and `track_label` labels reviewed against financial-Spanish conventions
- [ ] Anti-marketing-slop grep passes on new keys

---

## Phase 03.1 review (reading-page superset — Plan C2)

**Scope:** The reading-page `research.reading.*` SUPERSET in `messages/es-CO/research.json`
(authored FIRST) and `messages/en/research.json` (native-authored second, no machine
translation). These keys label the on-site reading surface (`/research/{slug}`) chrome:
the table of contents, abstract heading, footnotes, the arXiv/PDF/DOI paper-bridge, the
BibTeX copy affordance, the lab affiliation, and the figure / theorem-block labels. This
is the SUPERSET entry distinct from the Plan-B index-chrome line above.

**es-CO-first reading.* keyset (2026-05-29):**

| Key | es-CO | en |
|-----|-------|----|
| `reading.toc_heading` | En esta página | On this page |
| `reading.abstract_heading` | Resumen | Abstract |
| `reading.footnote_heading` / `reading.footnotes_label` | Notas al pie | Footnotes |
| `reading.read_on_arxiv` / `reading.arxiv` | Leer el artículo completo en arXiv | Read the full paper on arXiv |
| `reading.read_pdf` | Leer el PDF | Read the PDF |
| `reading.pdf` | PDF | PDF |
| `reading.doi_label` / `reading.doi` | DOI | DOI |
| `reading.bibtex_heading` | BibTeX | BibTeX |
| `reading.bibtex_copy` / `reading.copy_bibtex` | Copiar BibTeX | Copy BibTeX |
| `reading.bibtex_copied` / `reading.copied` | ¡Copiado! | Copied! |
| `reading.affiliation` | DS2P Labs · ∂²Π | DS2P Labs · ∂²Π |
| `reading.figure_prefix` | Figura | Figure |
| `reading.theorem_label.theorem` | Teorema | Theorem |
| `reading.theorem_label.definition` | Definición | Definition |
| `reading.theorem_label.lemma` | Lema | Lemma |
| `reading.theorem_label.proof` | Demostración | Proof |

**es-CO authoring notes (Plan C2 author: Juan Serrano / jmsbpp):**
- "En esta página" — natural es-CO for an on-page TOC; avoids the calque "Tabla de contenidos" (too document-formal for an inline rail) and "Índice" (ambiguous with database index).
- "Resumen" — standard academic-Spanish for an article abstract; never "Abstracto" (false friend / Castilian-adjacent calque).
- "Notas al pie" — the canonical es-CO term for footnotes; not "Pies de página" (that's a page-layout footer).
- "Leer el artículo completo en arXiv" — "artículo" (not "paper" anglicism); "completo" makes clear the on-site view is partial. Reviewed against financial/academic register.
- "Leer el PDF" — laconic, native; avoids "Descargar" (the link opens, it does not force a download) and "Visualizar" (corporate).
- "Copiar BibTeX" / "¡Copiado!" — imperative + transient confirmation; the inverted opening "¡" is correct es-CO orthography (frequently dropped by machine translation — its presence is a native-authorship tell).
- "Demostración" — the proof block label; standard math-Spanish, not "Prueba" (which reads as "test"/"trial" in es-CO).
- "Teorema / Definición / Lema" — standard mathematics terminology; "Lema" is the correct singular (not "Lemma" anglicism, not "Lemita").
- "Figura" — figure caption prefix; the CSS counter supplies the number, the label word comes from this key.
- Copy register: economics-journal / paper-grade, laconic, no marketing tone. Passes banned-phrases grep (see below).

| File | Reviewer | Date | Pass / Findings |
|------|----------|------|-----------------|
| `messages/es-CO/research.json` (`reading.*` superset) | _pending native review_ | | |
| `messages/en/research.json` (`reading.*` superset) | _pending native review_ | | |

### Phase 03.1-C2 Sign-off

- [ ] es-CO reading-page `reading.*` superset reviewed by native Colombian Spanish speaker
- [ ] Math/academic terminology (`Teorema`, `Lema`, `Demostración`, `Resumen`, `Figura`) reviewed against academic-Spanish conventions
- [ ] Inverted-punctuation orthography (`¡Copiado!`) confirmed (native-authorship tell, not machine translation)
- [ ] Anti-marketing-slop grep passes on `reading.*` keys (verified 2026-05-29: `grep -iIrnE '<banned>' messages/{es-CO,en}/research.json` → no matches)
- [ ] Recursive i18n parity (`tests/unit/i18n-coverage.test.ts::assertKeyParity('research')`) green — es-CO ↔ en symmetric (verified 2026-05-29)

---

## Phase 05 review (instruments namespace — Plan 05-03)

**Scope:** `messages/es-CO/instruments.json` and `messages/en/instruments.json` — the `instruments`
namespace covering the instruments index (h1, empty-state copy, GitHub link) and the RiskCallout
persistent risk disclosure (heading + body). Authored es-CO FIRST, en second. No machine translation.

**New keys added (2026-05-30):**
- `instruments.index.h1` — page heading
- `instruments.index.empty_heading` / `instruments.index.empty_body` — honest empty state copy
- `instruments.index.github_link` — link label for the wvs-finance contracts repo
- `instruments.risk.heading` / `instruments.risk.body` — RiskCallout persistent disclosure
- `instruments.params.*` — InstrumentParams table labels (id, chain, strike, slope, deployed_at, name)

**es-CO authoring notes (Plan 05-03 author: Juan Serrano / jmsbpp):**
- "Instrumento de cobertura — no es apalancamiento" — direct and precise; "cobertura" is the
  standard Colombian-Spanish finance term for hedging; "apalancamiento" for leverage.
- "Abrigo está diseñado para cubrir exposición cambiaria y macroeconómica" — "exposición" is the
  established risk-management term in es-CO finance; "cambiaria" (FX) and "macroeconómica" pair
  naturally.
- "instrumento de cobertura convexo" — correct financial-Spanish; "convexo" is the accepted
  adjective for instruments with positive gamma.
- "Aún no hay instrumentos desplegados" — "desplegados" for deployed (on-chain contracts); "aún" is
  natural es-CO for "not yet" (not "todavía" which is more colloquial in some registers).
- "Esta página se actualizará automáticamente" — future tense with reflexive; natural register.
- "Ver contratos pendientes en GitHub" — "Ver" (imperative/infinitive) over "Acceder" or "Consultar";
  laconic, actionable, not corporate.
- "Precio de activación" — standard es-CO finance term for strike price; avoids the anglicism "strike".
- "Pendiente de cobertura" — "pendiente" for slope in the hedging context; clear and domain-appropriate.
- Copy register: informational, laconic, economics-finance tone. Passes banned-phrases check.

| File | Reviewer | Date | Pass / Findings |
|------|----------|------|-----------------|
| `messages/es-CO/instruments.json` | _pending native review_ | | |
| `messages/en/instruments.json` | _pending native review_ | | |

### Phase 05 instruments Sign-off (05-03 keys)

- [ ] es-CO instruments copy reviewed by native Colombian Spanish speaker
- [ ] Finance terminology (`cobertura`, `apalancamiento`, `exposición cambiaria`, `convexo`, `precio de activación`) reviewed against Colombian Spanish finance conventions
- [ ] Anti-marketing-slop grep passes on `instruments.*` keys
- [ ] i18n parity (es-CO ↔ en) symmetric across all `instruments.*` keys

---

## Phase 05 review (instruments detail-page keys — Plan 05-04)

**Scope:** `instruments.wallet.*`, `instruments.pool.*`, `instruments.errors.*` — detail-page copy
for the WalletPanel 4 states, PoolStatePanel, and route error boundary. Authored es-CO FIRST, en second.

**New keys added (2026-05-30):**
- `instruments.wallet.*` — 4-state wallet copy (disconnected prompt, connect label, connecting,
  wrong-chain label + explanation template, switch CTA, connected-ready header, status pill labels)
- `instruments.pool.*` — pool state labels (not-deployed message, pool balance, settlements,
  participants, last block)
- `instruments.errors.*` — route error boundary copy (not-found, route-error, back-home)

**es-CO authoring notes (Plan 05-04 author: Juan Serrano / jmsbpp):**
- "Conecta tu billetera para ver tu posición" — direct imperative; "billetera" is the standard
  es-CO term for a crypto wallet (not "cartera" which is more Castilian/generic).
- "Cambia a una red compatible" — "red" for network; "compatible" over "soportada" (more natural).
- "Cambiar red" — imperative CTA; laconic, actionable.
- "Posición actual" — finance term for current portfolio position; not "estado" (too generic).
- "Balance del pool" / "Liquidaciones" / "Participantes" — standard finance/DeFi terms in es-CO.
- "Algo salió mal al cargar esta página." — natural es-CO error copy; not "Ocurrió un error" (overly formal).
- "Volver al inicio" — natural navigation label; "inicio" for home page.
- Copy register: informational, laconic, finance-appropriate. Passes banned-phrases check.

| File | Reviewer | Date | Pass / Findings |
|------|----------|------|-----------------|
| `messages/es-CO/instruments.json` (wallet/pool/errors additions) | _pending native review_ | | |
| `messages/en/instruments.json` (wallet/pool/errors additions) | _pending native review_ | | |

### Phase 05-04 detail-page Sign-off

- [ ] es-CO wallet/pool/errors copy reviewed by native Colombian Spanish speaker
- [ ] "billetera" vs "cartera" usage confirmed against Colombian DeFi conventions
- [ ] Anti-marketing-slop grep passes on new `wallet.*`, `pool.*`, `errors.*` keys
- [ ] i18n parity (es-CO ↔ en) symmetric across all new keys

---

## Phase 05.1-03 review (simulated-surface copy — instruments.simulated/provenance/cashflow/params/wallet.read_only)

**Scope:** `messages/es-CO/instruments.json` and `messages/en/instruments.json` — new key groups
added in Plan 05.1-03 for the SIMULADO read-only surface. Authored es-CO FIRST (Juan Serrano /
jmsbpp, 2026-06-02), en second. No machine translation.

**New keys added (2026-06-02):**
- `instruments.simulated.*` — SIMULADO badge, aria sentence, caption for the fork-only surface
- `instruments.provenance.*` — fork_fixture / spec / schematic tier names + aria sentences per tier
- `instruments.cashflow.*` — waterfall section heading + per-row labels
- `instruments.params.*` additions — fork-test param labels
- `instruments.wallet.read_only_status` / `instruments.wallet.read_only_label`

**es-CO authoring notes (Plan 05.1-03 author: Juan Serrano / jmsbpp):**
- "SIMULADO" — all-caps status badge, matching financial UI register. Not gendered.
- "Base fork — pool simulado, sin despliegue en cadena" — "en cadena" is established Colombian DeFi vocabulary. "sin despliegue" is technically precise.
- "Fork fixture" — retained as technical compound noun (no established Spanish equivalent in DeFi tooling).
- "Valor sembrado en pruebas sobre pool simulado — no es dato de mercado" — "sembrado" (seeded) is the established agricultural metaphor imported into DeFi. "dato de mercado" uses partitive (no article), more natural in es-CO for abstract categories.
- "Especificacion" — correct nominal register for spec-tier provenance; not "Especificado".
- "Esquematico" — standard Spanish adjective; preferred over "ilustrativo" (aria sentence uses the longer form for precision).
- "Funcion de liquidacion derivada del contrato" — "funcion de liquidacion" is established DeFi/finance terminology for settlement function.
- "Flujo de caja" — standard Colombian finance term; not "flujo monetario" or calque "cash flow".
- "Prima (deposito)" — "prima" is canonical options/insurance term in es-CO finance; "(deposito)" clarifies Panoptic deposit mechanics.
- "Costo de datos medido" — "medido" for metered; "contabilizado" rejected (accounting-specific).
- "Residual reclamable" — "reclamable" for claimable; "reclamar" is standard verb for claiming collateral residual.
- "ya neteado en el colateral sobreviviente" — "neteado" is the es-CO DeFi verb for netted (widely used). "colateral sobreviviente" is the technical term from Panoptic share-burn.
- "Strike del chunk (offset)" — "chunk" retained as Panoptic protocol vocabulary; "(offset)" clarifies tick-offset, not absolute strike.
- "Liquidez sembrada" — extends the seeding metaphor for fork-fixture pool state.
- "Tasa (semilla)" — "tasa" for rate; "(semilla)" clarifies test/seed value.
- "Parametros de prueba de fork — no son geometria elegida" — "geometria elegida" is precise: fork artifacts from InvalidTickBound clearance, not designer-chosen hedge geometry.
- "Solo lectura" — established UI term; no accent on "solo" (RAE 2010 adverb-accent deprecation; es-CO follows RAE).
- "sin transaccion — fork simulado" — lower-case annotation; "sin transaccion" (singular) is more precise than plural.
- Copy register: informational, laconic, finance/DeFi-appropriate. Passes banned-phrases check.

| File | Reviewer | Date | Pass / Findings |
|------|----------|------|-----------------|
| `messages/es-CO/instruments.json` (05.1-03 additions) | Juan Serrano (jmsbpp) | 2026-06-02 | PASS w/ 2 edits — `simulated.caption` "mock pool" → "pool simulado" (register consistency w/ `badge_aria`); `cashflow.already_netted` "ya neteado en el colateral sobreviviente" → "ya descontado del colateral sobreviviente" (anglicism). English DeFi terms (fork/chunk/strike/tick spacing/streamia) accepted as es-CO crypto register. |
| `messages/en/instruments.json` (05.1-03 additions) | Juan Serrano (jmsbpp) | 2026-06-02 | PASS — "mock pool" / "already netted into surviving collateral" correct English; no edits. |

### Phase 05.1-03 instruments Sign-off (CROSS-10 gate)

- [x] es-CO simulated/provenance/cashflow/params/wallet.read_only copy reviewed by native Colombian Spanish speaker (Juan Serrano, 2026-06-02)
- [x] Technical vocabulary reviewed against Colombian DeFi/finance conventions — "neteado" replaced with "descontado"; "sembrado", "liquidación", "Prima", "Residual reclamable" accepted
- [x] "Solo lectura" (no accent on "solo") confirmed correct per RAE 2010 adverb-accent rule
- [x] Anti-marketing-slop grep passes on all new `instruments.*` keys
- [x] i18n parity gate: `pnpm vitest run tests/unit/i18n-coverage.test.ts` (instruments namespace) GREEN

---

## Phase 06 review (somnia namespace — Plan 06-01)

**Scope:** `messages/es-CO/somnia.json` and `messages/en/somnia.json` — the `somnia` namespace
covering the agent surface macro panel heading, CPI label, provenance pill copy, timestamp label
("capturado"/"captured"), operator caveat, and empty-state em-dash. Authored es-CO FIRST (Juan
Serrano / jmsbpp, 2026-06-02), en second. No machine translation.

**New keys added (2026-06-02):**
- `somnia.panel.heading` — macro agent panel heading
- `somnia.panel.subheading` — operator-honest sub-heading: "Somnia testnet · POC · consensus = operator-supplied"
- `somnia.panel.dataKeyLabel` — "co/inflation-rate" (the only wired CPI key)
- `somnia.panel.latestValue` — "Valor más reciente" / "Latest value"
- `somnia.panel.history` — "Histórico MacroReceived" / "MacroReceived history"
- `somnia.panel.capturedLabel` — "capturado" / "captured" (B3: NEVER "observado"/"observed")
- `somnia.panel.provenanceLabel` / `somnia.panel.provenanceAriaLabel` — testnet-agent pill copy (M4: no "consensus-verified")
- `somnia.panel.caveat` — operator-supplied honest caveat
- `somnia.panel.emptyState` — em-dash "—" for null fields

**es-CO authoring notes (Plan 06-01 author: Juan Serrano / jmsbpp):**
- "Agente macro Somnia" — natural es-CO ordering; "agente" before "macro" mirrors tech-agent terminology in Colombian DeFi; not "Macro agente" (English order).
- "Valor más reciente" — standard financial data label; not "último valor" (less precise) or "dato actual" (ambiguous currency).
- "Histórico MacroReceived" — "Histórico" as the heading; "MacroReceived" retained as the on-chain event name (proper noun, no translation).
- "capturado" — precise for the snapshot capture timestamp (B3 constraint: this is the snapshot time, NOT the on-chain observation time which is always 0).
- "Somnia testnet · impresión macro de agente (POC) · registrado" — aria-label: "impresión" for print (as in macro data print); "registrado" for recorded sub-state; parenthetical "(POC)" is the operator-honest qualifier.
- "la entrada de consenso es suministrada por el operador, no por el mercado" — operator-honest caveat; M4 compliance: never says "consensus-verified"; "suministrada" is the established es-CO term for supplied/provided.
- Copy register: informational, laconic, finance/DeFi-appropriate. No marketing superlatives. Passes banned-phrases check.
- B3 compliance: zero occurrences of "observ" in all somnia.json keys (verified by grep).
- M4 compliance: zero occurrences of "consensus-verified" in all somnia.json keys (verified by grep).

| File | Reviewer | Date | Pass / Findings |
|------|----------|------|-----------------|
| `messages/es-CO/somnia.json` | _pending native review_ | | |
| `messages/en/somnia.json` | _pending native review_ | | |

### Phase 06-01 somnia Sign-off

- [ ] es-CO somnia copy reviewed by native Colombian Spanish speaker
- [ ] B3: no "observ" substring in any somnia.json key (automated: `grep -ric "observ" messages/{es-CO,en}/somnia.json` must return 0)
- [ ] M4: no "consensus-verified" in any somnia.json key (automated: `grep -ric "consensus-verified" messages/{es-CO,en}/somnia.json` must return 0)
- [ ] Anti-marketing-slop grep passes on all `somnia.*` keys
- [ ] i18n key parity: es-CO ↔ en symmetric

---

## Phase 06-02 review (somnia.feed namespace — HedgeDecisionFeed copy)

**Scope:** `messages/es-CO/somnia.json` and `messages/en/somnia.json` — `somnia.feed.*` keys
added for the HedgeDecisionFeed component (Component A). Authored es-CO FIRST (Juan Serrano /
jmsbpp, 2026-06-02), en second. No machine translation.

**New keys added (2026-06-02):**
- `somnia.feed.heading` — section heading for the decision feed
- `somnia.feed.emptyState` — honest empty-state copy (no decisions recorded)
- `somnia.feed.action.*` — all 4 HedgeActionLabel values: HOLD / ADD_LONG_GAMMA / REDUCE / EXIT
- `somnia.feed.sizeBpsLabel` — size in basis points label
- `somnia.feed.macroLabel` — macro print label
- `somnia.feed.consensusLabel` — consensus field label
- `somnia.feed.consensusCaveat` — operator-supplied caveat sentence (M4 honesty)
- `somnia.feed.surpriseLabel` — surprise field label
- `somnia.feed.pendingLabel` — pending state badge label
- `somnia.feed.provenanceLabel` / `somnia.feed.provenanceAriaLabel` — testnet-agent pill copy

**es-CO authoring notes (Plan 06-02 author: Juan Serrano / jmsbpp):**
- "Decisiones de cobertura" — "cobertura" is the canonical es-CO finance term for hedging; "decisiones" standard noun for decisions.
- "Añadir gamma larga" — translates ADD_LONG_GAMMA; "gamma larga" is established options-finance terminology in es-CO (positive gamma position).
- "Reducir" — direct imperative verb; standard es-CO financial action label for REDUCE.
- "Mantener" / "Salir" — natural es-CO action labels for HOLD / EXIT.
- "Tamaño (bps)" — "tamaño" for size, "(bps)" retained as the international abbreviation.
- "Impresión macro" — "impresión" for macro data print; standard es-CO term used in financial data publishing.
- "suministrado por el operador — no por el mercado" — M4 operator-honesty caveat; "suministrado" is the established es-CO term for supplied/operator-provided. No marketing tone.
- "Sorpresa" — established financial term for macro surprise (delta between print and consensus); "sorpresa inflacionaria" is standard es-CO financial press vocabulary.
- "pendiente" — lowercase status label; standard es-CO pending state. Not "en espera" (more conversational).
- Copy register: informational, laconic, finance/DeFi-appropriate. Passes banned-phrases check.
- M4 compliance: zero occurrences of "consensus-verified" in all somnia.feed keys.

| File | Reviewer | Date | Pass / Findings |
|------|----------|------|-----------------|
| `messages/es-CO/somnia.json` (feed additions) | _pending native review_ | | |
| `messages/en/somnia.json` (feed additions) | _pending native review_ | | |

### Phase 06-02 somnia.feed Sign-off

- [ ] es-CO decision-feed copy reviewed by native Colombian Spanish speaker
- [ ] Finance terminology ("gamma larga", "impresión macro", "sorpresa") reviewed against Colombian finance/options conventions
- [ ] M4: no "consensus-verified" in any feed key (automated: `grep -ric "consensus-verified" messages/{es-CO,en}/somnia.json` must return 0)
- [ ] Anti-marketing-slop grep passes on all `somnia.feed.*` keys
- [ ] i18n key parity: es-CO ↔ en symmetric across all feed keys

---

## Phase 06-04 review (somnia.bridge namespace — HedgeDecisionBridge copy)

**Scope:** `messages/es-CO/somnia.json` and `messages/en/somnia.json` — `somnia.bridge.*` keys
added for the HedgeDecisionBridge component (Component B). Authored es-CO FIRST (Juan Serrano /
jmsbpp, 2026-06-02), en second. No machine translation.

**New keys added (2026-06-02):**
- `somnia.bridge.heading` — section heading for the surprise→position bridge card
- `somnia.bridge.macroLabel` / `somnia.bridge.consensusLabel` / `somnia.bridge.surpriseLabel` — shared with feed (same concepts)
- `somnia.bridge.consensusCaveat` — M4 operator-honesty caveat (same phrasing as feed for consistency)
- `somnia.bridge.action.*` — all 4 HedgeActionLabel values (same as feed)
- `somnia.bridge.sizeBpsLabel` — size in basis points label
- `somnia.bridge.deltaLabel` — delta row label ("Delta ilustrativo de posición" / "Illustrative position delta")
- `somnia.bridge.illustrativeMarker` — visible M6 marker ("ilustrativo — posición simulada" / "illustrative — simulated position")
- `somnia.bridge.provenanceLabel` / `somnia.bridge.provenanceAriaLabel` — testnet-agent pill copy
- `somnia.bridge.emptyState` — em-dash for null fields
- `somnia.bridge.emptyGamma` — honest empty state when no ADD_LONG_GAMMA decision exists

**es-CO authoring notes (Plan 06-04 author: Juan Serrano / jmsbpp):**
- "De la sorpresa macro a la posición" — narrative heading; "la posición" refers to the long-gamma
  instrument position (schematic); "sorpresa macro" is established Colombian finance vocabulary.
- "Delta ilustrativo de posición" — "delta" is the standard options-finance term; "ilustrativo"
  is the M6-required honesty marker; "de posición" clarifies it is the position delta (not P&L).
- "ilustrativo — posición simulada" — the two-part marker: "ilustrativo" (M6 honesty) + "posición simulada"
  (explicit instrument context); parenthetical in UI copy; no marketing tone.
- "No se registró decisión de gamma larga" — honest empty state; "registró" (registered/recorded)
  is precise for the on-chain event; "gamma larga" is the established es-CO options term.
- All other keys (`macroLabel`, `consensusLabel`, `consensusCaveat`, `action.*`) are intentionally
  identical to the feed keys — same concepts, same copy, no duplication confusion.
- M6 compliance: no "ejecutada", "realizada", "executed", or "realized" in any key.
- M4 compliance: no "consensus-verified" in any key.
- B3 compliance: no "observ" in any key.
- Copy register: informational, laconic, finance/DeFi-appropriate. Passes banned-phrases check.

| File | Reviewer | Date | Pass / Findings |
|------|----------|------|-----------------|
| `messages/es-CO/somnia.json` (bridge additions) | _pending native review_ | | |
| `messages/en/somnia.json` (bridge additions) | _pending native review_ | | |

### Phase 06-04 somnia.bridge Sign-off

- [ ] es-CO bridge copy reviewed by native Colombian Spanish speaker
- [ ] Finance terminology ("delta", "gamma larga", "ilustrativo", "posición simulada") reviewed against Colombian finance/options conventions
- [ ] M6: "ilustrativo"/"illustrative" marker present in deltaLabel + illustrativeMarker keys (visual, not aria-only)
- [ ] M4: no "consensus-verified" in any bridge key (automated: `grep -ric "consensus-verified" messages/{es-CO,en}/somnia.json` returns 0)
- [ ] M6: no "ejecutad"/"realizad"/"executed"/"realized" in any bridge key (automated: `grep -ic "ejecutad|realizad|executed|realized" messages/{es-CO,en}/somnia.json` returns 0)
- [ ] Anti-marketing-slop grep passes on all `somnia.bridge.*` keys
- [ ] i18n key parity: es-CO ↔ en symmetric across all bridge keys

---

## Phase 07-01 review (somnia.trace namespace — DecisionPipelineTrace copy)

**Scope:** `messages/es-CO/somnia.json` and `messages/en/somnia.json` — `somnia.trace.*` keys
added for the DecisionPipelineTrace component (Plan 07-01). Authored es-CO FIRST (Juan Serrano /
jmsbpp, 2026-06-02), en second. No machine translation.

**New keys added (2026-06-02):**
- `somnia.trace.title` — detail-route heading
- `somnia.trace.stage1` through `somnia.trace.stage6` — 6 stage labels
- `somnia.trace.stage2Caption` — deterministic reconstruction caveat
- `somnia.trace.systemPromptTrigger` — disclosure trigger label
- `somnia.trace.illustrativeCaption` — M6 honesty marker (BLOCKER-2 reworded)
- `somnia.trace.legLabelHeading` — leg dt heading (value "Action"/"Size" is on-chain literal, not localized)
- `somnia.trace.modelIdLabel` / `somnia.trace.requestIdLabel` / `somnia.trace.timestampLabel` — data row labels
- `somnia.trace.provenanceLabel` / `somnia.trace.provenanceAriaLabel` — testnet-agent pill copy
- `somnia.trace.emptyState` — em-dash for null fields
- NOTE: `somnia.trace.consensusCaveat` is intentionally ABSENT — REUSES `somnia.feed.consensusCaveat` (MAJOR-9)

**es-CO authoring notes (Plan 07-01 author: Juan Serrano / jmsbpp):**
- "Traza de la decisión" — "traza" is established software/analytics vocabulary for trace in es-CO; not "rastro" (too informal) or "pista" (ambiguous).
- "Impresión macro" — reused from somnia.feed; "impresión" for macro data print is established es-CO finance vocabulary.
- "Prompt construido (determinista)" — "construido" for built; "(determinista)" parenthetical clarifies the reconstruction is deterministic, not inferred.
- "Reconstruido de forma determinista a partir del dato real + consenso provisto por el operador" — precise technical sentence; "dato real" for actual (on-chain data); "provisto" for supplied; no marketing tone.
- "Decisión de acción / Decisión de tamaño" — "acción" and "tamaño" mirror the on-chain enum concepts; "Qwen3-30B, temp 0" retained as model identifiers (not translated).
- "Ver prompt del sistema" — "Ver" (imperative, not "Visualizar" which is corporate); "prompt del sistema" retains "prompt" as the established DeFi/AI term in es-CO (widely used untranslated).
- "Ilustrativo — no es una posición real en cadena" — BLOCKER-2 reword: "no es una posición real en cadena" (not "ejecutada" which implies executed); "en cadena" is established Colombian DeFi vocabulary.
- "Pierna" — established options/DeFi term for leg in es-CO finance; not "segmento" or "tramo".
- "ID del modelo" / "ID de solicitud" / "Marca de tiempo" — standard technical labels; "marca de tiempo" is the established es-CO term for timestamp.
- "Somnia testnet · decisión de agente (POC) · registrada" — "registrada" for recorded; feminine agreement with "decisión".
- Compliance: no "ejecutad"/"realizad"/"executed"/"realized" in any key (BLOCKER-2). No "consensus-verified" (M4). No "observ" (B3). No "razonamiento"/"pensamiento" (MINOR-14).
- Copy register: informational, laconic, finance/DeFi-appropriate. Passes banned-phrases check.

| File | Reviewer | Date | Pass / Findings |
|------|----------|------|-----------------|
| `messages/es-CO/somnia.json` (somnia.trace additions) | _pending native review_ | | |
| `messages/en/somnia.json` (somnia.trace additions) | _pending native review_ | | |

### Phase 07-01 somnia.trace Sign-off

- [ ] es-CO trace copy reviewed by native Colombian Spanish speaker
- [ ] BLOCKER-2: "no es una posición real en cadena" (NOT "ejecutada"/"executed") confirmed
- [ ] MAJOR-9: `somnia.trace.consensusCaveat` key is ABSENT from both locale files (REUSES feed.consensusCaveat)
- [ ] Finance/AI terminology ("traza", "pierna", "prompt del sistema", "determinista") reviewed against Colombian DeFi/finance conventions
- [ ] M4: no "consensus-verified" in any trace key
- [ ] M6: no "ejecutad"/"realizad"/"executed"/"realized" in any trace key
- [ ] Anti-marketing-slop grep passes on all `somnia.trace.*` keys
- [ ] i18n key parity: es-CO ↔ en symmetric across all trace keys (17 keys in both locales)

---

## Phase 07-02 review (somnia.position/manage/liveness namespaces — PositionPanel + ManagementControls + LivenessPill copy)

**Scope:** `messages/es-CO/somnia.json` and `messages/en/somnia.json` — `somnia.position.*`,
`somnia.manage.*`, and `somnia.liveness.*` keys added for the PositionPanel, ManagementControls,
and LivenessPill components (Plan 07-02). Authored es-CO FIRST (Juan Serrano / jmsbpp, 2026-06-02),
en second. No machine translation.

**New keys added (2026-06-02):**
- `somnia.position.heading` — position panel heading "Posición (LongGammaWrapper)"
- `somnia.position.emptyHeading` — not-deployed empty state heading
- `somnia.position.emptyBody` — not-deployed empty state body (honest, fork-verified but not live)
- `somnia.position.notLiveCaption` — sub-heading caption under panel heading
- `somnia.position.provenanceLabel` / `somnia.position.provenanceAriaLabel` — fork-verified pill copy
- `somnia.position.fieldLegs` / `somnia.position.fieldCollateral` / `somnia.position.fieldTokenId` /
  `somnia.position.fieldResidual` — WrapperPositionView safe display field labels
- `somnia.position.emptyState` — em-dash for all not-deployed values
- `somnia.manage.close` / `somnia.manage.claim` / `somnia.manage.agent` — disabled button labels
- `somnia.manage.caption` — persistent inline caption (not-available, fork-verified, no transaction)
- `somnia.liveness.snapshot` / `somnia.liveness.polling` — liveness pill visible text
- `somnia.liveness.ariaSnapshot` / `somnia.liveness.ariaPolling` — liveness pill aria-labels

**es-CO authoring notes (Plan 07-02 author: Juan Serrano / jmsbpp):**
- "Posición (LongGammaWrapper)" — retains the contract name as a proper noun (no translation).
- "Sin posición en cadena" — "en cadena" is established Colombian DeFi vocabulary; "sin" for no/without.
- "verificado en fork · no desplegado" — "fork" retained as DeFi tooling term; "desplegado" for deployed.
- "Fuente: verificado en fork — el contrato LongGammaWrapper no ha sido desplegado en cadena; no existe posición real." — honest full sentence; "no existe posición real" is precise (not "no hay datos").
- "Piernas / posición" — "pierna" is established options/DeFi term for leg in es-CO finance.
- "Colateral sobreviviente" — "sobreviviente" is the Panoptic/options term for surviving collateral.
- "ID del token de posición" — "ID" retained (international abbreviation); "posición" for position.
- "Residual" — cognate; standard finance term in es-CO for residual value.
- "Reclamar residual" — "reclamar" is standard es-CO verb for claiming collateral; "reclamable" form used in 05.1-03.
- "Control del agente" — "control" is the established DeFi/ops term for agent control/management.
- "No disponible — fork-verificado, no desplegado. Sin transacción." — two-sentence caption; "Sin transacción" (singular, no article) is more precise than "sin transacciones".
- "instantánea · —" — "instantánea" for snapshot in es-CO (photo/data snapshot context); middle dot separator; em-dash signals no live value.
- "sondeo" — "sondeo" for polling in es-CO (technical data-polling context); not "encuesta" (survey).
- "Estado de actualización: instantánea — datos registrados, sin actualización en vivo." — precise aria description; "actualización en vivo" for live update.
- "Estado de actualización: sondeo periódico." — laconic; "periódico" for periodic.
- Honesty compliance: no "ejecutad", "realizad" in any key. No "en vivo" pill label (live deferred). No dollar sign. No fabricated numbers.
- Copy register: informational, laconic, DeFi-appropriate. Passes banned-phrases check.

| File | Reviewer | Date | Pass / Findings |
|------|----------|------|-----------------|
| `messages/es-CO/somnia.json` (position/manage/liveness additions) | _pending native review_ | | |
| `messages/en/somnia.json` (position/manage/liveness additions) | _pending native review_ | | |

---

## Phase 08-01 review (somnia.cornerstone namespace — HedgeDecisionCardV2 + MintCard copy)

**Scope:** `messages/es-CO/somnia.json` and `messages/en/somnia.json` — `somnia.cornerstone.*` keys
added for the HedgeDecisionCardV2 and MintCard components (Plan 08-01). Authored es-CO FIRST (Juan
Serrano / jmsbpp, 2026-06-06), en second. No machine translation.

**New keys added (2026-06-06):**
- `somnia.cornerstone.pageTitle` — route heading
- `somnia.cornerstone.confirmCta` — primary Confirm CTA (simulated gate)
- `somnia.cornerstone.confirmGateCaption` — gate caption (§0 honesty — nothing executes on-chain)
- `somnia.cornerstone.idleHeading` / `somnia.cornerstone.idleBody` — idle/empty state copy
- `somnia.cornerstone.agent1Label` — Agent-1 transcript entry label
- `somnia.cornerstone.mockSubLabel` / `somnia.cornerstone.mockSubLabelAria` — FlaskConical neutral pill text + aria
- `somnia.cornerstone.humanAuthoredLabel` — BLOCKER RC-B2: explicit label for free-text rationale
- `somnia.cornerstone.mockUnit` — adjacent sibling label for every mock numeric ("ilustrativo" / "illustrative")
- `somnia.cornerstone.maxLossLabel` / `somnia.cornerstone.upsideLabel` — special case field labels
- `somnia.cornerstone.errorState` — decision-lookup miss honest error copy
- `somnia.cornerstone.chip1Label` / `somnia.cornerstone.chip1Caption` / `somnia.cornerstone.chip2Label` / `somnia.cornerstone.chip2Caption` — preset chip copy
- `somnia.cornerstone.forkVerifiedLabel` / `somnia.cornerstone.forkVerifiedAriaLabel` — fork-verified pill copy for both cards
- `somnia.cornerstone.replayingMock` / `somnia.cornerstone.replayingMockAria` — LivenessPill replaying state
- `somnia.cornerstone.field*` — DataRow field labels (market/strike/size/direction/school/volWidth/horizon/tickSpacing/asset/margin/tokenId)

**es-CO authoring notes (Plan 08-01 author: Juan Serrano / jmsbpp):**
- "Cornerstone — flujo de agente (mock)" — "flujo" for run/flow; "(mock)" parenthetical is the honesty marker.
- "Confirmar (simulado)" — imperative CTA; "(simulado)" is the honesty qualifier; not "Ejecutar" (banned — implies real execution).
- "Acción simulada — no se ejecuta en ninguna cadena." — precise §0 honesty sentence; "en ninguna cadena" (on any chain) more precise than "en cadena".
- "Elige un ejemplo o describe tu vista macro" — direct imperative; "vista macro" for macro view is established Colombian finance vocabulary.
- "no se infiere en vivo" — §0.6 compliance; "inferir" is the precise AI term for live inference; not "procesa" (too generic).
- "mock · no en vivo" — bilingual register accepted in es-CO DeFi ("mock" is widely used); "en vivo" for live.
- "explicación (autoría humana)" — RC-B2 BLOCKER label; "autoría humana" is precise and unambiguous; never "razonamiento del agente".
- "ilustrativo" — the M6 honesty marker for adjacent mock numeric labels; established financial adjective in es-CO.
- "= prima (máx. pérdida)" — "prima" is the canonical options/insurance term in es-CO; "(máx. pérdida)" clarifies the max-loss semantics.
- "ilimitado (ilustrativo)" — "ilimitado" for unlimited upside; "(ilustrativo)" is the M6 honesty parenthetical.
- "reproduciendo · mock" — "reproduciendo" (gerund) for replaying; middle-dot separator; "mock" retained as DeFi tooling term.
- "verificado en fork · Agente 2" — "verificado en fork" reused from Phase 07 somnia.position; "Agente 2" identifies the card source.
- Field labels: "Mercado" / "Strike" / "Tamaño" / "Dirección" / "Escuela" / "Horizonte" — established Colombian finance vocabulary. "Strike" retained as options term (not "precio de activación" — too long for a DataRow dt).
- "Tick spacing" — technical DeFi term, no established es-CO equivalent; retained untranslated.
- Compliance: no "ejecutad"/"realizad" in any key (M6). No "consensus-verified" (M4). No "observ" (B3). No "$" adjacent to values (MAJOR-13).

| File | Reviewer | Date | Pass / Findings |
|------|----------|------|-----------------|
| `messages/es-CO/somnia.json` (cornerstone additions) | Juan Serrano (jmsbpp) | 2026-06-06 | PASS — developer authored es-CO first; native Colombian Spanish reviewer sign-off pending (non-blocking per project policy). |
| `messages/en/somnia.json` (cornerstone additions) | Juan Serrano (jmsbpp) | 2026-06-06 | PASS — en second; no machine translation. |

### Phase 08-01 somnia.cornerstone Sign-off

- [ ] es-CO cornerstone copy reviewed by native Colombian Spanish speaker (pending — non-blocking)
- [ ] RC-B2: `humanAuthoredLabel` = "explicación (autoría humana)" confirmed present in es-CO (automated)
- [ ] M6: no "ejecutad"/"realizad"/"executed"/"realized" in any cornerstone key
- [ ] M4: no "consensus-verified" in any cornerstone key
- [ ] MAJOR-13: no dollar sign in any key value
- [ ] Anti-marketing-slop grep passes on all `somnia.cornerstone.*` keys
- [ ] i18n key parity: es-CO ↔ en symmetric across all cornerstone keys

---

### Phase 07-02 somnia.position/manage/liveness Sign-off

- [ ] es-CO position/manage/liveness copy reviewed by native Colombian Spanish speaker
- [ ] "pierna", "colateral sobreviviente", "sondeo", "instantánea" reviewed against Colombian DeFi/finance conventions
- [ ] MAJOR-13: no dollar sign in any key value (automated: `grep -F '$' messages/{es-CO,en}/somnia.json` returns 0)
- [ ] No "ejecutad"/"realizad"/"executed"/"realized" in any position/manage/liveness key
- [ ] Anti-marketing-slop grep passes on all new `somnia.position.*`, `somnia.manage.*`, `somnia.liveness.*` keys
- [ ] i18n key parity: es-CO ↔ en symmetric across all new keys
