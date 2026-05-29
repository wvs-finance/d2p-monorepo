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
