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
