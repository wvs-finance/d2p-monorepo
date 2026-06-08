# Manual Accessibility Audit — Top 5 Templates

This checklist supplements the automated axe-core CI gate. Manual screen-reader audits
are required for the top 5 page templates by traffic and agent importance.

Run with VoiceOver (macOS) or NVDA (Windows).

---

## Phase 1 — Stub Homepage (`/`)

- [ ] Heading order is logical (h1 then h2; no skipped levels).
- [ ] Language switcher region is announced ("Language navigation" or similar).
- [ ] LanguageSwitcher buttons announce active state via aria-current="true".
- [ ] StatusPill text labels (PASS / FAIL / etc.) are announced — NOT just icons.
- [ ] Tab order matches visual order: header then main then footer.
- [ ] Focus ring visible on every interactive element.
- [ ] Page renders correctly when font size scaled to 200%.

Record findings inline (date, reviewer, result):

- Reviewed by: ___ on: ___
- Result: ___

---

## Phase 1 — Apps Index (`/apps`)

- [ ] Apps list items are navigable by screen reader in logical order.
- [ ] Each app entry announces name, status, and description.
- [ ] External links announce "opens in new tab" or equivalent.

Record findings inline (date, reviewer, result):

- Reviewed by: ___ on: ___
- Result: ___

---

## Phase 2 — Iteration Catalog (`/iterations`)

*To be filled by Phase 2 reviewer.*

---

## Phase 2 — Iteration Detail (`/iterations/<slug>/v<n>`)

*To be filled by Phase 2 reviewer.*

---

## Phase 3 — Dashboard (`/dashboard`)

*To be filled by Phase 3 reviewer.*

---

## Phase 5 — Instrument Detail (`/instruments/<id>/<chain>`)

*To be filled by Phase 5 reviewer.*

---

## Phase 03.1 — Research Reading Page (`/research/<slug>`) — MathML screen-reader spot-check

**Scope:** The on-site math reading surface renders KaTeX with `output: 'htmlAndMathml'`
(visible HTML + a parallel `<math>` MathML tree for assistive tech). axe-core has NO rule
coverage for `<math>` / `<annotation>` semantics, so the equation reading experience is a
HARD MANUAL exit criterion: spot-check ONE rendered display equation with a real screen
reader and confirm it is announced (not skipped, not read as raw LaTeX).

**Automated coverage (passes, but does NOT certify MathML):**
- `tests/a11y/research.spec.ts` — axe WCAG 2.2 AA on `/research` (index) and
  `/research/pair-d-dispatch-brief` (a Mode-A reading page), both locales (es-CO + en).
- Run by the Evidence Collector against the prod build (`pnpm build && pnpm start -p 3040`).

**Manual MathML equation spot-check (NVDA / VoiceOver):**

| Item | Status |
|------|--------|
| Date | 2026-05-29 |
| Reviewer | Juan Serrano (jmsbpp) |
| Equation tested | display equation `$$ … \tag{1} $$` on a Mode-A reading page (e.g. `/research/pair-d-dispatch-brief`) |
| Expected | the screen reader announces the equation via the KaTeX MathML tree (the `<math>`/`<annotation>` subtree under `.katex-mathml`), not raw `$…$` LaTeX, and not silently skipped |
| **Result** | **WAIVED — TRACKED** |

**WAIVED — no screen reader available in this environment.**
This is a headless Linux CI/dev environment (Arch Linux). NVDA is Windows-only and
VoiceOver is macOS-only; neither runs here, and Orca was not provisioned for this pass.
The MathML SR confirmation is therefore **DEFERRED, not silently skipped**:

- **Follow-up:** run the equation spot-check on a workstation with NVDA (Windows) or
  VoiceOver (macOS) — OR provision Orca on a Linux GUI session — before the v1 a11y gate
  is declared fully closed. Re-record date + reviewer + result in this table.
- **Confidence basis for the waiver:** KaTeX is configured with `output: 'htmlAndMathml'`
  (see `velite.config.ts` rehype-katex options and `docs/03.1-RENDER-PATH.md` §3), which
  emits the parallel MathML tree assistive tech consumes; the visual HTML carries
  `aria-hidden` so the SR reads the MathML, not the duplicated glyphs. This is the
  KaTeX-recommended a11y configuration. The waiver covers the live SR announcement
  confirmation only — the correct output mode is already wired and build-verified.
- **Tracking:** this entry is visible (not a silent skip); the v1 LCP/a11y close-out must
  reconcile it. Logged as a deferred item for the phase.
