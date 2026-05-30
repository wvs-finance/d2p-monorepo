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
