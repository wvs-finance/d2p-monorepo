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
